import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import { staticSecurityHeaders } from "./src/lib/security-headers";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(appDir, "../..");

// Un único .env en la raíz del monorepo, compartido con Docker Compose.
loadEnvConfig(repoRoot);

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: repoRoot,
  poweredByHeader: false,
  generateEtags: false,
  reactStrictMode: true,
  transpilePackages: ["@rutasegura/contracts", "@rutasegura/database"],
  async headers() {
    return [{ source: "/:path*", headers: staticSecurityHeaders }];
  },
};

export default nextConfig;
