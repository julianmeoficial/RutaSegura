#!/bin/sh
# Prepara MinIO para desarrollo y pruebas (servicio minio-init de Docker Compose):
# bucket privado sin acceso anónimo, cuenta de la app con solo lectura y los
# documentos ficticios de la semilla. Se puede ejecutar varias veces.
set -eu

: "${STORAGE_BUCKET:?Falta STORAGE_BUCKET}"
: "${STORAGE_ACCESS_KEY_ID:?Falta STORAGE_ACCESS_KEY_ID}"
: "${STORAGE_SECRET_ACCESS_KEY:?Falta STORAGE_SECRET_ACCESS_KEY}"

mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" > /dev/null

mc mb --ignore-existing "local/$STORAGE_BUCKET"
# Ninguna política anónima: sin firma, cualquier GET o listado responde 403.
mc anonymous set none "local/$STORAGE_BUCKET"

# La app solo firma descargas: le basta lectura.
mc admin user add local "$STORAGE_ACCESS_KEY_ID" "$STORAGE_SECRET_ACCESS_KEY" > /dev/null
mc admin policy attach local readonly --user "$STORAGE_ACCESS_KEY_ID" > /dev/null 2>&1 || true

# Clave de objeto opaca: el nombre del archivo sin extensión, bajo documents/.
for file in /seed/*.pdf; do
  [ -e "$file" ] || continue
  key="documents/$(basename "$file" .pdf)"
  mc cp --quiet --attr "Content-Type=application/pdf" "$file" "local/$STORAGE_BUCKET/$key" > /dev/null
done

echo "Política anónima del bucket:"
mc anonymous get "local/$STORAGE_BUCKET"
echo "Objetos en el bucket privado: $(mc ls --recursive "local/$STORAGE_BUCKET" | wc -l)"
