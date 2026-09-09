export const POLL_INTERVAL_MS = 15_000;

/**
 * How long to wait for a deploy to carry the edit.
 *
 * This must stay comfortably under the `maxDuration` of the function doing the
 * waiting - 300s for `api/seo/process` - because the report is written *after*
 * validation. A wait longer than the function's own lifetime cannot ever produce
 * a report: the instance is killed mid-poll and nothing is stored, with no error
 * anywhere to explain the silence. It was originally ten minutes, which is
 * exactly that trap.
 *
 * Three and a half minutes is roughly four times a normal deploy here (~50s),
 * and leaves about ninety seconds inside the budget for the analysis, the link
 * ranking and the audit that follow.
 */
export const POLL_TIMEOUT_MS = 3.5 * 60 * 1000;

export type DeployWaitResult =
  | { readonly status: "ready"; readonly polls: number }
  | { readonly status: "timeout"; readonly polls: number; readonly lastSeen: string | null };

export interface DeployWaitConfig {
  readonly fetch?: typeof globalThis.fetch;
  readonly sleep?: (ms: number) => Promise<void>;
  readonly now?: () => number;
  readonly intervalMs?: number;
  readonly timeoutMs?: number;
}

/** `dateModified` from the page's BlogPosting, or null if there isn't one yet. */
const dateModifiedOf = (html: string): string | null => {
  for (const match of html.matchAll(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
  )) {
    try {
      const parsed: unknown = JSON.parse(match[1] ?? "");
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "@type" in parsed &&
        parsed["@type"] === "BlogPosting" &&
        "dateModified" in parsed
      ) {
        const value: unknown = parsed["dateModified"];
        return typeof value === "string" ? value : null;
      }
    } catch {
      // A page mid-deploy can serve truncated HTML; that is simply not-ready.
      continue;
    }
  }
  return null;
};

/**
 * Waits until the deployed page reflects a specific edit.

 * Waiting for a 200 is not enough: a 200 only proves *a* deploy exists, not that
 * it contains *this* change. Grading the previous deploy's HTML produces a
 * report that is confidently about the wrong bytes, which is worse than
 * producing none - nothing in the output would reveal the mistake.
 *
 * So the poll compares the page's own `dateModified` against the post's
 * `updated_at`. On timeout it says so rather than grading what it found.
 */
export const waitForDeploy = async (
  url: string,
  expectedModifiedAt: string,
  config: DeployWaitConfig = {},
): Promise<DeployWaitResult> => {
  const doFetch = config.fetch ?? globalThis.fetch;
  const sleep = config.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const now = config.now ?? Date.now;
  const intervalMs = config.intervalMs ?? POLL_INTERVAL_MS;
  const timeoutMs = config.timeoutMs ?? POLL_TIMEOUT_MS;

  const deadline = now() + timeoutMs;
  const expected = Date.parse(expectedModifiedAt);
  let polls = 0;
  let lastSeen: string | null = null;

  for (;;) {
    polls += 1;
    try {
      const response = await doFetch(url);
      if (response.ok) {
        const html = await response.text();
        lastSeen = dateModifiedOf(html);

        // >= rather than ===: Ghost's updated_at and the rendered value can
        // differ in trailing-zero formatting, and a later deploy is still fresh.
        if (lastSeen !== null && Date.parse(lastSeen) >= expected) {
          return { status: "ready", polls };
        }
      }
      // A 404 during the window is not-yet-deployed, not a fatal error.
    } catch {
      // Same for a connection reset mid-deploy.
    }

    if (now() + intervalMs > deadline) {
      return { status: "timeout", polls, lastSeen };
    }
    await sleep(intervalMs);
  }
};
