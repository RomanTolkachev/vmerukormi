import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { boundaries } from "./tooling/eslint/fsd.mjs";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}", "backend/**/*.{ts,tsx}"],
    plugins: { fsd: { rules: { boundaries } } },
    rules: { "fsd/boundaries": "error" },
  },
  globalIgnores([".next/**", "node_modules/**", "src/generated/**"]),
]);

