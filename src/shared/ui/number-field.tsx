import type { UseFormRegisterReturn } from "react-hook-form";
import { ui } from "@/shared/ui/styles";

export function NumberField({ label, registration, min = 0.1, max = 150, step = 0.1, readOnly = false, hint }: {
  label: string;
  registration: UseFormRegisterReturn;
  min?: number;
  max?: number;
  step?: number;
  readOnly?: boolean;
  hint?: string;
}) {
  return <div className={ui("field")}><label>{label}</label><input className={ui("input", readOnly && "readonly")} type="number" min={min} max={max} step={step} readOnly={readOnly} {...registration}/>{hint && <div className={ui("fieldHint")}>{hint}</div>}</div>;
}
