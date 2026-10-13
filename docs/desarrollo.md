# Desarrollo

## Requisitos

- Node.js 22 o superior (`.node-version`)
- pnpm 11: `corepack enable` toma la versión fijada en `packageManager`
- Docker con Compose v2

## Entorno con Docker

```bash
cp .env.example .env
pnpm docker:up
curl -i http://localhost:3000/api/v1/health
```

Compose levanta seis servicios: `rutasegura` (la app en modo desarrollo), `postgres` (PostgreSQL 17), `redis` (Redis 7), `minio` (almacenamiento S3 compatible), `migrate`, que aplica las migraciones y la semilla de datos ficticios y termina, y `minio-init`, que crea el bucket privado, la cuenta de solo lectura de la app y sube los PDF ficticios, y termina. La app espera a que `migrate` y `minio-init` terminen con éxito y a que Redis esté sano; su propio healthcheck llama a `GET /api/v1/health`. Dentro de Compose, `DATABASE_URL`, `REDIS_URL` y `STORAGE_ENDPOINT` apuntan a los servicios sin editar `.env`.

`pnpm docker:down` detiene todo. Los datos persisten en los volúmenes `postgres_data`, `redis_data` y `minio_data`.

### Imagen de la app: desarrollo o producción

`APP_BUILD_TARGET` elige el target del `Dockerfile` para el servicio `rutasegura`:

| Valor                   | Qué levanta                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `development` (defecto) | `next dev` con recarga en caliente; su CSP añade `unsafe-eval` y `unsafe-inline`                                        |
| `runner`                | La imagen de producción: build `standalone`, usuario `nextjs` y CSP estricta. Es la que usan los smoke, CI y el pentest |

```bash
APP_BUILD_TARGET=runner docker compose up -d --build --wait
```

Los scripts de smoke usan `runner` si no se indica otra cosa. Para volver al modo desarrollo después, `docker compose up -d --build rutasegura` sin la variable.

La interfaz queda en `http://localhost:3000` (redirige a `/rastreo`). Para recorrer el portal: crea una cuenta en `/registro`, entra y vincula `RS0000000001` con los dígitos `4321`; esa guía trae dos documentos para probar la descarga firmada.

### Almacenamiento de documentos

MinIO se publica en `127.0.0.1:9000` (`STORAGE_HOST_PORT`), sin consola web. Las URLs firmadas se calculan contra `STORAGE_PUBLIC_ENDPOINT` (`http://localhost:9000`), que es el que alcanza el navegador; el servidor usa `STORAGE_ENDPOINT`. Si corres la app fuera de Compose, deja ambos en `http://localhost:9000`. Sin las variables `STORAGE_*`, la app arranca igual fuera de producción y la descarga responde 503. Diseño y evidencia en [documentos.md](documentos.md).

### Puertos ocupados

Si ya tienes PostgreSQL o Redis instalados en la máquina, los puertos 5432 y 6379 estarán en uso y Compose no podrá publicarlos. Cambia en `.env`:

```bash
POSTGRES_HOST_PORT=55432
REDIS_HOST_PORT=56379
DATABASE_URL=postgresql://rutasegura:local_only_change_me@localhost:55432/rutasegura
REDIS_URL=redis://localhost:56379
```

`APP_HOST_PORT` cambia de igual forma el puerto de la app.

## Entorno sin contenedor de la app

```bash
pnpm install
cp .env.example .env
docker compose up -d postgres redis minio-init
pnpm db:migrate && pnpm db:seed
pnpm dev
```

Next lee el mismo `.env` de la raíz (lo carga `next.config.ts`), y drizzle-kit y la semilla también (`packages/database/src/load-env.ts`). Así hay un único archivo de entorno para Compose, `pnpm dev` y las migraciones.

### CORS

La API solo acepta peticiones CORS de los orígenes de `CORS_ALLOWED_ORIGINS`, además del origen de `NEXT_PUBLIC_APP_URL`, que siempre está permitido. Por defecto la variable está vacía: solo el mismo origen. Si levantas un cliente en otro puerto, añade su origen exacto:

```bash
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

Se rechazan `*`, rutas y query. Con `APP_ENV=production` solo se admite `https`. Si la lista no es válida, la app no arranca. Detalle en [seguridad.md](seguridad.md#cors).

## Base de datos

El esquema vive en [`packages/database/src/schema.ts`](../packages/database/src/schema.ts) y las migraciones SQL generadas en `packages/database/drizzle/`. Para cambiar el esquema:

1. Edita `schema.ts`.
2. `pnpm db:generate --name descripcion` genera la migración SQL; revísala antes de versionarla.
3. `pnpm db:migrate` la aplica.

`pnpm db:seed` es idempotente: crea las guías ficticias `RS0000000001` a `RS0000000008` y sus documentos (la tabla con los dígitos de cada una está en [pentest-freeze.md](pentest-freeze.md#datos-de-prueba)) solo si no existen. Los PDF de los documentos están en `packages/database/fixtures/documents` y los sube `minio-init`.

## Pruebas smoke en Docker

```bash
pnpm test:smoke
```

[`scripts/smoke-auth.sh`](../scripts/smoke-auth.sh) levanta Compose con `--wait` (reconstruye si hace falta), borra los contadores `rl:*` de Redis de ejecuciones anteriores, borra y vuelve a sembrar las guías ficticias (para que queden sin dueño ni franja) y corre [`smoke/auth.smoke.test.ts`](../apps/rutasegura/smoke/auth.smoke.test.ts), [`smoke/documents.smoke.test.ts`](../apps/rutasegura/smoke/documents.smoke.test.ts) e [`smoke/integration.smoke.test.ts`](../apps/rutasegura/smoke/integration.smoke.test.ts) con la imagen `runner` contra `http://localhost:$APP_HOST_PORT`. Al final imprime el conteo de `auth_events`, de `shipment_audit_events` y de avisos simulados como evidencia de la bitácora.

