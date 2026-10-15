# Documentación de RutaSegura

| Documento                                                      | Contenido                                                                                                         |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| [arquitectura.md](arquitectura.md)                             | Aplicación única de Next.js, capas, fronteras de confianza y límites que el código hace cumplir                   |
| [api.md](api.md)                                               | Convenciones de `/api/v1`, endpoints disponibles, códigos de error y endpoints reservados                         |
| [paquetes.md](paquetes.md)                                     | Paquetes del workspace, qué exporta cada uno y versiones fijadas                                                  |
| [seguridad.md](seguridad.md)                                   | Hallazgos del sitio de referencia frente a los controles de RutaSegura, CSP, cabeceras y secretos                 |
| [autenticacion.md](autenticacion.md)                           | Argon2id, bloqueo de cuenta, JWT y cookies, rate limiting, rastreo de doble dato y auditoría                      |
| [notificaciones.md](notificaciones.md)                         | Avisos simulados: API disponible y guía para conectarlos a la UI del portal                                       |
| [compatibilidad-navegadores.md](compatibilidad-navegadores.md) | Por qué y cómo RutaSegura funciona igual en WebKit y Chromium, con evidencia                                      |
| [datos-de-prueba.md](datos-de-prueba.md)                       | Guías ficticias con sus dígitos, cuentas demo para iniciar sesión, límites y cómo reiniciar                       |
| [desarrollo.md](desarrollo.md)                                 | Entorno local, scripts, ramas, pull requests y protección de `main`                                               |
| [smoke-ui.md](smoke-ui.md)                                     | Checklist del smoke de UI de flujos críticos contra la imagen de producción y registro de defectos                |
| [pentest-freeze.md](pentest-freeze.md)                         | Versión congelada para el pentest: tag, rama, alcance, cómo levantarla y checklist de la SM                       |
| [entorno-pentest.md](entorno-pentest.md)                       | Entorno Docker aislado para ensayar el pentest: datos ficticios, snapshot restaurable y declaración ética         |
| [despliegue.md](despliegue.md)                                 | Vercel con Supabase (Postgres y Storage) y Upstash: conexiones, RLS, migración, semilla, variables y verificación |

El historial de cambios está en [CHANGELOG.md](../CHANGELOG.md).

## Orden de lectura sugerido

- **Desarrollo:** arquitectura, desarrollo, api y paquetes.
- **Diseño y frontend:** arquitectura (capas y reglas de importación) y notificaciones, que muestra el patrón para conectar una pantalla del portal a un servicio.
- **QA y pentesting:** pentest-freeze (empieza aquí), datos-de-prueba, entorno-pentest para ensayar en local, smoke-ui, seguridad, autenticación y compatibilidad de navegadores. Cada control indica dónde vive en el código y cómo verificarlo.
- **Informe del TCC:** seguridad, autenticación y compatibilidad de navegadores, que traducen cada hallazgo del análisis HTTP y cada riesgo OWASP en un control con evidencia.

## Mantener la documentación al día

Una PR que cambie un endpoint, una cabecera, una variable de entorno o el flujo de trabajo actualiza el documento correspondiente y el CHANGELOG en la misma PR.
