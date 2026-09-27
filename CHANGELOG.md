# Changelog

Todos los cambios relevantes de RutaSegura se registran aquí. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa [versionado semántico](https://semver.org/lang/es/).

## [Unreleased]

### Añadido

- Documentación en `docs/`: arquitectura, API, paquetes, seguridad, compatibilidad con WebKit y Chromium, y guía de desarrollo, con diagramas de los flujos principales.
- Este CHANGELOG.
- Tipo de rama `docs/` en la convención de ramas.

### Cambiado

- El README se reduce a la descripción, el arranque rápido y los scripts; el resto se mueve a `docs/`.
- `CODEOWNERS` incluye a Mónica y a Julián en todas las reglas para que cada PR pida la revisión cruzada ([#2](https://github.com/julianmeoficial/RutaSegura/pull/2), pendiente de aprobación).

## [0.1.0] - 2026-09-27

Base técnica del Sprint 0 hasta la API ([#1](https://github.com/julianmeoficial/RutaSegura/pull/1)).

### Añadido

- Monorepo pnpm con la aplicación Next.js 16 `apps/rutasegura` y los paquetes `contracts`, `database` y `config`.
- `GET /api/v1/health`, que comprueba PostgreSQL y Redis con un tiempo límite de 2 s y responde `200` o `503` sin detalles internos.
- 404 JSON genérico para cualquier ruta de API sin handler.
- Códigos de error públicos con un mensaje fijo por código.
- CSP con nonce por petición y `strict-dynamic`, sin `unsafe-inline` ni `unsafe-eval` en producción.
- HSTS con `preload` sobre HTTPS; COOP, COEP y CORP; `Permissions-Policy` restrictiva; `no-store` en la API; `noindex` fuera de producción.
- Validación de variables de entorno con Zod; en producción el proceso termina si hay secretos de ejemplo o la URL no usa HTTPS.
- Logs JSON que reducen los errores a su tipo, sin cadenas de conexión.
- Docker Compose con la app, PostgreSQL 17 y Redis 7, y puertos configurables.
- Dockerfile con imagen `standalone` que corre sin root.
- CI en GitHub Actions: formato, lint, typecheck, pruebas unitarias, build y Playwright en Chromium, WebKit y WebKit iPhone.
- Plantilla de PR con checklist de seguridad y `CODEOWNERS`.

### Seguridad

- Sin cabeceras `X-Powered-By`, `Server` ni `ETag`.
- PostgreSQL y Redis publicados solo en `127.0.0.1`.
- pnpm solo permite scripts de instalación a `esbuild` y `unrs-resolver`.

[Unreleased]: https://github.com/julianmeoficial/RutaSegura/compare/acd29ee...HEAD
[0.1.0]: https://github.com/julianmeoficial/RutaSegura/pull/1
