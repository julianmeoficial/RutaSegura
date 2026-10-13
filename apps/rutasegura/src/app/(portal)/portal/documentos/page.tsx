import type { Metadata } from "next";
import { Alert, ButtonLink, Card, CardTitle, EmptyState, PageIntro } from "@/components/ui";
import { DocumentList } from "@/features/documents/document-list";
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
        eyebrow="RF-09 · A01 / A05"
        title="Tus documentos, sin enlaces públicos"
        description="Los soportes viven en un bucket privado. Cada descarga crea una URL firmada al pulsar el botón, válida por 60 segundos."
      />
      <Card labelledBy="documents-title">
        <CardTitle id="documents-title">Documentos de tus envíos</CardTitle>
        {documents.length > 0 ? (
          <DocumentList documents={documents} trackingNumbers={trackingNumbers} />
        ) : (
          <EmptyState
            title="Sin documentos"
            description="Cuando un envío tuyo tenga soportes (guía, factura o prueba de entrega), aparecerán aquí."
            action={
              <ButtonLink href="/portal" variant="soft">
                Ir a Mis envíos
              </ButtonLink>
            }
          />
        )}
        <Alert>
          Ningún documento tiene una dirección permanente. Sin firma, o con la firma vencida, el
          almacenamiento responde 403.
        </Alert>
      </Card>
    </>
  );
}
