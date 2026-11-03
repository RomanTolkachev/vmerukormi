"use client";

import { Toaster } from "sonner";
import { buttonMotionClassName } from "@/shared/ui/button-motion";
import styles from "./notifications.module.css";

export function AppToaster() {
  return <Toaster
    className={styles.toaster}
    theme="light"
    richColors
    closeButton
    position="bottom-right"
    containerAriaLabel="Уведомления"
    mobileOffset={16}
    toastOptions={{
      closeButtonAriaLabel: "Закрыть уведомление",
      classNames: {
        toast: styles.toast,
        closeButton: `${styles.closeButton} ${buttonMotionClassName}`,
        actionButton: `${styles.actionButton} ${buttonMotionClassName}`,
        cancelButton: `${styles.cancelButton} ${buttonMotionClassName}`,
      },
    }}
  />;
}
