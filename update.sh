#!/bin/sh
# Update Budgeteer on this machine: get the latest code, rebuild the Docker image with the commit stamped in, restart it,
# and check the server is running the new build.   Run it from anywhere:  ./update.sh   (or sudo ./update.sh)
set -e
cd "$(dirname "$0")"
DC="docker compose"; $DC version >/dev/null 2>&1 || DC="docker-compose"

echo "Getting the latest code..."
if ! git pull --ff-only; then
  echo "Couldn't update the code: files in this folder were changed here. 'git status' shows which; 'git stash' sets them aside."
  exit 1
fi
REV=$(git rev-parse --short HEAD)

echo "Building $REV (a minute or two)..."
BUILD_REV=$REV $DC build
BUILD_REV=$REV $DC up -d

echo "Waiting for the server..."
RUN=""; i=0
while [ $i -lt 45 ]; do
  RUN=$(docker exec budgeteer node -e "fetch('http://127.0.0.1:8080/api/health',{headers:process.env.BASIC_AUTH?{authorization:'Basic '+Buffer.from(process.env.BASIC_AUTH).toString('base64')}:{}}).then(r=>r.json()).then(j=>process.stdout.write(j.rev||'unknown')).catch(()=>{})" 2>/dev/null || true)
  [ -n "$RUN" ] && break
  i=$((i+1)); sleep 2
done

if [ "$RUN" = "$REV" ]; then
  echo "Done: Budgeteer is running $REV. Reload the app (on a phone, close it and open it again)."
else
  echo "The server is running '${RUN:-nothing yet}', expected $REV. Its log: $DC logs --tail 50 budgeteer"
  exit 1
fi
