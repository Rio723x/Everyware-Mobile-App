import { timingSafeEqual } from "node:crypto";

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
 * Fires the processing endpoint without waiting for it.
 *
 * Deliberately not awaited: Ghost's webhook times out after two seconds, and
 * processing takes minutes. Failures are swallowed here because the webhook has
 * already accepted the event - a retry would re-deliver and hit the idempotency
 * claim anyway.
 */
export const dispatchProcess = (slug: string): void => {
  const base = process.env["PUBLIC_SITE_URL"] ?? "https://everyware.in";
  const token = process.env["SEO_WORKER_TOKEN"] ?? "";

  void fetch(`${base}/api/seo/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ slug }),
  }).catch(() => undefined);
};
