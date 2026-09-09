import {
  createStore,
  readEventName,
  readWebhookIntent,
  triggerDeploy,
  verifyGhostSignature,
} from "@everyware/seo-worker";
import { dispatchProcess, json } from "../_lib/auth.js";

/**
 * Ghost webhook receiver.
 *
 * Verify, deduplicate, dispatch, return. Ghost waits two seconds and retries up
 * to five times, so nothing slow can happen before the response - analysis takes
 * tens of seconds and validation waits on a deploy that takes minutes.
 *
 * Exported as `POST` rather than as a default. Vercel's Node runtime selects the
 * Web `Request`/`Response` signature only when it finds a named HTTP-method or a
 * `fetch` export; with a default export it invokes the handler as legacy
 * `(req, res)`, so `request.text()` does not exist and every delivery 500s. The
 * method check goes with it - the runtime answers 405 itself for a verb with no
 * matching export.
 */
export async function POST(request: Request): Promise<Response> {
  // The raw body, before any parsing: Ghost signs the exact bytes it sent.
  const rawBody = await request.text();

  const verified = verifyGhostSignature(
    rawBody,
    request.headers.get("x-ghost-signature"),
    process.env["GHOST_WEBHOOK_SECRET"] ?? "",
  );
  if (verified.status !== "valid") {
    return json({ error: "signature verification failed", reason: verified.status }, 401);
  }

  const event = readEventName(request.headers);
  const intent = readWebhookIntent(rawBody, event);
  if (intent.kind === "reject") {
    return json({ error: intent.reason }, 400);
  }

  const store = createStore();
  if (!(await store.claimIdempotencyKey(intent.idempotencyKey, 24 * 3600))) {
    return json({ status: "duplicate", slug: intent.slug });
  }

  // Every event changes the URL set - unpublish and delete remove a page - so
  // every event rebuilds.
  const deploy = await triggerDeploy({ store }, `ghost:${event}:${intent.slug}`);

  if (intent.analyse) {
    dispatchProcess(intent.slug);
  }

  return json({ status: "accepted", event, slug: intent.slug, deploy: deploy.status }, 202);
}
