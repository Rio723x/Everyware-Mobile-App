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

### Remaining

- [ ] **Cloudflare A record** `cms` → `35.207.232.124`, **grey cloud / DNS only**.
- [ ] **Certificate** (needs root): `sudo certbot certonly --webroot -w /var/www/certbot -d cms.everyware.in`
- [ ] **nginx vhost**, only after the cert exists: copy
      `~/services/ghost/nginx/cms.everyware.in.conf` into `~/services/nginx/conf.d/`,
      then `docker exec nginx nginx -t && docker exec nginx nginx -s reload`.
- [ ] Owner account, branding, tags, Content API key, 3 seed posts.
- [ ] Optional but recommended (needs root): 2 GB swapfile.

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
