"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DocumentSummary, DownloadUrlResponse } from "@rutasegura/contracts";
import { Actions, Alert, Button, Chip, Muted } from "@/components/ui";
import { apiRequest } from "@/lib/api-client";
import { MIME_LABEL, countdownLabel, dateLabel, sizeLabel } from "@/lib/format";
import {
  ApiErrorAlert,
  useRateLimitActive,
  type ApiFailure,
} from "@/features/shared/api-error-alert";
import { useCountdown } from "@/features/shared/use-countdown";
import styles from "@/features/portal/portal.module.css";

type Link = { url: string; deadline: number };

/** Abre la URL firmada: el almacenamiento responde con `Content-Disposition: attachment`. */
function startDownload(url: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.rel = "noopener noreferrer";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}

function DocumentItem({
  document: doc,
  trackingNumber,
}: {
  document: DocumentSummary;
  trackingNumber?: string;
}) {
  const router = useRouter();
  const [link, setLink] = useState<Link | null>(null);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [pending, setPending] = useState(false);
  const remaining = useCountdown(link?.deadline ?? null);
  const limited = useRateLimitActive(failure);
  const expired = link !== null && remaining <= 0;
  const titleId = `doc-${doc.id}`;

  async function requestLink() {
    setPending(true);
    const result = await apiRequest<DownloadUrlResponse>(
      `/api/v1/documents/${encodeURIComponent(doc.id)}/download-url`,
      { method: "POST" },
    );
    setPending(false);
    if (result.ok) {
      setFailure(null);
      setLink({ url: result.data.url, deadline: Date.now() + result.data.expiresIn * 1000 });
      startDownload(result.data.url);
      return;
    }
    if (result.code === "unauthorized") {
      router.replace("/ingresar?next=/portal/documentos");
      return;
    }
    setLink(null);
    setFailure({ ...result, at: Date.now() });
  }

  return (
    <li className={styles.doc} aria-labelledby={titleId}>
      <div className={styles.docTop}>
        <div>
          <p id={titleId} className={styles.docName}>
            {doc.fileName}
          </p>
          <Muted>
            {MIME_LABEL[doc.mimeType] ?? doc.mimeType} · {sizeLabel(doc.sizeBytes)} ·{" "}
            {dateLabel(doc.createdAt)}
            {trackingNumber ? ` · ${trackingNumber}` : ""}
          </Muted>
        </div>
        {link && !expired ? (
          <Chip tone="success">Enlace vigente · {countdownLabel(remaining)}</Chip>
        ) : null}
        {expired ? <Chip tone="neutral">Enlace expirado</Chip> : null}
      </div>

      <div aria-live="polite">
        {link && !expired ? (
          <Muted>
            La descarga empezó. Si no se abrió,{" "}
            <a href={link.url} rel="noopener noreferrer">
              descárgalo de nuevo
            </a>{" "}
            antes de que venza el enlace.
          </Muted>
        ) : null}
        {expired ? (
          <Alert tone="warning">
            La URL firmada dura 60 s y ya venció: el almacenamiento la rechaza. Genera un enlace
            nuevo para descargar otra vez.
          </Alert>
        ) : null}
      </div>
      <ApiErrorAlert failure={failure} context="documents" />

      <Actions>
        <Button
          variant={expired ? "soft" : "primary"}
          onClick={requestLink}
          disabled={pending || limited || (link !== null && !expired)}
          aria-describedby={titleId}
        >
          {pending ? "Generando enlace…" : expired ? "Generar enlace" : "Descargar"}
        </Button>
      </Actions>
    </li>
  );
}

export function DocumentList({
  documents,
  trackingNumbers,
}: {
  documents: DocumentSummary[];
  /** Guía de cada envío, para la vista con documentos de varios envíos. */
  trackingNumbers?: Record<string, string>;
}) {
  return (
    <ul className={styles.docs} aria-label="Documentos">
      {documents.map((doc) => (
        <DocumentItem
          key={doc.id}
          document={doc}
          trackingNumber={trackingNumbers?.[doc.shipmentId]}
        />
      ))}
    </ul>
  );
}
