import type { Metadata } from "next";
import type { ShipmentSummary } from "@rutasegura/contracts";
import { Alert, ButtonLink, EmptyState, PageIntro, Section } from "@/components/ui";
import { firstName } from "@/components/site-header";
import { ClaimPanel } from "@/features/shipments/claim-form";
import { ShipmentList, needsSchedule } from "@/features/shipments/shipment-list";
import styles from "@/features/portal/portal.module.css";
import { bogotaToday, slotLabel, calendarDateLabel } from "@/lib/format";
import { requirePortalUser } from "@/server/auth/current-user";
import { pageData } from "@/server/portal/page-data";
import { listDocumentsForUser } from "@/server/services/documents";
import { listShipmentsForUser } from "@/server/services/shipments";

export const metadata: Metadata = { title: "Mis envíos" };

const ACTIVE = new Set(["created", "in_transit", "out_for_delivery", "exception"]);

/** Próxima entrega agendada desde hoy, para destacarla arriba. */
function nextDelivery(shipments: ShipmentSummary[]): ShipmentSummary | null {
  const today = bogotaToday();
  return (
    shipments
      .filter((s) => s.window && s.window.date >= today && s.status !== "delivered")
      .sort((a, b) =>
        `${a.window!.date}${a.window!.slot}`.localeCompare(`${b.window!.date}${b.window!.slot}`),
      )[0] ?? null
  );
}

export default async function PortalHomePage() {
  const user = await requirePortalUser("/portal");
  const [shipments, documents] = await pageData("portal.home", () =>
    Promise.all([listShipmentsForUser(user.id), listDocumentsForUser(user.id)]),
  );

  const documentCounts = new Map<string, number>();
  for (const document of documents) {
    documentCounts.set(document.shipmentId, (documentCounts.get(document.shipmentId) ?? 0) + 1);
  }
  const issues = shipments.filter((s) => s.status === "exception").length;
  const active = shipments.filter((s) => ACTIVE.has(s.status)).length;
  const toSchedule = shipments.filter(needsSchedule).length;
  const delivered = shipments.filter((s) => s.status === "delivered").length;
  const upcoming = nextDelivery(shipments);

  return (
    <>
      <PageIntro
        eyebrow={`Hola, ${firstName(user.fullName)}`}
        title="Mis envíos"
        description="Sigue tus paquetes, elige cuándo recibirlos y descarga sus documentos."
        aside={
          <dl className={styles.stats}>
            <div className={styles.statMain}>
              <dt>En camino</dt>
              <dd className={styles.bigNumber}>{active}</dd>
            </div>
            <div className={styles.statLine}>
              <div>
                <dt>Por agendar</dt>
                <dd>{toSchedule}</dd>
              </div>
              <div>
                <dt>Entregados</dt>
                <dd>{delivered}</dd>
              </div>
            </div>
          </dl>
        }
      />

      {upcoming?.window ? (
        <section className={styles.next} aria-labelledby="next-title">
          <h2 id="next-title" className={styles.nextLabel}>
            Tu próxima entrega
          </h2>
          <p className={styles.nextWhen}>
            {calendarDateLabel(upcoming.window.date)}, de {slotLabel(upcoming.window.slot)}
          </p>
          <p className={styles.nextGuide}>Guía {upcoming.trackingNumber}</p>
          <ButtonLink href={`/portal/envios/${upcoming.id}`} variant="primary">
            Ver envío
          </ButtonLink>
        </section>
      ) : null}

      {issues > 0 ? (
        <Alert tone="warning" live>
          {issues === 1
            ? "Uno de tus envíos tiene una novedad. Te avisaremos apenas avance."
            : `${issues} envíos tienen una novedad. Te avisaremos apenas avancen.`}
        </Alert>
      ) : null}

      <Section id="shipments-title" title="Tus envíos">
        {shipments.length > 0 ? (
          <ShipmentList shipments={shipments} documentCounts={documentCounts} />
        ) : (
          <EmptyState
            title="Aún no tienes envíos"
            description="Agrega tu primer envío con la guía y los 4 dígitos del teléfono, o rastréalo sin agregarlo."
            action={<ButtonLink href="/rastreo">Rastrear un envío</ButtonLink>}
          />
        )}
      </Section>

      <ClaimPanel defaultOpen={shipments.length === 0} />
    </>
  );
}
