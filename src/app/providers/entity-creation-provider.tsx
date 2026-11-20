"use client";

import type { ReactNode } from "react";
import { EntityCreationProvider } from "@/features/create-entity";
import { RationDetailsDialog } from "@/features/edit-ration";
import { ProductCreationDialog } from "@/features/edit-product";
import { CalculationDialog } from "@/features/calculate-energy";

export function AppEntityCreationProvider({ children, isAdmin }: { children: ReactNode; isAdmin: boolean }) {
  return <EntityCreationProvider isAdmin={isAdmin} renderCalculationDialog={(request, onClose) => <CalculationDialog initial={request.initial} onClose={onClose} onSaved={calculation => request.onCreated?.({ value: calculation.id, label: calculation.name, data: calculation })} />} renderProductDialog={(request, onClose) => <ProductCreationDialog isAdmin={isAdmin} initial={request.initial} onClose={onClose} onSaved={product => request.onCreated?.({ value: product.id, label: product.name, data: product })} />} renderRationDialog={(request, onClose) =>
    <RationDetailsDialog initial={request.initial} onClose={onClose} onSaved={ration => request.onCreated?.({ value: ration.id, label: ration.name, data: ration })} />
  }>{children}</EntityCreationProvider>;
}
