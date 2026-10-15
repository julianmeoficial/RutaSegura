import type { Metadata } from "next";
import { Page, PageIntro } from "@/components/ui";
import { TrackingPanel } from "@/features/tracking/tracking-panel";

export const metadata: Metadata = { title: "Rastrear envío" };

export default function TrackingPage() {
  return (
    <Page>
      <PageIntro
        eyebrow="Rastreo"
        title="Rastrea tu envío"
        description="Escribe la guía y los últimos 4 dígitos del teléfono de quien recibe el paquete. No necesitas cuenta."
      />
      <TrackingPanel showSample />
    </Page>
  );
}
