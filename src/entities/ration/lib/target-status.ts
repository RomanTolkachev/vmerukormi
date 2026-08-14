export type TargetStatus = "neutral" | "low" | "within" | "high";

export function targetStatus(actual: number, target: number, tolerancePercent: number): TargetStatus {
  if (target <= 0) return "neutral";
  if (actual < target) return "low";
  if (actual > target * (1 + tolerancePercent / 100)) return "high";
  return "within";
}

export function targetStatusClass(status: TargetStatus) {
  if (status === "within") return "targetMet";
  if (status === "low" || status === "high") return "targetLow";
  return "";
}

export function targetStatusLabel(status: TargetStatus, tolerancePercent: number) {
  if (status === "low") return "недобор";
  if (status === "high") return `выше допуска +${tolerancePercent}%`;
  if (status === "within") return "в пределах нормы";
  return "норма не указана";
}
