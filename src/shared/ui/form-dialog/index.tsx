"use client";

import { useState, type ReactNode } from "react";
import { Modal } from "../kit/modal";
import { ui } from "../styles";

export function FormDialog({ title, children, onClose, dirty = false, busy = false }: { title: string; children: ReactNode; onClose: () => void; dirty?: boolean; busy?: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const close = () => { if (!busy) { if (dirty) setConfirming(true); else onClose(); } };
  return <>
    <Modal isOpen onClose={close} preventClose={busy} showCloseButton title={title}>
      <h2>{title}</h2>
      {children}
      <div className={ui("actions")}><button type="button" className={ui("secondary")} disabled={busy} onClick={close}>Отмена</button></div>
    </Modal>
    <Modal isOpen={confirming} title="Отменить создание?" onClose={() => setConfirming(false)}>
      <h2>Отменить создание?</h2>
      <p>Введённые в этой форме данные будут потеряны. Уже созданные связанные записи сохранятся.</p>
      <div className={ui("actions")}>
        <button type="button" className={ui("secondary")} onClick={() => setConfirming(false)}>Продолжить заполнение</button>
        <button type="button" className={ui("danger")} onClick={onClose}>Отменить создание</button>
      </div>
    </Modal>
  </>;
}
