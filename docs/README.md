# Documentación de RutaSegura

| Documento                                                      | Contenido                                                                                         |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| [arquitectura.md](arquitectura.md)                             | Aplicación única de Next.js, capas, fronteras de confianza y límites que el código hace cumplir   |
| [api.md](api.md)                                               | Convenciones de `/api/v1`, endpoints disponibles, códigos de error y endpoints reservados         |
| [paquetes.md](paquetes.md)                                     | Paquetes del workspace, qué exporta cada uno y versiones fijadas                                  |
| [seguridad.md](seguridad.md)                                   | Hallazgos del sitio de referencia frente a los controles de RutaSegura, CSP, cabeceras y secretos |
| [compatibilidad-navegadores.md](compatibilidad-navegadores.md) | Por qué y cómo RutaSegura funciona igual en WebKit y Chromium, con evidencia                      |
| [desarrollo.md](desarrollo.md)                                 | Entorno local, scripts, ramas, pull requests y protección de `main`                               |

El historial de cambios está en [CHANGELOG.md](../CHANGELOG.md).

## Orden de lectura sugerido

- **Desarrollo:** arquitectura, desarrollo, api y paquetes.
- **QA y pentesting:** seguridad y compatibilidad de navegadores. Cada control indica dónde vive en el código y cómo verificarlo.
- **Informe del TCC:** seguridad y compatibilidad de navegadores, que traducen cada hallazgo del análisis HTTP en un control con evidencia.

## Mantener la documentación al día

Una PR que cambie un endpoint, una cabecera, una variable de entorno o el flujo de trabajo actualiza el documento correspondiente y el CHANGELOG en la misma PR.
