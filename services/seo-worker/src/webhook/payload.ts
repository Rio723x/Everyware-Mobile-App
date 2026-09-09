import { z } from "zod";

/**
 * Ghost webhook payload handling.
 *
 * Lives here rather than in the API handler so it can be tested without an HTTP
 * server, and so the handler stays a genuinely thin adapter. Ghost's payload
 * shape varies by event - a delete carries only `previous` - so every field is
 * optional and the caller is told what was missing.
 */
const postShapeSchema = z
  .object({
    id: z.string().optional(),
    slug: z.string().optional(),
    updated_at: z.string().optional(),
  })
  .optional();

export const ghostWebhookPayloadSchema = z.object({
  post: z
    .object({
      current: postShapeSchema,
      previous: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
});

/** Events that warrant an analysis run. The rest only need a rebuild. */
const ANALYSED_EVENTS = new Set(["post.published", "post.published.edited"]);

export type WebhookIntent =
  | {
      readonly kind: "process";
      readonly postId: string;
      readonly slug: string;
      readonly idempotencyKey: string;
      readonly analyse: boolean;
      readonly event: string;
    }
  | { readonly kind: "reject"; readonly reason: string };

/**
 * Turns a raw body and an event name into what the worker should do.
 *
 * An unrecognised event still triggers analysis: Ghost adds events over time,
 * and defaulting to "do the work" is safer than silently ignoring a publish
 * because a header was named differently in a newer version.
 */
export const readWebhookIntent = (rawBody: string, event: string): WebhookIntent => {
  const parsedJson = (() => {
    try {
      return JSON.parse(rawBody);
    } catch {
      return null;
    }
  })();

  const parsed = ghostWebhookPayloadSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return { kind: "reject", reason: "payload is not a recognisable Ghost webhook body" };
  }

  const current = parsed.data.post?.current;
  const postId = current?.id;
  const slug = current?.slug;

  if (postId === undefined || slug === undefined) {
    return { kind: "reject", reason: "payload carries no post id or slug" };
  }

  return {
    kind: "process",
    postId,
    slug,
    // Ghost retries up to five times and can double-fire. Keying on the edit
    // rather than the delivery makes every repeat free.
    idempotencyKey: `${postId}:${current?.updated_at ?? "no-timestamp"}`,
    analyse: ANALYSED_EVENTS.has(event) || !event.startsWith("post."),
    event,
  };
};

/** Ghost sends the event name in one of two headers depending on version. */
export const readEventName = (headers: { get(name: string): string | null }): string =>
  headers.get("x-ghost-event") ?? headers.get("x-ghost-trigger") ?? "unknown";
