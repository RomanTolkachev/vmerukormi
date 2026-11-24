"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { requestJson } from "@/shared/api";
import { Button } from "@/shared/ui/controls";
import { FormDialog } from "@/shared/ui/form-dialog";
import { notify } from "@/shared/ui/notifications";
import { ui } from "@/shared/ui/styles";
import type { EditableProduct } from "../model/edit-product";
import { ProductReadout } from "./product-readout";
import styles from "./product-form.module.css";

type Version = { id: string; revision: number; busBegin: string; busEnd: string | null; action: string; snapshot: EditableProduct };
export function ProductHistory({ product, onRestored, onClose }: { product: EditableProduct; onRestored: (product: EditableProduct) => void; onClose: () => void }) {
  const [page, setPage] = useState(0);
  const versions = useQuery({ queryKey: ["product-versions", product.id, product.revision, page], queryFn: () => requestJson<Omit<Version, "snapshot">[]>(`/api/products/${product.id}/versions?page=${page}`) });
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selected = versions.data?.find(version => version.id === selectedId) ?? versions.data?.[0];
  const detail = useQuery({ queryKey: ["product-version", product.id, selected?.id], enabled: Boolean(selected), queryFn: () => requestJson<Version>(`/api/products/${product.id}/versions?versionId=${selected!.id}`) });
  async function restore() {
    if (!selected || busy || !window.confirm(`Восстановить версию ${selected.revision}? Будет создана новая версия. Сохранённые рационы не изменятся.`)) return;
    setBusy(true); setError("");
    try {
      const restored = await requestJson<EditableProduct>(`/api/products/${product.id}/versions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ versionId: selected.id, expectedRevision: product.revision }) });
      notify.success("Версия восстановлена"); onRestored(restored); onClose();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Не удалось восстановить"); }
    finally { setBusy(false); }
  }
  return <FormDialog title="История версий" onClose={onClose} busy={busy}>
    <div className={styles.history}>
      <p>Восстановление создаёт новую текущую версию. История и ранее сохранённые рационы остаются неизменными.</p>
      {versions.isPending && <p role="status">Загружаем историю…</p>}
      {versions.isError && <><p role="alert">Не удалось загрузить историю.</p><Button onClick={() => void versions.refetch()}>Повторить</Button></>}
      <div className={styles.historyList}>{versions.data?.map(version => <Button type="button" key={version.id} aria-pressed={selected?.id === version.id} onClick={() => setSelectedId(version.id)}>№{version.revision} · {new Date(version.busBegin).toLocaleString("ru-RU")}{version.busEnd ? "" : " · текущая"}</Button>)}</div>
      <div className={ui("actions")}><Button type="button" disabled={page === 0 || versions.isFetching} onClick={() => setPage(value => value - 1)}>Новые версии</Button><Button type="button" disabled={versions.data?.length !== 30 || versions.isFetching} onClick={() => setPage(value => value + 1)}>Ранние версии</Button></div>
      {selected && detail.isPending && <p role="status">Загружаем состав версии…</p>}
      {detail.isError && <><p role="alert">Не удалось загрузить версию.</p><Button onClick={() => void detail.refetch()}>Повторить</Button></>}
      {selected && detail.data && <><p>Действие: {selected.action.startsWith("RESTORE:") ? `Восстановление версии ${selected.action.split(":")[1]}` : ({ CREATE: "Создание", SAVE: "Сохранение", DELETE: "Удаление", UNDELETE: "Восстановление записи", MIGRATION: "Исходное состояние" }[selected.action] ?? selected.action)}</p><ProductReadout product={detail.data.snapshot} nutrients /><Button type="button" variant="primary" loading={busy} disabled={busy || !product.canEdit || selected.revision === product.revision || Boolean(detail.data.snapshot.deletedAt)} onClick={() => void restore()}>Восстановить эту версию</Button></>}
      {error && <p role="alert" className={ui("error")}>{error}</p>}
    </div>
  </FormDialog>;
}
