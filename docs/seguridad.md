# Seguridad

RutaSegura se diseña para no repetir las debilidades del [análisis observacional del protocolo HTTP](https://app.notion.com/p/5d02fd524dd54d9882a908a2ee04bbc6) del sitio de rastreo que tomamos como referencia. Aquel análisis fue pasivo: navegación normal, lectura de cabeceras y una petición `HEAD`. Cualquier prueba activa se hace solo contra RutaSegura, en un entorno aislado y con datos ficticios.

> **Disponibilidad en WebKit y Chromium.** El hallazgo más grave del sitio de referencia no estaba en las cabeceras: su vista de rastreo se quedaba en negro en navegadores Chromium y solo funcionaba en Safari. RutaSegura trata la compatibilidad con ambos motores como un control de seguridad (disponibilidad), y cada PR la verifica en CI. Detalle y evidencia en [compatibilidad-navegadores.md](compatibilidad-navegadores.md).

## Hallazgos del sitio de referencia y controles de RutaSegura

| Hallazgo | Qué se observó                                             | Control en RutaSegura                                                                             | Dónde vive                            |
| -------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------- |
| H-00     | Vista de rastreo en negro en Chromium, funcional en WebKit | Render en servidor, cero terceros, verificación en Chromium, WebKit y WebKit iPhone en cada PR    | `layout.tsx`, `e2e/smoke.spec.ts`, CI |
| H-01     | Ambiente de pruebas público e indexable                    | `X-Robots-Tag: noindex, nofollow` en todo entorno distinto de producción                          | `proxy.ts`                            |
| H-02     | `X-Powered-By: PHP/8.2.33`                                 | `poweredByHeader: false`                                                                          | `next.config.ts`                      |
| H-03     | CSP con `'unsafe-inline'` y `'unsafe-eval'`                | CSP con nonce por petición y `'strict-dynamic'`; sin `unsafe-*` en producción                     | `security-headers.ts`, `proxy.ts`     |
| H-04     | Cookies con `SameSite=None` y sin `HttpOnly`               | Cookie de sesión propia `HttpOnly; Secure; SameSite=Lax`, sin cookies de terceros                 | Phase 8                               |
| H-05     | Infraestructura compartida entre pruebas y producción      | Secretos por entorno; la app no arranca en producción con valores de ejemplo                      | `env.ts`, `startup.ts`                |
| H-06     | Seis orígenes de terceros confiados en la CSP              | Ningún origen externo en la CSP; sin scripts, fuentes ni estilos de terceros                      | `security-headers.ts`                 |
| H-07     | `connect-src` e `img-src` con comodín `https:`             | `connect-src 'self'`; `img-src 'self' blob: data:`                                                | `security-headers.ts`                 |
| H-08     | HSTS sin `preload`                                         | `max-age=63072000; includeSubDomains; preload` sobre HTTPS                                        | `proxy.ts`                            |
| H-09     | Sin `COOP`, `COEP` ni `CORP`                               | Las tres cabeceras en todas las respuestas; el documento queda `crossOriginIsolated`              | `security-headers.ts`                 |
| H-10     | HTML cacheado un año en caché compartida                   | `Cache-Control: no-store` en la API; documentos renderizados por petición con `private, no-store` | `proxy.ts`, `layout.tsx`              |
| H-11     | Banner `server` y `ETag` expuestos                         | `generateEtags: false`; sin cabecera `Server` con producto o versión                              | `next.config.ts`                      |
| H-12     | Política de indexación distinta entre dominios             | Una sola política, decidida por `APP_ENV`                                                         | `proxy.ts`                            |

Los hallazgos H-03, H-04, H-06 y H-07 forman una sola cadena de ataque en el sitio de referencia: se puede inyectar un script, la cookie es legible, el destino de exfiltración está permitido y un tercero puede ser la puerta de entrada. RutaSegura rompe los cuatro eslabones a la vez.

## Recorrido de una petición

[`proxy.ts`](../apps/rutasegura/src/proxy.ts) se ejecuta en toda petición salvo los recursos estáticos de `_next` y las precargas de navegación.

```mermaid
flowchart TD
    req["Petición entrante"] --> api{"¿Ruta /api/?"}
    api -- "Sí" --> apiCsp["CSP de API: default-src 'none'"]
    apiCsp --> noStore["Cache-Control: no-store"]
    api -- "No" --> nonce["Genera nonce de 16 bytes"]
    nonce --> docCsp["CSP de documento con el nonce"]
    docCsp --> reqHeader["Pasa la CSP a Next para firmar sus scripts"]
    noStore --> https{"¿Llega por HTTPS?"}
    reqHeader --> https
    https -- "Sí" --> hsts["HSTS con preload y upgrade-insecure-requests"]
    https -- "No" --> env{"¿APP_ENV es production?"}
    hsts --> env
    env -- "No" --> robots["X-Robots-Tag: noindex, nofollow"]
    env -- "Sí" --> resp["Respuesta"]
    robots --> resp
```

Las cabeceras fijas (`X-Content-Type-Options`, `X-Frame-Options`, `Permissions-Policy`, COOP, COEP, CORP y demás) las añade `next.config.ts` a todas las rutas, incluidos los recursos estáticos.

## Política de seguridad de contenido

La CSP de los documentos se construye en [`security-headers.ts`](../apps/rutasegura/src/lib/security-headers.ts). En producción es:

```text
default-src 'self';
script-src 'self' 'nonce-<aleatorio>' 'strict-dynamic';
style-src 'self' 'nonce-<aleatorio>';
img-src 'self' blob: data:;
font-src 'self';
connect-src 'self';
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
frame-src 'none';
worker-src 'self';
manifest-src 'self';
upgrade-insecure-requests
```

| Directiva                                   | Por qué                                                                                                                               |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `script-src` con nonce y `'strict-dynamic'` | Solo corren los scripts que Next firma con el nonce de esa petición. Un script inyectado no conoce el nonce y el navegador lo bloquea |
| `style-src` con nonce                       | Sin estilos en línea arbitrarios. Los estilos van en hojas CSS propias                                                                |
| `connect-src 'self'`                        | Un script comprometido no puede enviar datos a otro dominio                                                                           |
| `object-src 'none'`, `frame-src 'none'`     | Sin plugins ni iframes                                                                                                                |
| `frame-ancestors 'none'`                    | Nadie puede incrustar RutaSegura en un iframe (clickjacking)                                                                          |
| `base-uri 'self'`, `form-action 'self'`     | Impide redirigir rutas relativas o formularios a otro dominio                                                                         |
| `upgrade-insecure-requests`                 | Solo sobre HTTPS; ver [compatibilidad-navegadores.md](compatibilidad-navegadores.md)                                                  |

El nonce se genera con `crypto.getRandomValues` en cada petición, así que ningún documento se puede servir desde caché con un nonce viejo.

En desarrollo, y solo ahí, la CSP añade `'unsafe-eval'` en scripts y `'unsafe-inline'` en estilos: React usa `eval` para reconstruir trazas de error y la recarga en caliente de Next inyecta estilos sin nonce. La imagen de producción no los incluye, y una prueba unitaria lo verifica.

## Cabeceras comunes

| Cabecera                       | Valor                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------ |
| `X-Content-Type-Options`       | `nosniff`                                                                            |
| `X-Frame-Options`              | `DENY`                                                                               |
| `Referrer-Policy`              | `strict-origin-when-cross-origin`                                                    |
| `Permissions-Policy`           | Deniega cámara, micrófono, geolocalización, pagos, USB, sensores y `browsing-topics` |
| `Cross-Origin-Opener-Policy`   | `same-origin`                                                                        |
| `Cross-Origin-Embedder-Policy` | `require-corp`                                                                       |
| `Cross-Origin-Resource-Policy` | `same-origin`                                                                        |
| `Origin-Agent-Cluster`         | `?1`                                                                                 |
| `X-DNS-Prefetch-Control`       | `off`                                                                                |
| `Strict-Transport-Security`    | `max-age=63072000; includeSubDomains; preload`, solo sobre HTTPS                     |

## Configuración y secretos

- Solo se versiona `.env.example`. `.env` y sus variantes están en `.gitignore` y en `.dockerignore`.
- [`env.ts`](../apps/rutasegura/src/server/env.ts) valida todas las variables con Zod: URLs con protocolo esperado (`postgres`, `redis`), secretos de al menos 32 caracteres y vigencia de URL firmada de 300 s como máximo.
- Con `APP_ENV=production`, la validación además rechaza secretos que conserven valores de ejemplo y una `NEXT_PUBLIC_APP_URL` sin HTTPS.
- La validación corre al arrancar ([`startup.ts`](../apps/rutasegura/src/server/startup.ts)). Si falla, el proceso termina con código 1, para que el orquestador lo marque como caído en lugar de dejar un servidor mal configurado atendiendo peticiones.
- El error de validación nombra las variables inválidas y nunca muestra sus valores.

## Errores y logs

- Los errores de la API tienen un mensaje fijo por código ([api.md](api.md#códigos-de-error)): casos equivalentes responden igual, sin trazas ni detalles internos.
- [`logger.ts`](../apps/rutasegura/src/server/logger.ts) escribe JSON con metadatos (evento, dependencia, tipo de error). `errorKind()` reduce cada error a su nombre, porque el mensaje de un error de conexión puede contener la cadena de conexión.

## Contenedores

- La imagen de producción corre como el usuario `nextjs` (uid 1001), no como root.
- Compose publica PostgreSQL y Redis solo en `127.0.0.1`, nunca en la red local.
- Las credenciales de `compose.yaml` son locales y de ejemplo; producción usa servicios administrados con secretos propios.

## Controles pendientes

| Control                                                                                     | Riesgo OWASP | Phase   |
| ------------------------------------------------------------------------------------------- | ------------ | ------- |
| Hash Argon2id, bloqueo progresivo por cuenta e IP, TOTP opcional, rotación de sesión        | A07          | 8       |
| Rastreo con guía más segundo dato del destinatario, límite de intentos y respuesta uniforme | A01          | 8       |
| `assertOwnership` en cada endpoint privado, ULID, RLS en PostgreSQL y bitácora de auditoría | A01, A09     | 9       |
| Bucket privado y URLs firmadas de corta duración                                            | A05          | 10      |
| Checklist ASVS L1, pentesting y re-test antes/después                                       | Todas        | 14 a 17 |

## Cómo verificarlo

```bash
curl -sI https://<dominio>/            # CSP con nonce, COOP, COEP, CORP, HSTS
curl -si https://<dominio>/api/v1/health
pnpm test                              # CSP, proxy, entorno y health check
pnpm test:e2e                          # Chromium, WebKit y WebKit iPhone
```
