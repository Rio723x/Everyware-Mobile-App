import {
  SITE_RULES,
  auditSite,
  httpPageSource,
  isUnreadable,
  type PageAudit,
  type SiteAudit,
} from "@everyware/seo-core";
import { waitForDeploy, type DeployWaitConfig } from "./deploy-wait.js";

export type ValidationStatus = "validated" | "deploy-timeout" | "fetch-failed" | "skipped";

export interface ArticleValidation {
  readonly status: ValidationStatus;
  readonly audit: PageAudit | null;
}

export interface ValidatorConfig {
  readonly baseUrl?: string;
  readonly fetch?: typeof globalThis.fetch;
  readonly deployWait?: DeployWaitConfig;
  /** Skip the deploy wait, for a validation that is not following an edit. */
  readonly skipDeployWait?: boolean;
}

/**
 * Grades the live site with spec 02's rules.
 *
 * Deliberately thin. The rules already exist in `packages/seo-core`, and
 * reimplementing even one of them here would mean the gate that blocks a build
 * and the validator that grades production could disagree about what "correct"
 * means - at which point neither is trustworthy. This module fetches and wires;
 * it decides nothing.
 */
export const createValidator = (config: ValidatorConfig = {}) => {
  const baseUrl = config.baseUrl ?? process.env["PUBLIC_SITE_URL"] ?? "https://everyware.in";

  const auditPaths = async (paths: readonly string[]): Promise<SiteAudit> => {
    const input = await httpPageSource(paths, {
      baseUrl,
      ...(config.fetch === undefined ? {} : { fetch: config.fetch }),
    });
    return auditSite(input, SITE_RULES);
  };

  return {
    /**
     * Validates one article, after confirming the deploy carries the edit.
     */
    async validateArticle(slug: string, expectedModifiedAt: string): Promise<ArticleValidation> {
      const path = `/blog/${slug}`;
      const url = `${baseUrl}${path}`;

      if (config.skipDeployWait !== true) {
        const waited = await waitForDeploy(url, expectedModifiedAt, {
          ...(config.fetch === undefined ? {} : { fetch: config.fetch }),
          ...config.deployWait,
        });
        if (waited.status === "timeout") {
          // Reporting the timeout rather than grading whatever is currently
          // deployed: a report about the previous version of an article is
          // indistinguishable from a correct one, and therefore worse than none.
          return { status: "deploy-timeout", audit: null };
        }
      }

      const result = await auditPaths([path]);
      const audit = result.pages[0];
      if (audit === undefined) {
        return { status: "fetch-failed", audit: null };
      }
      // Asked of the audit rather than sniffed from a message string: the
      // engine already knows whether any rule was able to run.
      if (isUnreadable(audit)) {
        return { status: "fetch-failed", audit };
      }
      return { status: "validated", audit };
    },

    /**
     * Site-level validation: sitemap completeness, canonical uniqueness,
     * orphan detection. Run on publish and delete, the events that change the
     * URL set.
     */
    async validateSite(paths: readonly string[]): Promise<SiteAudit> {
      return auditPaths(paths);
    },
  };
};

export type Validator = ReturnType<typeof createValidator>;
