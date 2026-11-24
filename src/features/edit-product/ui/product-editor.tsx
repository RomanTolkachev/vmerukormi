"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, ButtonLink } from "@/shared/ui/controls";
import { ui } from "@/shared/ui/styles";
import { ProductForm } from "./product-form";
import { ProductHistory } from "./product-history";
import type { EditableProduct } from "../model/edit-product";
import styles from "./product-form.module.css";

export function ProductEditor({ initialProduct }: { initialProduct: EditableProduct }) {
  const [product, setProduct] = useState(initialProduct);
  const [history, setHistory] = useState(false);
  const [dirty, setDirty] = useState(false);
  const client = useQueryClient();
  function saved(value: EditableProduct) { setProduct(value); setDirty(false); void client.invalidateQueries({ queryKey: ["workspace-products"] }); void client.invalidateQueries({ queryKey: ["workspace-recipes"] }); void client.invalidateQueries({ queryKey: ["entity-options", "products"] }); void client.invalidateQueries({ queryKey: ["entity-option", "products"] }); }
  return <div className={`${ui("pageLayout")} ${styles.page}`}>
    <div className={styles.editorContent}>
      <header className={`${ui("productEditorHeader")} ${styles.editorHeader}`}>
        <div>
          <ButtonLink href={product.kind === "RECIPE" ? "/recipes" : "/products"} onClick={event => { if (dirty && !window.confirm("Уйти без сохранения изменений?")) event.preventDefault(); }}>← В каталог</ButtonLink>
          <h1>{product.name}</h1>
          <p>Версия {product.revision} · {product.isShared ? "Общий каталог" : "Личный каталог"}</p>
          {product.deletedAt && <p role="status" className={ui("error")}>Запись удалена. Сохранённые рационы не изменены. Для редактирования восстановите её в разделе «Удалённые».</p>}
          {product.source && <a href={product.source === "health-diet" ? `https://health-diet.ru/base_of_food/sostav/${product.sourceExternalId}.php` : product.source} target="_blank" rel="noreferrer">Источник состава</a>}
        </div>
        {(product.canViewHistory || product.kind === "RECIPE") && <div className={styles.headerActions}>
          {product.canViewHistory && <Button type="button" onClick={() => { if (!dirty || window.confirm("Восстановление заменит несохранённые изменения. Открыть историю?")) setHistory(true); }}>История версий</Button>}
          {product.kind === "RECIPE" && <ButtonLink href={`/recipes/${product.id}/print`} target="_blank">Печать сохранённого рецепта</ButtonLink>}
        </div>}
      </header>
      <div className={styles.panel}><ProductForm key={product.revision} initial={product} onSaved={saved} onDirtyChange={setDirty} /></div>
    </div>
    {history && <ProductHistory product={product} onRestored={saved} onClose={() => setHistory(false)} />}
  </div>;
}
