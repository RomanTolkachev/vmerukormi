import { notFound } from "next/navigation";
import { getProductEditorData } from "@backend/application/products/queries";
import { RecipePrint } from "@/features/edit-product";
export default async function PrintRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const data = await getProductEditorData((await params).id);
  if (!data || data.product.kind !== "RECIPE") notFound();
  return <RecipePrint product={data.product} />;
}
