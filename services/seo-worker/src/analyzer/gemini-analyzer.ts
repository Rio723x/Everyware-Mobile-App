import { z } from "zod";
import type { BlogPost } from "@everyware/ghost";
import { seoAnalysisSchema } from "../report/types.js";
import { SYSTEM_INSTRUCTION, buildArticlePrompt } from "./prompt.js";
import type { AnalysisOutcome, SeoAnalyzer } from "./analyzer.js";

export const GEMINI_MODEL = "gemini-2.5-flash";

/**
 * The slice of `@google/genai` this uses.
 *
 * Declared structurally rather than imported as a type so the analyzer can be
 * tested with a plain object, and so the package is only required when a key is
 * actually configured.
 */
export interface GenerateContentClient {
  readonly models: {
    generateContent(request: {
      model: string;
      contents: string;
      config: {
        systemInstruction: string;
        responseMimeType: string;
        responseJsonSchema: unknown;
        thinkingConfig: { thinkingBudget: number };
      };
    }): Promise<{ text?: string | undefined; usageMetadata?: unknown }>;
  };
}

export interface GeminiAnalyzerConfig {
  readonly client: GenerateContentClient;
  readonly model?: string;
  readonly log?: (message: string, detail?: unknown) => void;
  readonly sleep?: (ms: number) => Promise<void>;
}

const RATE_LIMIT_BACKOFF_MS = 2_000;

/**
 * The JSON Schema the model is constrained to at generation time.
 *
 * Derived from the same zod schema the response is parsed with, so the shape
 * the provider enforces and the shape this codebase trusts cannot drift apart.
 */
export const responseJsonSchema: unknown = z.toJSONSchema(seoAnalysisSchema);

const isRateLimited = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return /\b429\b|rate.?limit|quota|RESOURCE_EXHAUSTED/i.test(message);
};

/**
 * Gemini-backed analyzer, on the free tier.
 *
 * Thinking is disabled: this is extraction from supplied text, which needs no
 * reasoning budget, and thinking tokens are the largest avoidable draw on a
 * free quota.
 *
 * The response is parsed with zod even though the provider enforced a schema.
 * A schema the provider applies and a schema this codebase trusts must be
 * *verified* to be the same schema, not assumed to be - provider-side
 * constraint enforcement is best-effort, and a silently missing field would
 * otherwise propagate into a stored report.
 */
export const createGeminiAnalyzer = (config: GeminiAnalyzerConfig): SeoAnalyzer => {
  const model = config.model ?? GEMINI_MODEL;
  const log = config.log ?? (() => undefined);
  const sleep = config.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));

  const request = async (contents: string): Promise<string> => {
    const response = await config.client.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseJsonSchema,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    log("gemini usage", response.usageMetadata);
    return response.text ?? "";
  };

  return {
    async analyze(post: BlogPost): Promise<AnalysisOutcome> {
      // The article is passed whole. Truncating it to fit would silently change
      // what was analysed, and a report about half an article is worse than no
      // report because nothing signals which half.
      const base = buildArticlePrompt(post);

      const attempt = async (contents: string): Promise<AnalysisOutcome> => {
        let raw: string;
        try {
          raw = await request(contents);
        } catch (error) {
          if (isRateLimited(error)) {
            await sleep(RATE_LIMIT_BACKOFF_MS);
            try {
              raw = await request(contents);
            } catch (retryError) {
              return { ok: false, error: describe(retryError) };
            }
          } else {
            return { ok: false, error: describe(error) };
          }
        }

        let parsedJson: unknown;
        try {
          parsedJson = JSON.parse(raw);
        } catch {
          return { ok: false, error: `model returned text that is not JSON: ${raw.slice(0, 200)}` };
        }

        const result = seoAnalysisSchema.safeParse(parsedJson);
        if (result.success) {
          return { ok: true, analysis: result.data };
        }
        return { ok: false, error: formatIssues(result.error) };
      };

      const first = await attempt(base);
      if (first.ok) return first;

      // One retry, telling the model exactly what was wrong. A second failure
      // degrades to a null analysis rather than blocking the pipeline.
      log("analysis validation failed, retrying once", first.error);
      const retry = await attempt(
        `${base}\n\nYour previous response was rejected: ${first.error}\nReturn JSON that satisfies the schema exactly.`,
      );
      if (retry.ok) return retry;

      return { ok: false, error: `${first.error} (retry also failed: ${retry.error})` };
    },
  };
};

const describe = (error: unknown): string =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error);

const formatIssues = (error: z.ZodError): string =>
  error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");

/**
 * Builds the real client, or falls back to the stub when no key is configured.
 *
 * A missing key is an ordinary state - local development, CI, a contributor
 * without credentials - not an error, because everything downstream of the
 * analyzer keeps working without it.
 */
export const createAnalyzerFromEnv = async (
  fallback: SeoAnalyzer,
  log?: (message: string, detail?: unknown) => void,
): Promise<SeoAnalyzer> => {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (apiKey === undefined || apiKey === "") {
    log?.("no GEMINI_API_KEY - SEO analysis will use the deterministic stub");
    return fallback;
  }

  const { GoogleGenAI } = await import("@google/genai");
  const client: GenerateContentClient = new GoogleGenAI({ apiKey });
  return createGeminiAnalyzer(log === undefined ? { client } : { client, log });
};
