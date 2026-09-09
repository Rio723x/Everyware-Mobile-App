import { z } from "zod";
import { linkSuggestionSchema, type LinkSuggestion } from "../report/types.js";
import type { GenerateContentClient } from "../analyzer/gemini-analyzer.js";
import { GEMINI_MODEL, GEMINI_THINKING } from "../analyzer/gemini-analyzer.js";
import type { IndexedArticle, ScoredCandidate } from "./types.js";

export const MAX_SUGGESTIONS = 5;

const RANKER_INSTRUCTION = `You recommend internal links for the Everyware blog, an Indian home-appliance repair and support publication.

You are given one source article and a shortlist of candidate articles that a deterministic relevance model already selected. Your job is to choose which links genuinely help a reader, and to say where each should go.

Rules:

1. Choose only from the candidate list. Do not suggest any other URL.
2. The anchor text must be a phrase that already appears, word for word, in the source article text you are given. Do not invent phrasing for the editor to insert.
3. Recommend a link only where a reader of that sentence would actually want the other article. Fewer, better links beat more.
4. Give a short concrete reason for each.
5. Return at most ${String(MAX_SUGGESTIONS)} suggestions. Returning none is a valid answer.`;

const modelSuggestionSchema = z.object({
  suggestions: z
    .array(
      z.object({
        targetUrl: z.string(),
        anchorText: z.string(),
        reason: z.string(),
        confidence: z.number().min(0).max(1),
      }),
    )
    .max(20),
});

export interface RankResult {
  readonly suggestions: readonly LinkSuggestion[];
  /** Suggestions the model produced that failed a hard constraint. */
  readonly dropped: number;
}

export interface RankerConfig {
  readonly client: GenerateContentClient;
  readonly model?: string;
  readonly log?: (message: string, detail?: unknown) => void;
}

export interface RankRequest {
  /** Text the anchor must appear in - the article that will carry the link. */
  readonly anchorSourceText: string;
  readonly sourceTitle: string;
  readonly candidates: readonly ScoredCandidate[];
  /** Set on inbound suggestions: the existing article that should be edited. */
  readonly sourceUrlForSuggestions?: (candidate: IndexedArticle) => string | null;
}

/**
 * Ranks and explains internal-link candidates.
 *
 * The two constraints below are enforced **after** the model responds, not
 * merely stated in the prompt. A prompt is a request; this is a guarantee. The
 * model therefore cannot invent a URL that 404s, and cannot propose an anchor
 * phrase an editor would have to write from scratch - which would turn a
 * one-click suggestion into a rewrite.
 *
 * Failure returns an empty list rather than throwing: link suggestions are
 * advisory, and losing them must not cost the technical validation.
 */
export const createLinkRanker = (config: RankerConfig) => {
  const model = config.model ?? GEMINI_MODEL;
  const log = config.log ?? (() => undefined);

  return {
    async rank(request: RankRequest): Promise<RankResult> {
      if (request.candidates.length === 0) {
        return { suggestions: [], dropped: 0 };
      }

      const allowed = new Map(request.candidates.map((c) => [c.article.url, c.article]));

      const prompt = [
        `Source article: ${request.sourceTitle}`,
        "",
        "Candidates:",
        ...request.candidates.map(
          (c) => `- ${c.article.url}\n  title: ${c.article.title}\n  excerpt: ${c.article.excerpt}`,
        ),
        "",
        "Text the anchor must appear in, word for word:",
        request.anchorSourceText,
      ].join("\n");

      let raw: string;
      try {
        const response = await config.client.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction: RANKER_INSTRUCTION,
            responseMimeType: "application/json",
            responseJsonSchema: z.toJSONSchema(modelSuggestionSchema),
            thinkingConfig: GEMINI_THINKING,
          },
        });
        raw = response.text ?? "";
      } catch (error) {
        log("link ranking failed", error);
        return { suggestions: [], dropped: 0 };
      }

      const parsed = (() => {
        try {
          return modelSuggestionSchema.safeParse(JSON.parse(raw));
        } catch {
          return null;
        }
      })();

      if (parsed === null || !parsed.success) {
        log("link ranking returned unusable output", raw.slice(0, 200));
        return { suggestions: [], dropped: 0 };
      }

      const kept: LinkSuggestion[] = [];
      let dropped = 0;

      for (const candidate of parsed.data.suggestions) {
        const target = allowed.get(candidate.targetUrl);
        if (target === undefined) {
          // The model named a URL that was not on the shortlist.
          dropped += 1;
          continue;
        }
        // Case-sensitive: the anchor has to be insertable verbatim.
        if (!request.anchorSourceText.includes(candidate.anchorText)) {
          dropped += 1;
          continue;
        }

        const suggestion = linkSuggestionSchema.safeParse({
          targetUrl: candidate.targetUrl,
          anchorText: candidate.anchorText,
          reason: candidate.reason,
          confidence: candidate.confidence,
          sourceUrl: request.sourceUrlForSuggestions?.(target) ?? null,
        });
        if (suggestion.success) {
          kept.push(suggestion.data);
        } else {
          dropped += 1;
        }
      }

      if (dropped > 0) {
        log(`dropped ${String(dropped)} link suggestion(s) that failed a hard constraint`);
      }
      return { suggestions: kept.slice(0, MAX_SUGGESTIONS), dropped };
    },
  };
};

export type LinkRanker = ReturnType<typeof createLinkRanker>;

/** Used when no API key is configured: the deterministic shortlist, unranked. */
export const nullRanker: LinkRanker = {
  rank: () => Promise.resolve({ suggestions: [], dropped: 0 }),
};
