"use client";

import type { ReactNode } from "react";
import { EntityCreationProvider } from "@/features/create-entity";
import { RationDetailsDialog } from "@/features/edit-ration";

export function AppEntityCreationProvider({ children, isAdmin }: { children: ReactNode; isAdmin: boolean }) {
  return <EntityCreationProvider isAdmin={isAdmin} renderRationDialog={(request, onClose) =>
    <RationDetailsDialog initial={request.initial} onClose={onClose} onSaved={ration => request.onCreated?.({ value: ration.id, label: ration.name, data: ration })} />
  }>{children}</EntityCreationProvider>;
}
