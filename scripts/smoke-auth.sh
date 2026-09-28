#!/usr/bin/env bash
# Pruebas smoke de autenticación contra el entorno Docker Compose.
# Levanta (o reutiliza) app, PostgreSQL, Redis y migraciones, limpia los
# contadores de rate limit de ejecuciones anteriores, restablece las guías
# ficticias (sin dueño ni franja) y corre la suite.
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

# Solo datos ficticios de la semilla: se borran y se vuelven a sembrar para que
# cada ejecución pueda reclamar RS0000000001 desde cero.
docker compose exec -T postgres psql -q -U rutasegura -d rutasegura -c \
  "delete from shipments where tracking_number in ('RS0000000001', 'RS0000000002');"
docker compose run --rm migrate > /dev/null

SMOKE_BASE_URL="http://localhost:${port}" pnpm --filter @rutasegura/app test:smoke

echo
echo "Eventos de autenticación registrados (evidencia de la bitácora):"
docker compose exec -T postgres psql -U rutasegura -d rutasegura -c \
  "select type, count(*) from auth_events group by type order by type;"

echo "Bitácora de envíos y avisos simulados:"
docker compose exec -T postgres psql -U rutasegura -d rutasegura -c \
  "select type, count(*) from shipment_audit_events group by type order by type;" -c \
  "select kind, body, count(*) from notifications group by kind, body order by kind;"
