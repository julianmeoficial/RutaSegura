"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DocumentSummary, DownloadUrlResponse } from "@rutasegura/contracts";
import { IconDownload, IconFile, IconRefresh } from "@/components/icons";
import { Button, Chip } from "@/components/ui";
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

/** Abre el enlace temporal: el almacenamiento responde con `Content-Disposition: attachment`. */
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
  const active = link !== null && !expired;
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
      <div className={styles.docMain}>
        <span className={styles.docIcon} aria-hidden="true">
          <IconFile size={22} />
          <span className={styles.docType}>{MIME_LABEL[doc.mimeType] ?? "Archivo"}</span>
        </span>
        <div className={styles.docInfo}>
          <p id={titleId} className={styles.docName}>
            {doc.fileName}
          </p>
          <p className={styles.docMeta}>
            {sizeLabel(doc.sizeBytes)} · {dateLabel(doc.createdAt)}
            {trackingNumber ? ` · Guía ${trackingNumber}` : ""}
          </p>
        </div>
        <div className={styles.docAction}>
          <Button
            variant={expired ? "soft" : active ? "secondary" : "primary"}
            onClick={requestLink}
            disabled={pending || limited || active}
            loading={pending}
            aria-describedby={titleId}
          >
            {pending ? null : expired ? <IconRefresh size={18} /> : <IconDownload size={18} />}
            {pending ? "Generando enlace…" : expired ? "Generar enlace" : "Descargar"}
          </Button>
        </div>
      </div>

      {link ? (
        <div className={styles.docStatus} aria-live="polite">
          {active ? (
            <>
              <div className={styles.docStatusTop}>
                <Chip tone="success">Enlace vigente · {countdownLabel(remaining)}</Chip>
                <span className={styles.docHint}>
                  ¿No empezó?{" "}
                  <a href={link.url} rel="noopener noreferrer">
                    Descargar de nuevo
                  </a>
                </span>
              </div>
              <span className={styles.validity} key={link.deadline} aria-hidden="true">
                <span className={styles.validityFill} />
              </span>
            </>
          ) : (
            <div className={styles.docStatusTop}>
              <Chip tone="neutral">Enlace expirado</Chip>
              <span className={styles.docHint}>
                Por seguridad, el enlace dura un minuto. Genera uno nuevo para descargar otra vez.
              </span>
            </div>
          )}
        </div>
      ) : null}
      <ApiErrorAlert failure={failure} context="documents" />
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
