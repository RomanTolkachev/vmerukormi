import styles from "./required-mark.module.css";

export function RequiredMark() {
  return <span className={styles.mark} aria-hidden="true">*</span>;
}
