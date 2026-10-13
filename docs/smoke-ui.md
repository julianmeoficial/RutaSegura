# Smoke de UI de flujos críticos

Checklist de las pruebas de humo de la interfaz contra la **imagen de producción** (`runner`), con PostgreSQL, Redis y MinIO reales en Docker. Es la evidencia de que el frontend y el backend se comunican en autenticación, agenda y documentos sin errores críticos, y una de las condiciones del [freeze para pentest](pentest-freeze.md).

## Cómo se ejecuta

```bash
pnpm test:smoke:ui
```

El script (`scripts/e2e-flows.sh` con `APP_BUILD_TARGET=runner`) construye la imagen de producción, levanta el stack, restablece las guías RS0000000004 a RS0000000007, limpia los contadores de rate limit y corre `apps/rutasegura/e2e-flows/` en Chromium y WebKit. Para probar contra otra URL: `E2E_BASE_URL=https://… pnpm test:smoke:ui`.

| Archivo                           | Qué cubre                                                                                    |
| --------------------------------- | -------------------------------------------------------------------------------------------- |
| `e2e-flows/portal.flow.spec.ts`   | Redirección sin sesión, rastreo público y el recorrido completo del cliente                  |
| `e2e-flows/critical.flow.spec.ts` | Renovación de sesión, agenda completa, errores visibles, 429, caída de servicio y controles  |
| `e2e-flows/fixtures.ts`           | Guía y IP por motor (Chromium usa RS04/RS06, WebKit RS05/RS07) para que no compartan límites |

## Checklist

Última ejecución: **2026-10-13**, sobre `frontend_imp` en `2bd6f1f` más los cambios sin commit de la integración (sin commit todavía). Resultado: **11 pruebas OK, 1 omitida a propósito, 0 fallos**.

| #   | Flujo                                                                                                   | Prueba                                                                 | Chromium | WebKit |
| --- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------- | ------ |
| 1   | Sin sesión, `/portal/documentos` redirige a `/ingresar?next=…`                                          | `portal.flow` › sin sesión, el portal redirige al login                | OK       | OK     |
| 2   | Rastreo público con guía y segundo dato                                                                 | `portal.flow` › rastreo público con guía y segundo dato                | OK       | OK     |
| 3   | Registro con nombre XSS (se pinta escapado), login y llegada al portal                                  | `portal.flow` › flujo completo                                         | OK       | OK     |
| 4   | Vincular guía con doble dato y confirmar franja                                                         | `portal.flow` › flujo completo                                         | OK       | OK     |
| 5   | Descarga con URL firmada de 60 s, cuenta regresiva y "Enlace expirado"                                  | `portal.flow` › flujo completo                                         | OK       | OK     |
| 6   | Bitácora del envío ("Enlace de descarga generado"), 404 sin pistas y cierre de sesión                   | `portal.flow` › flujo completo                                         | OK       | OK     |
| 7   | Cabeceras en cada página pública y del portal: CSP con nonce y sin `unsafe-*`, HSTS, `nosniff`          | `critical.flow` › sesión renovada, agenda completa y controles activos | OK       | OK     |
| 8   | Agenda: confirmar, reprogramar y cancelar, con las tres entradas en "Actividad reciente"                | `critical.flow` › sesión renovada, agenda completa y controles activos | OK       | OK     |
| 9   | Sin cookie de acceso, una página del servidor renueva con el refresh y vuelve al destino                | `critical.flow` › sesión renovada, agenda completa y controles activos | OK       | OK     |
| 10  | Sin cookie de acceso, "Descargar" renueva la sesión en el cliente y descarga sin interrumpir            | `critical.flow` › sesión renovada, agenda completa y controles activos | OK       | OK     |
| 11  | Sin errores de CSP, JavaScript ni hidratación en todo el recorrido                                      | ambas pruebas de recorrido                                             | OK       | OK     |
| 12  | Rastreo: validación en el cliente y mensaje genérico para una guía inexistente                          | `critical.flow` › rastreo: errores de validación…                      | OK       | OK     |
| 13  | Rastreo: ráfaga hasta el 429, aviso con cuenta regresiva y botón deshabilitado                          | `critical.flow` › rastreo: errores de validación…                      | OK       | OK     |
| 14  | PostgreSQL caído: página "Algo salió mal" con código de referencia, API con `internal_error` genérico   | `critical.flow` › servicio caído                                       | OK       | N/A    |
| 15  | PostgreSQL caído: el log del contenedor tiene `page.unhandled_error` y no la consulta ni sus parámetros | `critical.flow` › servicio caído                                       | OK       | N/A    |
| 16  | Recuperación: con PostgreSQL de vuelta, el portal carga sin reiniciar la aplicación                     | `critical.flow` › servicio caído                                       | OK       | N/A    |

La prueba de caída detiene PostgreSQL con `docker compose stop` y solo corre en Chromium: el comportamiento es del servidor, no del navegador, y repetirla no aporta evidencia.

Complementan este checklist el smoke de API (`pnpm test:smoke`, 49 pruebas, incluidas las 14 de `smoke/integration.smoke.test.ts` que verifican contratos, cookies, rotación del refresh, agenda, documentos, errores y 429) y las pruebas unitarias.

## Registro de defectos

Severidades: **crítico** (bloquea un flujo o expone datos), **alto**, **medio** y **bajo**.

**Defectos críticos abiertos: 0**

| ID     | Severidad | Flujo                     | Pasos                                                | Esperado                                           | Obtenido                                                                                                   | Estado                                                                                                                                          |
| ------ | --------- | ------------------------- | ---------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| DEF-01 | Medio     | Portal con servicio caído | Iniciar sesión, detener PostgreSQL y abrir `/portal` | Página genérica y un evento estructurado en el log | La página era genérica, pero Next escribía en stderr el error de Drizzle con la consulta y el ID de sesión | Corregido: `server/portal/page-data.ts` cambia el error por `PageDataError` y registra `page.unhandled_error`; lo cubren unitarias y la fila 15 |

### Observaciones sin impacto

| ID     | Severidad | Observación                                                                                                                                                                                                                               |
| ------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OBS-01 | Bajo      | WebKit reporta como error de página las precargas RSC (`?_rsc=`) que Next cancela al navegar ("due to access control checks"). No es CSP ni CORS: son peticiones abortadas del mismo origen. La prueba las excluye con un patrón acotado. |
| OBS-02 | Bajo      | Ante un fallo de servidor, Next imprime en stderr `PageDataError: internal_error` con su `digest`. No contiene datos y el mismo `digest` aparece en la página de error, lo que permite correlacionar un reporte del usuario con el log.   |
| OBS-03 | Bajo      | La subida de documentos no existe en la UI ni en la API: el alcance de esta versión es solo descarga, y queda fuera del pentest.                                                                                                          |

Para reportar un defecto nuevo, añade una fila con el siguiente ID y actualiza la línea "Defectos críticos abiertos". `scripts/freeze-check.sh` falla si esa cifra no es 0.
