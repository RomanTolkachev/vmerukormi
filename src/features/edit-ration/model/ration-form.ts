import type { RationMode } from "@/entities/ration";

export function rationFormDefaults(initial: Record<string, unknown> = {}) {
  return {
    name: String(initial.name ?? ""),
    customerId: String(initial.customerId ?? ""),
    petId: String(initial.petId ?? ""),
    calculationId: String(initial.calculationId ?? ""),
    mode: (initial.mode === "WEEKLY" ? "WEEKLY" : "DAILY") as RationMode,
    targetEnergy: String(initial.targetEnergy ?? ""),
    tolerancePercent: String(initial.tolerancePercent ?? 10),
    note: String(initial.note ?? ""),
  };
}

export type RationFormValues = ReturnType<typeof rationFormDefaults>;

export function rationFormPayload(values: RationFormValues) {
  return {
    name: values.name.trim(),
    petId: values.petId || null,
    calculationId: values.calculationId || null,
    mode: values.mode,
    targetEnergy: values.targetEnergy === "" ? undefined : Number(values.targetEnergy),
    tolerancePercent: Number(values.tolerancePercent),
    note: values.note.trim() || null,
  };
}

export function changeRationCustomer(values: RationFormValues, customerId: string): RationFormValues {
  return { ...values, customerId, petId: "", calculationId: "", targetEnergy: "" };
}

export function changeRationPet(values: RationFormValues, petId: string, customerId = values.customerId): RationFormValues {
  return { ...values, petId, customerId, calculationId: "", targetEnergy: "" };
}
