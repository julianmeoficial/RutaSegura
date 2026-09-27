# RutaSegura

Plataforma de seguimiento de envíos segura por diseño. Es una única aplicación full-stack de Next.js: la interfaz, la API (`/api/v1`) y la lógica de servidor viven en el mismo proyecto, se construyen juntas y se despliegan como un solo servicio.

Esta base cubre el Sprint 0 hasta la API. Las pantallas llegan cuando estén listos los mockups de Figma (phase 6); autenticación, rastreo, agenda y documentos llegan en las phases 8, 9 y 10.

## Requisitos

- Node.js 22 o superior (`.node-version`)
- pnpm 11 (`corepack enable` toma la versión de `packageManager`)
- Docker con Compose v2



## Arranque rápido con Docker

```bash
cp .env.example .env
pnpm docker:up
curl -i http://localhost:3000/api/v1/health
```

Compose levanta RutaSegura, PostgreSQL 17 y Redis 7. Dentro de Compose, `DATABASE_URL` y `REDIS_URL` apuntan a los servicios `postgres` y `redis`; no hace falta editar `.env`.

Si ya tienes PostgreSQL o Redis instalados en la máquina, los puertos 5432 y 6379 estarán ocupados. Cambia `POSTGRES_HOST_PORT` y `REDIS_HOST_PORT` en `.env` (por ejemplo a 55432 y 56379) y ajusta el puerto de `DATABASE_URL` y `REDIS_URL` para el desarrollo sin contenedor.

`GET /api/v1/health` responde `200` con `{"status":"ok","checks":{"database":"ok","redis":"ok"}}` cuando ambas dependencias responden, y `503` con el mismo formato cuando alguna falla.

## Desarrollo sin contenedor de la app

```bash
pnpm install
cp .env.example .env
docker compose up -d postgres redis
pnpm dev
```

El `.env` de la raíz lo leen tanto Compose como Next (`next.config.ts` lo carga). Los valores de `.env.example` apuntan a `localhost`, que es donde Compose publica PostgreSQL y Redis (solo en `127.0.0.1`).

## Scripts


| Comando            | Qué hace                                                  |
| ------------------ | --------------------------------------------------------- |
| `pnpm dev`         | Servidor de desarrollo de la app                          |
| `pnpm build`       | Build de producción (`output: "standalone"`)              |
| `pnpm lint`        | ESLint en todos los paquetes                              |
| `pnpm typecheck`   | TypeScript en todos los paquetes                          |
| `pnpm test`        | Pruebas unitarias (Vitest)                                |
| `pnpm test:e2e`    | Pruebas en Chromium, WebKit y WebKit móvil                |
| `pnpm format`      | Prettier                                                  |
| `pnpm db:generate` | Genera migraciones con drizzle-kit                        |
| `pnpm db:migrate`  | Aplica migraciones (paso controlado, nunca por solicitud) |
| `pnpm docker:up`   | Levanta el entorno completo                               |


Para las pruebas de navegador hay que instalar los motores una vez: `pnpm --filter @rutasegura/app exec playwright install chromium webkit`.

## Estructura

```plain text
apps/rutasegura/
  src/app/              páginas, layouts y Route Handlers
    (public)/ (portal)/ grupos de rutas reservados para la UI
    api/v1/health/      único endpoint implementado
    api/[...path]/      404 JSON genérico para cualquier ruta de API sin handler
  src/features/         UI por dominio (tracking, shipments, schedules, documents)
  src/server/           solo servidor: env, logger, redis, http, services, auth, authorization,
                        repositories, rate-limit, audit
  src/lib/              código sin secretos compartido (cabeceras de seguridad)
  src/proxy.ts          CSP con nonce por petición, HSTS, no-store en API, X-Robots-Tag
packages/contracts/     esquemas Zod y tipos compartidos entre UI y API
packages/database/      cliente Drizzle sobre PostgreSQL y migraciones
packages/config/        TypeScript, ESLint y Prettier compartidos
```



### Límites internos

- Todo módulo bajo `src/server` y `packages/database` importa `server-only`: si un Client Component los importa, el build falla.
- ESLint impide que `app/(public)`, `app/(portal)`, `components` y `features` importen la base de datos, los repositorios o Redis. La UI llega a los datos solo por `src/server/services`, que es donde vive la autorización.
- La autorización se decide siempre en el servidor. Ningún endpoint acepta `userId`, `ownerId`, `actorId` ni roles desde el navegador; el dueño se deriva de la sesión.
- Los errores de la API salen de `apiError()` con un mensaje fijo por código (`packages/contracts/src/errors.ts`), para que casos equivalentes (recurso inexistente frente a ajeno) respondan igual.



## Controles frente al análisis HTTP

