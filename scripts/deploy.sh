#!/bin/bash
set -euo pipefail

APP_DIR="/opt/social-wall"
COMPOSE_FILE="$APP_DIR/docker-compose.yml"
ENV_FILE="$APP_DIR/.env"
LAST_GOOD_APP_TAG_FILE="$APP_DIR/.last-good-app-tag"
LAST_GOOD_REMBG_TAG_FILE="$APP_DIR/.last-good-rembg-tag"

GITHUB_REPOSITORY=$(grep "^GITHUB_REPOSITORY=" "$ENV_FILE" | cut -d '=' -f2)
NEW_APP_TAG="${APP_IMAGE_TAG}"
NEW_REMBG_TAG="${REMBG_IMAGE_TAG}"
APP_PORT=$(grep "^PORT=" "$ENV_FILE" | cut -d '=' -f2 || true)
REMBG_PORT=$(grep "^REMBG_PORT=" "$ENV_FILE" | cut -d '=' -f2 || true)
APP_PORT="${APP_PORT:-3000}"
REMBG_PORT="${REMBG_PORT:-5001}"

APP_IMAGE="ghcr.io/${GITHUB_REPOSITORY}"
REMBG_IMAGE="ghcr.io/${GITHUB_REPOSITORY}"

echo "=============================="
echo " Deploying app:   $APP_IMAGE:$NEW_APP_TAG"
echo " Deploying rembg: $REMBG_IMAGE:rembg-$NEW_REMBG_TAG"
echo "=============================="

docker pull "$APP_IMAGE:$NEW_APP_TAG"
docker pull "$REMBG_IMAGE:rembg-$NEW_REMBG_TAG"

sed -i "s|^APP_IMAGE_TAG=.*|APP_IMAGE_TAG=$NEW_APP_TAG|" "$ENV_FILE"
sed -i "s|^REMBG_IMAGE_TAG=.*|REMBG_IMAGE_TAG=$NEW_REMBG_TAG|" "$ENV_FILE"

# Start rembg first; it may need extra warm-up on first run.
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --no-deps rembg

# Start app separately so rembg health warm-up doesn't abort compose.
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --no-deps app

echo ">>> Waiting for health checks..."
for i in $(seq 1 15); do
    sleep 4

    if docker exec social-wall-rembg python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:${REMBG_PORT}/health', timeout=3)" >/dev/null 2>&1 \
      && docker exec social-wall-app wget -qO- http://localhost:${APP_PORT}/health >/dev/null 2>&1; then
        echo ">>> Health checks passed on attempt $i"
        echo "$NEW_APP_TAG" > "$LAST_GOOD_APP_TAG_FILE"
        echo "$NEW_REMBG_TAG" > "$LAST_GOOD_REMBG_TAG_FILE"
        echo ">>> Deployment successful."
        exit 0
    fi

    echo "    Attempt $i/15 failed, retrying..."
done

ROLLBACK_APP_TAG=$(cat "$LAST_GOOD_APP_TAG_FILE" 2>/dev/null || echo "latest")
ROLLBACK_REMBG_TAG=$(cat "$LAST_GOOD_REMBG_TAG_FILE" 2>/dev/null || echo "latest")

echo ">>> ERROR: Health check failed. Rolling back..."
echo ">>> App rollback tag:   $ROLLBACK_APP_TAG"
echo ">>> Rembg rollback tag: $ROLLBACK_REMBG_TAG"

sed -i "s|^APP_IMAGE_TAG=.*|APP_IMAGE_TAG=$ROLLBACK_APP_TAG|" "$ENV_FILE"
sed -i "s|^REMBG_IMAGE_TAG=.*|REMBG_IMAGE_TAG=$ROLLBACK_REMBG_TAG|" "$ENV_FILE"

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --no-deps rembg app

echo ">>> Rollback complete."
exit 1
