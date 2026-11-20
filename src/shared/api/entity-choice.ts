export type EntityKind = "customers" | "pets" | "products" | "groups" | "tags" | "nutrients" | "rations" | "notifications" | "calculations" | "species";
export type ChoiceKind = EntityKind | "breeds" | "modules";
export type EntityChoice = { value: string; label: string; data: Record<string, unknown> };
export type CreationRequest = { entity: EntityKind; initial?: Record<string, unknown>; shared?: boolean; onCreated?: (choice: EntityChoice) => void };
