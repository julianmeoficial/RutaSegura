"use client";

import { ErrorView } from "@/components/error-view";
import "./globals.css";

/** Reemplaza al layout raíz cuando es él el que falla: necesita su propio html y body. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body>
        <ErrorView digest={error.digest} onRetry={reset} />
      </body>
    </html>
  );
}
