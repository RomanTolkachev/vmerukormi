"use client";

import { useState, type ReactNode } from "react";
import { Modal } from "../kit/modal";
import { ui } from "../styles";
import { Button } from "@/shared/ui/controls";

export function FormDialog({ title, children, onClose, dirty = false, busy = false, discardTitle = "Отменить создание?", discardLabel = "Отменить создание" }: { title: string; children: ReactNode; onClose: () => void; dirty?: boolean; busy?: boolean; discardTitle?: string; discardLabel?: string }) {
  const [confirming, setConfirming] = useState(false);
  const close = () => { if (!busy) { if (dirty) setConfirming(true); else onClose(); } };
  return <>
    <Modal isOpen onClose={close} preventClose={busy} showCloseButton title={title}>
      <h2 className={ui("formDialogHeading")}>{title}</h2>
      {children}
      <div className={ui("actions")}><Button type="button" className={ui("secondary")} disabled={busy} onClick={close}>Отмена</Button></div>
    </Modal>
    <Modal isOpen={confirming} title={discardTitle} onClose={() => setConfirming(false)}>
      <h2>{discardTitle}</h2>
      <p>Введённые в этой форме данные будут потеряны. Уже созданные связанные записи сохранятся.</p>
      <div className={ui("actions")}>
        <Button type="button" className={ui("secondary")} onClick={() => setConfirming(false)}>Продолжить заполнение</Button>
        <Button type="button" className={ui("danger")} onClick={onClose}>{discardLabel}</Button>
      </div>
    </Modal>
  </>;
}
