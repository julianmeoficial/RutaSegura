"use client";

import { ErrorView } from "@/components/error-view";

/** Dentro del portal el layout (navegación y sesión) se conserva. */
export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorView
      digest={error.digest}
      onRetry={reset}
      homeHref="/portal"
      homeLabel="Ir a Mis envíos"
    />
  );
}
