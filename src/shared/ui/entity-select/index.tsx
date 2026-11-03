"use client";
import { createContext, useContext, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { requestJson } from "@/shared/api";
import { AsyncSelect } from "../kit/inputs/AsyncSelect";
import { ui } from "../styles";
import type { ChoiceKind, CreationRequest, EntityChoice } from "@/shared/api/entity-choice";
import { Button } from "@/shared/ui/controls";
export const CreationContext = createContext<{ open: (request: CreationRequest) => void; isAdmin: boolean; labels: Partial<Record<ChoiceKind, string>> } | null>(null);
export function useEntityCreation() {
 const context = useContext(CreationContext);
 if (!context) throw new Error("EntityCreationProvider отсутствует");
 return context;
}
export function EntitySelect({ entity, label, value, onChange, filters = {}, disabled = false, allowCreate = true, initial, selectedOption, required = false }: {
  entity: ChoiceKind; label: string; value: string; onChange: (value: string, option: EntityChoice | null) => void; filters?: Record<string, string>; disabled?: boolean; allowCreate?: boolean; initial?: Record<string, unknown>; selectedOption?: EntityChoice | null; required?: boolean;
}) {
  const { open, isAdmin, labels } = useEntityCreation();
  const [created, setCreated] = useState<EntityChoice | null>(null);
  const filterKey = JSON.stringify(filters);
  const lookup = useQuery({ queryKey: ["entity-option", entity, value, filterKey], enabled: Boolean(value) && !selectedOption && created?.value !== value, queryFn: ({ signal }) => requestJson<EntityChoice[]>(`/api/options/${entity}?${new URLSearchParams({ ...filters, id: value })}`, { signal }) });
  const choose = (next: string, option: EntityChoice | null) => { setCreated(option); onChange(next, option); };
  const shared = filters.shared === "true";
  return <div className={ui("field")}>
    <AsyncSelect<EntityChoice> label={label} value={value} selectedOption={selectedOption ?? (created?.value === value ? created : lookup.data?.[0] ?? null)}
      onChange={choose} disabled={disabled} required={required} queryKey={["entity-options", entity, filterKey]} wrapOptions
      loadOptions={({ search, signal }) => requestJson<EntityChoice[]>(`/api/options/${entity}?${new URLSearchParams({ ...filters, search })}`, { signal })} />
    {allowCreate && Boolean(labels[entity]) && (!shared || isAdmin) && (entity !== "modules" || isAdmin) && <Button type="button" className={ui("secondary")} disabled={disabled} onClick={() => open({ entity: entity as CreationRequest["entity"], shared, initial: { ...(filters.species ? { species: filters.species } : {}), ...initial }, onCreated: option => choose(option.value, option) })}>{labels[entity]}</Button>}
  </div>;
}
