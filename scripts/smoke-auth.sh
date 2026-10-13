#!/usr/bin/env bash
# Pruebas smoke contra el entorno Docker Compose.
# Levanta (o reutiliza) app, PostgreSQL, Redis, MinIO y migraciones, limpia los
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

# Por defecto, la imagen de producción, la misma que recibe el pentest.
export APP_BUILD_TARGET="${APP_BUILD_TARGET:-runner}"
echo "Imagen de la app: ${APP_BUILD_TARGET}"

docker compose up -d --build --wait rutasegura

docker compose exec -T redis sh -c \
  "redis-cli --scan --pattern 'rl:*' | xargs -r redis-cli del > /dev/null"

# Solo datos ficticios de la semilla: se borran (sus documentos caen en cascada)
# y se vuelven a sembrar para que cada ejecución pueda reclamarlos desde cero.
docker compose exec -T postgres psql -q -U rutasegura -d rutasegura -c \
  "delete from shipments where tracking_number like 'RS000000000_';"
docker compose run --rm migrate > /dev/null

SMOKE_BASE_URL="http://localhost:${port}" pnpm --filter @rutasegura/app test:smoke

echo
echo "Eventos de autenticación registrados (evidencia de la bitácora):"
docker compose exec -T postgres psql -U rutasegura -d rutasegura -c \
  "select type, count(*) from auth_events group by type order by type;"

echo "Bitácora de envíos y avisos simulados:"
docker compose exec -T postgres psql -U rutasegura -d rutasegura -c \
  "select type, count(*) from shipment_audit_events group by type order by type;" -c \
  "select kind, body, count(*) filter (where read_at is null) as unread, count(*) from notifications group by kind, body order by kind;"
