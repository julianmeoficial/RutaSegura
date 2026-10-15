# Changelog

Todos los cambios relevantes de RutaSegura se registran aquí. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa [versionado semántico](https://semver.org/lang/es/).

## [Unreleased](https://github.com/julianmeoficial/RutaSegura/compare/v0.4.0-pentest...HEAD)

### Añadido

- Entorno aislado para ensayar el pentest (`docs/entorno-pentest.md`):
  - `compose.pentest.yaml` y `compose.pentest.dev.yaml`: proyecto `rutasegura-pentest` con `.env.pentest` y secretos propios, app en `127.0.0.1:3100` y MinIO en `127.0.0.1:9100`, PostgreSQL y Redis sin puertos y en una red sin salida a internet.
  - `scripts/pentest-env.sh` y los alias `pnpm pentest:up`, `pentest:dev`, `pentest:snapshot`, `pentest:restore`, `pentest:status` y `pentest:down`: modo runner o dev server con recarga, cuentas de prueba sembradas por la API, verificación de datos ficticios y snapshots de los volúmenes con manifest y SHA-256.
  - Declaración ética y checklist con firmas del equipo.
- Datos de prueba unificados en `docs/datos-de-prueba.md`: guías, dígitos, cuentas, límites y cómo reiniciar. Las tablas de `pentest-freeze.md` y `entorno-pentest.md` ahora enlazan ahí.
- Semilla: guías RS0000000009 a RS0000000012 (en reparto, entregado, novedad y creado) con recorridos por varias ciudades y sus PDF, y las cuentas demo `ana.demo` y `luis.demo` `@rutasegura.test`, con contraseña pública documentada, guías vinculadas y un aviso sin leer.
- Pantalla `/portal/avisos`: lista de avisos con título por tipo, marca "Nuevo" y botón "Marcar como leídos"; campana con contador en la cabecera y pestaña en el portal.
- `events` en `GET /api/v1/shipments/{id}` (`shipmentDetailSchema`), con el recorrido del envío del más antiguo al más reciente; el detalle del portal lo muestra como "Recorrido".
- Página `/ayuda` con el significado de cada estado y preguntas frecuentes.
- Preparación del despliegue en vivo (`docs/despliegue.md`):
  - Migración `0005_enable_rls`: Row Level Security sin políticas en las 8 tablas, para que la API REST de Supabase no exponga datos. La app, dueña de las tablas, no cambia.
  - `pnpm db:fixtures`: sube los PDF de la semilla a un almacenamiento S3 compatible (Supabase Storage) con las mismas claves que MinIO, sin duplicar.
  - Proyecto Supabase `rutasegura` (us-east-1) con bucket privado `rutasegura-private`, y `.env.supabase` local para migrar, sembrar y probar contra los servicios reales.

### Cambiado

- Reconstrucción de la interfaz según `DESIGN.md`, con lenguaje para clientes:
  - Sistema visual: papel, arena y tinta con un solo acento naranja (`--route`), sin bordes, cajas ni sombras salvo en el header y las capas abiertas; radios solo pill, 40 px o 0. Tipografías Bricolage Grotesque (titulares), Geist (interfaz) y Geist Mono (datos). Íconos Lucide a 20 px y trazo 1,75; escenas con GSAP. `.cursorrules` fija CSS Modules, GSAP y Lucide, y prohíbe estilos en línea por la CSP.
  - Header pill flotante en tinta con píldora activa que se desliza, compactado al hacer scroll, campana y avatar con sesión, y hoja inferior en móvil. Footer en tinta con campo de rastreo ("Tu guía"), columnas, wordmark gigante y enlace al estado del servicio.
  - Portada "¿Dónde va tu paquete?" con la ruta animada, formulario en una fila, banda arena con vista de ejemplo del portal, "Cómo funciona" en tres pasos con un punto que avanza por la ruta al hacer scroll (ScrollTrigger) y banda tinta con la demo de datos enmascarados.
  - Rastreo público con la guía enmascarada (`RS-****-0009`, `maskTracking`), ruta con paradas y un punto que avanza hasta el estado actual, recorrido y aviso para vincular el envío. La guía completa solo se ve dentro del portal.
  - Ayuda con estados, preguntas en píldoras y secciones de privacidad y términos. Ingreso y registro sobre papel con panel en tinta. 404 y error como bandas "Fuera de ruta" y "Desvío".
  - Portal con navegación en píldora, número grande de envíos en camino, próxima entrega en tinta, filas pill por envío (la guía enlaza al detalle), chips de día y franja en la agenda, documentos, avisos y seguridad sin cajas.
  - Estados de carga en forma de pill y animaciones solo de `transform` y `opacity`, que respetan `prefers-reduced-motion`.
- Simetría y detalle en el responsive:
  - Rejilla única: tokens `--container`, `--band-pad`, `--space-section` y `--page-top`, y cortes unificados en 30, 48 y 64 rem. Las bandas, el header, el footer y las pantallas internas comparten bordes y rellenos, y las composiciones 7/5 se mantienen sin recortar contenido.
  - Portada: el titular "¿Dónde va tu paquete?" se escala sin cortarse ni tapar el formulario, y la ruta va en su propia franja debajo. La vista de ejemplo del portal se adapta a su ancho (container queries). "Cómo funciona" pasa a tres pasos iguales desde 64 rem y apilados en móvil. El titular conserva su nombre accesible exacto.
  - Barra de progreso con las etiquetas bajo cada parada, pestañas del portal de ancho completo, ciudad y fecha con separación clara (apiladas en móvil), enlaces tipo texto alineados con la columna, y header con los enlaces en una sola línea.
  - Ortografía y puntuación: tildes ("últimos", "dígitos", "Aún", "Después"), comas tras los conectores y comillas latinas en los textos de ayuda, rastreo, agenda y seguridad.
- Base de datos: con el pooler de Supabase en modo transacción (puerto 6543) la conexión desactiva las sentencias preparadas y abre como máximo 3 conexiones por instancia, para desplegar en Vercel. Con cualquier otro puerto se mantiene igual.
- `/estados` redirige de forma permanente a `/ayuda`.
- El portal no tiene `loading.tsx`: el streaming hacía que `notFound()` respondiera 200 y rompía el 404 uniforme.
- Pruebas: los e2e y los smoke de UI siguen los nuevos títulos, verifican que el rastreo público muestre la guía enmascarada y no la completa, comprueban avisos y recorrido, y la verificación de nonce lee el HTML del servidor en lugar de los scripts del DOM. El flujo crítico espera a que termine `router.refresh()` tras vincular una guía antes de navegar, porque WebKit cancelaba la petición en curso.

## [0.4.0](https://github.com/julianmeoficial/RutaSegura/compare/acd29ee...v0.4.0-pentest) - 2026-10-13

Versión congelada para el pentest: sprints 1 a 3 e integración del frontend con la API. El tag `v0.4.0-pentest` y la rama `release/pentest-v0.4.0` se crean con `./scripts/freeze-check.sh --tag` una vez hecho el commit; el alcance y el checklist están en [docs/pentest-freeze.md](docs/pentest-freeze.md).

### Añadido

- Integración frontend-backend y freeze para pentest:
  - Catálogo único de mensajes de error en `lib/error-messages.ts`, con variantes por pantalla que no revelan si una guía o una cuenta existen; `ApiErrorAlert` y el cliente de la API lo usan.
  - Error boundaries (`error.tsx`, `portal/error.tsx` y `global-error.tsx`) con "Algo salió mal", botón para reintentar y el `digest` como código de referencia, sin mensaje ni traza.
  - `security.auth_failure` con `source: "page"` cuando una página del portal recibe una cookie de acceso inválida, vencida o revocada.
  - Smoke de integración contra Docker (`smoke/integration.smoke.test.ts`): contratos estrictos, cookies, rotación y reutilización del refresh, agenda completa, documentos, bitácora, catálogo de errores, 429 y logout.
  - Smoke de UI de flujos críticos (`e2e-flows/critical.flow.spec.ts` y `pnpm test:smoke:ui`): renovación de sesión, confirmar, reprogramar y cancelar franja, errores de rastreo, 429 con cuenta regresiva, caída de PostgreSQL y CSP, HSTS y `nosniff` en cada página.
  - Variable `APP_BUILD_TARGET` en Compose para levantar la imagen `runner` de producción; los smoke la usan por defecto.
  - Guías ficticias RS0000000006 a RS0000000008 con su PDF para los nuevos flujos.
  - `scripts/freeze-check.sh`, `docs/pentest-freeze.md` y `docs/smoke-ui.md` (checklist y registro de defectos).
  - Casos de inyección SQL para los repositorios de documentos.

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
- Sprint 3, frontend React + TypeScript con los diseños S06:
  - Páginas públicas: rastreo (`/rastreo`, destino de `/`), ingreso, registro y panel de estados y errores.
  - Portal autenticado: Mis envíos con vinculación de guías, detalle con bitácora, agenda de franjas, documentos y seguridad de la cuenta. Sin sesión redirige a `/ingresar?next=…`; envío ajeno o inexistente muestra la misma página 404.
  - Componentes base accesibles (objetivos táctiles de 44 px, foco visible, `aria-live`), CSS Modules sin estilos en línea y fuente Inter servida desde el propio origen: la CSP estricta no cambia.
  - Cliente de la API con renovación silenciosa de sesión ante un 401 y cuenta regresiva de `Retry-After` ante un 429.
- Documentos con URL firmada (OWASP A01 y A05), solo descarga:
  - MinIO en Compose con bucket privado sin acceso anónimo, cuenta de la app de solo lectura y PDF ficticios (`minio-init`).
  - `GET /api/v1/shipments/{id}/documents` y `POST /api/v1/documents/{id}/download-url`: URL SigV4 de 60 s (`SIGNED_URL_TTL_SECONDS`, máximo 300) con `attachment` y `no-store` firmados; ajeno o inexistente responde 404; rate limit `DOCUMENTS_RATE_LIMIT_*`.
  - Migración `0004`: tabla `documents` con RLS heredada del envío y evento de bitácora `document_url_issued`.
  - En producción el almacenamiento es obligatorio, sin valores de ejemplo y con endpoint HTTPS.
  - `docs/documentos.md` con la evidencia de que el bucket no es público y `scripts/evidence-signed-urls.sh` para reproducirla.
- Pruebas del Sprint 3:
  - Smoke de documentos contra Docker: IDOR, 403 sin firma, con firma alterada y al vencer la URL, listados anónimos, bitácora y 429.
  - Flujos de UI en Chromium y WebKit contra Docker (`pnpm test:e2e:flows`): registro, login, carga XSS en el nombre, reclamo, agenda, descarga firmada y su vencimiento, 404 y logout, sin errores de consola.

### Cambiado

- HSTS (`max-age=63072000; includeSubDomains; preload`) se emite en todas las respuestas, incluidos los 403 del proxy y los estáticos de `/_next`, y no solo sobre HTTPS. El navegador lo ignora si llega por HTTP.
- Las mutaciones de la API desde un origen de la allowlist CORS ya no se rechazan como CSRF.
- `shipmentVisible` en `schema.ts` acepta solo un tipo literal cerrado; el SQL generado no cambia.

- `SESSION_TTL_SECONDS` pasa a ser la vida de la sesión de refresh (8 h por defecto); nuevas variables `ACCESS_TOKEN_TTL_SECONDS`, `LOCKOUT_*`, `LOGIN_RATE_LIMIT_*` y `REGISTER_RATE_LIMIT_*`.
- El README se reduce a la descripción, el arranque rápido y los scripts; el resto se mueve a `docs/`.
- La guía ficticia `RS0000000001` queda en tránsito en la semilla para poder agendarla; el smoke la restablece en cada ejecución.
- El rastreo público consulta dentro de una transacción con el modo RLS `public_tracking`; su contrato no cambia.
- `/` redirige a `/rastreo`; la prueba E2E de humo verifica la página de rastreo.
- El job de CI `Smoke auth en Docker` pasa a `Smoke y flujos de UI en Docker`: incluye MinIO, el smoke de documentos, el script de evidencia y los flujos de UI.
- `CODEOWNERS` incluye a Mónica y a Julián en todas las reglas para que cada PR pida la revisión cruzada ([#2](https://github.com/julianmeoficial/RutaSegura/pull/2), pendiente de aprobación).

- El job de CI de smoke construye la imagen `runner`, así que los flujos de UI validan la CSP estricta de producción.
- La versión de `@rutasegura/app` pasa de 0.1.0 a 0.4.0.

### Corregido

- Las páginas del servidor ya no dejan en stderr el error de Drizzle con la consulta y sus parámetros (incluido el ID de sesión) cuando falla la base de datos: `pageData()` lo registra como `page.unhandled_error` y lanza un error sin detalles (DEF-01 de `docs/smoke-ui.md`).
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
