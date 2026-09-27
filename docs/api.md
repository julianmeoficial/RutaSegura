# API

La API vive bajo `/api/v1` en el mismo origen que la interfaz. La implementan Route Handlers de Next.js en [`apps/rutasegura/src/app/api`](../apps/rutasegura/src/app/api), y sus tipos y esquemas están en [`packages/contracts`](../packages/contracts/src).

## Convenciones

| Aspecto    | Regla                                                                                                                                    |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Versión    | Prefijo `/api/v1`. Un cambio incompatible abre `/api/v2`                                                                                 |
| Formato    | JSON en peticiones y respuestas                                                                                                          |
| Caché      | Toda respuesta de API lleva `Cache-Control: no-store`                                                                                    |
| CSP        | `default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`: una respuesta JSON nunca se interpreta como documento |
| Errores    | Cuerpo `{ "error": { "code", "message" } }` con un mensaje fijo por código                                                               |
| Identidad  | El servidor deriva el usuario de la sesión. Ningún endpoint acepta `userId`, `ownerId` ni roles en el cuerpo o la URL                    |
| Validación | Esquemas Zod en el servidor, siempre, aunque la UI ya haya validado                                                                      |

Además de lo anterior, cada respuesta lleva las cabeceras de seguridad comunes descritas en [seguridad.md](seguridad.md).

## Endpoints disponibles

### `GET /api/v1/health`

Comprueba PostgreSQL y Redis en paralelo, cada uno con un tiempo límite de 2 segundos. Lo usan el healthcheck de Docker Compose y cualquier monitor externo.

Todo en orden, `200`:

```json
{ "status": "ok", "checks": { "database": "ok", "redis": "ok" } }
```

Alguna dependencia falla o no responde a tiempo, `503`:

```json
{ "status": "error", "checks": { "database": "ok", "redis": "error" } }
```

La respuesta nunca incluye mensajes de error, cadenas de conexión ni versiones. El detalle queda en el log del servidor, reducido al tipo de error:

```json
{ "level": "error", "event": "health.dependency_failed", "dependency": "redis", "kind": "Error" }
```

```mermaid
sequenceDiagram
    autonumber
    participant C as Cliente
    participant P as proxy.ts
    participant H as health/route.ts
    participant S as services/health
    participant DB as PostgreSQL
    participant R as Redis

    C->>P: GET /api/v1/health
    P->>H: CSP de API y no-store
    H->>S: checkHealth
    par En paralelo, 2 s como máximo cada uno
        S->>DB: select 1
        S->>R: PING
    end
    alt Ambas responden
        S-->>H: status ok
        H-->>C: 200
    else Alguna falla o se agota el tiempo
        S-->>H: status error y log sin detalles
        H-->>C: 503
    end
```

### Rutas inexistentes

Cualquier ruta bajo `/api/` sin handler (por ejemplo `/api/v1/no-existe`) responde con el mismo cuerpo, sea cual sea el método (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`):

```json
{ "error": { "code": "not_found", "message": "El recurso solicitado no existe." } }
```

Lo implementa [`api/[...path]/route.ts`](../apps/rutasegura/src/app/api/%5B...path%5D/route.ts). Así la API no devuelve la página HTML de error de Next ni revela qué rutas existen.

## Códigos de error

Definidos en [`packages/contracts/src/errors.ts`](../packages/contracts/src/errors.ts) y emitidos solo mediante `apiError()` de [`server/http/responses.ts`](../apps/rutasegura/src/server/http/responses.ts).

| Código                | HTTP | Mensaje                                             |
| --------------------- | ---- | --------------------------------------------------- |
| `bad_request`         | 400  | La solicitud no es válida.                          |
| `unauthorized`        | 401  | No fue posible verificar la solicitud.              |
| `forbidden`           | 403  | No tienes acceso a este recurso.                    |
| `not_found`           | 404  | El recurso solicitado no existe.                    |
| `rate_limited`        | 429  | Demasiados intentos. Vuelve a intentarlo más tarde. |
| `internal_error`      | 500  | Ocurrió un error inesperado.                        |
| `service_unavailable` | 503  | El servicio no está disponible en este momento.     |

El mensaje depende solo del código, nunca de la causa interna. Esto es deliberado: si la API respondiera distinto a "la guía no existe" y a "el segundo dato no coincide", o a "el usuario no existe" y a "la contraseña es incorrecta", entregaría un oráculo para enumerar guías o cuentas.

## Endpoints reservados

Las carpetas existen, pero todavía no tienen handler: hoy responden con el 404 genérico.

| Ruta                | Propósito                                 | Phase | Control principal                                                                    |
| ------------------- | ----------------------------------------- | ----- | ------------------------------------------------------------------------------------ |
| `/api/v1/auth`      | Registro, ingreso, TOTP, cierre de sesión | 8     | Argon2id, bloqueo progresivo, cookie `HttpOnly; Secure; SameSite=Lax`                |
| `/api/v1/tracking`  | Consulta pública de guía                  | 8     | Guía más segundo dato del destinatario, límite por IP y por guía, respuesta uniforme |
| `/api/v1/shipments` | Envíos y agenda del usuario               | 9     | `assertOwnership` por objeto, identificadores ULID, RLS en PostgreSQL                |
| `/api/v1/documents` | Descarga de soportes                      | 10    | Bucket privado y URL firmada de 60 s                                                 |

Cuando se implementen, cada una se documenta aquí con su contrato, sus errores y su prueba de autorización negativa.
