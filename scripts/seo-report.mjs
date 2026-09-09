#!/usr/bin/env node
/** Thin entry point; all logic lives in services/seo-worker so it is testable. */
import { runReportCli } from "../services/seo-worker/dist/report/cli.js";

process.exitCode = await runReportCli(process.argv.slice(2));
