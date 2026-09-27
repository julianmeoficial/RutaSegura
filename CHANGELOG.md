# Changelog

Todos los cambios relevantes de RutaSegura se registran aquí. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa [versionado semántico](https://semver.org/lang/es/).

## [Unreleased]

### Añadido

- Sprint 1, autenticación en el servidor (OWASP A07):
  - `POST /api/v1/auth/register`, `login`, `refresh`, `logout` y `GET /api/v1/auth/me`.
  - Contraseñas con Argon2id (19 MiB, t=2, p=1) y política NIST de 12 a 128 caracteres.
  - Bloqueo progresivo por cuenta: 5 fallos, 5 min que se duplican hasta 1 h.
  - JWT HS256 de 15 min y refresh token rotativo con detección de reutilización, en cookies `HttpOnly; SameSite=Lax` (`Secure` y `__Host-` sobre HTTPS).
  - Rechazo de mutaciones de la API desde otro origen en `proxy.ts`.
- Rastreo de doble dato (OWASP A01): `POST /api/v1/tracking` con número de guía y últimos 4 dígitos del teléfono, guardados como HMAC; respuesta 404 uniforme.
- Rate limiting en Redis por IP, correo y guía, con 429, `Retry-After` y cabeceras `RateLimit-*`.
- Bitácora `auth_events` sin datos personales en claro.
- Esquema de base de datos y primera migración (`users`, `sessions`, `auth_events`, `shipments`, `shipment_events`), semilla idempotente con guías ficticias y servicio `migrate` en Compose.
- Pruebas smoke de autenticación contra Docker (`pnpm test:smoke`) y job de CI `Smoke auth en Docker`.
- `docs/autenticacion.md` y endpoints nuevos en `docs/api.md`.
- Documentación en `docs/`: arquitectura, API, paquetes, seguridad, compatibilidad con WebKit y Chromium, y guía de desarrollo, con diagramas de los flujos principales.
- Este CHANGELOG.
- Tipo de rama `docs/` en la convención de ramas.

### Cambiado

- `SESSION_TTL_SECONDS` pasa a ser la vida de la sesión de refresh (8 h por defecto); nuevas variables `ACCESS_TOKEN_TTL_SECONDS`, `LOCKOUT_*`, `LOGIN_RATE_LIMIT_*` y `REGISTER_RATE_LIMIT_*`.
- El README se reduce a la descripción, el arranque rápido y los scripts; el resto se mueve a `docs/`.
- `CODEOWNERS` incluye a Mónica y a Julián en todas las reglas para que cada PR pida la revisión cruzada ([#2](https://github.com/julianmeoficial/RutaSegura/pull/2), pendiente de aprobación).

### Corregido

- El diagrama de ramas de `docs/desarrollo.md` pasa de `gitGraph` a `flowchart`, que también se dibuja en visores con versiones antiguas de Mermaid.

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