Los 25 casos cubren: health; registro con contraseña débil, válida y duplicada; login con cookies `HttpOnly` y `SameSite=Lax`; ruta protegida con JWT válido, ausente y alterado; rotación y reutilización del refresh token; logout inmediato; envíos sin sesión (401); reclamo idempotente de `RS0000000001`; agenda, reprogramación y franjas inválidas; detalle con bitácora y sin datos del destinatario; Bob sobre el ULID de Alice (404 en `GET` y `PATCH`, idéntico a un ULID inexistente); lista de Alice sin la guía no reclamada; avisos sin sesión (401), Alice con sus 2 avisos genéricos, Bob sin acceso a ellos ni capacidad de marcarlos, y marcado como leído; cancelación de la agenda sin sesión (401), Bob sobre el ULID de Alice (404 en `DELETE`, idéntico a un ULID inexistente, y la franja de Alice intacta), cancelación idempotente de Alice, evento `unscheduled` en la bitácora y un único aviso `shipment_unscheduled`; bloqueo tras 5 fallos con respuesta idéntica; 403 desde otro origen; 429 por IP y por correo con `X-Forwarded-For` falsificado; y rastreo de doble dato con 200, 404 uniforme y 429.

Los 10 casos de documentos cubren: listado y emisión sin sesión (401); listado sin claves internas del almacenamiento; Dave sobre los documentos de Carol (404 idéntico a un ULID inexistente); URL firmada de 60 s que descarga el PDF como adjunto; 403 directo al bucket sin firma y en listados anónimos; 403 con la firma alterada o el plazo ampliado; 403 al vencer la URL (la prueba espera los 60 s reales); evento `document_url_issued` en la bitácora; y 429 en la emisión de URLs. La suite tarda algo más de un minuto por esa espera.

Los 14 casos de integración recorren la API como la usa el frontend, con `RS0000000008`: cada respuesta se valida con el esquema de `@rutasegura/contracts` en modo estricto (sin campos de más) y con `Cache-Control: no-store`; cookies `rs_at` y `rs_rt` con `HttpOnly`, `SameSite=Lax` y `Path=/`; firma alterada y cookie de acceso ausente (401) seguidas de la renovación con el refresh; reutilización del refresh que revoca la familia; rastreo, reclamo, confirmar, reprogramar y cancelar franja; documentos y descarga del PDF; bitácora y avisos; cada código de error con su mensaje fijo y sin trazas ni nombres de servicios; 429 con `Retry-After`; y logout que revoca acceso y refresh.

CI corre los tres archivos en el job `Smoke y flujos de UI en Docker`, seguidos de [`scripts/evidence-signed-urls.sh`](../scripts/evidence-signed-urls.sh) y de los flujos de UI.

## Flujos de UI en Docker

```bash
pnpm test:e2e:flows
```

[`scripts/e2e-flows.sh`](../scripts/e2e-flows.sh) levanta la imagen `runner`, restablece `RS0000000004` a `RS0000000007` y corre [`e2e-flows`](../apps/rutasegura/e2e-flows) con [`playwright.flows.config.ts`](../apps/rutasegura/playwright.flows.config.ts) en Chromium y WebKit contra el entorno Docker completo: portal sin sesión (redirección al login con `next`), rastreo público, y el flujo completo de registro, login, carga XSS en el nombre, reclamo, agenda, descarga firmada, cuenta regresiva y "Generar enlace" al vencer (con reloj simulado), bitácora, 404 de un envío ajeno y logout. Cada motor usa su propia guía y su propia IP. Falla ante cualquier error de consola, violaciones de CSP e hidratación incluidas.

`critical.flow.spec.ts` añade el smoke de flujos críticos: renovación de la sesión sin la cookie de acceso (en una página del servidor y en una descarga), confirmar, reprogramar y cancelar franja, errores de rastreo, 429 con cuenta regresiva, caída de PostgreSQL (página de error genérica y log sin la consulta) y CSP, HSTS y `nosniff` en cada página. `pnpm test:smoke:ui` es el mismo script con la imagen `runner` fijada; el checklist y el registro de defectos están en [smoke-ui.md](smoke-ui.md).

