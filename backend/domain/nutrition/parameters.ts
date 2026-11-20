import { evaluateExpression, expressionVariables } from "./expression";
import { MODULES } from "./modules";

export const calculationParameters = [
  { key: "AW", label: "Фактическая масса, кг", min: Number.MIN_VALUE },
  { key: "IW", label: "Идеальная масса, кг", min: Number.MIN_VALUE },
  { key: "LACTATION_WEEK", label: "Неделя лактации", min: 1, integer: true },
  { key: "CHILDREN", label: "Количество детёнышей", min: 0, integer: true },
  { key: "K", label: "Коэффициент K", min: 0 },
  { key: "L", label: "Коэффициент L", min: 0 },
  { key: "N", label: "Коэффициент N", min: 0 },
  { key: "M", label: "Коэффициент M", min: 0 },
] as const;
export type ParameterKey = typeof calculationParameters[number]["key"];
export type Parameters = Partial<Record<ParameterKey, number>>;
export type ParameterDraft = Partial<Record<ParameterKey, string | number>>;
export type CoefficientDraft = Record<string, string | number>;
export type CoefficientProfile = "MANUAL" | "CAT_LACTATION" | "DOG_LACTATION";
export type FormulaTemplate = {
  key: string; moduleId: string; formula: string; expression: string; speciesCodes: string[];
  profile: CoefficientProfile; fields: ParameterKey[]; automatic: ParameterKey[]; growing: boolean;
  coefficients: { key: string; label: string; value: number }[];
};

export const formulaTemplates: FormulaTemplate[] = MODULES.map(module => {
  const profile: CoefficientProfile = module.id === "cat-lactation" ? "CAT_LACTATION" : module.id === "dog-lactation" ? "DOG_LACTATION" : "MANUAL";
  const growing = ["cat-kitten", "dog-puppy-1", "dog-puppy-2"].includes(module.id);
  const labels = growing ? ["Базовый коэффициент", "Показатель степени массы", "Множитель роста", "Коэффициент экспоненты", "Вычитаемая поправка"] : ["Базовый коэффициент", "Показатель степени массы", ...(module.id === "dog-lactation" ? ["Коэффициент первых щенков", "Коэффициент следующих щенков"] : ["Дополнительный коэффициент массы"])];
  const coefficients: FormulaTemplate["coefficients"] = [];
  const expression = module.formula.replace(/\d+(?:\.\d+)?/g, literal => {
    const key = `C${coefficients.length + 1}`;
    coefficients.push({ key, label: labels[coefficients.length], value: Number(literal) });
    return key;
  });
  const automatic: ParameterKey[] = profile === "CAT_LACTATION" ? ["K", "L"] : profile === "DOG_LACTATION" ? ["N", "M", "L"] : [];
  const fields: ParameterKey[] = growing ? ["AW", "IW"] : ["IW"];
  if (automatic.length) fields.push("LACTATION_WEEK", "CHILDREN", ...automatic);
  return { key: `${module.id}:v1`, moduleId: module.id, formula: module.formula, expression, speciesCodes: [module.species], profile, fields, automatic, growing, coefficients };
});

export function getFormulaTemplate(key: string | null | undefined) {
  return formulaTemplates.find(template => template.key === key);
}

export function parameterLabel(template: FormulaTemplate, key: ParameterKey) {
  return key === "IW" && template.growing ? "Ожидаемая взрослая масса, кг" : calculationParameters.find(parameter => parameter.key === key)!.label;
}

export function cleanParameters(input: Record<string, unknown>, template: FormulaTemplate): Parameters {
  const result: Parameters = {};
  for (const [key, raw] of Object.entries(input)) {
    if (raw === "" || raw === null || raw === undefined) continue;
    const definition = calculationParameters.find(item => item.key === key && template.fields.includes(item.key));
    if (!definition) throw new Error(`Параметр ${key} не используется в выбранной формуле`);
    const value = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() ? Number(raw) : NaN;
    if (!Number.isFinite(value) || value < definition.min || ("integer" in definition && !Number.isSafeInteger(value))) throw new Error(`${parameterLabel(template, definition.key)}: укажите ${"integer" in definition ? "целое " : ""}${definition.min > 0 ? "положительное" : "неотрицательное"} число`);
    result[definition.key] = value;
  }
  return result;
}

