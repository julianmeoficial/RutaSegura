# Checklist ASVS L1 (v4.0)

Resultado: OK / NO / N/A / Parcial. Solo se registra lo ejecutado a mano el 28/10/2026 por Karina Redondo Sáez en el despliegue. Lo que no se probó a mano se deja como «No ejecutado».

| Capítulo | Qué se espera | Resultado | Fecha | Responsable | Evidencia / nota |
| --- | --- | --- | --- | --- | --- |
| V2 Autenticación | Contraseñas robustas, bloqueo y mensajes que no filtran cuentas | Parcial | 28/10/2026 | Karina Redondo | Tras varios intentos fallidos de inicio de sesión la web mostró «Demasiados intentos. Vuelve a intentar en MM:SS» con cuenta regresiva y botón deshabilitado (captura). No ejecutados a mano: el bloqueo de cuenta tras 5 fallos y la política de contraseña |
| V3 Sesión | Cookies seguras, rotación y cierre de sesión | Parcial | 28/10/2026 | Karina Redondo | Cerrar sesión y pulsar Atrás lleva a `/ingresar?next=%2Fportal` con «Inicia sesión para continuar donde ibas» (captura). No ejecutados: atributos de las cookies y rotación del refresh |
| V4 Control de acceso | Autorización por objeto, sin IDOR | OK | 28/10/2026 | Karina Redondo | María vio solo sus guías RS0000000018 y 19; vincular la guía de Ana (RS0000000009) dio el mensaje genérico y no se agregó. Con Ana la guía sí aparece. El operador intentó vincularla y recibió el mismo mensaje (3 capturas) |
| V5 Validación, XSS y SQLi | Validación en servidor, salida escapada, consultas parametrizadas | No ejecutado | | | No se probó a mano |
| V7 Errores y registro | Sin fugas, logs de seguridad | Parcial | 28/10/2026 | Karina Redondo | El rastreo con dato errado y con guía inexistente devolvió el mismo mensaje: «No pudimos verificar la información. Revisa los datos o intenta más tarde.» La actividad del envío mostró «Enlace de descarga generado» (tras recargar). No se revisaron los logs del servidor |
| V8 Protección de datos | Datos sensibles fuera de logs y caché | Parcial | 28/10/2026 | Karina Redondo | `Cache-Control: private, no-cache, no-store` en `/ingresar` (captura de cabeceras). No se revisaron logs |
| V9 Comunicaciones | HSTS y TLS en el despliegue | OK | 28/10/2026 | Karina Redondo | HTTPS en Vercel y `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (captura de cabeceras en Edge) |
| V12 Archivos | Descarga controlada | OK | 28/10/2026 | Karina Redondo | Con María, «Guía de transporte.pdf»: «Enlace vigente» con cuenta regresiva y luego «Enlace expirado»: «el enlace dura un minuto» (2 capturas). No hay subida |
| V13 API | Contratos estrictos, CORS y límite de peticiones | Parcial | 28/10/2026 | Karina Redondo | Límite de peticiones observado en el inicio de sesión (429 con cuenta regresiva). CORS no ejecutado a mano |
| V14 Configuración | Cabeceras y secretos (sin credenciales de ejemplo) | Parcial | 28/10/2026 | Karina Redondo | CSP con nonce y sin `unsafe-inline` ni `unsafe-eval`, `nosniff`, `X-Frame-Options: DENY`, `Permissions-Policy` y `Referrer-Policy` (capturas en Edge). Pendiente: confirmar que no hay `X-Powered-By`. Las cuentas demo con contraseña pública son intencionales (`docs/datos-de-prueba.md`) |
