import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

// next/font descarga las fuentes en el build y las sirve desde el mismo origen (font-src 'self').
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
  variable: "--font-bricolage",
});
const sans = Geist({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-geist",
});
const mono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: { default: "RutaSegura", template: "%s · RutaSegura" },
  description: "Rastrea tus paquetes, agenda la entrega y descarga tus documentos.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: "#f5f1ea",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // El nonce de la CSP es único por petición: todo documento se renderiza dinámicamente.
  await connection();

  return (
    <html lang="es" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <a className="skip-link" href="#contenido">
          Saltar al contenido
        </a>
        <SiteHeader />
        <div id="contenido" className="app-content">
          {children}
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
