#!/usr/bin/env bash
# Flujos críticos de la UI (auth, agenda, documentos) en Chromium y WebKit
# contra el entorno Docker Compose completo, MinIO incluido.
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "Falta .env en la raíz. Cópialo desde .env.example." >&2
  exit 1
fi

port="$(grep -E '^APP_HOST_PORT=' .env | cut -d= -f2 || true)"
port="${port:-3000}"

# Por defecto, la imagen de producción: así los flujos validan la CSP estricta
# y no la relajada de `next dev`. APP_BUILD_TARGET=development la sustituye.
export APP_BUILD_TARGET="${APP_BUILD_TARGET:-runner}"
echo "Imagen de la app: ${APP_BUILD_TARGET}"

docker compose up -d --build --wait rutasegura

docker compose exec -T redis sh -c \
  "redis-cli --scan --pattern 'rl:*' | xargs -r redis-cli del > /dev/null"

# Las guías de los flujos se restablecen (sin dueño ni franja) en cada ejecución.
docker compose exec -T postgres psql -q -U rutasegura -d rutasegura -c \
  "delete from shipments where tracking_number in ('RS0000000004', 'RS0000000005', 'RS0000000006', 'RS0000000007');"
docker compose run --rm migrate > /dev/null

E2E_BASE_URL="http://localhost:${port}" pnpm --filter @rutasegura/app test:e2e:flows "$@"
