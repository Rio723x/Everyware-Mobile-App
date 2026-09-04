# Ghost CMS — self-hosted

Ghost is MIT-licensed and this directory is the complete deployment. The
Content API, Admin API and webhooks behave identically to the hosted plan, so
nothing in `packages/ghost`, `apps/blog` or `services/seo-worker` changes based
on where Ghost runs.

## What you need

- A host with Docker and Docker Compose, reachable on ports 80 and 443.
- A DNS **A record** for `cms.everyware.in` pointing at that host's public IP,
  created *before* first boot — Caddy issues the TLS certificate on startup and
  needs the record to resolve.

## Bring it up

```bash
cd infra/ghost
cp .env.example .env
# Fill in both passwords:  openssl rand -base64 32
docker compose up -d
docker compose logs -f ghost      # watch for "Ghost server started"
```

Then open `https://cms.everyware.in/ghost/` and create the owner account. Do
this promptly: until it exists, anyone who reaches the URL can claim it.

## Get the Content API key

Ghost admin → **Settings → Integrations → Add custom integration**, named
`Everyware Web`. Copy:

- **Content API key** → `GHOST_CONTENT_API_KEY` (used by the blog build)
- **API URL** → `GHOST_CONTENT_API_URL` (`https://cms.everyware.in`)
- **Admin API key** → store it, but note that nothing in this project uses it.
  Spec 03 never writes to Ghost, which is what makes webhook loops structurally
  impossible rather than merely unlikely.

Set the first two in the Vercel project (all environments) and in a local
`.env.local` at the repo root.

## De-indexing — why it is here and not a Ghost setting

Ghost renders a full public site of its own at `cms.everyware.in`. Left
indexable, it competes with `everyware.in/blog` for identical content and splits
the ranking signal across two URLs. The `Caddyfile` handles it in two rules — a
hard `robots.txt` override and an `X-Robots-Tag: noindex` header on every
response — which is more reliable than Ghost's own private-site toggle, because
the toggle also gates the Content API the blog build depends on.

Verify both after first boot:

```bash
curl -sI https://cms.everyware.in/ | grep -i x-robots-tag   # noindex, nofollow, noarchive
curl -s  https://cms.everyware.in/robots.txt                # User-agent: * / Disallow: /
```

## Backups

Two volumes hold everything: `ghost-content` (images, themes, settings) and
`db-data` (posts). A nightly job that snapshots both is enough.

```bash
docker compose exec -T db mysqldump -u ghost -p"$MYSQL_PASSWORD" ghost > ghost-$(date +%F).sql
docker run --rm -v ghost_ghost-content:/c -v "$PWD":/b alpine tar czf /b/content-$(date +%F).tar.gz -C /c .
```

Ghost also exports posts as JSON from **Settings → Migration**, which is worth
doing before any upgrade.

## Upgrades

```bash
docker compose pull && docker compose up -d
```

Ghost migrates its own schema on boot. Take a database dump first.

## Version note

Pinned to `ghost:5-alpine`. The Content API path this project calls,
`/ghost/api/content/`, is unchanged in Ghost 6, so moving the pin later needs no
code change — take a backup and read Ghost's major-version upgrade notes first.
