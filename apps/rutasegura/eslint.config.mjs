import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { defineConfig, globalIgnores } from "eslint/config";
import { sqlInjectionRules } from "@rutasegura/config/eslint-sql";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "next-env.d.ts", "playwright-report/**", "test-results/**"]),
  {
    rules: {
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "react/no-danger": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      ...sqlInjectionRules,
    },
  },
  {
    // La UI llega a los datos solo a través de server/services, que aplican autorización.
    files: ["src/app/(public)/**", "src/app/(portal)/**", "src/components/**", "src/features/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@rutasegura/database", "@/server/repositories/*", "@/server/redis"],
              message: "La UI accede a datos solo mediante @/server/services.",
            },
          ],
        },
      ],
    },
  },
]);
