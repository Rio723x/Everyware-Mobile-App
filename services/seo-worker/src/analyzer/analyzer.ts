import type { BlogPost } from "@everyware/ghost";
import { truncateAtWord } from "@everyware/seo-core";
import { seoAnalysisSchema, type SeoAnalysis } from "../report/types.js";

/**
 * The analyzer's whole interface: one method.
 *
 * Deliberately narrow, because this is the seam the provider sits behind.
 * Spec 03 moved from Claude to Gemini without touching anything else, and that
 * was only cheap because nothing depends on more than this.
 */
export interface SeoAnalyzer {
  analyze(post: BlogPost): Promise<AnalysisOutcome>;
}

/**
 * Success or a recorded failure - never a throw.
 *
 * The analyzer is advisory. A failure here must not stop validation or
 * deployment, so the outcome is a value the pipeline carries rather than an
 * exception it has to remember to catch.
 */
export type AnalysisOutcome =
  | { readonly ok: true; readonly analysis: SeoAnalysis }
  | { readonly ok: false; readonly error: string };

/**
 * A deterministic analyzer that needs no API key.
 *
 * Every test in this package runs against it, which is what lets the suite run
 * offline. Its output is derived from the post rather than random, so a test
 * asserting on a suggestion is asserting on something stable.
 */
export class StubAnalyzer implements SeoAnalyzer {
  analyze(post: BlogPost): Promise<AnalysisOutcome> {
    const primaryTag = post.tags[0]?.name ?? "appliance care";
    const sentences = post.plaintext.split(/(?<=\.)\s+/).filter((s) => s.length > 20);

    const analysis = seoAnalysisSchema.parse({
      primaryTopic: truncateAtWord(primaryTag.toLowerCase(), 80),
      searchIntent: /cost|price|how much/i.test(post.title) ? "commercial" : "informational",
      secondaryTopics: post.tags.slice(1).map((tag) => tag.name.toLowerCase()),
      entities: post.tags.map((tag) => tag.name),
      suggestedTitle: fit(post.title, 15, 60),
      suggestedDescription: fit(post.excerpt || post.plaintext, 70, 160),
      suggestedSlug: post.slug.replace(/_/g, "-"),
      summary: fit(sentences.slice(0, 2).join(" ") || post.title, 40, 400),
      likelyQuestions: sentences
        .filter((sentence) => sentence.includes("?"))
        .slice(0, 8)
        .map((sentence) => sentence.trim()),
      contentGaps: [],
      faqOpportunities: [],
    });

    return Promise.resolve({ ok: true, analysis });
  }
}

/** Pads or trims a string into a schema-legal range without splitting a word. */
const fit = (value: string, min: number, max: number): string => {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length > max) {
    return truncateAtWord(trimmed, max);
  }
  if (trimmed.length >= min) {
    return trimmed;
  }
  const padded = `${trimmed} — practical appliance guidance from Everyware for Indian households.`;
  return padded.length > max ? truncateAtWord(padded, max) : padded;
};
