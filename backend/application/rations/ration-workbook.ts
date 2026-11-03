import ExcelJS, { type Cell, type Row, type Worksheet } from "exceljs";
import { nutrientKey, type SummaryNutrient } from "@/entities/ration";
import { isVisibleNutrient, requiredRationNutrients } from "@backend/domain/catalog/nutrient-conventions";

type NutrientValue = { nutrientId: string; amount: number | null; nutrient: Omit<SummaryNutrient, "id"> };
type Product = {
  id: string;
  name: string;
  baseQuantity: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  nutrients: NutrientValue[];
};

export type RationWorkbookInput = {
  name: string;
  mode: "DAILY" | "WEEKLY";
  targetEnergy: number;
  tolerancePercent: number;
  note: string | null;
  pet: { name: string; breed: { nameRu: string } | null; customer: { name: string } | null } | null;
  calculation: { protein?: number; fat?: number; carbs?: number; nutrients: { nutrientId: string; targetAmount: number; nutrient: Omit<SummaryNutrient, "id"> }[] } | null;
  items: {
    productId: string;
    enabled: boolean;
    day: number;
    quantity: number;
    grams: number;
    measure: { name: string; grams: number } | null;
    product: Product;
  }[];
};

const INK = "203B30";
const GREEN = "295B48";
const LIGHT = "EAF2EE";
const LINE = "D8E4DD";
const INPUT = "FFF4D6";
const FORMAT = "0.00######";
const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const TEMPLATE_ORDER = ["MO", "CP", "CFa", "CH", "CFi", "CAs", "Ca", "P", "Carotene", "A", "D", "E", "Tau", "Energy"];
const MACROS = { Energy: "calories", CP: "protein", CFa: "fat", CH: "carbs" } as const;

function formula(cell: Cell, expression: string, result: number | string) {
  cell.value = { formula: expression, result };
}

function input(cell: Cell, positive = false, blank = true) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: INPUT } };
  cell.dataValidation = {
    type: "decimal", operator: positive ? "greaterThan" : "greaterThanOrEqual", formulae: [0],
    allowBlank: blank, showErrorMessage: true, errorTitle: "Проверьте число",
    error: positive ? "Введите число больше нуля" : "Введите неотрицательное число",
  };
}

function header(row: Row) {
  row.height = 60;
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN } };
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFF" } };
    cell.alignment = { wrapText: true, horizontal: "center", vertical: "middle" };
  });
}

function band(sheet: Worksheet, row: number, start: number, end: number, label: string) {
  sheet.mergeCells(row, start, row, end);
  const cell = sheet.getCell(row, start);
  cell.value = label;
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } };
  cell.font = { name: "Arial", size: 10, bold: true, color: { argb: INK } };
  cell.alignment = { vertical: "middle", wrapText: true };
}

function title(sheet: Worksheet, text: string, endColumn: number) {
  sheet.mergeCells(2, 1, 2, endColumn);
  const cell = sheet.getCell("A2");
  cell.value = text;
  cell.font = { name: "Arial", size: 16, bold: true, color: { argb: INK } };
  cell.alignment = { vertical: "middle", wrapText: true };
  sheet.getRow(2).height = 42;
}

function cached(cell: Cell): number | string {
  const value = cell.value;
  if (cell.formula) return cell.result as number | string;
  return typeof value === "number" || typeof value === "string" ? value : "";
}

function productAmount(product: Product, nutrient: SummaryNutrient) {
  const macro = MACROS[nutrient.code as keyof typeof MACROS];
  const canonical = requiredRationNutrients.find((value) => value.code === nutrient.code);
  const amount = macro && canonical?.unit === nutrient.unit ? product[macro]
    : product.nutrients.find((value) => isVisibleNutrient(value.nutrient) && nutrientKey(value.nutrient) === nutrientKey(nutrient) && value.amount !== null)?.amount;
  return amount == null ? null : amount * 100 / product.baseQuantity;
}

