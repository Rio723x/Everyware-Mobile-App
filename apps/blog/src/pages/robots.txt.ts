import type { APIRoute } from "astro";
import { buildRobotsTxt } from "@everyware/seo-core";

export const GET: APIRoute = () =>
  new Response(buildRobotsTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
