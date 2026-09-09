/**
 * Deterministic tokenisation.
 *
 * No dependencies and no model: the same text always yields the same tokens, so
 * the ranking built on top can be unit-tested against a fixed corpus and a
 * rebuild never reshuffles suggestions.
 */

const STOPWORDS = new Set([
  "a", "about", "above", "after", "again", "all", "also", "am", "an", "and", "any", "are",
  "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
  "can", "did", "do", "does", "doing", "down", "during", "each", "few", "for", "from", "further",
  "had", "has", "have", "having", "he", "her", "here", "hers", "him", "his", "how", "i", "if", "in",
  "into", "is", "it", "its", "itself", "just", "me", "more", "most", "my", "no", "nor", "not", "now",
  "of", "off", "on", "once", "only", "or", "other", "our", "out", "over", "own", "same", "she",
  "should", "so", "some", "such", "than", "that", "the", "their", "them", "then", "there", "these",
  "they", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "we",
  "were", "what", "when", "where", "which", "while", "who", "whom", "why", "will", "with", "would",
  "you", "your",
]);

/**
 * Light suffix stripping.
 *
 * Not a real stemmer, and deliberately not: a full stemmer is a dependency and
 * a source of surprises, while the only job here is making "machines" and
 * "machine" score as the same term. Order matters - longer suffixes first.
 */
export const stem = (word: string): string => {
  if (word.length <= 3) return word;

  if (word.length >= 4 && word.endsWith("ies")) {
    return `${word.slice(0, -3)}y`;
  }

  // "es" only comes off when the base ends in a sibilant - "boxes" is "box",
  // but "machines" is "machine", not "machin". Getting this backwards makes
  // every plural a different term from its singular, which is exactly the
  // conflation the stemmer exists to perform.
  if (word.length >= 5 && word.endsWith("es")) {
    const base = word.slice(0, -2);
    if (/(?:s|x|z|ch|sh)$/.test(base)) {
      return base;
    }
  }

  // No "er"/"ers" rules. They are meant for agent nouns ("washers" -> "wash")
  // but wreck ordinary words: "filters" becomes "filt", "cooler" becomes "cool".
  // Conflating washer with wash is a small relevance gain; corrupting "filter"
  // on an appliance blog is a large loss.
  for (const [suffix, minLength] of [
    ["ing", 5],
    ["ed", 4],
    ["s", 4],
  ] as const) {
    if (word.length >= minLength && word.endsWith(suffix)) {
      return word.slice(0, -suffix.length);
    }
  }
  return word;
};

export const tokenize = (text: string): readonly string[] =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word))
    .map(stem);

/** Raw term counts for one document. */
export const termFrequency = (tokens: readonly string[]): ReadonlyMap<string, number> => {
  const counts = new Map<string, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return counts;
};

/**
 * Inverse document frequency across a corpus.
 *
 * `log(N / documentsContaining)`, so a term appearing in every document scores
 * exactly 0 and contributes nothing - which is the point: "appliance" appearing
 * everywhere tells you nothing about which two articles are related.
 */
export const inverseDocumentFrequency = (
  documents: readonly (readonly string[])[],
): ReadonlyMap<string, number> => {
  const containing = new Map<string, number>();
  for (const tokens of documents) {
    for (const token of new Set(tokens)) {
      containing.set(token, (containing.get(token) ?? 0) + 1);
    }
  }

  const idf = new Map<string, number>();
  for (const [token, count] of containing) {
    idf.set(token, Math.log(documents.length / count));
  }
  return idf;
};

/** An L2-normalised TF-IDF vector, so cosine similarity is a plain dot product. */
export const tfidfVector = (
  tokens: readonly string[],
  idf: ReadonlyMap<string, number>,
): Readonly<Record<string, number>> => {
  const tf = termFrequency(tokens);
  const raw = new Map<string, number>();

  for (const [term, count] of tf) {
    const weight = count * (idf.get(term) ?? 0);
    if (weight > 0) raw.set(term, weight);
  }

  const magnitude = Math.sqrt([...raw.values()].reduce((sum, value) => sum + value * value, 0));
  if (magnitude === 0) return {};

  const vector: Record<string, number> = {};
  // Sorted so the serialised index is byte-stable between runs.
  for (const term of [...raw.keys()].sort()) {
    vector[term] = (raw.get(term) ?? 0) / magnitude;
  }
  return vector;
};

/** Both vectors are unit length, so this is the cosine directly. */
export const cosineSimilarity = (
  a: Readonly<Record<string, number>>,
  b: Readonly<Record<string, number>>,
): number => {
  const [shorter, longer] =
    Object.keys(a).length <= Object.keys(b).length ? [a, b] : [b, a];

  let dot = 0;
  for (const [term, weight] of Object.entries(shorter)) {
    dot += weight * (longer[term] ?? 0);
  }
  return dot;
};
