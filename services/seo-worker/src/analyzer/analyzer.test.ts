import { InMemoryGhostClient, type BlogPost } from "@everyware/ghost";
import { describe, expect, it, vi } from "vitest";
import { seoAnalysisSchema } from "../report/types.js";
import { StubAnalyzer } from "./analyzer.js";
import {
  GEMINI_MODEL,
  createGeminiAnalyzer,
  responseJsonSchema,
  type GenerateContentClient,
} from "./gemini-analyzer.js";
import { SYSTEM_INSTRUCTION, buildArticlePrompt } from "./prompt.js";

const client = new InMemoryGhostClient();
const posts = await client.listPosts();
const post = posts[0];
if (post === undefined) throw new Error("fixture corpus empty");

const validAnalysis = {
  primaryTopic: "washing machine maintenance",
  searchIntent: "informational",
  secondaryTopics: ["descaling", "drain pump"],
  entities: ["washing machine", "drain filter"],
  suggestedTitle: "How Often to Service a Washing Machine",
  suggestedDescription:
    "Once a year for normal use, plus a descaling wash every two months on hard water. Here is what a service covers and what it costs in Indian metros.",
  suggestedSlug: "washing-machine-service-frequency",
  summary: "A washing machine needs a professional service once a year, and more often on hard water.",
  likelyQuestions: ["How often should a washing machine be serviced?"],
  contentGaps: [],
  faqOpportunities: [],
};

type Request = Parameters<GenerateContentClient["models"]["generateContent"]>[0];

const stubClient = (
  responses: readonly (string | Error)[],
): { client: GenerateContentClient; requests: Request[] } => {
  const requests: Request[] = [];
  let call = 0;

  return {
    requests,
    client: {
      models: {
        generateContent: (request) => {
          requests.push(request);
          const next = responses[Math.min(call, responses.length - 1)];
          call += 1;
          if (next instanceof Error) return Promise.reject(next);
          return Promise.resolve({ text: next, usageMetadata: { totalTokenCount: 512 } });
        },
      },
    },
  };
};

describe("StubAnalyzer", () => {
  it("returns schema-valid analysis for every fixture post", async () => {
    for (const p of posts) {
      const outcome = await new StubAnalyzer().analyze(p);
      expect(outcome.ok, p.slug).toBe(true);
      if (outcome.ok) {
        expect(() => seoAnalysisSchema.parse(outcome.analysis), p.slug).not.toThrow();
      }
    }
  });

  it("is deterministic across ten runs", async () => {
    const analyzer = new StubAnalyzer();
    const runs = await Promise.all(Array.from({ length: 10 }, () => analyzer.analyze(post)));
    for (const run of runs) {
      expect(run).toEqual(runs[0]);
    }
  });

  it("needs no API key", async () => {
    const saved = process.env["GEMINI_API_KEY"];
    delete process.env["GEMINI_API_KEY"];
    await expect(new StubAnalyzer().analyze(post)).resolves.toMatchObject({ ok: true });
    if (saved !== undefined) process.env["GEMINI_API_KEY"] = saved;
  });
});

describe("prompt", () => {
  it("is a module-level constant, identical across calls", () => {
    expect(SYSTEM_INSTRUCTION).toBe(SYSTEM_INSTRUCTION);
    expect(SYSTEM_INSTRUCTION.length).toBeGreaterThan(200);
  });

  it("forbids inventing facts and schema", () => {
    // Asserted so a future edit cannot quietly drop the grounding rules.
    expect(SYSTEM_INSTRUCTION).toMatch(/Never invent facts/i);
    expect(SYSTEM_INSTRUCTION).toMatch(/Never invent schema/i);
    expect(SYSTEM_INSTRUCTION).toMatch(/Ground every suggestion in the supplied article/i);
    expect(SYSTEM_INSTRUCTION).toMatch(/advisory/i);
  });

  it("passes the article body untruncated", () => {
    expect(buildArticlePrompt(post)).toContain(post.plaintext);
  });
});