function exportNutrients(ration: RationWorkbookInput, definitions: SummaryNutrient[]) {
  const catalog = new Map<string, SummaryNutrient>();
  for (const nutrient of requiredRationNutrients) {
    const definition = definitions.find((value) => isVisibleNutrient(value) && nutrientKey(value) === nutrientKey(nutrient));
    catalog.set(nutrientKey(nutrient), { ...nutrient, id: definition?.id ?? `required-${nutrient.code}` });
  }
  for (const value of [...ration.items.flatMap((item) => item.product.nutrients), ...ration.calculation?.nutrients ?? []]) {
    const key = nutrientKey(value.nutrient);
    if (isVisibleNutrient(value.nutrient) && !catalog.has(key)) catalog.set(key, { ...value.nutrient, id: value.nutrientId });
  }
  const rank = (code: string) => TEMPLATE_ORDER.includes(code) ? TEMPLATE_ORDER.indexOf(code) : TEMPLATE_ORDER.length;
  return [...catalog.values()].sort((left, right) => rank(left.code) - rank(right.code) || `${left.category}-${left.name}-${left.unit}`.localeCompare(`${right.category}-${right.name}-${right.unit}`, "ru"));
}

export function buildRationWorkbook(ration: RationWorkbookInput, definitions: SummaryNutrient[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "В меру корми";
  workbook.created = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;
  const nutrients = exportNutrients(ration, definitions);
  const products = [...new Map(ration.items.map((item) => [item.productId, item.product])).values()];
  if (products.some((product) => !Number.isFinite(product.baseQuantity) || product.baseQuantity <= 0)) {
    throw new Error("Базовое количество продукта должно быть больше нуля");
  }
  const main = workbook.addWorksheet("Рацион");
  const analysis = workbook.addWorksheet("Нутриенты");
  const source = workbook.addWorksheet("Состав продуктов");
  const start = 16;
  const end = Math.max(start, start + ration.items.length - 1);
  const total = end + 2;
  const daily = total + 1;
  const per100 = total + 2;
  const dry = total + 3;
  const target = total + 4;
  const maximum = total + 5;
  const missing = total + 6;
  const rawStart = 11;
  const contributionStart = rawStart + nutrients.length + 1;
  const last = contributionStart + nutrients.length - 1;
  const divisor = ration.mode === "WEEKLY" ? 7 : 1;
  const active = ration.items.filter((item) => item.enabled && item.grams > 0);
  const totalGrams = active.reduce((sum, item) => sum + item.grams, 0);
  const productRows = new Map(products.map((product, index) => [product.id, index + 6]));
  const targets = new Map<string, number | null>((ration.calculation?.nutrients ?? []).filter((value) => isVisibleNutrient(value.nutrient)).map((value) => [nutrientKey(value.nutrient), value.targetAmount]));
  for (const [code, field] of [["CP", "protein"], ["CFa", "fat"], ["CH", "carbs"]] as const) {
    const amount = ration.calculation?.[field];
    if (amount !== undefined) targets.set(`${code}|г`, amount > 0 ? amount : null);
  }
  const summaries = nutrients.map((nutrient) => ({
    amount: active.reduce((sum, item) => sum + (productAmount(item.product, nutrient) ?? 0) * item.grams / 100, 0),
    missing: active.filter((item) => productAmount(item.product, nutrient) === null).length,
    target: nutrient.code === "Energy" && nutrient.unit === "ккал" ? (ration.targetEnergy > 0 ? ration.targetEnergy : null) : targets.get(nutrientKey(nutrient)) ?? null,
  }));
  const moistureIndex = nutrients.findIndex((value) => value.code === "MO" && value.unit === "г");
  const moisture = summaries[moistureIndex];
  const dryGrams = active.length && !moisture.missing && moisture.amount <= totalGrams ? (totalGrams - moisture.amount) / divisor : null;

  main.columns = [11, 13, 38, 19, 14, 14, 16, 13, 16, 17].map((width) => ({ width }));
  for (let column = rawStart; column <= last; column += 1) main.getColumn(column).width = 16;
  main.getColumn(contributionStart - 1).width = 3;
  main.views = [{ state: "frozen", xSplit: 3, ySplit: 15, showGridLines: false, zoomScale: 85 }];
  title(main, ration.name, 10);
  main.mergeCells("A3:J3");
  main.getCell("A3").value = [ration.pet?.name ?? "Питомец не указан", ration.pet?.breed?.nameRu, ration.pet?.customer?.name, ration.mode === "WEEKLY" ? "Недельный рацион" : "Суточный рацион"].filter(Boolean).join(" · ");
  main.getRow(3).height = 28;
  main.mergeCells("A4:J4");
  main.getCell("A4").value = ration.note ?? "";
  main.getRow(4).height = ration.note ? Math.max(30, Math.ceil(ration.note.length / 120) * 15) : 12;
  const label = (range: string, text: string) => { main.mergeCells(range); main.getCell(range.split(":")[0]).value = text; };
  label("A5:C5", "Дней в периоде");
  main.getCell("D5").value = divisor;
  input(main.getCell("D5"), true, false);
  main.getCell("D5").dataValidation.type = "whole";
  main.getCell("D5").numFmt = "0";
  label("F5:I5", "Допуск к норме");
  main.getCell("J5").value = ration.tolerancePercent / 100;
  main.getCell("J5").numFmt = "0.0%";
  input(main.getCell("J5"), false, false);
  label("A6:C6", "Целевая энергия, ккал/сутки");
  main.getCell("D6").value = ration.targetEnergy || null;
  input(main.getCell("D6"));
  label("F6:I6", "Включённых позиций");
  formula(main.getCell("J6"), `COUNTIFS(A${start}:A${end},"Да",G${start}:G${end},">0")`, active.length);
  main.getCell("J6").numFmt = "0";
  label("A8:C8", "Масса, г/сутки");
  formula(main.getCell("D8"), `G${daily}`, totalGrams / divisor);
  label("F8:I8", "Энергия, ккал/сутки");
  const energyIndex = nutrients.findIndex((value) => value.code === "Energy" && value.unit === "ккал");
  formula(main.getCell("J8"), `${main.getColumn(contributionStart + energyIndex).letter}${daily}`, summaries[energyIndex].amount / divisor);
  label("A9:C9", "Влага, г/сутки (известная часть)");
  const moistureColumn = main.getColumn(contributionStart + moistureIndex).letter;
  formula(main.getCell("D9"), `${moistureColumn}${daily}`, moisture.amount / divisor);
  label("F9:I9", "Сухое вещество, г/сутки");
  formula(main.getCell("J9"), `IF(OR(J6=0,${moistureColumn}${missing}>0,D9>D8),"Нет данных",D8-D9)`, dryGrams ?? "Нет данных");
  label("A10:C10", "Влажность рациона");
  formula(main.getCell("D10"), 'IF(AND(ISNUMBER(J9),D8>0),D9/D8,"")', dryGrams === null || totalGrams === 0 ? "" : moisture.amount / totalGrams);
  main.getCell("D10").numFmt = "0.0%";
  label("F10:I10", "Стоимость, руб/сутки");
  formula(main.getCell("J10"), `J${daily}`, active.length ? "Нет цены" : 0);
  label("A11:J11", "Жёлтые ячейки можно менять. Цены заполняются на листе «Состав продуктов». Изменения в файле не сохраняются на сайте.");
  label("A12:J12", "Нет данных в составе — не подтверждённый ноль. В итогах показана известная часть. При неизвестной влаге расчёт по СВ недоступен.");
  label("A13:J13", "Нормы взяты из расчёта питомца. Пустые нормы можно заполнить ниже. Единицы соответствуют каталогу приложения.");
  for (const row of [11, 12, 13]) main.getRow(row).height = 30;
  band(main, 14, 1, 10, "Порции и стоимость за период");
  band(main, 14, rawStart, rawStart + nutrients.length - 1, "Состав на 100 г продукта");
  band(main, 14, contributionStart, last, "Вклад продуктов в рацион за период");
  main.getRow(14).height = 26;
  main.getRow(15).values = ["Включён", "День", "Продукт", "Мера", "Количество", "Граммов в мере", "Масса в рационе, г", "Доля массы", "Цена, руб/кг", "Стоимость, руб"];
  nutrients.forEach((nutrient, index) => {
    const text = `${nutrient.name}, ${nutrient.unit}`;
    main.getCell(15, rawStart + index).value = text;
    main.getCell(15, contributionStart + index).value = text;
  });
  header(main.getRow(15));
  main.autoFilter = { from: { row: 15, column: 1 }, to: { row: end, column: last } };

  source.columns = [{ width: 40 }, { width: 18 }, ...nutrients.map(() => ({ width: 17 }))];
  source.views = [{ state: "frozen", xSplit: 1, ySplit: 5, showGridLines: false }];
  title(source, "Состав продуктов на 100 г", 8);
  source.mergeCells("A3:H3");
  source.getCell("A3").value = "Источник: каталог приложения. Значения приведены к 100 г. Пусто — нет данных, 0 — известное нулевое содержание.";
  source.mergeCells("A4:H4");
  source.getCell("A4").value = "Цены в приложении не хранятся. При необходимости заполните руб/кг здесь. Состав и цены пересчитывают весь файл.";
  source.getRow(3).height = 30;
  source.getRow(4).height = 30;
  source.getRow(5).values = ["Продукт", "Цена, руб/кг", ...nutrients.map((value) => `${value.name}, ${value.unit}`)];
  header(source.getRow(5));
  products.forEach((product, index) => {
    source.getRow(index + 6).values = [product.name, null, ...nutrients.map((nutrient) => productAmount(product, nutrient))];
    for (let column = 2; column <= nutrients.length + 2; column += 1) input(source.getCell(index + 6, column));
  });
  source.autoFilter = { from: { row: 5, column: 1 }, to: { row: Math.max(6, products.length + 5), column: nutrients.length + 2 } };

  ration.items.forEach((item, index) => {
    const rowNumber = start + index;
    const sourceRow = productRows.get(item.productId)!;
    const row = main.getRow(rowNumber);
    const gramsPerMeasure = item.quantity > 0 ? item.grams / item.quantity : item.measure?.grams ?? 1;
    row.values = [item.enabled ? "Да" : "Нет", ration.mode === "WEEKLY" ? DAYS[item.day - 1] : "Ежедневно", item.product.name, item.measure?.name ?? (gramsPerMeasure === 1 ? "Граммы" : "Сохранённая мера"), item.quantity, gramsPerMeasure];
    row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: INPUT } };
    row.getCell(1).dataValidation = { type: "list", allowBlank: false, formulae: ['"Да,Нет"'], showErrorMessage: true, error: "Выберите Да или Нет" };
    input(row.getCell(5), false, false);
    input(row.getCell(6), true, false);
    const grams = item.enabled ? item.grams : 0;
    formula(row.getCell(7), `IF(A${rowNumber}="Да",E${rowNumber}*F${rowNumber},0)`, grams);
    formula(row.getCell(8), `IF($G$${total}>0,G${rowNumber}/$G$${total},0)`, totalGrams ? grams / totalGrams : 0);
    row.getCell(8).numFmt = "0.00%";
    const priceRef = `'Состав продуктов'!$B$${sourceRow}`;
    formula(row.getCell(9), `IF(ISNUMBER(${priceRef}),${priceRef},"Нет цены")`, "Нет цены");
    formula(row.getCell(10), `IF(G${rowNumber}=0,0,IF(ISNUMBER(I${rowNumber}),G${rowNumber}*I${rowNumber}/1000,"Нет цены"))`, grams ? "Нет цены" : 0);
    nutrients.forEach((nutrient, nutrientIndex) => {
      const sourceRef = `'Состав продуктов'!$${source.getColumn(nutrientIndex + 3).letter}$${sourceRow}`;
      const rawCell = row.getCell(rawStart + nutrientIndex);
      const amount = productAmount(item.product, nutrient);
      formula(rawCell, `IF(ISNUMBER(${sourceRef}),${sourceRef},"Нет данных")`, amount ?? "Нет данных");
      formula(row.getCell(contributionStart + nutrientIndex), `IF(ISNUMBER(${rawCell.address}),$G${rowNumber}*${rawCell.address}/100,0)`, grams * (amount ?? 0) / 100);
    });
  });
  if (!ration.items.length) main.getCell(start, 3).value = "В рационе пока нет продуктов";
  main.addConditionalFormatting({ ref: `A${start}:${main.getColumn(last).letter}${end}`, rules: [{ type: "expression", formulae: [`$A${start}="Нет"`], priority: 1, style: { font: { color: { argb: "7F8C85" } }, fill: { type: "pattern", pattern: "solid", fgColor: { argb: "F0F3F1" } } } }] });

  for (const [row, text] of [[total, "Итого за период"], [daily, "В среднем за сутки"], [per100, "На 100 г рациона"], [dry, "На 100 г сухого вещества"], [target, "Норма в сутки"], [maximum, "Норма + допуск в сутки"], [missing, "Позиций без данных"]] as const) {
    band(main, row, 1, 6, text);
    main.getRow(row).height = 26;
  }
  formula(main.getCell(total, 7), `SUM(G${start}:G${end})`, totalGrams);
  formula(main.getCell(daily, 7), `G${total}/$D$5`, totalGrams / divisor);
  formula(main.getCell(total, 8), `SUM(H${start}:H${end})`, totalGrams ? 1 : 0);
  main.getCell(total, 8).numFmt = "0.00%";
  formula(main.getCell(total, 10), `IF(COUNTIFS(G${start}:G${end},">0",I${start}:I${end},"Нет цены")>0,"Нет цены",SUM(J${start}:J${end}))`, active.length ? "Нет цены" : 0);
  formula(main.getCell(daily, 10), `IF(ISNUMBER(J${total}),J${total}/$D$5,"Нет цены")`, active.length ? "Нет цены" : 0);
  formula(main.getCell(per100, 10), `IF(AND(ISNUMBER(J${total}),G${total}>0),J${total}/G${total}*100,"")`, "");
  nutrients.forEach((nutrient, index) => {
    const column = contributionStart + index;
    const letter = main.getColumn(column).letter;
    const raw = main.getColumn(rawStart + index).letter;
    const summary = summaries[index];
    formula(main.getCell(total, column), `SUM(${letter}${start}:${letter}${end})`, summary.amount);
    formula(main.getCell(daily, column), `${letter}${total}/$D$5`, summary.amount / divisor);
    formula(main.getCell(per100, column), `IF($G$${total}>0,${letter}${total}/$G$${total}*100,"")`, totalGrams ? summary.amount / totalGrams * 100 : "");
    const dryExpression = index === moistureIndex ? "0" : `${letter}${daily}/$J$9*100`;
    formula(main.getCell(dry, column), `IF(AND(ISNUMBER($J$9),$J$9>0),${dryExpression},"")`, dryGrams && dryGrams > 0 ? (index === moistureIndex ? 0 : summary.amount / divisor / dryGrams * 100) : "");
    const targetCell = main.getCell(target, column);
    if (index === energyIndex) formula(targetCell, 'IF(AND(ISNUMBER($D$6),$D$6>0),$D$6,"")', summary.target ?? "");
    else { targetCell.value = summary.target; input(targetCell); }
    formula(main.getCell(maximum, column), `IF(ISNUMBER(${letter}${target}),${letter}${target}*(1+$J$5),"")`, summary.target === null ? "" : summary.target * (1 + ration.tolerancePercent / 100));
    formula(main.getCell(missing, column), `COUNTIFS($G${start}:$G${end},">0",${raw}${start}:${raw}${end},"Нет данных")`, summary.missing);
    main.getCell(missing, column).numFmt = "0";
  });

  analysis.columns = [34, 12, 19, 19, 21, 19, 19, 15, 27, 18, 24].map((width) => ({ width }));
  analysis.views = [{ state: "frozen", xSplit: 1, ySplit: 5, showGridLines: false, zoomScale: 90 }];
  title(analysis, "Анализ рациона и нормы", 11);
  analysis.mergeCells("A3:K3");
  analysis.getCell("A3").value = "Нули при неполных данных означают только известную часть. Показатели на 100 г СВ доступны при известной влаге всех включённых продуктов.";
  analysis.getRow(3).height = 32;
  analysis.mergeCells("A4:K4");
  analysis.getCell("A4").value = "Сравнение с суточными нормами из расчёта питомца, а не универсальными нормами из шаблона. Допуск не является безопасным верхним пределом.";
  analysis.getRow(4).height = 32;
  analysis.getRow(5).values = ["Нутриент", "Единица", "Факт в сутки", "На 100 г рациона", "На 100 г СВ", "Норма в сутки", "Норма + допуск", "От нормы", "Статус", "Позиций без данных", "Категория"];
  header(analysis.getRow(5));
  nutrients.forEach((nutrient, index) => {
    const rowNumber = index + 6;
    const row = analysis.getRow(rowNumber);
    const column = contributionStart + index;
    const letter = main.getColumn(column).letter;
    const summary = summaries[index];
    row.values = [nutrient.name, nutrient.unit];
    for (const [output, inputRow] of [[3, daily], [4, per100], [5, dry], [6, target], [7, maximum], [10, missing]]) {
      const ref = `'Рацион'!${letter}${inputRow}`;
      formula(row.getCell(output), `IF(ISNUMBER(${ref}),${ref},"")`, cached(main.getCell(inputRow, column)));
    }
    formula(row.getCell(8), `IF(AND(ISNUMBER(F${rowNumber}),F${rowNumber}>0),C${rowNumber}/F${rowNumber},"")`, summary.target !== null && summary.target > 0 ? summary.amount / divisor / summary.target : "");
    row.getCell(8).numFmt = "0.0%";
    row.getCell(10).numFmt = "0";
    const actual = summary.amount / divisor;
    const status = !active.length ? "Нет продуктов" : summary.missing ? "Нет полных данных" : summary.target === null ? "Норма не указана" : actual < summary.target ? "Недобор" : actual > summary.target * (1 + ration.tolerancePercent / 100) ? "Выше допуска" : "В диапазоне";
    formula(row.getCell(9), `IF('Рацион'!$J$6=0,"Нет продуктов",IF(J${rowNumber}>0,"Нет полных данных",IF(NOT(ISNUMBER(F${rowNumber})),"Норма не указана",IF(C${rowNumber}<F${rowNumber},"Недобор",IF(C${rowNumber}>G${rowNumber},"Выше допуска","В диапазоне")))))`, status);
    row.getCell(11).value = nutrient.category;
  });
  analysis.autoFilter = `A5:K${nutrients.length + 5}`;
  analysis.addConditionalFormatting({ ref: `I6:J${nutrients.length + 5}`, rules: [{ type: "expression", priority: 1, formulae: ['OR($I6="Нет полных данных",$I6="Недобор",$I6="Выше допуска")'], style: { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FBE8E6" } } } }] });

  for (const sheet of workbook.worksheets) {
    sheet.properties.defaultRowHeight = 26;
    sheet.eachRow((row) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { name: "Arial", size: 10, color: { argb: INK }, ...cell.font };
        cell.alignment = { vertical: "middle", wrapText: true, ...cell.alignment };
        if (!cell.numFmt) cell.numFmt = FORMAT;
        if (row.number >= (sheet === main ? start : 6)) cell.border = { bottom: { style: "hair", color: { argb: LINE } } };
      });
      if (sheet === main && row.number >= start && row.number <= end) row.height = Math.max(40, Math.ceil(String(row.getCell(3).value ?? "").length / 32) * 14);
      if (sheet === source && row.number >= 6) row.height = Math.max(32, Math.ceil(String(row.getCell(1).value ?? "").length / 34) * 14);
      if (sheet === analysis && row.number >= 6) row.height = Math.max(30, Math.ceil(String(row.getCell(1).value ?? "").length / 28) * 14);
    });
    sheet.pageSetup = { orientation: "landscape", paperSize: 9, scale: 85, printTitlesRow: sheet === main ? "14:15" : "5:5", printTitlesColumn: sheet === main ? "A:C" : "A:A", printArea: `A1:${sheet.getColumn(sheet.columnCount).letter}${sheet.rowCount}` };
    sheet.headerFooter.oddFooter = "В меру корми · &D · страница &P из &N";
  }
  return workbook;
}
