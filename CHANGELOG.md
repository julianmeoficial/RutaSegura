# Changelog

Todos los cambios relevantes de RutaSegura se registran aquí. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa [versionado semántico](https://semver.org/lang/es/).

## [Unreleased](https://github.com/julianmeoficial/RutaSegura/compare/acd29ee...HEAD)

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
- Phase 9, agenda de entregas (OWASP A01 y A09), solo API:
  - `POST /api/v1/shipments/claim`, `GET /api/v1/shipments`, `GET /api/v1/shipments/{id}` y `PATCH /api/v1/shipments/{id}/schedule`.
  - `assertOwnership` por objeto; envío ajeno o inexistente responde `404 not_found`, sin sesión `401`.
  - Identificadores ULID en la API; el UUID interno no sale del servidor.
  - Franjas de 2 h de lunes a viernes en `America/Bogota`, con inicio estrictamente futuro; nuevo error `invalid_schedule`.
  - Migración `0001`: `owner_id`, `public_id`, `window_date` y `window_slot` en `shipments`; tablas `shipment_audit_events` y `notifications`; políticas RLS por `app.user_id` y `app.mode`.
  - Bitácora de envíos sin datos personales en claro y avisos simulados con cuerpo genérico.
  - Rate limit por usuario para listar, consultar y agendar (`SHIPMENTS_RATE_LIMIT_*`).
  - Casos smoke de IDOR: Bob recibe 404 sobre el envío de Alice.
- Notificaciones simuladas visibles por API (OWASP A01):
  - `GET /api/v1/notifications` (avisos del usuario de la sesión, `?limit=` de 1 a 50, con `unreadCount`) y `POST /api/v1/notifications/read`.
  - Migración `0002`: columna `read_at`, índice de no leídos y política RLS de `UPDATE` por `app.user_id`.
  - Rate limit por usuario (`NOTIFICATIONS_RATE_LIMIT_*`).
  - Casos smoke: sin sesión 401; Bob no ve ni marca los avisos de Alice; `?userId=` responde 400.
  - `docs/notificaciones.md`: guía para conectar los avisos a la UI del portal cuando lleguen diseño y frontend.
- Cancelación de la agenda (OWASP A01 y A09):
  - `DELETE /api/v1/shipments/{id}/schedule`: deja el envío sin franja; idempotente, `400 invalid_schedule` si ya está en reparto o entregado y `404 not_found` si es ajeno o no existe.
  - Migración `0003`: evento de bitácora `unscheduled` y tipo de aviso `shipment_unscheduled`.
  - Casos smoke: sin sesión 401; Bob recibe 404 al cancelar la agenda de Alice y la franja queda intacta; cancelación idempotente, bitácora y aviso genérico.
- Hardening transversal OWASP, parte de backend (A02, A03, A05 y A09):
  - CORS con allowlist de orígenes exactos (`CORS_ALLOWED_ORIGINS`), validada al arrancar: sin `*`, sin rutas y solo `https` en producción. Preflight 204 para orígenes permitidos y 403 para el resto, con `Vary: Origin` y sin cabeceras CORS para orígenes no listados.
  - Log de seguridad: `security.auth_failure` en cada 401 con su motivo, `security.access_denied` en los 403 del proxy y en los 404 por ownership, y `security.auth_event` para fallos de login, bloqueos, reutilización de refresh, rate limit y rastreo fallido. La IP va solo como HMAC.
  - Redacción defensiva en `logger.ts`: claves como `password`, `token`, `cookie`, `email`, `phone` o `tracking` salen como `[redacted]`.
  - `requireUser()` sustituye el patrón `authenticate` + 401 en las rutas protegidas.
  - Regla ESLint `no-restricted-syntax` contra `sql.raw`, `unsafe()` y SQL como string o concatenación en `execute()` y `query()`.
  - Prueba `sql-injection.test.ts`: ejecuta los repositorios reales con cargas de inyección y verifica que viajen como parámetros `$n`.

### Cambiado

- HSTS (`max-age=63072000; includeSubDomains; preload`) se emite en todas las respuestas, incluidos los 403 del proxy y los estáticos de `/_next`, y no solo sobre HTTPS. El navegador lo ignora si llega por HTTP.
- Las mutaciones de la API desde un origen de la allowlist CORS ya no se rechazan como CSRF.
- `shipmentVisible` en `schema.ts` acepta solo un tipo literal cerrado; el SQL generado no cambia.

- `SESSION_TTL_SECONDS` pasa a ser la vida de la sesión de refresh (8 h por defecto); nuevas variables `ACCESS_TOKEN_TTL_SECONDS`, `LOCKOUT_*`, `LOGIN_RATE_LIMIT_*` y `REGISTER_RATE_LIMIT_*`.
- El README se reduce a la descripción, el arranque rápido y los scripts; el resto se mueve a `docs/`.
- La guía ficticia `RS0000000001` queda en tránsito en la semilla para poder agendarla; el smoke la restablece en cada ejecución.
- El rastreo público consulta dentro de una transacción con el modo RLS `public_tracking`; su contrato no cambia.
- `CODEOWNERS` incluye a Mónica y a Julián en todas las reglas para que cada PR pida la revisión cruzada ([#2](https://github.com/julianmeoficial/RutaSegura/pull/2), pendiente de aprobación).

### Corregido

- El diagrama de ramas de `docs/desarrollo.md` pasa de `gitGraph` a `flowchart`, que también se dibuja en visores con versiones antiguas de Mermaid.

## [0.1.0](https://github.com/julianmeoficial/RutaSegura/pull/1) - 2026-09-27

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
