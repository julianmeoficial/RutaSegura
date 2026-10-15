# Datos de prueba

Todos los datos ficticios de RutaSegura en un solo lugar: guías, cuentas para iniciar sesión, límites que conviene conocer y cómo volver al estado inicial. Ningún dato es real. Salen de la semilla ([packages/database/src/seed.ts](../packages/database/src/seed.ts)), que se aplica al levantar Docker y en cada despliegue.

## Empezar en un minuto

1. Abre la app (`http://localhost:3000` con `docker compose up`, o `http://127.0.0.1:3100` con `pnpm pentest:dev`).
2. Rastrea sin cuenta: guía `RS0000000009`, últimos 4 dígitos `7070`. Va en reparto.
3. Inicia sesión con `ana.demo@rutasegura.test` y la contraseña `RutaSegura-Demo-2026`. Verás dos envíos, un aviso sin leer y documentos para descargar.

## Cuentas para iniciar sesión

### Cuentas demo

Existen en todos los entornos, también en el despliegue de Vercel. La contraseña es pública a propósito para poder mostrar el portal: **no es un hallazgo del pentest**. No guardes nada importante en ellas.

| Correo                      | Contraseña             | Guías vinculadas           | Qué muestra                                                    |
| --------------------------- | ---------------------- | -------------------------- | -------------------------------------------------------------- |
| `ana.demo@rutasegura.test`  | `RutaSegura-Demo-2026` | RS0000000009, RS0000000010 | Un envío en reparto y uno entregado, con documentos y un aviso |
| `luis.demo@rutasegura.test` | `RutaSegura-Demo-2026` | RS0000000011, RS0000000012 | Un envío con novedad y uno recién creado, listo para agendar   |

Como las comparte todo el equipo, cualquiera puede haber cambiado su franja de entrega o leído sus avisos. Si alguien falla 5 veces la contraseña, la cuenta se bloquea un rato (ver [Límites](#límites-que-afectan-a-quien-prueba)).

### Cuentas propias

Cualquier persona puede crear una cuenta en `/registro`. La contraseña debe tener entre 12 y 128 caracteres. Para probar con datos ficticios, usa un dominio reservado, por ejemplo `tu-nombre@pentest.example`.

### Cuentas del entorno de pentest

`pnpm pentest:up` registra tres cuentas más en el entorno aislado ([entorno-pentest.md](entorno-pentest.md)). Su contraseña se genera al crear el entorno y está en `PENTEST_ACCOUNT_PASSWORD` de `.env.pentest`; no está en el repositorio.

| Correo                  | Guía vinculada |
| ----------------------- | -------------- |
| `alice@pentest.example` | RS0000000001   |
| `bob@pentest.example`   | RS0000000003   |
| `carol@pentest.example` | RS0000000004   |

### Cuentas de las pruebas automáticas

Las pruebas crean y borran sus propias cuentas con dominios reservados: `smoke.test` (smoke de la API), `flows.test` (flujos de UI) y `example.org` (pruebas unitarias). No las uses a mano: las pruebas las reinician.

## Guías

Para rastrear o vincular una guía hacen falta el número y los últimos 4 dígitos del teléfono del destinatario. Una guía vinculada a una cuenta ya no se puede vincular a otra.

| Guía         | 4 dígitos | Estado      | Recorrido                     | Documentos                  | Uso                                    |
| ------------ | --------- | ----------- | ----------------------------- | --------------------------- | -------------------------------------- |
| RS0000000001 | 4321      | En tránsito | Bogotá → Medellín             | Guía de transporte, Factura | Libre; smoke de autenticación y agenda |
| RS0000000002 | 9876      | Entregado   | Cali → Barranquilla           | Sin documentos              | Libre; smoke de autenticación          |
| RS0000000003 | 5555      | En tránsito | Bogotá → Cartagena            | Soporte de entrega          | Smoke de documentos                    |
| RS0000000004 | 1111      | En tránsito | Medellín → Turbaco            | Guía de transporte          | Flujos de UI en Chromium               |
| RS0000000005 | 2222      | En tránsito | Cali → Pasto                  | Guía de transporte          | Flujos de UI en WebKit                 |
| RS0000000006 | 3333      | En tránsito | Bogotá → Tunja                | Guía de transporte          | Smoke de UI crítico en Chromium        |
| RS0000000007 | 4444      | En tránsito | Medellín → Manizales          | Guía de transporte          | Smoke de UI crítico en WebKit          |
| RS0000000008 | 6666      | En tránsito | Cali → Popayán                | Guía de transporte          | Smoke de integración                   |
| RS0000000009 | 7070      | En reparto  | Bogotá → La Dorada → Medellín | Guía de transporte, Factura | Demo: Ana                              |
| RS0000000010 | 8080      | Entregado   | Cali → Armenia → Pereira      | Soporte de entrega          | Demo: Ana                              |
| RS0000000011 | 9090      | Novedad     | Barranquilla → Cartagena      | Guía de transporte          | Demo: Luis                             |
| RS0000000012 | 1212      | Creado      | Bucaramanga                   | Sin documentos              | Demo: Luis                             |

- **Para rastrear sin cuenta,** sirve cualquier guía.
- **Para vincular una guía a una cuenta nueva,** usa RS0000000001 o RS0000000002. Las de las pruebas automáticas (RS0000000003 a RS0000000008) también funcionan, pero las pruebas las desvinculan al correr.
- **Las guías demo** (RS0000000009 a RS0000000012) ya tienen dueño: al vincularlas desde otra cuenta, la respuesta es la misma que para una guía inexistente.
- **Para ver el rechazo,** usa una guía con dígitos equivocados (RS0000000001 con `0000`) o una guía que no existe (RS0000000099). Las dos responden igual, a propósito.

Los PDF están en [packages/database/fixtures/documents](../packages/database/fixtures/documents). Son documentos ficticios de una página; el bucket los guarda con un nombre opaco.

## Límites que afectan a quien prueba

| Acción                       | Límite                                       | Qué verás                                              |
| ---------------------------- | -------------------------------------------- | ------------------------------------------------------ |
| Rastrear o vincular una guía | 5 intentos cada 15 min, por IP y por guía    | Aviso "Demasiados intentos" con cuenta regresiva       |
| Iniciar sesión               | 10 intentos cada 15 min, por IP y por correo | El mismo aviso                                         |
| Contraseña equivocada        | 5 fallos seguidos bloquean la cuenta 5 min   | El bloqueo se duplica en cada repetición, hasta 1 hora |
| Enlace de descarga           | Dura 60 segundos                             | Pasado ese tiempo, pide un enlace nuevo                |

El detalle está en [autenticacion.md](autenticacion.md#rate-limiting).

## Volver al estado inicial

| Entorno                       | Cómo                                                                                            |
| ----------------------------- | ----------------------------------------------------------------------------------------------- |
| Docker de desarrollo          | `docker compose down --volumes` y `docker compose up -d --wait`                                 |
| Solo contadores de rate limit | `docker compose exec redis sh -c "redis-cli --scan --pattern 'rl:*' \| xargs -r redis-cli del"` |
| Entorno de pentest            | `pnpm pentest:restore` ([entorno-pentest.md](entorno-pentest.md#snapshot-y-restauración))       |

La semilla es idempotente: volver a ejecutarla (`docker compose run --rm migrate`) no duplica guías, documentos ni cuentas, y no reescribe los cambios hechos sobre ellas.
