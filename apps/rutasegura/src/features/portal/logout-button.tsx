"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import { apiRequest } from "@/lib/api-client";

/** Revoca la sesión en el servidor (y con ella el JWT vigente) y vuelve al login. */
export function LogoutButton({ variant = "soft" }: { variant?: "soft" | "danger" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    await apiRequest("/api/v1/auth/logout", { method: "POST", refreshOnUnauthorized: false });
    router.replace("/ingresar");
    router.refresh();
  }

  return (
    <Button variant={variant} onClick={onClick} disabled={pending}>
      {pending ? "Cerrando…" : "Cerrar sesión"}
    </Button>
  );
}
