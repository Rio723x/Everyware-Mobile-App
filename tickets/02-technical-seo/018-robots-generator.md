# T-02-018 — `/robots.txt` generator; retire the hand-written files

**Spec:** 02-technical-seo §5.2, §5.3
**Depends on:** T-02-017
**Estimate:** ~1h

## What to build

1. `packages/seo-core/src/robots.ts` — `buildRobotsTxt(config): string` emitting exactly the
   document in Spec 02 §5.2: a permissive `User-agent: *` group, the seven preserved AI-crawler
   groups from `AI_USER_AGENTS`, and the `Sitemap:` line. The meaningless `Allow: /#info` and
   `Allow: /#experiences` directives are dropped — robots.txt matching ignores fragments.
2. `apps/blog/src/pages/robots.txt.ts` — the Astro endpoint, prerendered to `dist/robots.txt`.
3. **Delete `apps/site/public/sitemap.xml` and `apps/site/public/robots.txt`** in the same commit.
   Leaving them causes a dist-merge collision, which T-01-016 turns into a hard build failure — so
   the two cannot coexist even by accident. That collision is the safety net; deletion is the fix.

## Acceptance criteria

- [ ] `dist/robots.txt` contains `Sitemap: https://everyware.in/sitemap.xml` exactly once.
- [ ] All seven preserved user-agents (GPTBot, ChatGPT-User, PerplexityBot, ClaudeBot,
      Google-Extended, Bytespider, Amazonbot) are present with `Allow: /`.
- [ ] The `User-agent: *` group does not contain `Disallow: /`.
- [ ] No line contains `#` as a path fragment directive.
- [ ] `apps/site/public/robots.txt` and `apps/site/public/sitemap.xml` no longer exist in the repo.
- [ ] `npm run build` completes with zero merge collisions.
- [ ] The generated file lists the seven user-agents in the order given by `AI_USER_AGENTS`, and
      removing one from that constant removes it from the output — proving the two are wired
      together rather than independently hardcoded. Restore the constant afterwards.

## Status

Not started
