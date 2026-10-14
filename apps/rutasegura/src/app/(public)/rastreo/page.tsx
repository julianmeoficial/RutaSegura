import type { Metadata } from "next";
import { Page, PageIntro } from "@/components/ui";
import { TrackingPanel } from "@/features/tracking/tracking-panel";

export const metadata: Metadata = { title: "Rastreo seguro" };

export default function TrackingPage() {
  return (
    <Page>
      <PageIntro
        eyebrow="RF-05 · A01 / A07"
        title="Rastrea tu envío sin exponer tus datos"
        description="El número de guía no basta. Pedimos un segundo dato para comprobar que eres la persona destinataria y limitar la enumeración de envíos."
      />
      <TrackingPanel />
    </Page>
  );
}
