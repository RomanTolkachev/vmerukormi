import { z } from "zod";

const measureSchema = z.object({ id: z.string(), name: z.string(), grams: z.number().positive() });
const productSchema = z.object({
  id: z.string(), name: z.string(), baseQuantity: z.number().positive(), unit: z.string(),
  calories: z.number(), protein: z.number(), fat: z.number(), carbs: z.number(),
  measures: z.array(measureSchema),
  nutrients: z.array(z.object({
    nutrientId: z.string(), amount: z.number().nullable(),
    nutrient: z.object({ code: z.string(), name: z.string(), unit: z.string(), category: z.string() }),
  })),
});
const snapshotSchema = z.object({ version: z.literal(1), product: productSchema, measure: measureSchema.nullable() });
export type ProductSnapshot = z.infer<typeof snapshotSchema>;

export function createProductSnapshot(product: z.input<typeof productSchema>, measure: z.input<typeof measureSchema> | null = null): ProductSnapshot {
  return snapshotSchema.parse({ version: 1, product, measure });
}

export function readProductSnapshot(snapshot: unknown): ProductSnapshot | null {
  const parsed = snapshotSchema.safeParse(snapshot);
  return parsed.success ? parsed.data : null;
}

export function applyRationSnapshot<Item extends { productSnapshot?: unknown; product: object; measure?: unknown }>(item: Item): Item {
  const snapshot = readProductSnapshot(item.productSnapshot);
  if (!snapshot) return item;
  return { ...item, product: { ...item.product, ...snapshot.product }, measure: snapshot.measure };
}
