import type { Metadata } from "next";
import Link from "next/link";
import { IconArrowLeft, IconCheck } from "@/components/icons";
import { Alert, ButtonLink, Mono, PageIntro, Section } from "@/components/ui";
import styles from "@/features/portal/portal.module.css";
import { ScheduleForm } from "@/features/schedules/schedule-form";
import { AuditTimeline } from "@/features/shipments/audit-timeline";
import { canSchedule } from "@/features/shipments/shipment-list";
import { STATUS_LABEL, calendarDateLabel, slotLabel } from "@/lib/format";
import { requirePortalUser } from "@/server/auth/current-user";
import { loadOwnedShipment } from "@/server/portal/load";

export const metadata: Metadata = { title: "Agendar entrega" };

type Props = { params: Promise<{ id: string }> };

export default async function ShipmentAgendaPage({ params }: Props) {
  const { id } = await params;
  const user = await requirePortalUser(`/portal/envios/${encodeURIComponent(id)}/agenda`);
  const { shipment } = await loadOwnedShipment(id, user.id, "portal.shipment_agenda");

  return (
    <>
      <Link href={`/portal/envios/${shipment.id}`} className={styles.back}>
        <IconArrowLeft size={18} />
        Envío {shipment.trackingNumber}
      </Link>
      <PageIntro
        eyebrow={<Mono>Guía {shipment.trackingNumber}</Mono>}
        title={shipment.window ? "Cambia tu entrega" : "¿Cuándo quieres recibirlo?"}
        description="Elige un día hábil y una franja de dos horas. Puedes cambiarla mientras el paquete no haya salido a reparto."
      />

      <div className={styles.detail}>
        <div className={styles.detailMain}>
          {canSchedule(shipment) ? (
            <ScheduleForm
              shipmentId={shipment.id}
              current={shipment.window}
              nowIso={new Date().toISOString()}
            />
          ) : (
            <>
              <Alert tone="warning">
                Este envío está {STATUS_LABEL[shipment.status].label.toLowerCase()}, así que ya no
                se puede agendar ni cambiar la entrega.
              </Alert>
              <div>
                <ButtonLink href={`/portal/envios/${shipment.id}`}>Volver al envío</ButtonLink>
              </div>
            </>
          )}
        </div>

        <div className={styles.detailSide}>
          <section
            className={styles.delivery}
            data-set={shipment.window ? "" : undefined}
            aria-labelledby="agenda-confirmation"
          >
            <h2 id="agenda-confirmation" className={styles.deliveryLabel}>
              Tu entrega
            </h2>
            {shipment.window ? (
              <div className={styles.when} key={`${shipment.window.date}-${shipment.window.slot}`}>
                <span className={styles.whenIcon}>
                  <IconCheck size={22} />
                </span>
                <div>
                  <p className={styles.whenDate}>{calendarDateLabel(shipment.window.date)}</p>
                  <p className={styles.whenSlot}>De {slotLabel(shipment.window.slot)}</p>
                </div>
              </div>
            ) : (
              <p className={styles.deliveryText}>Todavía no has elegido una franja.</p>
            )}
          </section>
          <Section id="agenda-activity" title="Cambios recientes">
            <AuditTimeline audit={shipment.audit} limit={5} />
          </Section>
        </div>
      </div>
    </>
  );
}
