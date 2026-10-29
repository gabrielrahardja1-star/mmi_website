#!/usr/bin/env bash
# Backs up the database AND the uploaded photos (a database backup alone does not include the photos).
# Writes to /opt/mmi_website/backups and keeps the newest 14 of each. Run it by hand, or from cron:
#   17 2 * * *  /opt/mmi_website/deploy/backup.sh >> /opt/mmi_website/backups/backup.log 2>&1
# Copy /opt/mmi_website/backups somewhere OFF this server too, or one disk failure loses everything.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a

PG_CONTAINER="${PG_CONTAINER:-mmi-postgres}"
KEEP="${KEEP:-14}"
re='^postgres(ql)?://([^:]+):([^@]+)@[^/]+/(.+)$'
[[ "$DATABASE_URL" =~ $re ]] || { echo "Cannot read DATABASE_URL from .env"; exit 1; }
DBUSER="${BASH_REMATCH[2]}"; DBPASS="${BASH_REMATCH[3]}"; DBNAME="${BASH_REMATCH[4]}"

mkdir -p backups
stamp=$(date +%Y%m%d-%H%M%S)

docker exec -e PGPASSWORD="$DBPASS" "$PG_CONTAINER" pg_dump -U "$DBUSER" -d "$DBNAME" --no-owner --clean --if-exists | gzip > "backups/db-$stamp.sql.gz"
tar czf "backups/uploads-$stamp.tar.gz" uploads

ls -1t backups/db-*.sql.gz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm --
ls -1t backups/uploads-*.tar.gz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm --
echo "$(date -Is) backup ok: db-$stamp.sql.gz ($(du -h "backups/db-$stamp.sql.gz" | cut -f1)), uploads-$stamp.tar.gz ($(du -h "backups/uploads-$stamp.tar.gz" | cut -f1))"
