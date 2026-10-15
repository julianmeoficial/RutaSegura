# RutaSegura

Plataforma de seguimiento de envíos segura por diseño. Es una única aplicación full-stack de Next.js: la interfaz, la API (`/api/v1`) y la lógica de servidor viven en el mismo proyecto, se construyen juntas y se despliegan como un solo servicio.

RutaSegura corrige desde el diseño las debilidades encontradas en el análisis HTTP del sitio de rastreo que tomamos como referencia, y funciona igual en navegadores **WebKit y Chromium**: cada pull request se prueba en ambos motores antes de llegar a `main`.

El proyecto está en el Sprint 3: la API, la interfaz pública y el portal autenticado (envíos, agenda y documentos con URL firmada) están integrados y listos para desplegar. La versión 0.4.0 es la que se congela para el pentest ([docs/pentest-freeze.md](docs/pentest-freeze.md)).

## Arranque rápido

Requisitos: Node.js 22 o superior, pnpm 11 (`corepack enable`) y Docker con Compose v2.

```bash
cp .env.example .env
pnpm docker:up
curl -i http://localhost:3000/api/v1/health
```

Compose levanta la app, PostgreSQL 17, Redis 7 y MinIO (bucket privado de documentos). El health check responde `200` cuando PostgreSQL y Redis responden. La interfaz queda en `http://localhost:3000`. Si ya tienes PostgreSQL o Redis locales ocupando los puertos, consulta [docs/desarrollo.md](docs/desarrollo.md#puertos-ocupados).

## Scripts

| Comando                                | Qué hace                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------ |
| `pnpm dev`                             | Servidor de desarrollo                                                   |
| `pnpm build`                           | Build de producción                                                      |
| `pnpm lint`                            | ESLint en todos los paquetes                                             |
| `pnpm typecheck`                       | TypeScript en todos los paquetes                                         |
| `pnpm test`                            | Pruebas unitarias                                                        |
| `pnpm test:e2e`                        | Pruebas en Chromium, WebKit y WebKit iPhone                              |
| `pnpm test:smoke`                      | Smoke de la API contra Docker                                            |
| `pnpm test:e2e:flows`                  | Flujos de UI en Chromium y WebKit (Docker)                               |
| `pnpm test:smoke:ui`                   | Smoke de UI contra la imagen de producción                               |
| `./scripts/freeze-check.sh`            | Verificación completa del freeze                                         |
| `pnpm pentest:up` / `pnpm pentest:dev` | Entorno aislado de pentest en `127.0.0.1:3100` (producción o dev server) |
| `pnpm pentest:restore`                 | Restaura el snapshot `pre-pentest`                                       |
| `pnpm format`                          | Prettier                                                                 |
| `pnpm db:generate` / `pnpm db:migrate` | Migraciones                                                              |
| `pnpm db:seed`                         | Datos ficticios de desarrollo                                            |
| `pnpm docker:up` / `pnpm docker:down`  | Entorno completo                                                         |

## Documentación

| Documento                                                           | Contenido                                                                     |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [Arquitectura](docs/arquitectura.md)                                | Capas, fronteras de confianza y límites del código                            |
| [API](docs/api.md)                                                  | Contrato de `/api/v1` y códigos de error                                      |
| [Paquetes](docs/paquetes.md)                                        | Workspace, dependencias y versiones                                           |
| [Seguridad](docs/seguridad.md)                                      | Hallazgos del sitio de referencia y controles de RutaSegura                   |
| [Autenticación](docs/autenticacion.md)                              | Argon2id, bloqueo, JWT, rate limiting, rastreo de doble dato y auditoría      |
| [Documentos](docs/documentos.md)                                    | Bucket privado, URL firmada de 60 s y evidencia de que no es público          |
| [Compatibilidad de navegadores](docs/compatibilidad-navegadores.md) | WebKit y Chromium como criterio de aceptación                                 |
| [Desarrollo](docs/desarrollo.md)                                    | Entorno local, ramas (`feat/`, `fix/`, `hotfix/`, `chore/`, `docs/`), PR y CI |
| [Datos de prueba](docs/datos-de-prueba.md)                          | Guías ficticias, cuentas demo para iniciar sesión y límites                   |
| [Smoke de UI](docs/smoke-ui.md)                                     | Checklist de flujos críticos y registro de defectos                           |
| [Freeze para pentest](docs/pentest-freeze.md)                       | Tag, rama, alcance, objetivo, datos de prueba y checklist firmado por la SM   |
| [Entorno de pentest](docs/entorno-pentest.md)                       | Stack aislado con datos ficticios, snapshot restaurable y declaración ética   |
| [CHANGELOG](CHANGELOG.md)                                           | Historial de versiones                                                        |

## Equipo

- Julián Espitia: backend y seguridad
- Mónica Vellojín: diseño, interfaz y frontend
- Alexa Ricardo: Product Owner
- Karina Redondo: Scrum Master

Cada PR hacia `main` requiere CI en verde y la aprobación del otro dev.
