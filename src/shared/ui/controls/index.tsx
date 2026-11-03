import type { ComponentPropsWithRef } from "react";
import Link from "next/link";
import { ui } from "../styles";
import { buttonMotionClassName } from "../button-motion";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export function Button({ variant, className, ...props }: ComponentPropsWithRef<"button"> & { variant?: ButtonVariant }) {
  return <button className={[buttonMotionClassName, ui("button", variant ?? (!className ? "secondary" : undefined)), className].filter(Boolean).join(" ")} {...props} />;
}

export function ButtonLink({ variant = "secondary", className, ...props }: ComponentPropsWithRef<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={[buttonMotionClassName, ui("button", "linkButton", variant), className].filter(Boolean).join(" ")} {...props} />;
}

export function AnchorButton({ variant = "secondary", className, ...props }: ComponentPropsWithRef<"a"> & { variant?: ButtonVariant }) {
  return <a className={[buttonMotionClassName, ui("button", "linkButton", variant), className].filter(Boolean).join(" ")} {...props} />;
}

export function Input({ className, type, ...props }: ComponentPropsWithRef<"input">) {
  return <input type={type} className={[ui(type === "checkbox" || type === "radio" ? "choiceControl" : "input"), className].filter(Boolean).join(" ")} {...props} />;
}

export function Select({ className, ...props }: ComponentPropsWithRef<"select">) {
  return <select className={[ui("input", "selectControl"), className].filter(Boolean).join(" ")} {...props} />;
}

export function Textarea({ className, ...props }: ComponentPropsWithRef<"textarea">) {
  return <textarea className={[ui("input", "textareaControl"), className].filter(Boolean).join(" ")} {...props} />;
}
