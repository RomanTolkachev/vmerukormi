"use client";

import { useEffect, useState, type ComponentPropsWithRef } from "react";
import styles from "./loading.module.css";

export function LoadingSpinner() {
  return <span className={styles.spinner} aria-hidden="true" />;
}

export function LoadingStatus({ label = "Загружаем…" }: { label?: string }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timeout = window.setTimeout(() => setSlow(true), 10000);
    return () => window.clearTimeout(timeout);
  }, []);
  return <div className={styles.status} role="status" aria-live="polite">
    <span className={styles.message}><LoadingSpinner />{label}</span>
    {slow && <small>Это занимает больше времени, чем обычно. Запрос ещё выполняется.</small>}
  </div>;
}

export function BusyRegion({ busy, label, children, className, ...props }: ComponentPropsWithRef<"div"> & { busy: boolean; label?: string }) {
  return <div {...props} className={`${styles.region} ${className ?? ""}`}>
    <div className={styles.contents} inert={busy || undefined} aria-busy={busy}>{children}</div>
    {busy && <div className={styles.overlay}><LoadingStatus label={label} /></div>}
  </div>;
}
