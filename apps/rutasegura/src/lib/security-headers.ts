/**
 * Cabeceras de seguridad de RutaSegura. Cada decisión responde a un hallazgo
 * del análisis HTTP (H-02 a H-11); ver README.
 *
 * Este módulo no depende de secretos: lo usan next.config.ts y proxy.ts.
 */

type Header = { key: string; value: string };

/**
 * Se emite en toda respuesta, también sobre HTTP: el navegador ignora HSTS
 * recibido por HTTP (RFC 6797 §8.1), así que no afecta a http://localhost.
 */
export const STRICT_TRANSPORT_SECURITY = "max-age=63072000; includeSubDomains; preload";

export const staticSecurityHeaders: Header[] = [
  { key: "Strict-Transport-Security", value: STRICT_TRANSPORT_SECURITY },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), browsing-topics=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Origin-Agent-Cluster", value: "?1" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

/** Las respuestas JSON nunca se interpretan como documento. */
export const API_CONTENT_SECURITY_POLICY =
  "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

type DocumentPolicyOptions = {
  nonce: string;
  isDevelopment: boolean;
  isHttps: boolean;
};

/**
 * CSP de documentos HTML. En producción no admite `'unsafe-inline'` ni
 * `'unsafe-eval'`. En desarrollo React necesita `eval` para reconstruir
 * trazas y Next inyecta estilos de recarga en caliente sin nonce.
 */
export function buildDocumentPolicy({ nonce, isDevelopment, isHttps }: DocumentPolicyOptions) {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' ${isDevelopment ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "worker-src 'self'",
    "manifest-src 'self'",
  ];

  // WebKit aplica upgrade-insecure-requests también a http://localhost y
  // rompe la carga local de recursos; solo se emite cuando ya se sirve HTTPS.
  if (isHttps) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
