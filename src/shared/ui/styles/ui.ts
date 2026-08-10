import styles from "./ui.module.css";

const classes = styles as Record<string, string>;

export function ui(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).map((name) => classes[String(name)]).filter(Boolean).join(" ");
}
