#!/usr/bin/env bash
# Checks a running instance the way nginx and visitors will reach it. Safe to run any time (read-only).
# Defaults come from /opt/mmi_website/.env:  PUBLIC_HOST, CMS_HOST, APP_PORT.
#   deploy/verify.sh                        (checks http://127.0.0.1:$APP_PORT)
#   BASE=http://127.0.0.1:3199 deploy/verify.sh
set -uo pipefail
cd "$(dirname "$0")/.."
# Values given on the command line win over .env.
_pub="${PUBLIC_HOST:-}"; _cms="${CMS_HOST:-}"; _port="${APP_PORT:-}"
[ -f .env ] && { set -a; . ./.env; set +a; }
PUBLIC_HOST="${_pub:-${PUBLIC_HOST:-}}"; CMS_HOST="${_cms:-${CMS_HOST:-}}"; APP_PORT="${_port:-${APP_PORT:-}}"
BASE="${BASE:-http://127.0.0.1:${APP_PORT:-3140}}"
PUB="${PUBLIC_HOST:?PUBLIC_HOST is not set}"
CMS="${CMS_HOST:?CMS_HOST is not set}"

fail=0
expect() { # description, expected status, host, path
  local got; got=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 -H "Host: $3" "$BASE$4")
  if [ "$got" = "$2" ]; then printf 'ok    %s\n' "$1"; else printf 'FAIL  %s (wanted %s, got %s)\n' "$1" "$2" "$got"; fail=1; fi
}

echo "Checking $BASE as host $PUB and $CMS"
expect "app is healthy"                              200 "127.0.0.1" /api/health
for p in / /tentang /media /artikel /karir /en /en/tentang /en/media /en/artikel /en/karir; do
  expect "public page $p"                            200 "$PUB" "$p"
done
expect "unknown page gives the site's 404"          404 "$PUB" /no-such-page
expect "editor is NOT reachable from the public host"     404 "$PUB" /cms
expect "editor API is NOT reachable from the public host" 404 "$PUB" /api/content/news
expect "auth API is NOT reachable from the public host"   404 "$PUB" /api/auth/get-session
# These two only mean something against the container itself. Through nginx, an unknown Host header is
# answered by nginx's default vhost (another app), which is outside this app's control.
case "$BASE" in
  http://127.0.0.1*|http://localhost*)
    expect "an unknown host is refused"                  404 "evil.example.com" /
    expect "the server's raw IP is refused"              404 "76.13.19.246" /
    ;;
  *) echo "skip  unknown-host checks (they only apply when checking the container directly)" ;;
esac
expect "editor login page"                           200 "$CMS" /login
expect "editor is login-protected (redirects)"       307 "$CMS" /
expect "the public site is NOT served on the editor host" 404 "$CMS" /tentang

robots=$(curl -s --max-time 15 -H "Host: $PUB" "$BASE/robots.txt" | tr '\n' ' ')
case "$robots" in
  *"Disallow: /"*) echo "note  search engines are BLOCKED (SITE_INDEXABLE is not true). Correct until launch day." ;;
  *"Allow: /"*)    echo "note  search engines are ALLOWED (SITE_INDEXABLE=true). Correct only after launch." ;;
esac

[ "$fail" = 0 ] && echo "All checks passed." || echo "Some checks FAILED."
exit "$fail"
