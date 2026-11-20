"use client";

import { Button } from "@/shared/ui/controls";
import type { ProductDraft } from "@backend/domain/catalog/recipe";
import { ProductReadout } from "./product-readout";
import styles from "./product-form.module.css";

export function RecipePrint({ product }: { product: ProductDraft }) {
  return <div className={`${styles.page} ${styles.printDocument}`}><div className={styles.printControls}><Button type="button" onClick={() => window.print()}>Печатать рецепт</Button></div><ProductReadout product={product} /></div>;
}
