"use client";

import { useId } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { ui } from "@/shared/ui/styles";
import { Input } from "@/shared/ui/controls";

export function NumberField({ label, registration, min = 0.1, max = 150, step = 0.1, readOnly = false, hint }: {
  label: string;
  registration: UseFormRegisterReturn;
  min?: number;
  max?: number;
  step?: number;
  readOnly?: boolean;
  hint?: string;
}) {
  const id = useId();
  return <div className={ui("field")}><label htmlFor={id}>{label}</label><Input id={id} aria-describedby={hint ? `${id}-hint` : undefined} className={ui("input", readOnly && "readonly")} type="number" min={min} max={max} step={step} readOnly={readOnly} {...registration}/>{hint && <div id={`${id}-hint`} className={ui("fieldHint")}>{hint}</div>}</div>;
}
