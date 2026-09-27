# RutaSegura

Plataforma de seguimiento de envíos segura por diseño. Es una única aplicación full-stack de Next.js: la interfaz, la API (`/api/v1`) y la lógica de servidor viven en el mismo proyecto, se construyen juntas y se despliegan como un solo servicio.

RutaSegura corrige desde el diseño las debilidades encontradas en el análisis HTTP del sitio de rastreo que tomamos como referencia, y funciona igual en navegadores **WebKit y Chromium**: cada pull request se prueba en ambos motores antes de llegar a `main`.

El proyecto está en el Sprint 0: la base técnica y la API están listas; las pantallas llegan con los mockups de Figma.

## Arranque rápido

Requisitos: Node.js 22 o superior, pnpm 11 (`corepack enable`) y Docker con Compose v2.

```bash
cp .env.example .env
pnpm docker:up
curl -i http://localhost:3000/api/v1/health
```

Compose levanta la app, PostgreSQL 17 y Redis 7. El health check responde `200` cuando ambas dependencias responden. Si ya tienes PostgreSQL o Redis locales ocupando los puertos, consulta [docs/desarrollo.md](docs/desarrollo.md#puertos-ocupados).

## Scripts

| Comando                                | Qué hace                                    |
| -------------------------------------- | ------------------------------------------- |
| `pnpm dev`                             | Servidor de desarrollo                      |
| `pnpm build`                           | Build de producción                         |
| `pnpm lint`                            | ESLint en todos los paquetes                |
| `pnpm typecheck`                       | TypeScript en todos los paquetes            |
| `pnpm test`                            | Pruebas unitarias                           |
| `pnpm test:e2e`                        | Pruebas en Chromium, WebKit y WebKit iPhone |
| `pnpm test:smoke`                      | Smoke de autenticación contra Docker        |
| `pnpm format`                          | Prettier                                    |
| `pnpm db:generate` / `pnpm db:migrate` | Migraciones                                 |
| `pnpm db:seed`                         | Datos ficticios de desarrollo               |
| `pnpm docker:up` / `pnpm docker:down`  | Entorno completo                            |

## Documentación

| Documento                                                           | Contenido                                                                     |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [Arquitectura](docs/arquitectura.md)                                | Capas, fronteras de confianza y límites del código                            |
| [API](docs/api.md)                                                  | Contrato de `/api/v1` y códigos de error                                      |
| [Paquetes](docs/paquetes.md)                                        | Workspace, dependencias y versiones                                           |
| [Seguridad](docs/seguridad.md)                                      | Hallazgos del sitio de referencia y controles de RutaSegura                   |
| [Autenticación](docs/autenticacion.md)                              | Argon2id, bloqueo, JWT, rate limiting, rastreo de doble dato y auditoría      |
| [Compatibilidad de navegadores](docs/compatibilidad-navegadores.md) | WebKit y Chromium como criterio de aceptación                                 |
| [Desarrollo](docs/desarrollo.md)                                    | Entorno local, ramas (`feat/`, `fix/`, `hotfix/`, `chore/`, `docs/`), PR y CI |
| [CHANGELOG](CHANGELOG.md)                                           | Historial de versiones                                                        |

## Equipo

- Julián Espitia: backend y seguridad
- Mónica Vellojín: diseño, interfaz y frontend
- Alexa Ricardo: Product Owner
- Karina Redondo: Scrum Master

Cada PR hacia `main` requiere CI en verde y la aprobación del otro dev.
