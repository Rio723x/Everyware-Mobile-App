import { timingSafeEqual } from "node:crypto";
import { waitUntil } from "@vercel/functions";

/**
 * Bearer-token check for the internal endpoints.
 *
 * Constant-time, because a length-or-prefix comparison on a shared secret leaks
 * it a byte at a time to anyone willing to measure.
 */
export const isAuthorised = (header: string | null | undefined): boolean => {
  const expected = process.env["SEO_WORKER_TOKEN"] ?? "";
  if (expected === "") return false;

  const provided = (header ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
};

export const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/**
 * Fires the processing endpoint without making Ghost wait for it.
 *
 * Ghost gives up after two seconds and retries; processing takes a minute or
 * more. So the response must go back immediately - but the request still has to
 * actually complete.
 *
 * `waitUntil` is what makes that true. This began as a bare `void fetch(...)`,
 * on the assumption that an un-awaited request would finish on its own. It does
 * not, reliably: once the handler returns its response, the instance can be
 * frozen with the request still in flight, and the work silently never happens.
 * That is not theoretical - the first real publish went live with no report,
 * while an identical webhook minutes earlier had worked. An intermittent failure
 * that leaves no trace is the worst possible shape for this bug, which is why it
 * is fixed at the mechanism rather than papered over with a retry.
 *
 * `waitUntil` keeps the instance alive until the promise settles without
 * delaying the response, so Ghost still sees its 202 in milliseconds. The cost
 * is that this function bills for the processing it is waiting on; the webhook's
 * `maxDuration` in vercel.json is set to cover it.
 *
 * Failures are still swallowed: the webhook has already accepted the event, and
 * a Ghost retry would hit the idempotency claim rather than re-run the work.
 */
export const dispatchProcess = (slug: string): void => {
  const base = process.env["PUBLIC_SITE_URL"] ?? "https://everyware.in";
  const token = process.env["SEO_WORKER_TOKEN"] ?? "";

  const request = fetch(`${base}/api/seo/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ slug }),
  }).catch(() => undefined);

  try {
    waitUntil(request);
  } catch {
    // Outside a Vercel request context - a local script, a test - there is no
    // instance to keep alive, and the plain promise is already sufficient.
  }
};
