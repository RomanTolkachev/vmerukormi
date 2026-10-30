import { notFound } from "next/navigation";
import { getProductEditorData } from "@backend/application/products/queries";
import { ProductEditor } from "@/features/edit-product";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getProductEditorData(id);
  if (!data) notFound();
  return <ProductEditor initialProduct={data.product} nutrients={data.nutrients} groups={data.groups} tags={data.tags} />;
}
