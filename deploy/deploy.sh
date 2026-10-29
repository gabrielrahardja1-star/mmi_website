#!/usr/bin/env bash
# Deploy or update the site on the VPS. Run from anywhere:  /opt/mmi_website/deploy/deploy.sh
# Pulls the latest code, rebuilds, applies database migrations, restarts, and waits until it is healthy.
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] || { echo "Missing .env. Copy deploy/env.production.example to .env and fill it in."; exit 1; }
mkdir -p uploads && chown 1000:1000 uploads   # the container runs as uid 1000 and must be able to write here

git pull --ff-only
# The tools image is behind a compose profile, so name it, or migrations would run from stale code.
docker compose --profile tools build
docker compose run --rm tools npm run db:migrate
docker compose up -d

echo "Waiting for the app to become healthy..."
for _ in $(seq 1 30); do
  status=$(docker inspect -f '{{.State.Health.Status}}' mmi_website_app 2>/dev/null || echo starting)
  if [ "$status" = "healthy" ]; then
    echo "Healthy. Running the post-deploy checks..."
    exec "$(dirname "$0")/verify.sh"
  fi
  sleep 2
done
echo "The app did not become healthy. Look at the logs:  docker compose logs --tail 80 app"
exit 1
