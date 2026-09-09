import type { SeoStore } from "../store/store.js";

export const DEBOUNCE_MS = 60_000;
const DEBOUNCE_KEY = "deploy";

export type DeployTriggerResult =
  | { readonly status: "triggered" }
  | { readonly status: "debounced"; readonly lastFiredAtMs: number }
  | { readonly status: "failed"; readonly error: string };

export interface DeployTriggerConfig {
  readonly store: SeoStore;
  readonly hookUrl?: string | undefined;
  readonly fetch?: typeof globalThis.fetch;
  readonly now?: () => number;
  readonly debounceMs?: number;
}

/**
 * Fires the deploy hook, at most once per debounce window.
 *
 * An editor publishing five posts in a row should cause one build, not five -
 * each build takes minutes and they would queue behind each other, so the last
 * post would go live long after the first. The record stores the last fire
 * time; it is not a queue, because a build always picks up everything currently
 * published anyway.
 *
 * A failure here returns a value rather than throwing. The deploy is important
 * but the analysis pipeline should still finish and record what it found.
 */
export const triggerDeploy = async (
  config: DeployTriggerConfig,
  reason: string,
): Promise<DeployTriggerResult> => {
  const hookUrl = config.hookUrl ?? process.env["VERCEL_DEPLOY_HOOK_URL"];
  const doFetch = config.fetch ?? globalThis.fetch;
  const now = config.now ?? Date.now;
  const debounceMs = config.debounceMs ?? DEBOUNCE_MS;

  if (hookUrl === undefined || hookUrl === "") {
    return { status: "failed", error: "VERCEL_DEPLOY_HOOK_URL is not configured" };
  }

  const lastFiredAtMs = await config.store.getDebounce(DEBOUNCE_KEY);
  const currentMs = now();

  if (lastFiredAtMs !== null && currentMs - lastFiredAtMs < debounceMs) {
    return { status: "debounced", lastFiredAtMs };
  }

  // Recorded before the request, so a slow or failed hook cannot let a burst
  // through while the first call is still in flight.
  await config.store.setDebounce(DEBOUNCE_KEY, currentMs);

  try {
    const response = await doFetch(hookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (!response.ok) {
      return { status: "failed", error: `deploy hook returned ${String(response.status)}` };
    }
    return { status: "triggered" };
  } catch (error) {
    return {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
};
