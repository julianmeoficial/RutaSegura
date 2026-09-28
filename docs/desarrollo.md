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

Compose levanta cuatro servicios: `rutasegura` (la app en modo desarrollo), `postgres` (PostgreSQL 17), `redis` (Redis 7) y `migrate`, que aplica las migraciones y la semilla de datos ficticios y termina. La app espera a que `migrate` termine con éxito y a que Redis esté sano; su propio healthcheck llama a `GET /api/v1/health`. Dentro de Compose, `DATABASE_URL` y `REDIS_URL` apuntan a los servicios `postgres` y `redis` sin editar `.env`.

`pnpm docker:down` detiene todo. Los datos persisten en los volúmenes `postgres_data` y `redis_data`.

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
docker compose up -d postgres redis
pnpm db:migrate && pnpm db:seed
pnpm dev
```

Next lee el mismo `.env` de la raíz (lo carga `next.config.ts`), y drizzle-kit y la semilla también (`packages/database/src/load-env.ts`). Así hay un único archivo de entorno para Compose, `pnpm dev` y las migraciones.

## Base de datos

El esquema vive en [`packages/database/src/schema.ts`](../packages/database/src/schema.ts) y las migraciones SQL generadas en `packages/database/drizzle/`. Para cambiar el esquema:

1. Edita `schema.ts`.
2. `pnpm db:generate --name descripcion` genera la migración SQL; revísala antes de versionarla.
3. `pnpm db:migrate` la aplica.

`pnpm db:seed` es idempotente: crea las guías ficticias `RS0000000001` y `RS0000000002` solo si no existen.

## Pruebas smoke en Docker

```bash
pnpm test:smoke
```

[`scripts/smoke-auth.sh`](../scripts/smoke-auth.sh) levanta Compose con `--wait` (reconstruye si hace falta), borra los contadores `rl:*` de Redis de ejecuciones anteriores, borra y vuelve a sembrar las dos guías ficticias (para que queden sin dueño ni franja) y corre [`smoke/auth.smoke.test.ts`](../apps/rutasegura/smoke/auth.smoke.test.ts) contra `http://localhost:$APP_HOST_PORT`. Al final imprime el conteo de `auth_events`, de `shipment_audit_events` y de avisos simulados como evidencia de la bitácora.

Los 21 casos cubren: health; registro con contraseña débil, válida y duplicada; login con cookies `HttpOnly` y `SameSite=Lax`; ruta protegida con JWT válido, ausente y alterado; rotación y reutilización del refresh token; logout inmediato; envíos sin sesión (401); reclamo idempotente de `RS0000000001`; agenda, reprogramación y franjas inválidas; detalle con bitácora y sin datos del destinatario; Bob sobre el ULID de Alice (404 en `GET` y `PATCH`, idéntico a un ULID inexistente); lista de Alice sin la guía no reclamada; avisos sin sesión (401), Alice con sus 2 avisos genéricos, Bob sin acceso a ellos ni capacidad de marcarlos, y marcado como leído; bloqueo tras 5 fallos con respuesta idéntica; 403 desde otro origen; 429 por IP y por correo con `X-Forwarded-For` falsificado; y rastreo de doble dato con 200, 404 uniforme y 429. CI los corre en el job `Smoke auth en Docker`.

## Scripts

| Comando                                | Qué hace                                                            |
| -------------------------------------- | ------------------------------------------------------------------- |
| `pnpm dev`                             | Servidor de desarrollo                                              |
| `pnpm build`                           | Build de producción `standalone`                                    |
| `pnpm lint`                            | ESLint en todos los paquetes                                        |
| `pnpm typecheck`                       | TypeScript en todos los paquetes                                    |
| `pnpm test`                            | Pruebas unitarias con Vitest                                        |
| `pnpm test:e2e`                        | Pruebas en Chromium, WebKit y WebKit iPhone (requiere `pnpm build`) |
| `pnpm test:smoke`                      | Pruebas smoke de autenticación contra Docker Compose                |
| `pnpm format` / `pnpm format:check`    | Prettier                                                            |
| `pnpm db:generate` / `pnpm db:migrate` | Migraciones con drizzle-kit                                         |
| `pnpm db:seed`                         | Datos ficticios de desarrollo (idempotente)                         |
| `pnpm docker:up` / `pnpm docker:down`  | Entorno completo                                                    |

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
