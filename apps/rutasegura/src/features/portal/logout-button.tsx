"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconLogout } from "@/components/icons";
import { Button } from "@/components/ui";
import { apiRequest } from "@/lib/api-client";

/** Cierra la sesión en el servidor, que deja de aceptar el acceso vigente, y vuelve al login. */
export function LogoutButton({ variant = "soft" }: { variant?: "soft" | "danger" | "ghost" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    await apiRequest("/api/v1/auth/logout", { method: "POST", refreshOnUnauthorized: false });
    router.replace("/ingresar");
    router.refresh();
  }

  return (
    <Button variant={variant} onClick={onClick} disabled={pending} loading={pending}>
      {pending ? null : <IconLogout size={18} />}
      {pending ? "Cerrando…" : "Cerrar sesión"}
    </Button>
  );
}
