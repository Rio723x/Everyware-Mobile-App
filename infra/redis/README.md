# Redis for the SEO worker

Backing store for the SEO worker's reports, idempotency claims, debounce marks
and rate-limit counters. Runs on the same VM as Ghost, in `~/services/redis/`.

## Why a REST shim and not plain Redis

The worker runs as a Vercel function. It has no persistent disk, and no
long-lived process to hold a connection pool — a TCP client would open a new
connection on every invocation. So the store adapter speaks HTTP.

The dialect it speaks is Upstash's REST API, because that is what
`UpstashRedisStore` implements. [`serverless-redis-http`][srh] is an open-source
server for that same dialect, so pointing the worker at this host instead of
Upstash is an environment variable change and nothing else. If this box ever
becomes the wrong place for it, hosted Upstash remains a drop-in swap.

[srh]: https://github.com/hiett/serverless-redis-http

## Why it lives at `cms.everyware.in/_srh`

It is mounted as a path on the existing Ghost vhost rather than given its own
subdomain. That buys two things on this particular box:

- No extra DNS record, which is a round-trip through whoever owns the zone.
- No fifth certificate. Certs here are issued with `certbot standalone`, which
  binds port 80 itself, so every renewal needs nginx stopped — and this host
  also serves git and chat. Fewer certs is materially less risk.

Access control is the `SRH_TOKEN` bearer, checked by the shim. Vercel functions
have no stable egress IP, so an IP allowlist is not an option; this is the same
posture hosted Upstash has.

## Layout

- `docker-compose.yml` — Redis plus the shim. Copy to `~/services/redis/`.
- `nginx/srh-proxy.inc` — shared proxy body. Copy to
  `~/services/nginx/conf.d/`. The `.inc` extension matters: nginx autoloads
  `conf.d/*.conf`, and this file is a fragment, not a server block.
- The two `location` blocks that include it live in
  `../ghost/nginx/ghost.conf`, since they belong to that server name.

Redis is deliberately not on the `proxy` network. Only the shim is reachable
from nginx, and only over the token-authenticated REST surface.

## Setup

```sh
mkdir -p ~/services/redis && cd ~/services/redis
# copy docker-compose.yml here
echo "SRH_TOKEN=$(openssl rand -hex 32)" > .env && chmod 600 .env
docker compose up -d
```

Then copy `nginx/srh-proxy.inc` and the updated `ghost.conf` into
`~/services/nginx/conf.d/` and reload — **never** without testing first, because
a bad reload on this box takes git and chat down with it:

```sh
docker exec nginx nginx -t && docker exec nginx nginx -s reload
```

## Verifying

```sh
TOKEN=$(grep SRH_TOKEN ~/services/redis/.env | cut -d= -f2)
curl -s -X POST https://cms.everyware.in/_srh \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '["SET","seo:smoke","ok","EX","60"]'
```

Expect `{"result":"OK"}`. A request with no token gets 400, a wrong token 401.

The behaviour the worker actually depends on is `SET NX`: the first call returns
`{"result":"OK"}` and a replay returns `{"result":null}`. That is what
`claimIdempotencyKey` reads to tell a genuine webhook from a redelivery.

## Vercel environment

```
SEO_STORE_DRIVER=redis
UPSTASH_REDIS_REST_URL=https://cms.everyware.in/_srh
UPSTASH_REDIS_REST_TOKEN=<SRH_TOKEN from ~/services/redis/.env>
```

Set these through the Vercel dashboard, not by piping into `vercel env add` from
PowerShell — that pipe prepends a UTF-8 BOM, which produced an `Invalid URL`
build failure the first time round.

## Operational notes

- `appendonly yes` with `noeviction`. Reports must survive a restart, and
  silently evicting one would be worse than a loud write failure.
- `maxmemory 128mb`, container limits 192m and 128m. Measured footprint is well
  under that; the box has roughly 1.3GB free with Ghost, Supabase, Gitea and
  Mattermost all running.
- Idempotency keys, debounce marks and counters all carry TTLs. Only reports and
  the content index accumulate, and both are small.
