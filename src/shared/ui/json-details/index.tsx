import styles from "./json-details.module.css";

export function JsonDetails({ value }: { value: unknown }) {
  return <pre className={styles.content}>{JSON.stringify(value, null, 2) ?? "Нет данных"}</pre>;
}