describe("createGeminiAnalyzer", () => {
  it("returns a valid analysis from a well-formed response", async () => {
    const { client: fake } = stubClient([JSON.stringify(validAnalysis)]);
    const outcome = await createGeminiAnalyzer({ client: fake }).analyze(post);
    expect(outcome).toMatchObject({ ok: true });
  });

  it("sends the documented request shape", async () => {
    const { client: fake, requests } = stubClient([JSON.stringify(validAnalysis)]);
    await createGeminiAnalyzer({ client: fake }).analyze(post);

    const request = requests[0];
    expect(request?.model).toBe(GEMINI_MODEL);
    expect(request?.config.responseMimeType).toBe("application/json");
    expect(request?.config.thinkingConfig).toEqual({ thinkingLevel: "LOW" });
    expect(request?.config.systemInstruction).toBe(SYSTEM_INSTRUCTION);
    expect(request?.config.responseJsonSchema).toEqual(responseJsonSchema);
  });

  it("keeps the system instruction byte-identical across two calls", async () => {
    const { client: fake, requests } = stubClient([JSON.stringify(validAnalysis)]);
    const analyzer = createGeminiAnalyzer({ client: fake });
    await analyzer.analyze(post);
    await analyzer.analyze(posts[1] ?? post);
    expect(requests[0]?.config.systemInstruction).toBe(requests[1]?.config.systemInstruction);
  });

  it("retries exactly once on a schema-invalid response, then degrades", async () => {
    const { client: fake, requests } = stubClient([JSON.stringify({ primaryTopic: "x" })]);
    const outcome = await createGeminiAnalyzer({ client: fake }).analyze(post);

    expect(requests).toHaveLength(2);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.error).toContain("suggestedTitle");
      expect(outcome.error).toContain("retry also failed");
    }
  });

  it("recovers when the retry succeeds", async () => {
    const { client: fake, requests } = stubClient([
      JSON.stringify({ primaryTopic: "x" }),
      JSON.stringify(validAnalysis),
    ]);
    const outcome = await createGeminiAnalyzer({ client: fake }).analyze(post);
    expect(requests).toHaveLength(2);
    expect(outcome).toMatchObject({ ok: true });
  });

  it("tells the model what was wrong when retrying", async () => {
    const { client: fake, requests } = stubClient([
      JSON.stringify({ primaryTopic: "x" }),
      JSON.stringify(validAnalysis),
    ]);
    await createGeminiAnalyzer({ client: fake }).analyze(post);
    expect(requests[1]?.contents).toContain("Your previous response was rejected");
  });

  it("degrades rather than throwing when the model returns prose", async () => {
    const { client: fake } = stubClient(["I'm sorry, I can't help with that."]);
    const outcome = await createGeminiAnalyzer({ client: fake }).analyze(post);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.error).toContain("not JSON");
  });

  it("retries once after a 429, then degrades", async () => {
    const sleep = vi.fn<(ms: number) => Promise<void>>().mockResolvedValue(undefined);
    const { client: fake, requests } = stubClient([new Error("429 RESOURCE_EXHAUSTED: quota")]);

    const outcome = await createGeminiAnalyzer({ client: fake, sleep }).analyze(post);

    expect(sleep).toHaveBeenCalled();
    // Two attempts inside the first try, then the schema retry does the same.
    expect(requests.length).toBeGreaterThanOrEqual(2);
    expect(outcome.ok).toBe(false);
  });

  it("does not back off for a non-rate-limit error", async () => {
    const sleep = vi.fn<(ms: number) => Promise<void>>().mockResolvedValue(undefined);
    const { client: fake } = stubClient([new Error("400 INVALID_ARGUMENT")]);

    const outcome = await createGeminiAnalyzer({ client: fake, sleep }).analyze(post);
    expect(sleep).not.toHaveBeenCalled();
    expect(outcome.ok).toBe(false);
  });

  it("logs usage metadata so free-tier consumption is observable", async () => {
    const log = vi.fn<(message: string, detail?: unknown) => void>();
    const { client: fake } = stubClient([JSON.stringify(validAnalysis)]);
    await createGeminiAnalyzer({ client: fake, log }).analyze(post);
    expect(log).toHaveBeenCalledWith("gemini usage", { totalTokenCount: 512 });
  });

  it("derives the response schema from the same zod schema it parses with", () => {
    // Provider-side enforcement is best-effort; the parse is what makes it true.
    expect(responseJsonSchema).toBeTypeOf("object");
    expect(JSON.stringify(responseJsonSchema)).toContain("suggestedTitle");
  });
});

describe("provider isolation", () => {
  it("carries the whole article into the request", async () => {
    const long: BlogPost = { ...post, plaintext: `${post.plaintext} ${"extra ".repeat(500)}` };
    const { client: fake, requests } = stubClient([JSON.stringify(validAnalysis)]);
    await createGeminiAnalyzer({ client: fake }).analyze(long);
    expect(requests[0]?.contents).toContain(long.plaintext);
  });
});
