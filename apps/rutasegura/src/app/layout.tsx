import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "RutaSegura",
  description: "Seguimiento de envíos seguro por diseño.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // El nonce de la CSP es único por petición: todo documento se renderiza dinámicamente.
  await connection();

  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
