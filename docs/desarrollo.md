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

Compose levanta tres servicios: `rutasegura` (la app en modo desarrollo), `postgres` (PostgreSQL 17) y `redis` (Redis 7). La app espera a que ambas dependencias estén sanas y su propio healthcheck llama a `GET /api/v1/health`. Dentro de Compose, `DATABASE_URL` y `REDIS_URL` apuntan a los servicios `postgres` y `redis` sin editar `.env`.

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
pnpm dev
```

Next lee el mismo `.env` de la raíz (lo carga `next.config.ts`). Así hay un único archivo de entorno para Compose y para `pnpm dev`.

## Scripts

| Comando                                | Qué hace                                                            |
| -------------------------------------- | ------------------------------------------------------------------- |
| `pnpm dev`                             | Servidor de desarrollo                                              |
| `pnpm build`                           | Build de producción `standalone`                                    |
| `pnpm lint`                            | ESLint en todos los paquetes                                        |
| `pnpm typecheck`                       | TypeScript en todos los paquetes                                    |
| `pnpm test`                            | Pruebas unitarias con Vitest                                        |
| `pnpm test:e2e`                        | Pruebas en Chromium, WebKit y WebKit iPhone (requiere `pnpm build`) |
| `pnpm format` / `pnpm format:check`    | Prettier                                                            |
| `pnpm db:generate` / `pnpm db:migrate` | Migraciones con drizzle-kit                                         |
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
3. CI corre dos jobs obligatorios: `Lint, typecheck, test y build` y `Chromium y WebKit`.
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
