import { z } from "zod";
import { createGhostClient } from "@everyware/ghost";
import {
  StubAnalyzer,
  createAnalyzerFromEnv,
  createStore,
  createValidator,
  processPost,
  summarise,
} from "@everyware/seo-worker";
import { isAuthorised, json } from "../_lib/auth.js";

const bodySchema = z.object({ slug: z.string().min(1) });

/**
 * Thin adapter: authenticate, parse, delegate to processPost, serialise.
 *
 * Exported as `POST` rather than as a default, so Vercel invokes it with a Web
 * `Request` - see the note in webhooks/ghost.ts. `maxDuration` moved to
 * vercel.json, which is where the schema documents it for these functions.
 */
export async function POST(request: Request): Promise<Response> {
  if (!isAuthorised(request.headers.get("authorization"))) {
    return json({ error: "unauthorised" }, 401);
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "body must be { slug }" }, 400);

  const result = await processPost(parsed.data.slug, {
    ghost: createGhostClient(),
    store: createStore(),
    validator: createValidator(),
    analyzer: await createAnalyzerFromEnv(new StubAnalyzer()),
  });

  if (result.report === null) {
    return json({ status: "skipped", reason: result.skipped }, 404);
  }
  return json({ status: "processed", summary: summarise(result.report) });
}
