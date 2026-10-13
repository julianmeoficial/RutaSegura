import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, Page, PageIntro } from "@/components/ui";
import { LoginForm } from "@/features/auth/login-form";
import { safeNextPath } from "@/lib/format";
import { getCurrentUser } from "@/server/auth/current-user";

export const metadata: Metadata = { title: "Iniciar sesión" };

type Props = { searchParams: Promise<{ next?: string | string[] }> };

export default async function LoginPage({ searchParams }: Props) {
  const raw = (await searchParams).next;
  const nextParam = Array.isArray(raw) ? raw[0] : raw;
  const next = safeNextPath(nextParam);

  if (await getCurrentUser()) redirect(next);

  return (
    <Page>
      <PageIntro
        eyebrow="RF-14 · A07"
        title="Inicia sesión en tu portal"
        description="La sesión vive en cookies HttpOnly: la página nunca ve ni guarda tus tokens. Tras 5 intentos fallidos la cuenta se bloquea temporalmente."
      />
      <Card>
        <LoginForm next={next} expired={nextParam !== undefined} />
      </Card>
    </Page>
  );
}
