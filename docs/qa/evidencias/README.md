# Evidencias del QA manual (28/10/2026)

Capturas tomadas por Karina Redondo Sáez en el despliegue (https://ruta-segura-one.vercel.app/). Las de las cuentas de María y la cuenta propia se recortaron para mostrar solo el navegador. Las que dicen `edge` son de Microsoft Edge.

| Archivo | Qué muestra | Fila del QA |
| --- | --- | --- |
| `01-v2-login-429-cuenta-regresiva.png` | «Demasiados intentos» con cuenta regresiva en el inicio de sesión | V2, V13 |
| `02-` y `03-rastreo-datos-correctos-*.png` | Rastreo de RS0000000009 con sus 4 dígitos y su recorrido | Rastreo con doble dato |
| `04-rastreo-dato-errado-mensaje-generico.png` | Guía existente con dígitos errados: mensaje genérico | V7, rastreo |
| `05-rastreo-guia-inexistente-mensaje-generico.png` | Guía inexistente: el mismo mensaje | V7, rastreo |
| `06-`, `07-` y `08-v4-maria-*.png` | María no ve la guía de Ana y no puede vincularla | V4 |
| `09-v12-descarga-enlace-vigente.png` y `10-v12-descarga-enlace-expirado.png` | Enlace de descarga vigente y luego expirado | V12 |
| `11-`, `12-` y `13-agenda-*.png` | Franja seleccionada, reprogramada y cancelada | Agenda |
| `14-cuenta-propia-vincular-guia-libre.png` | Guía RS0000000013 vinculada a una cuenta propia | Vincular guía |
| `15-`, `16-` y `17-*-edge.png` | HSTS, nosniff, X-Frame-Options y CSP con nonce sin `unsafe-*` | V9, V14 |
| `18-v4-ana-agenda-con-guia-009-edge.png` | Ana sí ve RS0000000009 | V4 |
| `19-v3-cerrar-sesion-atras-edge.png` | Tras cerrar sesión y pulsar Atrás vuelve a `/ingresar` | V3 |
| `20-` y `21-v4-operador-*-edge.png` | El operador no ve envíos y no puede vincular la guía ajena | V4 |

No se incluyen capturas donde se veía una contraseña.
