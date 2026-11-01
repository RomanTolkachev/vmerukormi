import { getCustomerPets } from "@backend/application/customers/queries";
import { CustomerRegistry } from "@/_pages/customers";
export default async function CustomerPetsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pets = await getCustomerPets(id);
  return <CustomerRegistry kind="pets" customerId={id} rows={pets.map(pet => ({ id: pet.id, name: pet.name, species: pet.species === "CAT" ? "Кошка" : "Собака", breed: pet.breed?.nameRu ?? "—", actualWeight: pet.actualWeight, idealWeight: pet.idealWeight, bcs: pet.bcs, calculations: pet._count.calculations, rations: pet._count.rations }))}
    columns={[{ name: "name", label: "Питомец" }, { name: "species", label: "Вид" }, { name: "breed", label: "Порода" }, { name: "actualWeight", label: "Вес, кг" }, { name: "idealWeight", label: "Идеальный вес" }, { name: "bcs", label: "BCS" }, { name: "calculations", label: "Расчётов" }, { name: "rations", label: "Рационов" }]} />;
}
