import { toast } from "sonner";
import type { ReactNode } from "react";

export type AppToastType = "alert" | "error" | "success" | "info";
export type AppToastOptions = { id?: string };

function show(type: AppToastType, message: ReactNode, options: AppToastOptions = {}): void {
  const id = options.id ?? (typeof message === "string" ? `${type}:${message}` : type);
  const method = type === "alert" ? "warning" : type;
  toast[method](message, { id });
}

export const notify = {
  show,
  error: (message: ReactNode, options?: AppToastOptions) => show("error", message, options),
  success: (message: ReactNode, options?: AppToastOptions) => show("success", message, options),
  alert: (message: ReactNode, options?: AppToastOptions) => show("alert", message, options),
  info: (message: ReactNode, options?: AppToastOptions) => show("info", message, options),
  dismiss: (id?: string) => toast.dismiss(id),
};
