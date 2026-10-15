"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MarkNotificationsReadResponse } from "@rutasegura/contracts";
import { IconCheck } from "@/components/icons";
import { Button } from "@/components/ui";
import { apiRequest } from "@/lib/api-client";
import { ApiErrorAlert, type ApiFailure } from "@/features/shared/api-error-alert";

export function MarkReadButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<ApiFailure | null>(null);

  async function onClick() {
    setPending(true);
    const result = await apiRequest<MarkNotificationsReadResponse>("/api/v1/notifications/read", {
      method: "POST",
    });
    setPending(false);
    if (result.ok) {
      setFailure(null);
      router.refresh();
    } else if (result.code === "unauthorized") {
      router.replace("/ingresar?next=/portal/avisos");
    } else {
      setFailure({ ...result, at: Date.now() });
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={onClick} disabled={pending} loading={pending}>
        {pending ? null : <IconCheck size={18} />}
        Marcar como leídos
      </Button>
      <ApiErrorAlert failure={failure} />
    </>
  );
}
