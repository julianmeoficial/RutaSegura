# Notificaciones simuladas

Los avisos que genera la agenda de entregas y los cambios de estado de un envío. La API ya está lista; la pantalla del portal se construye cuando lleguen la fase de diseño y el frontend. Esta guía explica qué existe hoy y cómo conectarlo a la UI sin romper los controles de seguridad.

El contrato HTTP de cada endpoint está en [api.md](api.md#notificaciones).

## ¿Qué existe hoy?

| Pieza         | Qué hace                                                                                                                                                         | ¿Dónde vive?                                  |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Generación    | `enqueueNotification` guarda la fila con el cuerpo fijo y registra `notification.enqueued` en el log                                                             | `server/notifications/simulate.ts`            |
| Disparadores  | Agendar (`shipment_scheduled`), reprogramar (`shipment_rescheduled`), cancelar la agenda (`shipment_unscheduled`) y cambio de estado (`shipment_status_changed`) | `server/services/shipments.ts`                |
| Tabla         | `notifications`: `user_id`, `kind`, `body`, `read_at`, `created_at`, con RLS por `app.user_id`                                                                   | migraciones `0001`, `0002` y `0003`           |
| Lectura       | `listNotificationsForUser(userId, limit)` y `GET /api/v1/notifications`                                                                                          | `server/services/notifications.ts`, `app/api` |
| Marcar leídos | `markNotificationsReadForUser(userId)` y `POST /api/v1/notifications/read`                                                                                       | los mismos                                    |
| Contratos     | `notificationSchema`, `notificationListResponseSchema`, `notificationListQuerySchema`                                                                            | `packages/contracts/src/notifications.ts`     |

No hay envío real por correo, SMS ni push: "simulada" significa que el aviso queda en la base y en el log. Si más adelante se conecta un proveedor, se llama desde `enqueueNotification` con el mismo cuerpo fijo.

## Reglas que la UI debe respetar

- **El cuerpo es fijo y no se enriquece.** Siempre es _"Hay una novedad en uno de tus envíos. Entra a RutaSegura para ver el detalle."_. La UI no debe añadir guía, ULID, nombre, teléfono, dirección, ciudad ni franja al aviso, ni en el texto ni en atributos `title` o `aria-label`. El detalle se ve entrando al envío, que sí pasa por `assertOwnership`.
- **El texto por tipo lo pone la UI.** `kind` sirve para elegir icono y título ("Entrega agendada", "Entrega reprogramada", "Agenda cancelada", "Tu envío cambió de estado"). Esos textos viven en el frontend y tampoco llevan datos del envío.
- **Un aviso no enlaza a un envío concreto.** A propósito no trae identificador del envío: el enlace va a la lista de envíos (`/envios` o la ruta que defina el diseño).
- **Nunca se pide por usuario.** La API no acepta `userId` ni `ownerId`; el usuario sale de la sesión. Un parámetro extra en la URL da `400`.

## Cómo conectarlo al portal

La arquitectura obliga a que `app/(portal)`, `components` y `features` lean datos solo mediante `server/services` (regla `no-restricted-imports` en [`eslint.config.mjs`](../apps/rutasegura/eslint.config.mjs)) y a que el contenido útil llegue renderizado en el servidor ([arquitectura.md](arquitectura.md)). Con eso, la integración queda así:

```mermaid
sequenceDiagram
    participant N as Navegador
    participant P as app/(portal)/avisos/page.tsx
    participant U as currentUser()
    participant S as services/notifications
    participant A as POST /api/v1/notifications/read
    N->>P: GET /avisos con cookie de sesión
    P->>U: cookies de la petición
    alt Sin sesión
        U-->>P: null
        P-->>N: redirect a /login
    else Sesión válida
        P->>S: listNotificationsForUser(user.id, 20)
        S-->>P: avisos y unreadCount
        P-->>N: HTML ya renderizado
        N->>A: Botón "Marcar como leídos" (fetch mismo origen)
        A-->>N: 200 {"unreadCount":0}
        N->>P: router.refresh()
    end
```

### 1. Obtener el usuario en un Server Component

`authenticate()` recibe un `Request`, que los Server Components no tienen. Cuando exista el portal, añade en `server/auth/require-user.ts` un envoltorio que construya la petición con las cabeceras reales:

```ts
import { headers } from "next/headers";

export async function currentUser(): Promise<AuthUser | null> {
  const incoming = await headers();
  const url = `${getEnv().NEXT_PUBLIC_APP_URL}/`;
  return authenticate(new Request(url, { headers: incoming }));
}
```

Así se reutiliza la misma verificación de JWT, sesión vigente y usuario existente que usan los Route Handlers. No leas ni decodifiques el JWT en la UI.

### 2. Página o panel de avisos (Server Component)

```tsx
// app/(portal)/avisos/page.tsx
import { redirect } from "next/navigation";
import { currentUser } from "@/server/auth/require-user";
import { listNotificationsForUser } from "@/server/services/notifications";
import { NotificationList } from "@/features/notifications/notification-list";

export default async function AvisosPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { notifications, unreadCount } = await listNotificationsForUser(user.id, 20);
  return <NotificationList notifications={notifications} unreadCount={unreadCount} />;
}
```

- Llama al servicio directamente, no a `fetch("/api/v1/notifications")`: evita un salto HTTP interno y no hay que reenviar cookies.
- El contador del menú (`unreadCount`) puede salir de la misma llamada en el layout del portal con `limit: 1`.
- Los tipos (`Notification`, `NotificationListResponse`) se importan de `@rutasegura/contracts`, que sí puede usarse en Client Components.

### 3. Marcar como leídos (Client Component)

```tsx
"use client";
import { useRouter } from "next/navigation";

export function MarkAllRead() {
  const router = useRouter();
  async function markAll() {
    const response = await fetch("/api/v1/notifications/read", { method: "POST" });
    if (response.ok) router.refresh();
  }
  return <button onClick={markAll}>Marcar como leídos</button>;
}
```

- `fetch` a la misma URL de origen envía las cookies `HttpOnly` sin configurar nada y el navegador añade `Origin`, que `proxy.ts` exige para las mutaciones.
- No hace falta cuerpo ni `Content-Type`. Si la respuesta es `401`, redirige a login; si es `429`, respeta `Retry-After`.
- Alternativa equivalente: una Server Action que llame a `currentUser()` y `markNotificationsReadForUser(user.id)`.

### 4. Actualización

La primera versión puede refrescar al navegar o con `router.refresh()`. Si el diseño pide avisos "en vivo", usa sondeo cada 60 s o más con la pestaña visible (`document.visibilityState`); el límite es de 60 peticiones por minuto por usuario. WebSockets o SSE quedan fuera de alcance: la CSP solo permite `connect-src 'self'` y habría que revisarla.

## Estados que el diseño debe cubrir

| Estado        | ¿Cuándo?                                    | Sugerencia                                                          |
| ------------- | ------------------------------------------- | ------------------------------------------------------------------- |
| Vacío         | `notifications: []`                         | Mensaje neutro y enlace a "Mis envíos"                              |
| Con no leídos | `unreadCount > 0`                           | Contador en el menú; los no leídos con marca visible, no solo color |
| Todo leído    | `unreadCount === 0`                         | Ocultar el contador y el botón "Marcar como leídos"                 |
| Sin sesión    | `currentUser()` es `null` o la API da `401` | Redirigir a login                                                   |
| Límite        | `429`                                       | Aviso de reintento, sin reintentos automáticos en bucle             |
| Error         | `500` o `503`                               | Mensaje genérico; nunca mostrar el cuerpo de error crudo            |

Accesibilidad: el contador debe tener texto para lectores de pantalla ("3 avisos sin leer") y la lista debe ser una lista semántica. Las fechas se muestran en `America/Bogota` con `Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota" })`.

## Pruebas al construir la UI

- **Playwright** en Chromium, WebKit y WebKit iPhone (como exige [compatibilidad-navegadores.md](compatibilidad-navegadores.md)): con Alice agendada, la página muestra 2 avisos y el contador; tras "Marcar como leídos" el contador desaparece; el HTML no contiene la guía, el ULID ni la franja.
- **Negativa:** con la sesión de Bob, la página de avisos sale vacía aunque Alice tenga avisos. Ya lo cubre el smoke de la API; la prueba de UI confirma que la pantalla no usa otra fuente.
- **Sin JavaScript:** la lista debe verse igual, porque llega renderizada en el servidor; solo el botón de marcar depende de JS (o usa un `<form>` con Server Action para que funcione sin él).

## Pendiente

- Paginación: hoy la API devuelve los `limit` más recientes (máximo 50). Si el diseño pide historial completo, añadir un cursor opaco sin exponer el UUID interno.
- Marcar un aviso individual: exigiría exponer un identificador público (ULID) por aviso y aplicar `assertOwnership` como en envíos.
- Purga a los 365 días, junto con la bitácora de envíos.
