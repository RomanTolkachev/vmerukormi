import type { ProductDraft } from "@backend/domain/catalog/recipe";

export type EditableProduct = ProductDraft & {
  revision: number;
  canViewHistory: boolean;
  tagNames?: Record<string, string>;
  deletedAt?: string | null;
  isShared: boolean;
  canEdit: boolean;
  source: string | null;
  sourceExternalId: string | null;
  id: string;
};
