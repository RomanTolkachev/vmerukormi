"use client";

import { useEffect, useRef, useState } from "react";
import type {} from "altcha/types/react";
import { ui } from "../styles";

export function Captcha({ onChange }: { onChange: (payload: string) => void }) {
  const element = useRef<HTMLElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const widget = element.current;
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ state: string; payload?: string }>).detail;
      onChange(detail.state === "verified" ? detail.payload ?? "" : "");
    };
    widget?.addEventListener("statechange", listener);
    Promise.all([import("altcha"), import("altcha/i18n/ru")]).catch(() => setError("Проверка не загрузилась. Обновите страницу."));
    return () => widget?.removeEventListener("statechange", listener);
  }, [onChange]);
  return <div className={ui("field")}>
    <altcha-widget ref={element} challenge="/api/auth/captcha" language="ru" name="captcha" />
    {error && <p className={ui("error")} role="alert">{error}</p>}
  </div>;
}
