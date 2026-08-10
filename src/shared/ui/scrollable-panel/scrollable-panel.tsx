import type { ReactNode } from "react";
import styles from "./scrollable-panel.module.css";

export function ScrollablePanel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`${styles.root}${className ? ` ${className}` : ""}`}>
    <div className={styles.body}>{children}</div>
  </div>;
}
