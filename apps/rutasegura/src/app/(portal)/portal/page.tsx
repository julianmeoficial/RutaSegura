import type { Metadata } from "next";
import {
  Alert,
  ButtonLink,
  Card,
  CardHeader,
  CardTitle,
  EmptyState,
  Muted,
  PageIntro,
} from "@/components/ui";
import { ClaimForm } from "@/features/shipments/claim-form";
import { ShipmentList, needsSchedule } from "@/features/shipments/shipment-list";
import styles from "@/features/portal/portal.module.css";
import { requirePortalUser } from "@/server/auth/current-user";
import { pageData } from "@/server/portal/page-data";
import { listDocumentsForUser } from "@/server/services/documents";
import { listShipmentsForUser } from "@/server/services/shipments";

export const metadata: Metadata = { title: "Mis envíos" };

const timeFormat = new Intl.DateTimeFormat("es-CO", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Bogota",
});

export default async function PortalHomePage() {
  const user = await requirePortalUser("/portal");
  const [shipments, documents] = await pageData("portal.home", () =>
    Promise.all([listShipmentsForUser(user.id), listDocumentsForUser(user.id)]),
  );

  const documentCounts = new Map<string, number>();
  for (const document of documents) {
    documentCounts.set(document.shipmentId, (documentCounts.get(document.shipmentId) ?? 0) + 1);
  }
  const kpis = [
    {
      label: "En tránsito",
      value: shipments.filter((s) =>
        ["created", "in_transit", "out_for_delivery"].includes(s.status),
      ).length,
    },
    { label: "Por agendar", value: shipments.filter(needsSchedule).length },
    { label: "Entregados", value: shipments.filter((s) => s.status === "delivered").length },
  ];

  return (
    <>
      <PageIntro
        eyebrow="RF-06 · A01"
        title="Tus envíos, y solo los tuyos"
        description="El servidor obtiene la identidad desde la sesión. La interfaz nunca envía un userId."
      />

      <Card labelledBy="summary-title">
        <CardHeader>
          <div>
            <CardTitle id="summary-title">Resumen</CardTitle>
            <Muted>Actualizado hoy, {timeFormat.format(new Date())}</Muted>
          </div>
        </CardHeader>
        <ul className={styles.kpis}>
          {kpis.map((kpi) => (
            <li key={kpi.label} className={styles.kpi}>
              <p className={styles.kpiLabel}>{kpi.label}</p>
              <p className={styles.kpiValue}>{kpi.value}</p>
            </li>
          ))}
        </ul>
        {shipments.length > 0 ? (
          <ShipmentList shipments={shipments} documentCounts={documentCounts} />
        ) : (
          <EmptyState
            title="Sin envíos"
            description="Aún no tienes guías vinculadas. Vincula una con su número y los 4 dígitos del teléfono, o rastréala sin iniciar sesión."
            action={
              <ButtonLink href="/rastreo" variant="soft">
                Rastrear guía
              </ButtonLink>
            }
          />
        )}
        <Alert>
          La lista ya llega filtrada por tu sesión. Cambiar un identificador en la URL no permite
          acceder a otro envío.
        </Alert>
      </Card>

      <Card labelledBy="claim-title">
        <CardTitle id="claim-title">Vincular una guía</CardTitle>
        <Muted>
          Pedimos el mismo doble dato del rastreo. Una guía vinculada a otra cuenta responde igual
          que una inexistente.
        </Muted>
        <ClaimForm />
      </Card>
    </>
  );
}
