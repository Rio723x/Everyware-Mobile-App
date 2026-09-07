import { FileSeoStore } from "./file-store.js";
import { UpstashRedisStore } from "./redis-store.js";
import type { SeoStore } from "./store.js";

export interface CreateStoreOptions {
  readonly driver?: string | undefined;
  readonly dir?: string;
}

/**
 * Selects a store adapter.
 *
 * Defaults to files outside production so tests and local development need no
 * credentials. `SEO_STORE_DRIVER=redis` without credentials throws here, at
 * startup, rather than at first use - a worker that boots and then fails on the
 * first webhook is much harder to diagnose than one that refuses to start.
 */
export const createStore = (options: CreateStoreOptions = {}): SeoStore => {
  const driver = options.driver ?? process.env["SEO_STORE_DRIVER"] ?? "file";

  if (driver === "redis") {
    return new UpstashRedisStore({
      url: process.env["UPSTASH_REDIS_REST_URL"] ?? "",
      token: process.env["UPSTASH_REDIS_REST_TOKEN"] ?? "",
    });
  }
  return new FileSeoStore(options.dir ?? ".seo-store");
};
