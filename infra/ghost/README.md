# Ghost CMS — self-hosted

Ghost is MIT-licensed and this directory is the complete deployment. The
Content API, Admin API and webhooks behave identically to the hosted plan, so
nothing in `packages/ghost`, `apps/blog` or `services/seo-worker` changes based
on where Ghost runs.

## Where it runs

The fixolutions services VM (`ssh deploy`, `~/services/ghost`), alongside
production Supabase, Gitea and Mattermost. That box already runs an **nginx
reverse proxy on the `proxy` Docker network** with `certbot` and
`/etc/letsencrypt` mounted, serving three domains that way — so Ghost is a
fourth vhost rather than new infrastructure.

Consequently this stack **binds no host ports**. nginx reaches Ghost by
container name over the `proxy` network, exactly as it reaches gitea. TLS, the
HTTP→HTTPS redirect and the de-indexing rules all live in
`nginx/cms.everyware.in.conf`.

```
internet → nginx :443  (existing, shared)
             │  proxy network
             ▼
          ghost :2368  ──ghost-internal──▶  ghost-db (MySQL 8)
```

## Bring it up

```bash
ssh deploy
cd ~/services/ghost
cp .env.example .env        # generate both passwords: openssl rand -base64 32
chmod 600 .env
docker compose up -d
docker compose logs -f ghost      # wait for "Ghost booted"
```

`GHOST_PUBLIC_URL` must be the public origin. Ghost writes it into every URL the
Content API returns, so getting it wrong poisons every canonical downstream.

## Publishing it at cms.everyware.in

Three steps, in this order. **Do not reorder them** — nginx refuses to start if
`ssl_certificate` points at a file that does not exist, and this box also serves
git, chat and api-dev, so a bad reload takes all three down.

1. **DNS.** Cloudflare A record `cms` → the VM's public IP, **grey cloud / DNS
   only**. Proxied records make certbot's HTTP-01 challenge unreachable.
2. **Certificate.**
   ```bash
   sudo certbot certonly --webroot -w /var/www/certbot -d cms.everyware.in
   ```
3. **vhost**, only once the cert exists:
   ```bash
   cp nginx/cms.everyware.in.conf ~/services/nginx/conf.d/
   docker exec nginx nginx -t && docker exec nginx nginx -s reload
   ```
   The `nginx -t` is not optional. If it fails, fix the config before reloading.

## Get the Content API key

Ghost admin → **Settings → Integrations → Add custom integration**, named
`Everyware Web`. Copy:

- **Content API key** → `GHOST_CONTENT_API_KEY` (used by the blog build)
- **API URL** → `GHOST_CONTENT_API_URL` (`https://cms.everyware.in`)
- **Admin API key** → store it, but nothing in this project uses it. Spec 03
  never writes to Ghost, which is what makes webhook loops structurally
  impossible rather than merely unlikely.

Set the first two in the Vercel project (all environments) and in a local
`.env.local` at the repo root.

## De-indexing — why it is at the proxy

Ghost renders a full public site of its own at `cms.everyware.in`. Left
indexable, it competes with `everyware.in/blog` for identical content and splits
the ranking signal across two URLs. The vhost handles it in two rules — a hard
`/robots.txt` override and `X-Robots-Tag: noindex` on every response — which is
more reliable than Ghost's own private-site toggle, because that toggle also
gates the Content API the blog build depends on.

Verify once the vhost is live:

```bash
curl -sI https://cms.everyware.in/ | grep -i x-robots-tag   # noindex, nofollow, noarchive
curl -s  https://cms.everyware.in/robots.txt                # User-agent: * / Disallow: /
```

## Resource footprint

Measured on the shared box, not estimated:

| Container | Memory | Limit |
|---|---|---|
| `ghost` | ~115 MiB | 512 MiB |
| `ghost-db` | ~184 MiB | 640 MiB |

MySQL is tuned down from its defaults (`innodb-buffer-pool-size=128M`,
`performance-schema=OFF`), which is worth roughly 400 MiB on a box with no swap.
The hard `mem_limit` on each container matters for the same reason: if Ghost
leaks, the OOM killer takes Ghost rather than choosing `supabase-db` by score.

**This host has no swap.** Adding 2 GB is cheap insurance and needs root:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## Backups

Two volumes hold everything: `ghost_ghost-content` (images, themes, settings)
and `ghost_db-data` (posts).

```bash
cd ~/services/ghost
docker compose exec -T db mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" ghost > ghost-$(date +%F).sql
docker run --rm -v ghost_ghost-content:/c -v "$PWD":/b alpine \
  tar czf /b/content-$(date +%F).tar.gz -C /c .
```

Ghost also exports posts as JSON from **Settings → Migration**, which is worth
doing before any upgrade.

## Upgrades

```bash
cd ~/services/ghost && docker compose pull && docker compose up -d
```

Ghost migrates its own schema on boot. Take a database dump first.

## Version note

Pinned to `ghost:5-alpine`. The Content API path this project calls,
`/ghost/api/content/`, is unchanged in Ghost 6, so moving the pin later needs no
code change — take a backup and read Ghost's major-version upgrade notes first.

## Staff sign-in verification is off, on purpose, for now

Ghost 5.130 emails a verification code on every staff sign-in from a new device.
This instance's mail transport is `Direct`, meaning the VM would deliver that
mail itself — and the host blocks outbound port 25, so the code never arrives.

The failure mode is worth stating plainly, because it does not look like an auth
problem: a **correct** password returns `500 EmailError: Failed to send email`,
while a wrong one returns `422 ValidationError: Your password is incorrect`. The
500 comes from a step *after* the password is accepted, so the account is not
locked — it is unreachable. Nobody can create a new session at all.

`security__staffDeviceVerification: "false"` in the compose environment restores
password-only sign-in. Ghost reads config through nconf, which layers env vars
over `config.production.json`, so the file on disk still reads `true` and only
behaviour reveals the override — check by signing in, not by reading the file.

### Finishing this properly

Password-only access to a publicly reachable admin panel is weaker than what was
there before, so this is half a fix. To complete it, set real SMTP credentials
and turn verification back on:

```yaml
mail__transport: SMTP
mail__options__host: smtp-relay.brevo.com   # or any provider
mail__options__port: 587
mail__options__auth__user: <user>
mail__options__auth__pass: <key>
mail__from: "Everyware <noreply@everyware.in>"
security__staffDeviceVerification: "true"
```

Working mail is worth having regardless: without it there is also no password
reset, so a forgotten password means editing the database by hand.
