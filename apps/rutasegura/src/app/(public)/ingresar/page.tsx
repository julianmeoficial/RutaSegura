import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/features/auth/auth-shell";
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
    <AuthShell
      title="Inicia sesión"
      description="Entra para ver tus envíos, agendar entregas y descargar tus documentos."
      footer={
        <>
          ¿No tienes cuenta? <Link href="/registro">Crea una gratis</Link>
        </>
      }
    >
      <LoginForm next={next} expired={nextParam !== undefined} />
    </AuthShell>
  );
}
