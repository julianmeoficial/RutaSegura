import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

// next/font descarga la fuente en el build y la sirve desde el mismo origen (font-src 'self').
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "RutaSegura", template: "%s · RutaSegura" },
  description: "Seguimiento de envíos seguro por diseño.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // El nonce de la CSP es único por petición: todo documento se renderiza dinámicamente.
  await connection();

  return (
    <html lang="es" className={inter.variable}>
      <body>
        <a className="skip-link" href="#contenido">
          Saltar al contenido
        </a>
        <SiteHeader />
        <div id="contenido">{children}</div>
      </body>
    </html>
  );
}
