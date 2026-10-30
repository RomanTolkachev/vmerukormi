import { requestJson } from "@/shared/api";

export type FormulaDraft = { formula: string; description: string | null };

export function validateFormula(formula: string) {
  return requestJson<{ valid: true; result: number }>("/api/modules/validate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ formula }),
  });
}

export function createModule(input: FormulaDraft & { name: string; species: "CAT" | "DOG" }) {
  return requestJson<{ id: string }>("/api/modules", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function createFormulaVersion(moduleId: string, input: FormulaDraft & { name: string }) {
  return requestJson<{ id: string }>(`/api/modules/${moduleId}/versions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}
