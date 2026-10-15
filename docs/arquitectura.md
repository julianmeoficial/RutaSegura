# Arquitectura

RutaSegura es una única aplicación full-stack de Next.js 16 (App Router). La interfaz, la API bajo `/api/v1` y la lógica de servidor viven en `apps/rutasegura`, se construyen en un solo build y se despliegan como un solo servicio. El navegador consume la API en el mismo origen, con rutas relativas.

Compartir proyecto no significa compartir responsabilidades: solo el código de servidor toca la base de datos, Redis, secretos o sesiones.

## Capas y fronteras de confianza

```mermaid
flowchart TB
    subgraph cliente [Cliente no confiable]
        nav["Navegador: Chromium, WebKit"]
    end

    subgraph borde [Borde]
        proxy["proxy.ts: CSP con nonce, HSTS, no-store, noindex"]
    end

    subgraph app [apps/rutasegura]
        paginas["app/(public), app/(portal): Server Components"]
        rutas["app/api/v1: Route Handlers"]
        servicios["server/services: reglas de negocio y autorización"]
        infra["server/redis, packages/database"]
    end

    subgraph datos [Persistencia]
        pg[("PostgreSQL 17")]
        rd[("Redis 7")]
        s3[("MinIO / S3: bucket privado")]
    end

    nav --> proxy
    proxy --> paginas
    proxy --> rutas
    paginas --> servicios
    rutas --> servicios
    servicios --> infra
    infra --> pg
    infra --> rd
    nav -. "GET con URL firmada (60 s)" .-> s3
```

Cada flecha que cruza hacia abajo es una frontera: todo lo que llega del navegador se valida otra vez en el servidor, y ningún camino llega a la persistencia sin pasar por `server/services`. La única excepción es la descarga de documentos: el navegador va directo al bucket, pero solo con una URL que `server/storage/signer.ts` firmó para el dueño y que vence a los 60 s ([documentos.md](documentos.md)).

### La UI y los datos

- **Server Components** (páginas de `app/(public)` y `app/(portal)`) leen con `server/services`, con la identidad de la cookie (`server/auth/current-user.ts`). Las páginas del portal llaman a `requirePortalUser()`, que redirige a `/ingresar?next=…` sin sesión; un envío ajeno o inexistente responde con `notFound()`, la misma página 404.
- **Client Components** (`features/*`) solo mutan a través de `/api/v1` con `lib/api-client.ts`: mismo origen, `no-store`, un intento de `refresh` ante un 401 y lectura de `Retry-After` ante un 429. Después llaman a `router.refresh()` para volver a leer en el servidor.
- El navegador nunca envía `userId`, ni la UI recibe claves de objeto o URLs permanentes.

## ¿Qué vive en cada carpeta?

| Carpeta                                                         | Responsabilidad                                             | Estado                     |
| --------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------- |
| `src/app/(public)`                                              | Portada, rastreo, ingreso, registro y ayuda                 | Implementado (diseños S06) |
| `src/app/(portal)/portal`                                       | Mis envíos, agenda, detalle, documentos, avisos y seguridad | Implementado (diseños S06) |
| `src/app/api/v1/health`                                         | Health check contra PostgreSQL y Redis                      | Implementado               |
| `src/app/api/[...path]`                                         | 404 JSON genérico para cualquier ruta de API sin handler    | Implementado               |
| `src/app/api/v1/{auth,tracking,shipments,documents}`            | Endpoints de negocio                                        | Implementado               |
| `src/components`                                                | Componentes de UI base, cabecera y navegación               | Implementado               |
| `src/features/*`                                                | UI y lógica de presentación por dominio                     | Implementado               |
| `src/lib/{api-client,format}.ts`                                | Cliente de la API y formatos compartidos por la UI          | Implementado               |
| `src/server/storage/signer.ts`                                  | Firma de URLs de descarga (SigV4, 60 s)                     | Implementado               |
| `src/server/env.ts`                                             | Validación de variables con Zod                             | Implementado               |
| `src/server/startup.ts`, `src/instrumentation.ts`               | Arranque que falla con configuración inválida               | Implementado               |
| `src/server/logger.ts`                                          | Logs JSON sin secretos                                      | Implementado               |
| `src/server/http/responses.ts`                                  | Respuestas de error uniformes                               | Implementado               |
| `src/server/redis.ts`                                           | Cliente Redis                                               | Implementado               |
| `src/server/services/health.ts`                                 | Chequeo de dependencias con tiempo límite                   | Implementado               |
| `src/server/{auth,authorization,audit,repositories,rate-limit}` | Sesión, propiedad, bitácora, acceso a datos y límites       | Implementado               |
| `src/lib/security-headers.ts`                                   | Cabeceras y CSP, sin secretos                               | Implementado               |
| `src/proxy.ts`                                                  | Aplica la CSP y las cabeceras por petición                  | Implementado               |

## Límites que el código hace cumplir

1. **`server-only`.** Todo módulo de `src/server` y el paquete `@rutasegura/database` lo importan. Si un Client Component (`"use client"`) los importa, el build falla.
2. **ESLint.** La regla `no-restricted-imports` de [`apps/rutasegura/eslint.config.mjs`](../apps/rutasegura/eslint.config.mjs) impide que `app/(public)`, `app/(portal)`, `components` y `features` importen la base de datos, los repositorios o Redis. La UI llega a los datos solo por `server/services`.
3. **Autorización en el servidor.** Ningún endpoint acepta `userId`, `ownerId`, `actorId` ni roles desde el navegador. El dueño de un recurso se deriva de la sesión y la propiedad se comprueba por objeto (phase 9).
4. **Contratos compartidos, validación repetida.** Los esquemas Zod de `@rutasegura/contracts` los usan la UI y la API, pero la validación del servidor es la única que cuenta como control.

## Render y disponibilidad

Todo documento se renderiza en el servidor en cada petición (`await connection()` en [`layout.tsx`](../apps/rutasegura/src/app/layout.tsx)), porque la CSP usa un nonce distinto por petición. El contenido útil llega en el HTML aunque el JavaScript del cliente falle o esté desactivado. Es la respuesta directa a la pantalla negra observada en el sitio de referencia; ver [compatibilidad-navegadores.md](compatibilidad-navegadores.md).

## Despliegue

- **Local:** Docker Compose levanta la app, PostgreSQL, Redis y MinIO ([desarrollo.md](desarrollo.md)).
- **Producción:** imagen `standalone` de Next que corre sin root, o un único proyecto de Vercel con Root Directory `apps/rutasegura`. PostgreSQL, Redis y el almacenamiento S3 compatible son servicios administrados, y las migraciones corren como paso controlado del despliegue, nunca durante una petición.
