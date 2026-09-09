#!/usr/bin/env node
/**
 * Thin entry point: all logic lives in packages/seo-core so it stays testable.
 *
 * Imports the compiled output rather than the source, because the package's
 * `.js` import specifiers only resolve for a bundler; plain Node needs the
 * emitted JavaScript. `npm run seo:audit` builds it first.
 */
import { runCli } from "../packages/seo-core/dist/index.js";

process.exitCode = await runCli(process.argv.slice(2));
