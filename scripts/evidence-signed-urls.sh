#!/usr/bin/env bash
# Evidencia reproducible de que los documentos no son públicos (docs/documentos.md).
# Contra el entorno Docker Compose: revisa la política del bucket en MinIO,
# intenta leerlo sin firma y recorre el ciclo de vida de una URL firmada que
# emite la app, hasta que vence. Sale con error si algo no se comporta así.
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "Falta .env en la raíz. Cópialo desde .env.example." >&2
  exit 1
fi

env_value() { grep -E "^$1=" .env | cut -d= -f2- || true; }
port="$(env_value APP_HOST_PORT)"
app="http://localhost:${port:-3000}"
storage="$(env_value STORAGE_PUBLIC_ENDPOINT)"
storage="${storage:-http://localhost:9000}"
bucket="$(env_value STORAGE_BUCKET)"
ip="198.51.100.77"
jar="$(mktemp)"
trap 'rm -f "$jar"' EXIT

failures=0
check() {
  local label="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    printf '  OK    %-58s %s\n' "$label" "$actual"
  else
    printf '  FALLA %-58s esperado %s, recibido %s\n' "$label" "$expected" "$actual"
    failures=$((failures + 1))
  fi
}
status() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
json() { node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(eval('JSON.parse(s)'+process.argv[1])))" "$1"; }
api() {
  local method="$1" path="$2" body="${3:-}"
  curl -s -X "$method" "$app$path" -b "$jar" -c "$jar" \
    -H "origin: $app" -H "x-forwarded-for: $ip" \
    ${body:+-H "content-type: application/json" --data "$body"}
}

docker compose up -d --wait rutasegura > /dev/null 2>&1

echo "== 1. Configuración del bucket en MinIO"
docker compose exec -T minio sh -c '
  mc alias set local http://localhost:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" > /dev/null
  mc anonymous get "local/'"$bucket"'"
  echo "Política anónima (JSON): $(mc anonymous get-json "local/'"$bucket"'" | tr -d "\n ")"
'
app_put="$(docker compose exec -T minio sh -c '
  mc alias set app http://localhost:9000 "'"$(env_value STORAGE_ACCESS_KEY_ID)"'" "'"$(env_value STORAGE_SECRET_ACCESS_KEY)"'" > /dev/null
  echo x | mc pipe "app/'"$bucket"'/documents/escritura-no-permitida" > /dev/null 2>&1 && echo permitido || echo denegado
')"
check "La cuenta de la app no puede escribir en el bucket" "denegado" "$app_put"

echo
echo "== 2. Acceso anónimo directo al almacenamiento ($storage)"
key="$(docker compose exec -T postgres psql -At -U rutasegura -d rutasegura -c \
  "select object_key from documents order by created_at limit 1;")"
check "GET objeto sin firma (/$bucket/documents/…)" 403 "$(status "$storage/$bucket/$key")"
check "Listado del bucket sin firma (/$bucket)" 403 "$(status "$storage/$bucket")"
check "Listado ListObjectsV2 sin firma (?list-type=2)" 403 "$(status "$storage/$bucket?list-type=2")"
check "Listado de buckets sin firma (/)" 403 "$(status "$storage/")"

echo
echo "== 3. URL firmada emitida por la app"
# Guía ficticia de la prueba smoke: se restablece para poder reclamarla.
docker compose exec -T redis sh -c \
  "redis-cli --scan --pattern 'rl:*' | xargs -r redis-cli del > /dev/null"
docker compose exec -T postgres psql -q -U rutasegura -d rutasegura -c \
  "delete from shipments where tracking_number = 'RS0000000003';"
docker compose run --rm migrate > /dev/null 2>&1

email="evidencia.$(date +%s)@evidence.test"
password="caballo-bateria-grapa-ev"
api POST /api/v1/auth/register "{\"fullName\":\"Evidencia\",\"email\":\"$email\",\"password\":\"$password\"}" > /dev/null
api POST /api/v1/auth/login "{\"email\":\"$email\",\"password\":\"$password\"}" > /dev/null
shipment="$(api POST /api/v1/shipments/claim '{"trackingNumber":"RS0000000003","phoneLast4":"5555"}' | json .id)"
document="$(api GET "/api/v1/shipments/$shipment/documents" | json '.documents[0].id')"
signed="$(api POST "/api/v1/documents/$document/download-url")"
url="$(json .url <<< "$signed")"
expires_in="$(json .expiresIn <<< "$signed")"

with_param() {
  node -e 'const u=new URL(process.argv[1]);u.searchParams.set(process.argv[2],process.argv[3]);console.log(u.href)' "$url" "$1" "$2"
}
signature="$(node -e 'console.log(new URL(process.argv[1]).searchParams.get("X-Amz-Signature"))' "$url")"
echo "  URL firmada (firma oculta): $(with_param X-Amz-Signature '…')"
check "TTL informado por la API (expiresIn)" 60 "$expires_in"
check "X-Amz-Expires de la firma" 60 "$(node -e 'console.log(new URL(process.argv[1]).searchParams.get("X-Amz-Expires"))' "$url")"
check "GET con la firma vigente" 200 "$(status "$url")"
headers="$(curl -s -D - -o /dev/null "$url" | tr -d '\r')"
check "Content-Disposition" "attachment" \
  "$(grep -i '^content-disposition:' <<< "$headers" | cut -d' ' -f2 | cut -d';' -f1)"
check "Cache-Control" "no-store" "$(grep -i '^cache-control:' <<< "$headers" | cut -d' ' -f2)"
check "GET de la misma ruta sin la firma" 403 "$(status "${url%%\?*}")"
flipped="$([[ "${signature:0:1}" == 0 ]] && echo 1 || echo 0)${signature:1}"
check "GET con la firma alterada (un carácter)" 403 "$(status "$(with_param X-Amz-Signature "$flipped")")"
check "GET con el plazo ampliado a 7 días" 403 "$(status "$(with_param X-Amz-Expires 604800)")"

wait_s=$((expires_in + 2))
echo "  Esperando ${wait_s} s a que venza la firma…"
sleep "$wait_s"
expired_body="$(curl -s "$url")"
check "GET con la firma vencida" 403 "$(status "$url")"
check "Código de error de MinIO al vencer" "AccessDenied" \
  "$(sed -n 's:.*<Code>\(.*\)</Code>.*:\1:p' <<< "$expired_body")"
echo "  Mensaje de MinIO: $(sed -n 's:.*<Message>\(.*\)</Message>.*:\1:p' <<< "$expired_body")"

echo
echo "== 4. Bitácora: cada URL emitida queda registrada"
docker compose exec -T postgres psql -U rutasegura -d rutasegura -c \
  "select type, count(*) from shipment_audit_events where type = 'document_url_issued' group by type;"

if ((failures > 0)); then
  echo "Evidencia incompleta: $failures comprobaciones fallaron." >&2
  exit 1
fi
echo "Todas las comprobaciones pasaron."
