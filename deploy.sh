#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "[deploy] Pulling latest changes..."
git pull origin production

echo "[deploy] Pulling private providers..."
if [ -d "private-providers/.git" ]; then
  git -C private-providers pull origin main
else
  git clone https://github.com/xp-technologies-dev/private-providers private-providers
fi

echo "[deploy] Installing dependencies..."
pnpm i

echo "[deploy] Building..."
pnpm build

echo "[deploy] Restarting pm2..."
pm2 restart pstream

echo "[deploy] Done."