Cada control responde a un hallazgo del [análisis del protocolo HTTP](https://app.notion.com/p/5d02fd524dd54d9882a908a2ee04bbc6).


| Hallazgo                              | Control en esta base                                                                                                                           |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| H-00 pantalla negra en Chromium       | Documentos renderizados en servidor, sin CDN ni scripts de terceros; Playwright verifica Chromium, WebKit y la carga sin JavaScript en cada PR |
| H-02, H-11 fuga de producto y versión | `poweredByHeader: false`, sin `ETag`, errores genéricos                                                                                        |
| H-03, H-07 CSP débil                  | CSP con nonce por petición y `strict-dynamic`, sin `unsafe-inline` ni `unsafe-eval` en producción; `connect-src` e `img-src` sin comodines     |
| H-04 cookies débiles                  | Reservado para la phase 8: cookie de sesión `HttpOnly`, `Secure`, `SameSite=Lax`                                                               |
| H-06 terceros confiados               | Cero orígenes externos en la CSP                                                                                                               |
| H-08 HSTS sin preload                 | `max-age=63072000; includeSubDomains; preload` sobre HTTPS                                                                                     |
| H-09 sin aislamiento de origen        | `COOP`, `COEP` y `CORP` en todas las respuestas                                                                                                |
| H-10 caché compartida                 | `Cache-Control: no-store` en toda respuesta de API                                                                                             |
| H-01, H-12 staging indexable          | `X-Robots-Tag: noindex, nofollow` en todo entorno distinto de `APP_ENV=production`                                                             |


En desarrollo la CSP añade `'unsafe-eval'` y `'unsafe-inline'` en estilos porque React y la recarga en caliente de Next los necesitan; en producción no aparecen. `upgrade-insecure-requests` y HSTS solo se envían cuando la petición llega por HTTPS, porque WebKit aplica esa directiva también a `http://localhost`.

### Decisiones para las siguientes phases

- Autenticación propia (phase 8): Argon2id, bloqueo progresivo por cuenta e IP con Redis, TOTP opcional y rotación de sesión. Se implementa a mano porque el TCC exige demostrar cada control.
- Autorización por objeto (phase 9): `assertOwnership` en cada endpoint privado, identificadores ULID y Row Level Security en PostgreSQL como segunda barrera.
- Documentos (phase 10): bucket privado y URL firmada con vigencia máxima de 300 s (60 s por defecto), validada en `src/server/env.ts`.



## Variables de entorno

Solo se versiona `.env.example`. `src/server/env.ts` valida las variables con Zod al arrancar (`src/instrumentation.ts`) y el error nombra las claves inválidas sin mostrar sus valores. Con `APP_ENV=production` la app no arranca si algún secreto conserva un valor de ejemplo o si `NEXT_PUBLIC_APP_URL` no usa HTTPS.

- Solo las variables `NEXT_PUBLIC_*` llegan al navegador y ninguna puede contener secretos.
- En Vercel, los secretos se registran por entorno (Development, Preview, Production).
- Un secreto expuesto se rota de inmediato y se revisa el historial de Git.



## Ramas y pull requests

Trunk-based con ramas cortas desde `main`:


| Rama                        | Uso                                         |
| --------------------------- | ------------------------------------------- |
| `main`                      | Estable y desplegable. Sin push directo     |
| `feat/RS-###-descripcion`   | Funcionalidad nueva                         |
| `fix/RS-###-descripcion`    | Corrección no urgente                       |
| `hotfix/RS-###-descripcion` | Corrección urgente de producción            |
| `chore/RS-###-descripcion`  | Configuración, dependencias o documentación |


1. Crear la rama desde `main` y asociarla a la historia de Jira.
2. Commits pequeños con Conventional Commits, por ejemplo `feat(tracking): add secure query endpoint`.
3. Abrir la PR temprano para obtener el Preview Deployment.
4. CI ejecuta formato, lint, typecheck, pruebas, build y la verificación en Chromium y WebKit.
5. Una aprobación como mínimo y checklist de seguridad de la plantilla completo.
6. Squash merge y borrado de la rama remota. Las entregas demostrables se etiquetan `v0.1.0`, `v0.2.0`, etc.



### Configuración pendiente en las cuentas

- Protección de `main` en GitHub: PR obligatoria, checks `Lint, typecheck, test y build` y `Chromium y WebKit` requeridos, una aprobación, sin force push.
  ```bash
  gh api -X PUT repos/julianmeoficial/RutaSegura/branches/main/protection --input - <<'EOF'
  {
    "required_status_checks": {
      "strict": true,
      "contexts": ["Lint, typecheck, test y build", "Chromium y WebKit"]
    },
    "enforce_admins": true,
    "required_pull_request_reviews": { "required_approving_review_count": 1 },
    "restrictions": null,
    "allow_force_pushes": false,
    "allow_deletions": false
  }
  EOF
  ```
- Vercel: un solo proyecto conectado al repositorio con Root Directory `apps/rutasegura`. Producción solo desde `main`; cada PR recibe un Preview Deployment completo. PostgreSQL y Redis son servicios administrados en producción, y las migraciones corren como paso controlado del despliegue.

