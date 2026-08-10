import { ui } from "@/shared/ui/styles/ui";
import Link from "next/link";
import { getCustomerPets } from "@backend/application/customers/queries";

export default async function CustomerPetsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pets = await getCustomerPets(id);

  return <section className={ui("card")}>
    <div className={ui("cardHead")}>
      <div><h2>Питомцы клиента</h2><div className={ui("meta")}>Карточки, связанные с этим владельцем</div></div>
      <Link className={ui("primary", "linkButton")} href={`/pets?customerId=${encodeURIComponent(id)}`}>Добавить питомца</Link>
    </div>
    <div className={ui("cardBody")}>
      {pets.length ? <div className={ui("customerPetGrid")}>{pets.map((pet) => <article className={ui("customerPetCard")} key={pet.id}>
        <div className={ui("customerPetTop")}><h3>{pet.species === "CAT" ? "🐈" : "🐕"} {pet.name}</h3><span className={ui("species")}>{pet.species === "CAT" ? "Кошка" : "Собака"}</span></div>
        <div className={ui("meta")}>{pet.breed?.nameRu ?? "Порода не указана"}{pet.sex === "MALE" ? " · самец" : pet.sex === "FEMALE" ? " · самка" : ""}</div>
        <dl className={ui("petStats")}><div><dt>Вес</dt><dd>{pet.actualWeight} кг</dd></div><div><dt>Идеальный</dt><dd>{pet.idealWeight} кг</dd></div><div><dt>BCS</dt><dd>{pet.bcs}/9</dd></div></dl>
        <div className={ui("customerPetFooter")}><span>{pet._count.calculations} расчётов · {pet._count.rations} рационов</span><div className={ui("customerPetLinks")}><Link href={`/?petId=${encodeURIComponent(pet.id)}`}>Рассчитать</Link><Link href={`/rations?petId=${encodeURIComponent(pet.id)}`}>Новый рацион →</Link></div></div>
      </article>)}</div> : <div className={ui("empty")}>У клиента пока нет питомцев</div>}
    </div>
  </section>;
}
