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
  {
    files: ["src/app/**/*.tsx", "src/_pages/**/*.tsx", "src/features/**/*.tsx", "src/entities/**/*.tsx"],
    rules: {
      "no-restricted-imports": ["error", { paths: [{ name: "sonner", message: "Уведомления подключаются через @/shared/ui/notifications." }] }],
      "no-restricted-syntax": ["error", {
        selector: "JSXOpeningElement[name.type='JSXIdentifier'][name.name=/^(button|input|select|textarea)$/]",
        message: "Общие элементы управления импортируются из @/shared/ui/controls или публичного API Shared UI, а не реализуются внутри экрана или формы.",
      }],
    },
  },
  globalIgnores([".next/**", "node_modules/**", "src/generated/**", ".agents/skills/impeccable/**", ".impeccable/**"]),
]);

