# T-01-002 — Provision Ghost(Pro), de-index its frontend, seed real content

**Spec:** 01-foundation D4, §7
**Depends on:** none (ops task — run in parallel with 001; has external lead time)
**Estimate:** ~1.5h

## What to build

Stand up the CMS. No repository code changes.

1. Create the Ghost(Pro) Starter site, set its URL to `https://cms.everyware.in`, point the DNS CNAME.
2. Publication settings: title `Everyware Blog`, description, icon + logo from
   `apps/site/public/Everywware.webp`, accent colour `#00C4CC`, timezone `Asia/Kolkata`.
3. Invite admin + editor users. Create at least one author with a name, bio and avatar.
4. Create the initial public tags with **names and descriptions** (the description renders on the
   category page): `appliance-maintenance`, `buying-guides`, `service-costs`, `smart-home`.
5. Integrations → Add custom integration **"Everyware Web"**. Record the Content API URL and key,
   and the Admin API key (unused until Spec 03). Store them in the team password manager and in
   Vercel project env vars. Never commit them.
6. De-index the Ghost frontend: enable *Settings → Advanced → Make this site private*, or serve
   `Disallow: /` plus `X-Robots-Tag: noindex` from that host.
7. Publish **3 real posts**, each with a feature image **with alt text**, a `custom_excerpt`,
   at least one public tag, an author, and body headings starting at H2 (never H1).

## Acceptance criteria

- [ ] `curl -sI https://cms.everyware.in/ | grep -i x-robots-tag` shows `noindex`.
- [ ] `curl -s https://cms.everyware.in/robots.txt` contains `Disallow: /`.
- [ ] `curl -s "https://cms.everyware.in/ghost/api/content/posts/?key=$KEY&limit=all"` returns
      3 published posts.
- [ ] Every returned post has non-empty `feature_image`, `feature_image_alt`, `custom_excerpt`,
      at least one non-`hash-` tag, and a primary author.
- [ ] No returned post's `html` contains `<h1`.
- [ ] `GHOST_CONTENT_API_URL` and `GHOST_CONTENT_API_KEY` are set in the Vercel project.

## Status

Not started