export function resolveCoefficients(template: FormulaTemplate, input: Record<string, unknown>) {
  for (const key of Object.keys(input)) if (!template.coefficients.some(item => item.key === key)) throw new Error(`Неизвестный коэффициент ${key}`);
  return Object.fromEntries(template.coefficients.map(definition => {
    const raw = input[definition.key] === undefined ? definition.value : input[definition.key];
    const value = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() ? Number(raw) : NaN;
    if (!Number.isFinite(value)) throw new Error(`${definition.label}: введите конечное число или сбросьте коэффициенты`);
    return [definition.key, value];
  }));
}

export function requiredParameters(template: FormulaTemplate, provided: ParameterDraft = {}) {
  const required = new Set<ParameterKey>();
  for (const variable of expressionVariables(template.formula)) {
    const key = variable as ParameterKey;
    if (provided[key] !== undefined && provided[key] !== "") { required.add(key); continue; }
    if ((template.profile === "CAT_LACTATION" && key === "K") || (template.profile === "DOG_LACTATION" && ["N", "M"].includes(key))) required.add("CHILDREN");
    else if (template.profile !== "MANUAL" && key === "L") required.add("LACTATION_WEEK");
    else required.add(key);
  }
  return required;
}

export function resolveParameters(template: FormulaTemplate, input: Parameters) {
  const values: Record<string, number> = { ...input };
  for (const key of requiredParameters(template, input)) {
    if (values[key] === undefined) throw new Error(`Заполните параметр «${parameterLabel(template, key)}»: он используется в формуле`);
  }
  const week = input.LACTATION_WEEK;
  const children = input.CHILDREN;
  if (template.profile === "CAT_LACTATION") {
    if (values.K === undefined && children !== undefined) values.K = children < 3 ? 18 : children < 5 ? 60 : 70;
    if (values.L === undefined && week !== undefined) values.L = week <= 2 ? 0.9 : week <= 4 ? 1.2 : week === 5 ? 1.1 : 1;
  }
  if (template.profile === "DOG_LACTATION") {
    if (values.N === undefined && children !== undefined) values.N = Math.min(children, 4);
    if (values.M === undefined && children !== undefined) values.M = Math.min(Math.max(children - 4, 0), 4);
    if (values.L === undefined && week !== undefined) values.L = week === 1 ? 0.75 : week === 2 ? 0.95 : week === 3 ? 1.1 : 1.2;
  }
  return Object.fromEntries(expressionVariables(template.formula).map(key => [key, values[key]]));
}

export function displayFormula(template: FormulaTemplate, coefficients: CoefficientDraft) {
  return template.expression.replace(/\bC\d+\b/g, key => {
    const value = coefficients[key] ?? template.coefficients.find(item => item.key === key)!.value;
    return value === "" ? `[${key}]` : `(${value})`;
  });
}

export function calculateWithParameters(template: FormulaTemplate, parameters: Parameters, overrides: CoefficientDraft = {}, energyFactor = 1) {
  const variables = resolveParameters(template, cleanParameters(parameters, template));
  const coefficients = resolveCoefficients(template, overrides);
  const base = evaluateExpression(template.expression, { ...variables, ...coefficients });
  const adjusted = base * energyFactor;
  if (!(base > 0) || !Number.isFinite(energyFactor) || !(energyFactor > 0) || !Number.isFinite(adjusted) || !(adjusted > 0)) throw new Error("Формула должна давать положительный конечный результат");
  if (Math.round(base) < 1 || Math.round(adjusted) < 1 || Math.round(base) > 2147483647 || Math.round(adjusted) > 2147483647) throw new Error("Результат нельзя сохранить: после округления требуется от 1 до 2 147 483 647 ккал");
  return { baseEnergy: Math.round(base), adjustedEnergy: Math.round(adjusted), variables, coefficients };
}
