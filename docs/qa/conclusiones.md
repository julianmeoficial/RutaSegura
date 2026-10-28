# QA funcional y checklist ASVS L1: conclusiones (SCRUM-23)

> **Actualización del 28/10/2026.** Después de esta verificación documental, Karina Redondo ejecutó pruebas manuales en el despliegue. Su resultado está en `datos-del-ensayo.md`, `checklist-asvs-l1.md`, `criterios-aceptacion-po.md` y `defectos.md`. Lo que no se probó a mano sigue marcado como no ejecutado.
>
> **Alcance de este documento.** Es una **verificación documental** hecha el 25/10/2026 contra `docs/`, el smoke de API y el smoke de UI del 13/10/2026. **No es una ejecución manual.** Las pruebas manuales de la PO se registran en las plantillas de esta carpeta, solo cuando se ejecuten. La decisión y la firma son de la PO (Alexa Ricardo) y siguen pendientes.

## 1. Datos del ensayo

| Campo | Valor |
| --- | --- |
| Tipo de verificación | Documental (repositorio, smoke de API y smoke de UI) |
| Fecha de la verificación | 25/10/2026 |
| Smoke de UI usado como evidencia | 13/10/2026, commit `2bd6f1f` (`docs/smoke-ui.md`) |
| Commit del freeze | Por confirmar por Julián (`6db8835` o `e56e54d`) |
| Entorno | Imagen de producción local (smoke) y despliegue en Vercel |

## 2. Checklist ASVS nivel 1 (v4.0)

| Capítulo | Qué se espera | Evidencia documental | Estado |
| --- | --- | --- | --- |
| V2 Autenticación | Contraseñas robustas, bloqueo, mensajes que no filtran cuentas | Argon2id, política de 12 a 128 caracteres, bloqueo progresivo, mensaje uniforme (`docs/autenticacion.md`). TOTP no implementado | Cumple por evidencia; TOTP pendiente declarado |
| V3 Sesión | Cookies seguras, rotación, cierre de sesión | HttpOnly, SameSite=Lax, refresh rotativo, logout revoca (smoke de API; UI filas 6 y 9) | Cumple por evidencia |
| V4 Control de acceso | Autorización por objeto, sin IDOR | 404 uniforme ante envío ajeno, RLS (`docs/seguridad.md`; UI fila 6) | Cumple por evidencia |
| V5 Validación, XSS y SQLi | Validación en servidor, salida escapada | Zod, nombre con XSS mostrado como texto (UI fila 3), 30 casos de SQLi | Cumple por evidencia |
| V7 Errores y registro | Sin fugas, logs de seguridad | DEF-01 corregido (UI filas 14 y 15), eventos `security.auth_failure` y `access_denied` | Cumple por evidencia |
| V8 Protección de datos | Datos sensibles fuera de logs y caché | Campos redactados, IP solo como HMAC, `no-store` en la API | Cumple por evidencia |
| V9 Comunicaciones | HSTS y TLS | HSTS verificado en la imagen de producción (UI fila 7). TLS del despliegue lo provee Vercel | Cumple por evidencia |
| V12 Archivos | Descarga controlada | Bucket privado, URL firmada de 60 s (UI fila 5). Subida inexistente (OBS-03) | Cumple por evidencia; subida N/A |
| V13 API | Contratos estrictos, CORS, límite de peticiones | CORS con lista permitida, 429 con Retry-After (UI filas 12 y 13) | Cumple por evidencia |
| V14 Configuración | Cabeceras y secretos | CSP con nonce sin `unsafe-*` (UI fila 7) | Cumple en cabeceras; falta confirmar que el despliegue no usa credenciales de ejemplo |

## 3. Criterios de aceptación de la PO (sprints 1 a 3)

| Criterio | Evidencia | Estado |
| --- | --- | --- |
| Registro, inicio y cierre de sesión | `docs/smoke-ui.md`, filas 1 a 6 | Cumple por smoke |
| Rastreo con doble dato y 429 | Filas 2, 12 y 13 | Cumple por smoke |
| Vincular guía, agendar, reprogramar y cancelar | Fila 8 | Cumple por smoke |
| Descarga con enlace temporal y «Enlace expirado» | Fila 5; `docs/documentos.md` | Cumple por smoke |
| Notificaciones simuladas | `docs/notificaciones.md`; smoke de API | Cumple por smoke |
| Pantalla de Documentos frente a Figma | Comparación visual | **Pendiente** |
| Casos por rol | `docs/datos-de-prueba.md` | **Parcial**: administrador sin interfaz (RF-13 pendiente) |

## 4. Defectos

Defectos críticos abiertos: **0** (`docs/smoke-ui.md`).

| ID | Descripción | Severidad | Estado |
| --- | --- | --- | --- |
| DEF-01 | Log con consulta SQL e ID de sesión si cae la base de datos | Media | Corregido |
| OBS-01 a OBS-03 | Precargas canceladas en WebKit, digest en el log, subida de documentos inexistente | Baja | Sin impacto o fuera de alcance |

## 5. Conclusión y Go/No-Go (propuesta)

**Propuesta: GO con condiciones**, a confirmar por la PO. Motivo: 0 defectos críticos abiertos y ningún capítulo V2, V3, V4, V5 o V12 con resultado negativo en la evidencia documental.

Condiciones:
1. Julián confirma el commit del freeze en `docs/pentest-freeze.md`.
2. Se confirma que el despliegue no usa credenciales de ejemplo.
3. Se compara la pantalla de Documentos con el prototipo de Figma.
4. Quedan declarados como pendientes: TOTP, RF-10 (cotización) y RF-13 (auditoría del administrador).
5. La PO ejecuta a mano las plantillas de esta carpeta antes de dar la tarea por cerrada.

**Fecha de la decisión:** pendiente · **Firma PO (Alexa Ricardo):** pendiente
