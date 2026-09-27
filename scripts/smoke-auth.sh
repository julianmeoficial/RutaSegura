#!/usr/bin/env bash
# Pruebas smoke de autenticación contra el entorno Docker Compose.
# Levanta (o reutiliza) app, PostgreSQL, Redis y migraciones, limpia los
# contadores de rate limit de ejecuciones anteriores y corre la suite.
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "Falta .env en la raíz. Cópialo desde .env.example." >&2
  exit 1
fi

port="$(grep -E '^APP_HOST_PORT=' .env | cut -d= -f2 || true)"
port="${port:-3000}"

docker compose up -d --build --wait rutasegura

docker compose exec -T redis sh -c \
  "redis-cli --scan --pattern 'rl:*' | xargs -r redis-cli del > /dev/null"

SMOKE_BASE_URL="http://localhost:${port}" pnpm --filter @rutasegura/app test:smoke

echo
echo "Eventos de autenticación registrados (evidencia de la bitácora):"
docker compose exec -T postgres psql -U rutasegura -d rutasegura -c \
  "select type, count(*) from auth_events group by type order by type;"
