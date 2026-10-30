import type { Metadata } from "next";
import "./styles/globals.css";
import styles from "./styles/base.module.css";
import { QueryProvider } from "@/app/providers/query-provider";

export const metadata: Metadata = {
  title: "VetEnergy — калькулятор рационов",
  description: "Расчёт суточной обменной энергии кошек и собак",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html className={styles.root} lang="ru"><body className={styles.body}><QueryProvider>{children}</QueryProvider></body></html>;
}
