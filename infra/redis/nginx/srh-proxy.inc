# Shared proxy body for the SEO worker's Redis REST shim.
#
# Included from both the exact and the prefix location in ghost.conf: the store
# adapter POSTs to the base URL with no trailing slash, while a pipelined call
# would use a subpath, and a prefix location alone does not match the bare form.
#
# Each including location must, IN THIS ORDER, before including this file:
#
#   set $srh http://srh:80;     # the upstream
#   rewrite ... break;          # strip the /_srh prefix
#
# Both lines are the caller's because `rewrite ... break` halts the rewrite
# module for that location - a `set` placed after it silently never runs, and
# proxy_pass then fails with "invalid URL prefix in".
#
# The upstream goes through a variable so a restarted container is re-resolved
# through Docker's DNS rather than nginx caching a dead IP from startup. That is
# also why the prefix must be stripped by hand: a variable proxy_pass suppresses
# nginx's own prefix rewriting.

proxy_pass $srh;

proxy_http_version 1.1;
proxy_set_header Host              $host;
proxy_set_header X-Forwarded-Proto https;
proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
proxy_set_header X-Real-IP         $remote_addr;

# Never let this surface be indexed or cached by anything in between.
add_header X-Robots-Tag "noindex, nofollow, noarchive" always;
