"use client";

import { useRef, useState } from "react";
import { validateFormula } from "../api/update-module";
import { ui } from "@/shared/ui/styles";

export function FormulaInput({ value, onChange, onValidityChange }: { value: string; onChange: (value: string) => void; onValidityChange: (valid: boolean) => void }) {
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function check(formula: string) {
    if (!formula.trim()) {
      setError("Введите формулу");
      setResult(null);
      onValidityChange(false);
      return false;
    }
    setChecking(true);
    try {
      const response = await validateFormula(formula);
      setError("");
      setResult(response.result);
      onValidityChange(true);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Некорректная формула");
      setResult(null);
      onValidityChange(false);
      return false;
    } finally {
      setChecking(false);
    }
  }

  function change(next: string) {
    onChange(next);
    onValidityChange(false);
    setResult(null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void check(next), 350);
  }

  return <label className={ui("field")}>
    <span>Расчётное выражение</span>
    <textarea className={ui("input", "formulaTextarea", error && "inputError")} rows={3} value={value} onChange={(event) => change(event.target.value)} onBlur={() => void check(value)} required />
    {checking ? <small className={ui("fieldHint")}>Проверяем выражение…</small> : error ? <small className={ui("formulaError")}>{error}</small> : result !== null ? <small className={ui("formulaValid")}>Формула корректна · тестовый результат {result.toLocaleString("ru-RU", { maximumFractionDigits: 2 })}</small> : null}
  </label>;
}