La primera vez hay que instalar los navegadores: `pnpm --filter @rutasegura/app exec playwright install chromium webkit`.

## Scripts

| Comando                                | ¿Qué hace?                                                                |
| -------------------------------------- | ------------------------------------------------------------------------- |
| `pnpm dev`                             | Servidor de desarrollo                                                    |
| `pnpm build`                           | Build de producción `standalone`                                          |
| `pnpm lint`                            | ESLint en todos los paquetes                                              |
| `pnpm typecheck`                       | TypeScript en todos los paquetes                                          |
| `pnpm test`                            | Pruebas unitarias con Vitest                                              |
| `pnpm test:e2e`                        | Pruebas en Chromium, WebKit y WebKit iPhone (requiere `pnpm build`)       |
| `pnpm test:smoke`                      | Pruebas smoke de API (auth, envíos, documentos) contra Docker             |
| `pnpm test:e2e:flows`                  | Flujos de UI en Chromium y WebKit contra Docker                           |
| `pnpm test:smoke:ui`                   | Smoke de UI de flujos críticos contra la imagen de producción             |
| `./scripts/freeze-check.sh [--tag]`    | Verificación completa del freeze ([pentest-freeze.md](pentest-freeze.md)) |
| `pnpm format` / `pnpm format:check`    | Prettier                                                                  |
| `pnpm db:generate` / `pnpm db:migrate` | Migraciones con drizzle-kit                                               |
| `pnpm db:seed`                         | Datos ficticios de desarrollo (idempotente)                               |
| `pnpm docker:up` / `pnpm docker:down`  | Entorno completo                                                          |

Antes de abrir una PR conviene correr lo mismo que CI:

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

## Ramas

Trunk-based con ramas cortas que salen de `main` y vuelven a `main` por pull request.

| Tipo      | Uso                              | Ejemplo                        |
| --------- | -------------------------------- | ------------------------------ |
| `feat/`   | Funcionalidad nueva              | `feat/RS-017-login`            |
| `fix/`    | Corrección no urgente            | `fix/RS-020-csp-estilos`       |
| `hotfix/` | Corrección urgente de producción | `hotfix/RS-031-health-timeout` |
| `chore/`  | Configuración o dependencias     | `chore/codeowners-monica`      |
| `docs/`   | Documentación                    | `docs/documentacion-base`      |

Los commits siguen Conventional Commits: `feat(tracking): add secure query endpoint`, `docs: add API reference`.

```mermaid
flowchart LR
    main1(["main"]) --> feat["feat/RS-017-login<br/>feat(auth): hash argon2id<br/>test(auth): bloqueo progresivo"]
    feat --> pr1{{"PR N: squash merge"}}
    pr1 --> main2(["main"])
    main2 --> docs["docs/nueva-guia<br/>docs: guía"]
    docs --> pr2{{"PR N+1: squash merge"}}
    pr2 --> main3(["main"])
```

## Pull requests

```mermaid
flowchart LR
    rama["Rama desde main"] --> push["Push y PR hacia main"]
    push --> ci["CI: calidad, Chromium y WebKit"]
    push --> review["Revisión del otro dev"]
    ci --> ok{"¿CI verde y una aprobación?"}
    review --> ok
    ok -- "Sí" --> squash["Squash merge y borrado de la rama"]
    ok -- "No" --> fix["Nuevos commits en la misma rama"]
    fix --> ci
```

1. Actualiza `main` y crea la rama: `git checkout main && git pull && git checkout -b feat/RS-###-descripcion`.
2. Abre la PR temprano con `gh pr create --base main`. La plantilla trae el checklist de seguridad.
3. CI corre dos jobs obligatorios, `Lint, typecheck, test y build` y `Chromium y WebKit`, y además `Smoke auth en Docker`.
4. La otra persona del equipo técnico revisa y aprueba. Julián y Mónica se revisan mutuamente; [`CODEOWNERS`](../.github/CODEOWNERS) pide la revisión automáticamente.
5. Se fusiona con squash merge; GitHub borra la rama.

### Protección de `main`

- Sin push directo ni force push, y no se puede borrar.
- PR obligatoria con una aprobación, que no puede ser del autor.
- Los dos checks de CI deben pasar y la rama debe estar al día con `main`.
- Las reglas aplican también a administradores.
- Solo se permite squash merge.

## Versiones

Las entregas demostrables se etiquetan con versiones semánticas (`v0.1.0`, `v0.2.0`) y cada cambio se registra en [`CHANGELOG.md`](../CHANGELOG.md).

Una versión que va a pentest se congela con `./scripts/freeze-check.sh --tag`: con el árbol limpio y todas las verificaciones en verde, crea el tag anotado `vX.Y.Z-pentest` y la rama `release/pentest-vX.Y.Z`. Las correcciones de hallazgos van en `hotfix/*` desde esa rama y generan una versión nueva con su re-test. Procedimiento completo en [pentest-freeze.md](pentest-freeze.md).
