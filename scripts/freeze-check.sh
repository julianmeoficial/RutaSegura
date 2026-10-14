#!/usr/bin/env bash
# Verificación del freeze para pentest (docs/pentest-freeze.md).
#
# Corre las mismas etapas que CI y el smoke de UI contra la imagen de
# producción, revisa que no haya defectos críticos abiertos en
# docs/smoke-ui.md e imprime el commit y la imagen verificados.
#
#   ./scripts/freeze-check.sh          Solo verifica.
#   ./scripts/freeze-check.sh --tag    Verifica y, si todo pasa con el árbol
#                                      limpio, crea el tag anotado y la rama
#                                      de freeze (no los publica).
set -uo pipefail

cd "$(dirname "$0")/.."

create_tag=false
case "${1:-}" in
  "") ;;
  --tag) create_tag=true ;;
  *)
    echo "Uso: $0 [--tag]" >&2
    exit 2
    ;;
esac

if [[ ! -f .env ]]; then
  echo "Falta .env en la raíz. Cópialo desde .env.example." >&2
  exit 1
fi

version="$(node -p "require('./apps/rutasegura/package.json').version")"
tag="v${version}-pentest"
branch="release/pentest-v${version}"
export APP_BUILD_TARGET=runner

names=()
results=()
failed=0

stage() {
  local name="$1"
  shift
  echo
  echo "==> ${name}"
  local start=$SECONDS
  if "$@"; then
    results+=("OK     $(printf '%4ss' $((SECONDS - start)))")
  else
    results+=("FALLO  $(printf '%4ss' $((SECONDS - start)))")
    failed=1
  fi
  names+=("$name")
}

critical_defects() {
  local open
  open="$(grep -E '^\*\*Defectos críticos abiertos: [0-9]+\*\*$' docs/smoke-ui.md | grep -oE '[0-9]+' || true)"
  if [[ -z "$open" ]]; then
    echo "docs/smoke-ui.md no tiene la línea 'Defectos críticos abiertos: N'." >&2
    return 1
  fi
  echo "Defectos críticos abiertos: ${open}"
  [[ "$open" == "0" ]]
}

stage "Formato" pnpm format:check
stage "Lint" pnpm lint
stage "Typecheck" pnpm typecheck
stage "Pruebas unitarias" pnpm test
stage "Build de producción" pnpm build
stage "Smoke de API (imagen runner)" ./scripts/smoke-auth.sh
stage "Evidencia de URLs firmadas" ./scripts/evidence-signed-urls.sh
stage "Smoke de UI (imagen runner)" ./scripts/e2e-flows.sh
stage "Defectos críticos" critical_defects

sha="$(git rev-parse HEAD)"
dirty="$(git status --porcelain)"
container="$(docker compose ps -q rutasegura 2>/dev/null || true)"
image="$(docker inspect --format '{{.Image}}' "$container" 2>/dev/null || echo "sin contenedor")"

echo
echo "================ Freeze para pentest ================"
echo "Versión:   ${version}"
echo "Rama:      $(git rev-parse --abbrev-ref HEAD)"
if [[ -n "$dirty" ]]; then
  echo "Commit:    ${sha} + $(wc -l <<<"$dirty" | tr -d ' ') archivos sin commit"
else
  echo "Commit:    ${sha}"
fi
echo "Imagen:    ${image} (target runner)"
echo "Fecha:     $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo
for i in "${!names[@]}"; do
  printf '  %s  %s\n' "${results[$i]}" "${names[$i]}"
done
echo

if [[ $failed -ne 0 ]]; then
  echo "Resultado: FALLO. No se congela la versión."
  exit 1
fi
echo "Resultado: OK."

if [[ "$create_tag" != true ]]; then
  echo "Sin --tag: no se crea el tag ${tag} ni la rama ${branch}."
  exit 0
fi

if [[ -n "$dirty" ]]; then
  echo "El árbol tiene cambios sin commit: el tag debe apuntar a un commit verificado." >&2
  exit 1
fi
if git rev-parse -q --verify "refs/tags/${tag}" >/dev/null; then
  echo "El tag ${tag} ya existe. Una versión congelada no se mueve: usa un hotfix y una versión nueva." >&2
  exit 1
fi
if git rev-parse -q --verify "refs/heads/${branch}" >/dev/null; then
  echo "La rama ${branch} ya existe." >&2
  exit 1
fi

git tag -a "$tag" -m "Freeze para pentest ${version}

Commit verificado: ${sha}
Imagen runner: ${image}
Checklist: docs/pentest-freeze.md"
git branch "$branch" "$tag"
echo "Creados el tag ${tag} y la rama ${branch} sobre ${sha}."
echo "Publícalos con: git push origin ${tag} ${branch}"
