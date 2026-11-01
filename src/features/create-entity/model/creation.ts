import type { EntityKind } from "@/shared/api/entity-choice";
export type { EntityKind, ChoiceKind, EntityChoice, CreationRequest } from "@/shared/api/entity-choice";
export const creationLabels: Record<EntityKind, string> = { customers: "Создать клиента", pets: "Создать питомца", products: "Создать продукт", groups: "Создать группу", tags: "Создать тег", nutrients: "Создать нутриент", rations: "Создать рацион", notifications: "Создать событие", modules: "Создать методику", calculations: "Создать расчёт" };
export const creatableKinds = new Set<string>(Object.keys(creationLabels));
