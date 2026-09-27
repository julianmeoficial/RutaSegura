## Historia de Jira

SCRUM-

## Qué cambia

-

## Definition of Done de seguridad

- [ ] Toda entrada nueva se valida en el servidor con Zod (la validación del cliente no cuenta como control).
- [ ] Los endpoints privados derivan el dueño de la sesión y comprueban propiedad del objeto; ningún `userId`, `ownerId` o rol llega desde el navegador.
- [ ] Hay una prueba de autorización negativa (usuario A sobre recurso de B → respuesta genérica).
- [ ] Los errores usan `apiError` y no distinguen casos equivalentes ni exponen trazas.
- [ ] No se añadieron scripts, estilos ni fuentes de terceros, ni excepciones a la CSP.
- [ ] No hay secretos, datos personales reales ni `.env` en el diff.
- [ ] La pantalla o flujo afectado se revisó en Chromium y en WebKit (CI `browsers` en verde).

## Evidencia

Capturas o salida de comandos que se adjuntan a la tarjeta de Jira.
