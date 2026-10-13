import type { Metadata } from "next";
import { Card, Page, PageIntro } from "@/components/ui";
import { RegisterForm } from "@/features/auth/register-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegisterPage() {
  return (
    <Page>
      <PageIntro
        eyebrow="RF-14 · A07"
        title="Crea tu cuenta"
        description="La respuesta es la misma exista o no el correo: así nadie puede usar este formulario para averiguar quién tiene cuenta."
      />
      <Card>
        <RegisterForm />
      </Card>
    </Page>
  );
}
