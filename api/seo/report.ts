import { toSlug } from "@everyware/seo-core";
import { createStore } from "@everyware/seo-worker";
import { isAuthorised, json } from "../_lib/auth.js";

/**
 * Thin adapter: authenticate, read one report from the store, serialise.
 *
 * Exported as `GET` rather than as a default - see the note in
 * webhooks/ghost.ts for why the default export could never work here.
 */
export async function GET(request: Request): Promise<Response> {
  if (!isAuthorised(request.headers.get("authorization"))) {
    return json({ error: "unauthorised" }, 401);
  }

  const slug = new URL(request.url).searchParams.get("slug");
  if (slug === null || slug === "") return json({ error: "slug parameter is required" }, 400);

  const report = await createStore().getReport(toSlug(slug));
  if (report === null) return json({ error: "no report for that slug" }, 404);
  return json(report);
}
