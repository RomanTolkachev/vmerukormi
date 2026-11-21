"use client";

import { useId, type ComponentPropsWithRef, type ReactNode } from "react";
import { Input } from "../controls";
import { RequiredMark } from "../required-mark";
import { buttonMotionClassName } from "../button-motion";
import { ui } from "../styles";
import styles from "./input-field.module.css";

type Props = ComponentPropsWithRef<typeof Input> & {
  label: string;
  hint: string;
  note?: ReactNode;
  details?: { title: string; content: ReactNode };
};

export function InputField({ label, hint, note, details, id, required, "aria-describedby": describedBy, ...props }: Props) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hintId = `${controlId}-hint`;
  const noteId = `${controlId}-note`;
  return <div className={`${ui("field")} ${styles.field}`}>
    <label htmlFor={controlId}>{label}{required && <RequiredMark />}</label>
    <Input {...props} id={controlId} required={required} aria-describedby={[describedBy, hintId, note ? noteId : undefined].filter(Boolean).join(" ")} />
    <div id={hintId} className={ui("fieldHint")}>{hint}</div>
    {note && <div id={noteId} className={ui("fieldHint")}>{note}</div>}
    {details && <details className={styles.details}>
      <summary className={buttonMotionClassName} aria-label={`${details.title}: ${label}`}>{details.title}</summary>
      <div className={styles.content}>{details.content}</div>
    </details>}
  </div>;
}
