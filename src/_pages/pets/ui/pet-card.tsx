"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Pet } from "@/entities/pet";
import { EntitySelect } from "@/features/create-entity";
import { updatePetCustomer } from "@/features/update-pet-customer";
import { Button, ButtonLink, Input, Select, Textarea } from "@/shared/ui/controls";
import { ui } from "@/shared/ui/styles";
import { RequiredMark } from "@/shared/ui/required-mark";
import { updatePetAttributes } from "../api/update-pet-attributes";
import { changePetWeight, petAttributesDraft, type PetAttributesDraft } from "../model/pet-attributes";

export function PetCard({ initialPet }: { initialPet: Pet }) {
  const queryClient = useQueryClient();
  const [pet, setPet] = useState(initialPet);
  const [customerId, setCustomerId] = useState(initialPet.customerId ?? "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [attributes, setAttributes] = useState(() => petAttributesDraft(initialPet));
  const [attributesPending, setAttributesPending] = useState(false);
  const [attributesMessage, setAttributesMessage] = useState("");
  const [attributesError, setAttributesError] = useState("");
  const dirty = customerId !== (pet.customerId ?? "");
  const attributesDirty = JSON.stringify(attributes) !== JSON.stringify(petAttributesDraft(pet));
  const busy = pending || attributesPending;

  function acceptSavedPet(updated: Pet) {
    setPet(updated);
    void queryClient.invalidateQueries({ queryKey: ["entity-options", "pets"] });
    void queryClient.invalidateQueries({ queryKey: ["entity-option", "pets", pet.id] });
  }

  function changeAttribute<Field extends keyof PetAttributesDraft>(field: Field, value: PetAttributesDraft[Field]) {
    setAttributes(current => field === "actualWeight" || field === "idealWeight"
      ? changePetWeight(current, field, value)
      : { ...current, [field]: value, ...(field === "species" ? { breedId: "" } : {}) });
    setAttributesMessage("");
    setAttributesError("");
  }

  async function saveAttributes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !attributesDirty) return;
    setAttributesPending(true);
    setAttributesMessage("");
    setAttributesError("");
    try {
      const updated = await updatePetAttributes(pet.id, attributes);
      acceptSavedPet(updated);
      setAttributes(petAttributesDraft(updated));
      setAttributesMessage("Данные питомца сохранены");
    } catch (caught) {
      setAttributesError(caught instanceof Error ? caught.message : "Не удалось сохранить данные питомца");
    } finally {
      setAttributesPending(false);
    }
  }

  async function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !dirty) return;
    setPending(true);
    setMessage("");
    setError("");
    try {
      const updated = await updatePetCustomer(pet.id, customerId || null);
      acceptSavedPet(updated);
      setCustomerId(updated.customerId ?? "");
      setMessage(updated.customer ? "Хозяин сохранён" : "Связь с хозяином удалена");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось сохранить хозяина");
    } finally {
      setPending(false);
    }
  }

  return <div className={ui("pageLayout", "petDetailsPage")}>
    <header className={ui("customerHeader")}>
      <div>
        <Link className={ui("backLink")} href="/pets">← Все питомцы</Link>
        <h1>{pet.name}</h1>
        <div className={ui("meta")}>{pet.species === "CAT" ? "Кошка" : "Собака"} · {pet.breed?.nameRu ?? "Порода не указана"}</div>
      </div>
      <ButtonLink href={`/?petId=${pet.id}`}>Рассчитать рацион</ButtonLink>
    </header>
    <section className={ui("card")}>
      <div className={ui("cardHead")}><h2>Данные питомца</h2></div>
      <form className={ui("cardBody")} onSubmit={saveAttributes}>
        <div className={ui("formGrid")}>
          <label className={ui("field", "full")}><span>Имя питомца</span><Input value={attributes.name} onChange={event => changeAttribute("name", event.target.value)} maxLength={80} required disabled={busy} /></label>
          <label className={ui("field")}><span>Вид<RequiredMark /></span><Select required value={attributes.species} onChange={event => changeAttribute("species", event.target.value as Pet["species"])} disabled={busy}><option value="CAT">Кошка</option><option value="DOG">Собака</option></Select></label>
          <label className={ui("field")}><span>Пол</span><Select value={attributes.sex} onChange={event => changeAttribute("sex", event.target.value)} disabled={busy}><option value="">Не указан</option><option value="MALE">Самец</option><option value="FEMALE">Самка</option></Select></label>
          <div className={ui("field", "full")}><EntitySelect entity="breeds" label="Порода" value={attributes.breedId} filters={{ species: attributes.species }} allowCreate={false} disabled={busy}
            selectedOption={pet.breed?.id === attributes.breedId ? { value: pet.breed.id, label: pet.breed.nameRu, data: pet.breed } : null}
            onChange={value => changeAttribute("breedId", value)} /></div>
          <label className={ui("field")}><span>Фактический вес, кг</span><Input type="number" min="0.001" max="150" step="any" value={attributes.actualWeight} onChange={event => changeAttribute("actualWeight", event.target.value)} required disabled={busy} /></label>
          <label className={ui("field")}><span>Идеальный вес, кг</span><Input type="number" min="0.001" max="150" step="any" value={attributes.idealWeight} onChange={event => changeAttribute("idealWeight", event.target.value)} required disabled={busy} /></label>
          <label className={ui("field", "full")}><span>BCS</span><Input type="number" min="1" max="9" step="1" value={attributes.bcs} onChange={event => changeAttribute("bcs", event.target.value)} required disabled={busy} /><small className={ui("fieldHint")}>При изменении веса пересчитывается автоматически. Значение можно уточнить вручную от 1 до 9.</small></label>
          <label className={ui("field", "full")}><span>Заметка</span><Textarea rows={3} maxLength={500} value={attributes.note} onChange={event => changeAttribute("note", event.target.value)} disabled={busy} /></label>
        </div>
        <div className={ui("actions")}>
          <Button type="submit" variant="primary" disabled={busy || !attributesDirty}>{attributesPending ? "Сохраняем…" : "Сохранить данные"}</Button>
          {attributesDirty && <Button type="button" disabled={busy} onClick={() => { setAttributes(petAttributesDraft(pet)); setAttributesMessage(""); setAttributesError(""); }}>Отменить изменения данных</Button>}
        </div>
        {attributesMessage && <p className={ui("formMessage")} role="status">{attributesMessage}</p>}
        {attributesError && <p className={ui("error")} role="alert">{attributesError}</p>}
      </form>
    </section>
    <section className={ui("card")}>
      <div className={ui("cardHead")}><h2>Хозяин</h2></div>
      <form className={ui("cardBody")} onSubmit={saveCustomer}>
        <EntitySelect entity="customers" label="Клиент" value={customerId} selectedOption={pet.customer?.id === customerId ? { value: pet.customer.id, label: pet.customer.name, data: pet.customer } : null} disabled={busy} onChange={value => { setCustomerId(value); setMessage(""); setError(""); }} />
        <p className={ui("fieldHint")}>Выберите клиента или создайте нового. Чтобы отвязать хозяина, очистите поле и сохраните изменения.</p>
        {pet.customer && <Link className={ui("tablePrimaryLink")} href={`/customers/${pet.customer.id}`}>Карточка клиента: {pet.customer.name}</Link>}
        <div className={ui("actions")}>
          <Button type="submit" variant="primary" disabled={busy || !dirty}>{pending ? "Сохраняем…" : "Сохранить хозяина"}</Button>
          {dirty && <Button type="button" disabled={busy} onClick={() => { setCustomerId(pet.customerId ?? ""); setMessage(""); setError(""); }}>Отменить изменения</Button>}
        </div>
        {message && <p className={ui("formMessage")} role="status">{message}</p>}
        {error && <p className={ui("error")} role="alert">{error}</p>}
      </form>
    </section>
  </div>;
}
