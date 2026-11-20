"use client";

import { useState } from "react";
import { emptyProduct } from "@backend/domain/catalog/recipe";
import { FormDialog } from "@/shared/ui/form-dialog";
import { ProductForm } from "./product-form";
import type { EditableProduct } from "../model/edit-product";

export function ProductCreationDialog({ initial = {}, isAdmin, onClose, onSaved }: { initial?: Record<string, unknown>; isAdmin: boolean; onClose: () => void; onSaved: (product: EditableProduct) => void }) {
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [product] = useState<EditableProduct>(() => ({ ...emptyProduct(), id: "", revision: 0, isShared: isAdmin, canEdit: true, canViewHistory: false, source: null, sourceExternalId: null, kind: initial.kind === "RECIPE" && !initial.ingredientOnly ? "RECIPE" : initial.kind === "SUPPLEMENT" ? "SUPPLEMENT" : "PRODUCT" }));
  return <FormDialog title={product.kind === "RECIPE" ? "Создать рецепт" : "Создать продукт или добавку"} onClose={onClose} dirty={dirty} busy={busy}>
    <ProductForm initial={product} ingredientOnly={initial.ingredientOnly === true} onDirtyChange={setDirty} onBusyChange={setBusy} onSaved={saved => { onSaved(saved); onClose(); }} />
  </FormDialog>;
}
