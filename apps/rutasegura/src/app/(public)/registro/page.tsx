import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/features/auth/auth-shell";
import { RegisterForm } from "@/features/auth/register-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegisterPage() {
  return (
    <AuthShell
      title="Crea tu cuenta"
      description="Guarda tus envíos, elige cuándo recibirlos y ten tus documentos a mano."
      footer={
        <>
          ¿Ya tienes cuenta? <Link href="/ingresar">Inicia sesión</Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
