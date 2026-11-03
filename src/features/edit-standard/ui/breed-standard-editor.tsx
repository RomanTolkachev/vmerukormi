"use client";

import Link from "next/link";
import { useState } from "react";
import type { BreedStandardsValue, SexStandardValue } from "@/entities/standard";
import { updateBreedStandards } from "../api/update-standards";
import { macroEnergy } from "@/entities/calculation";
import { ui } from "@/shared/ui/styles";
import { Button, Input } from "@/shared/ui/controls";

export function BreedStandardEditor({ initialValue }: { initialValue: BreedStandardsValue }) {
  const [value, setValue] = useState(initialValue);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  function patchSex(sex: SexStandardValue["sex"], patch: Partial<SexStandardValue>) {
    setValue((current) => ({ ...current, standards: current.standards.map((item) => item.sex === sex ? { ...item, ...patch } : item) }));
  }

  async function save() {
    setPending(true);
    setMessage("");
    try {
      await updateBreedStandards(value);
      setMessage("Эталонные значения сохранены");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить эталоны");
    } finally {
      setPending(false);
    }
  }

  return <div className={ui("pageLayout", "standardEditorPage")}>
    <div className={ui("productEditorHeader")}><div><Link className={ui("backLink")} href="/standards">← Все породы</Link><h1>{value.breed.nameRu}</h1><div className={ui("meta")}>{value.breed.nameEn} · {value.breed.species === "DOG" ? "собака" : "кошка"}</div></div><Button className={ui("primary")} type="button" disabled={pending} onClick={()=>void save()}>{pending ? "Сохраняем…" : "Сохранить эталоны"}</Button></div>
    <div className={ui("standardEditorGrid")}>
      {value.standards.map((standard) => <section className={ui("card", "standardSexCard")} key={standard.sex}><div className={ui("cardHead")}><div><h2>{standard.sex === "MALE" ? "Самец" : "Самка"}</h2><div className={ui("meta")}>Значения нутриентов указаны на 1000 ккал ОЭ</div></div><span className={ui("badge")}>{macroEnergy(standard.proteinPer1000Kcal, standard.fatPer1000Kcal, standard.carbsPer1000Kcal)} ккал</span></div><div className={ui("cardBody", "standardSexBody")}><div className={ui("formGrid")}><StandardInput label="Идеальный вес, кг" value={standard.idealWeight} onChange={(idealWeight)=>patchSex(standard.sex,{idealWeight})}/><StandardInput label="Белок, г / 1000 ккал" value={standard.proteinPer1000Kcal} onChange={(proteinPer1000Kcal)=>patchSex(standard.sex,{proteinPer1000Kcal})}/><StandardInput label="Жир, г / 1000 ккал" value={standard.fatPer1000Kcal} onChange={(fatPer1000Kcal)=>patchSex(standard.sex,{fatPer1000Kcal})}/><StandardInput label="Углеводы, г / 1000 ккал" value={standard.carbsPer1000Kcal} onChange={(carbsPer1000Kcal)=>patchSex(standard.sex,{carbsPer1000Kcal})}/><label className={ui("field", "full")}><span>Источник / комментарий</span><Input className={ui("input")} value={standard.source} onChange={(event)=>patchSex(standard.sex,{source:event.target.value})}/></label></div><h3>Нутриенты</h3><div className={ui("nutrientTargetList")}>{standard.nutrients.map((nutrient)=><label className={ui("nutrientTargetRow")} key={nutrient.nutrientId}><span><b>{nutrient.code}</b>{nutrient.name}</span><Input className={ui("input")} type="number" min="0" step="any" placeholder="Не задано" value={nutrient.amountPer1000Kcal ?? ""} onChange={(event)=>patchSex(standard.sex,{nutrients:standard.nutrients.map((item)=>item.nutrientId===nutrient.nutrientId?{...item,amountPer1000Kcal:event.target.value===""?null:Number(event.target.value)}:item)})}/><small>{nutrient.unit}</small></label>)}</div></div></section>)}
    </div>
    {message&&<div className={ui("notice")}>{message}</div>}
  </div>;
}

function StandardInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className={ui("field")}><span>{label}</span><Input className={ui("input")} type="number" min="0" step="any" value={value} onChange={(event)=>onChange(Number(event.target.value))}/></label>;
}
