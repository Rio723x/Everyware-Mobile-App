# T-01-002 — Deploy self-hosted Ghost, de-index it, seed real content

**Spec:** 01-foundation D4, §7
**Depends on:** none (ops task — run in parallel; DNS has propagation lead time)
**Estimate:** ~1.5h

## What to build

Stand up the CMS. Ghost is MIT-licensed and the whole deployment is committed at
`infra/ghost/` — compose file, Caddyfile, env template and README. **No
application code changes:** the Content API, Admin API and webhooks are identical
whether Ghost is self-hosted or hosted, so `packages/ghost`, `apps/blog` and
`services/seo-worker` are unaffected by this ticket.

1. Point a DNS **A record** for `cms.everyware.in` at a host running Docker,
   reachable on ports 80 and 443. Do this **first** — Caddy issues the TLS
   certificate on startup and needs the record to resolve.
2. On the host: `cd infra/ghost && cp .env.example .env`, fill both passwords
   with `openssl rand -base64 32`, then `docker compose up -d`.
3. Open `https://cms.everyware.in/ghost/` and create the owner account
   **promptly** — until it exists, anyone who reaches that URL can claim it.
4. Publication settings: title `Everyware Blog`, description, icon + logo from
   `apps/site/public/Everywware.webp`, accent `#00C4CC`, timezone `Asia/Kolkata`.
5. Invite admin + editor users; create at least one author with a name, bio and
   avatar.
6. Create the initial public tags with **names and descriptions** (the
   description renders on the category page): `appliance-maintenance`,
   `buying-guides`, `service-costs`, `smart-home`.
7. Integrations → Add custom integration **"Everyware Web"**. Put the Content API
   URL and key into the Vercel project env and a local `.env.local`. Store the
   Admin API key, but note nothing in this project uses it — spec 03 never writes
   to Ghost, which is what makes webhook loops structurally impossible.
8. Publish **3 real posts**, each with a feature image *with alt text*, a
   `custom_excerpt`, at least one public tag, an author, and body headings
   starting at H2 (never H1).
9. Set up the nightly backup of the `ghost-content` and `db-data` volumes per
   `infra/ghost/README.md`.

## Acceptance criteria

- [ ] `docker compose ps` shows `ghost`, `db` and `caddy` all running and healthy.
- [ ] `https://cms.everyware.in/ghost/` loads over valid TLS with no certificate warning.
- [ ] `curl -sI https://cms.everyware.in/ | grep -i x-robots-tag` shows `noindex`.
- [ ] `curl -s https://cms.everyware.in/robots.txt` contains `Disallow: /`.
- [ ] `curl -s "https://cms.everyware.in/ghost/api/content/posts/?key=$KEY&limit=all"`
      returns 3 published posts.
- [ ] Every returned post has non-empty `feature_image`, `feature_image_alt`,
      `custom_excerpt`, at least one non-`hash-` tag, and a primary author.
- [ ] No returned post's `html` contains `<h1`.
- [ ] `GHOST_CONTENT_API_URL` and `GHOST_CONTENT_API_KEY` are set in the Vercel project.
- [ ] A `mysqldump` and a content-volume archive both complete successfully, and
      the dump is non-empty.
- [ ] `.env` is **not** committed — `git status` shows it ignored.

## Status

**Partly done.** Ghost and MySQL are deployed and running on the fixolutions
services VM at `~/services/ghost`. Three items remain, all gated on DNS or root.

### Done

- [x] Stack deployed to `~/services/ghost`; `docker compose up -d` succeeded.
- [x] Ghost booted in 24s; `ghost-db` reports healthy.
- [x] nginx reaches Ghost by container name over the `proxy` network.
- [x] **No host ports bound** — verified; the only 0.0.0.0 bindings on the box
      are still supabase-pooler, supabase-envoy and nginx.
- [x] All 10 Supabase containers and nginx still healthy after the deploy.
- [x] Secrets generated on the VM with `openssl rand`, `.env` at mode 600,
      never committed and never passed through a developer machine.

### Also done — Ghost is live at https://cms.everyware.in

- [x] Cloudflare A record `cms` → `35.207.232.124`, DNS only.
- [x] Certificate issued via `certbot --standalone`, matching the pattern used by
      the four existing certs on this host. Expires **2026-12-05**.
- [x] vhost installed at `~/services/nginx/conf.d/ghost.conf`; `nginx -t` passed
      **before** the reload, guarded so an invalid config would have been removed
      rather than reloaded.
- [x] `https://cms.everyware.in/` → 200, `/ghost/` → 200, HTTP → HTTPS 301.
- [x] De-indexing verified: `X-Robots-Tag: noindex, nofollow, noarchive` and
      `robots.txt` serving `Disallow: /`.

### Remaining — needs a human in the Ghost admin UI

- [ ] Owner account at `https://cms.everyware.in/ghost/` — **claim it promptly**;
      until it exists anyone reaching that URL can take it.
- [ ] Branding, the four tags with descriptions, Content API key into Vercel.
- [ ] 3 seed posts, headings starting at H2.
- [ ] Optional: 2 GB swapfile.

### Two pre-existing issues found, not caused by this work

1. **`git` and `chat` were returning 502 before nginx was ever stopped**, and
   still are. Their backends are down; the proxy is fine. `api-dev` returns 401,
   which looks intentional.
2. **Renewal will fail unattended.** All five certs on this host, Ghost's
   included, use `authenticator = standalone` with no pre/post hooks, so
   `certbot renew` will try to bind port 80 while nginx holds it. Renewal
   currently requires `docker stop nginx && sudo certbot renew && docker start
   nginx`. Worth `sudo certbot renew --dry-run` to confirm, and worth moving the
   whole host to webroot — but that is shared infrastructure and not this
   ticket's call.

### Deviation from the spec, recorded

**Caddy is gone.** Spec 01 D4 assumed a dedicated host where Caddy could own
ports 80 and 443. This box already runs an nginx reverse proxy on those ports
serving git, chat and api-dev, with certbot and `/etc/letsencrypt` mounted. Ghost
therefore binds no host ports and becomes a fourth vhost, and the de-indexing
rules moved from the Caddyfile into `nginx/cms.everyware.in.conf`. Same two
rules, same verification commands.

### Measured, not estimated

Ghost 115 MiB and ghost-db 184 MiB — about 300 MiB total, against the ~750 MiB
I projected when arguing this box might be too small. The MySQL tuning
(`innodb-buffer-pool-size=128M`, `performance-schema=OFF`) accounts for most of
the gap. Available memory went 1,709 → 1,433 MiB. Swap is still worth adding as
a backstop, but the headroom concern was overstated.
