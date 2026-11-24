"use client";

import type { ReactNode } from "react";
import { apiFetch } from "@/shared/api";
import { usePendingActions } from "@/shared/lib/pending-actions";
import { Button } from "../controls";
import { notify } from "../notifications";

export function DownloadButton({ href, filename, disabled, children }: { href: string; filename: string; disabled?: boolean; children: ReactNode }) {
  const download = usePendingActions();
  async function startDownload() {
    await download.run("download", async () => {
      try {
        const response = await apiFetch(href);
        if (!response.ok) throw new Error("Не удалось подготовить файл. Попробуйте ещё раз.");
        const blob = await response.blob();
        const encodedName = response.headers.get("content-disposition")?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
        const name = encodedName ? decodeURIComponent(encodedName) : filename;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = name.replace(/[\\/]/g, "_");
        link.hidden = true;
        document.body.append(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (error) {
        notify.error(error instanceof Error ? error.message : "Не удалось скачать файл");
      }
    });
  }
  return <Button type="button" disabled={disabled} loading={download.pending} onClick={() => void startDownload()}>{download.pending ? "Готовим файл…" : children}</Button>;
}
