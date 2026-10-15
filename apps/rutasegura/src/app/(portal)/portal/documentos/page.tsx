import type { Metadata } from "next";
import { IconLock } from "@/components/icons";
import { ButtonLink, EmptyState, PageIntro } from "@/components/ui";
import { DocumentList } from "@/features/documents/document-list";
import styles from "@/features/portal/portal.module.css";
import { requirePortalUser } from "@/server/auth/current-user";
import { pageData } from "@/server/portal/page-data";
import { listDocumentsForUser } from "@/server/services/documents";
import { listShipmentsForUser } from "@/server/services/shipments";

export const metadata: Metadata = { title: "Documentos" };

export default async function DocumentsPage() {
  const user = await requirePortalUser("/portal/documentos");
  const [documents, shipments] = await pageData("portal.documents", () =>
    Promise.all([listDocumentsForUser(user.id), listShipmentsForUser(user.id)]),
  );
  const trackingNumbers = Object.fromEntries(shipments.map((s) => [s.id, s.trackingNumber]));

  return (
    <>
      <PageIntro
        eyebrow="Documentos"
        title="Tus documentos"
        description="Guías de transporte, facturas y soportes de entrega de tus envíos."
      />
      <p className={styles.notePlain}>
        <IconLock size={16} />
        Cada descarga crea un enlace privado que dura un minuto.
      </p>
      {documents.length > 0 ? (
        <DocumentList documents={documents} trackingNumbers={trackingNumbers} />
      ) : (
        <EmptyState
          title="Aún no hay documentos"
          description="Cuando uno de tus envíos tenga guía, factura o soporte de entrega, lo encontrarás aquí."
          action={<ButtonLink href="/portal">Ir a Mis envíos</ButtonLink>}
        />
      )}
    </>
  );
}
