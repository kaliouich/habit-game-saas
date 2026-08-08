import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Artefacts de build (gitignorés, donc absents en CI mais présents en local
    // après un build/`cap sync` — sans ça `npm run lint` noie les vraies erreurs
    // sous un millier de warnings sur du JS minifié).
    "ssr_chunks/**",
    "android/**",
    "ios/**",
  ]),
]);

export default eslintConfig;
