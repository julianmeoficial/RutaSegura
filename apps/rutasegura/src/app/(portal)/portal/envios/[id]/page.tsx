import type { Metadata } from "next";
import Link from "next/link";
import { IconArrowLeft, IconMapPin } from "@/components/icons";
import { ButtonLink, Chip, Mono, Muted, PageIntro, Section } from "@/components/ui";
import { DocumentList } from "@/features/documents/document-list";
import styles from "@/features/portal/portal.module.css";
import { AuditTimeline } from "@/features/shipments/audit-timeline";
import { RouteTimeline } from "@/features/shipments/route-timeline";
import { canSchedule } from "@/features/shipments/shipment-list";
import { ShipmentProgress } from "@/features/shipments/shipment-progress";
import {
  STATUS_INFO,
  STATUS_LABEL,
  calendarDateLabel,
  dateTimeLabel,
  slotLabel,
} from "@/lib/format";
import { requirePortalUser } from "@/server/auth/current-user";
import { loadOwnedShipment } from "@/server/portal/load";

export const metadata: Metadata = { title: "Detalle del envío" };

type Props = { params: Promise<{ id: string }> };

export default async function ShipmentDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await requirePortalUser(`/portal/envios/${encodeURIComponent(id)}`);
  const { shipment, documents } = await loadOwnedShipment(id, user.id, "portal.shipment");
  const status = STATUS_LABEL[shipment.status];
  const info = STATUS_INFO[shipment.status];
  const latest = shipment.events.at(-1);
  const schedulable = canSchedule(shipment);

  return (
    <>
      <Link href="/portal" className={styles.back}>
        <IconArrowLeft size={18} />
        Mis envíos
      </Link>
      <PageIntro
        eyebrow={<Mono>Guía {shipment.trackingNumber}</Mono>}
        title={info.headline}
        description={info.description}
        aside={<Chip tone={status.tone}>{status.label}</Chip>}
      />

      <section className={styles.hero} aria-label="Avance del envío">
        {latest ? (
          <p className={styles.heroWhere}>
            <IconMapPin size={18} />
            <span className={styles.whereText}>
              <span>{latest.city}</span>
              <span aria-hidden="true" className={styles.whereSep}>
                ·
              </span>
              <Mono>{dateTimeLabel(latest.occurredAt)}</Mono>
            </span>
          </p>
        ) : null}
        <ShipmentProgress status={shipment.status} />
      </section>

      <div className={styles.detail}>
        <div className={styles.detailMain}>
          <Section id="shipment-route" title="Recorrido">
            <RouteTimeline events={shipment.events} />
          </Section>
          <Section id="shipment-audit" title="Actividad en tu cuenta">
            <AuditTimeline audit={shipment.audit} />
          </Section>
        </div>

        <div className={styles.detailSide}>
          <section
            className={styles.delivery}
            data-set={shipment.window ? "" : undefined}
            aria-labelledby="shipment-delivery"
          >
            <h2 id="shipment-delivery" className={styles.deliveryLabel}>
              Entrega
            </h2>
            {shipment.window ? (
              <>
                <p className={styles.whenDate}>{calendarDateLabel(shipment.window.date)}</p>
                <p className={styles.whenSlot}>De {slotLabel(shipment.window.slot)}</p>
              </>
            ) : (
              <p className={styles.deliveryText}>
                {schedulable
                  ? "Aún no has elegido cuándo recibirlo. Escoge el día y la franja que mejor te queden."
                  : shipment.status === "delivered"
                    ? "Este envío ya fue entregado."
                    : "El paquete ya salió a reparto; la entrega es hoy."}
              </p>
            )}
            {schedulable ? (
              <ButtonLink
                href={`/portal/envios/${shipment.id}/agenda`}
                variant={shipment.window ? "secondary" : "primary"}
              >
                {shipment.window ? "Cambiar la entrega" : "Agendar entrega"}
              </ButtonLink>
            ) : null}
          </section>

          <Section id="shipment-documents" title="Documentos">
            {documents.length > 0 ? (
              <DocumentList documents={documents} />
            ) : (
              <Muted>Este envío no tiene documentos.</Muted>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}
