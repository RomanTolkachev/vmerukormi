import "server-only";

import ExcelJS, { type Cell, type Row, type Worksheet } from "exceljs";
import { prisma } from "@backend/infrastructure/database/prisma";

const BLUE = "2F75B5";
const BLUE_LIGHT = "DCEAF5";
const GREEN = "E1F1E5";
const INK = "203243";
const MUTED = "647789";
const LINE = "D9E2EA";
const DISABLED = "F1F3F5";
const WHITE = "FFFFFF";
const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

type ExportRation = NonNullable<Awaited<ReturnType<typeof findRation>>>;

function findRation(userId: string, id: string) {
  return prisma.ration.findFirst({
    where: { id, userId },
    include: {
      pet: {
        include: {
          breed: { select: { nameRu: true } },
          customer: { select: { name: true } },
        },
      },
      items: {
        include: {
          measure: true,
          product: {
            include: {
              nutrients: {
                include: { nutrient: true },
                orderBy: { nutrient: { category: "asc" } },
              },
            },
          },
        },
        orderBy: [{ day: "asc" }, { id: "asc" }],
      },
    },
  });
}

function thinBottom(cell: Cell) {
  cell.border = { bottom: { style: "thin", color: { argb: LINE } } };
}

function styleSectionTitle(row: Row, lastColumn: number) {
  row.height = 25;
  for (let column = 1; column <= lastColumn; column += 1) {
    const cell = row.getCell(column);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE_LIGHT } };
    cell.font = { bold: true, color: { argb: INK } };
    cell.alignment = { vertical: "middle" };
  }
}

function styleTableHeader(row: Row) {
  row.height = 28;
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
    cell.font = { bold: true, color: { argb: WHITE }, size: 10 };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
}

function addLabelValue(sheet: Worksheet, rowNumber: number, label: string, value: string | number) {
  const labelCell = sheet.getCell(rowNumber, 1);
  const valueCell = sheet.getCell(rowNumber, 2);
  labelCell.value = label;
  labelCell.font = { bold: true, color: { argb: MUTED } };
  valueCell.value = value;
  sheet.mergeCells(rowNumber, 2, rowNumber, 5);
}

function amountForItem(item: ExportRation["items"][number], value: number) {
  return (item.grams * value) / item.product.baseQuantity;
}

function safeFilePart(value: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return normalized || "ration";
}

function buildWorkbook(ration: ExportRation) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "В меру корми";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;
  const products = [...new Map(ration.items.map((item) => [item.product.id, item.product])).values()]
    .sort((left, right) => left.name.localeCompare(right.name, "ru"));
  const productRows = new Map(products.map((product, index) => [product.id, index + 4]));

  const rationSheet = workbook.addWorksheet("Рацион", {
    properties: { defaultRowHeight: 18 },
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    },
  });
  rationSheet.views = [{ state: "frozen", ySplit: 12, showGridLines: false }];
  rationSheet.columns = [
    { width: 15 },
    { width: 9 },
    { width: 34 },
    { width: 20 },
    { width: 12 },
    { width: 12 },
    { width: 14 },
    { width: 12 },
    { width: 12 },
    { width: 14 },
  ];

  rationSheet.mergeCells("A1:J1");
  const title = rationSheet.getCell("A1");
  title.value = ration.name;
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
  title.font = { bold: true, color: { argb: WHITE }, size: 20 };
  title.alignment = { vertical: "middle", horizontal: "left" };
  rationSheet.getRow(1).height = 38;

  const petDescription = ration.pet
    ? [
        ration.pet.name,
        ration.pet.species === "CAT" ? "кошка" : "собака",
        ration.pet.breed?.nameRu,
        `${ration.pet.actualWeight} кг`,
      ].filter(Boolean).join(" · ")
    : "Не указан";
  addLabelValue(rationSheet, 3, "Питомец", petDescription);
  addLabelValue(rationSheet, 4, "Клиент", ration.pet?.customer?.name ?? "Не указан");
  addLabelValue(rationSheet, 5, "Режим", ration.mode === "DAILY" ? "Суточный" : "Недельный");
  addLabelValue(rationSheet, 6, "Дата выгрузки", new Date().toLocaleDateString("ru-RU"));
  if (ration.note) addLabelValue(rationSheet, 7, "Заметка", ration.note);

  rationSheet.mergeCells("A9:J9");
  rationSheet.getCell("A9").value = "Итоги в сутки";
  styleSectionTitle(rationSheet.getRow(9), 10);
  rationSheet.mergeCells("D10:E10");
  rationSheet.mergeCells("I10:J10");
  const summaryHeaders = [
    [1, "Цель, ккал"],
    [2, "Факт, ккал"],
    [3, "% от цели"],
    [4, "Статус"],
    [6, "Вес, г"],
    [7, "Белок, г"],
    [8, "Жир, г"],
    [9, "Углеводы, г"],
  ] as const;
  const summaryHeaderRow = rationSheet.getRow(10);
  summaryHeaders.forEach(([column, header]) => {
    summaryHeaderRow.getCell(column).value = header;
  });
  styleTableHeader(summaryHeaderRow);

  const itemHeaderRowNumber = 13;
  const itemStartRow = itemHeaderRowNumber + 1;
  const itemEndRow = Math.max(itemStartRow, itemStartRow + ration.items.length - 1);
  const divisor = ration.mode === "WEEKLY" ? 7 : 1;
  const enabledItems = ration.items.filter((item) => item.enabled);
  const daily = enabledItems.reduce(
    (total, item) => ({
      grams: total.grams + item.grams / divisor,
      calories: total.calories + amountForItem(item, item.product.calories) / divisor,
      protein: total.protein + amountForItem(item, item.product.protein) / divisor,
      fat: total.fat + amountForItem(item, item.product.fat) / divisor,
      carbs: total.carbs + amountForItem(item, item.product.carbs) / divisor,
    }),
    { grams: 0, calories: 0, protein: 0, fat: 0, carbs: 0 },
  );
  const percent = ration.targetEnergy ? daily.calories / ration.targetEnergy : 0;
  const status = !ration.targetEnergy
    ? "Цель не указана"
    : percent < 0.9
      ? "Недобор"
      : percent > 1.1
        ? "Избыток"
        : "В диапазоне";

  rationSheet.mergeCells("D11:E11");
  rationSheet.mergeCells("I11:J11");
  const summaryRow = rationSheet.getRow(11);
  summaryRow.getCell(1).value = ration.targetEnergy;
  summaryRow.getCell(2).value = { formula: `SUM(G${itemStartRow}:G${itemEndRow})/${divisor}`, result: daily.calories };
  summaryRow.getCell(3).value = ration.targetEnergy ? { formula: "IFERROR(B11/A11,0)", result: percent } : 0;
  summaryRow.getCell(4).value = status;
  summaryRow.getCell(6).value = { formula: `SUM(F${itemStartRow}:F${itemEndRow})/${divisor}`, result: daily.grams };
  summaryRow.getCell(7).value = { formula: `SUM(H${itemStartRow}:H${itemEndRow})/${divisor}`, result: daily.protein };
  summaryRow.getCell(8).value = { formula: `SUM(I${itemStartRow}:I${itemEndRow})/${divisor}`, result: daily.fat };
  summaryRow.getCell(9).value = { formula: `SUM(J${itemStartRow}:J${itemEndRow})/${divisor}`, result: daily.carbs };
  summaryRow.height = 28;
  summaryRow.eachCell((cell, column) => {
    cell.font = { bold: true, color: { argb: INK } };
    cell.alignment = { vertical: "middle", horizontal: column === 4 ? "left" : "right" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: column === 4 ? GREEN : "F6F9FB" } };
    thinBottom(cell);
  });
  rationSheet.getCell("C11").numFmt = "0%";
  for (const column of [1, 2, 6, 7, 8, 9]) rationSheet.getRow(11).getCell(column).numFmt = "0.0";

  rationSheet.mergeCells("A12:J12");
  rationSheet.getCell("A12").value = "Состав рациона";
  styleSectionTitle(rationSheet.getRow(12), 10);
  const itemHeaders = ["Включён", "День", "Продукт", "Мера", "Количество", "Граммы", "Энергия, ккал", "Белок, г", "Жир, г", "Углеводы, г"];
  const itemHeaderRow = rationSheet.getRow(itemHeaderRowNumber);
  itemHeaders.forEach((header, index) => {
    itemHeaderRow.getCell(index + 1).value = header;
  });
  styleTableHeader(itemHeaderRow);

  ration.items.forEach((item, index) => {
    const rowNumber = itemStartRow + index;
    const productRow = productRows.get(item.productId);
    if (!productRow) throw new Error(`Не найден продукт для позиции ${item.id}`);
    const row = rationSheet.getRow(rowNumber);
    const factor = item.grams / item.product.baseQuantity;
    row.values = [
      item.enabled ? "Да" : "Нет",
      ration.mode === "WEEKLY" ? days[item.day - 1] ?? item.day : "Ежедневно",
      item.product.name,
      item.measure?.name ?? "Граммы",
      item.quantity,
      item.grams,
      item.enabled ? { formula: `F${rowNumber}*'Состав продуктов'!$C$${productRow}/'Состав продуктов'!$B$${productRow}`, result: item.product.calories * factor } : 0,
      item.enabled ? { formula: `F${rowNumber}*'Состав продуктов'!$D$${productRow}/'Состав продуктов'!$B$${productRow}`, result: item.product.protein * factor } : 0,
      item.enabled ? { formula: `F${rowNumber}*'Состав продуктов'!$E$${productRow}/'Состав продуктов'!$B$${productRow}`, result: item.product.fat * factor } : 0,
      item.enabled ? { formula: `F${rowNumber}*'Состав продуктов'!$F$${productRow}/'Состав продуктов'!$B$${productRow}`, result: item.product.carbs * factor } : 0,
    ];
    row.height = 25;
    row.eachCell((cell, column) => {
      cell.alignment = { vertical: "middle", horizontal: column <= 4 ? "left" : "right", wrapText: column === 3 };
      if (!item.enabled) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DISABLED } };
      thinBottom(cell);
    });
    for (let column = 5; column <= 10; column += 1) row.getCell(column).numFmt = "0.00";
  });
  if (!ration.items.length) {
    rationSheet.mergeCells(itemStartRow, 1, itemStartRow, 10);
    const empty = rationSheet.getCell(itemStartRow, 1);
    empty.value = "В рационе пока нет продуктов";
    empty.font = { italic: true, color: { argb: MUTED } };
    empty.alignment = { horizontal: "center" };
  }
  rationSheet.autoFilter = { from: { row: itemHeaderRowNumber, column: 1 }, to: { row: itemHeaderRowNumber, column: 10 } };

  const nutrientsSheet = workbook.addWorksheet("Нутриенты", {
    properties: { defaultRowHeight: 20 },
    views: [{ state: "frozen", ySplit: 3, showGridLines: false }],
  });
  nutrientsSheet.columns = [{ width: 14 }, { width: 34 }, { width: 24 }, { width: 13 }, { width: 18 }];
  nutrientsSheet.mergeCells("A1:E1");
  nutrientsSheet.getCell("A1").value = "Нутриенты в сутки";
  nutrientsSheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
  nutrientsSheet.getCell("A1").font = { bold: true, color: { argb: WHITE }, size: 18 };
  nutrientsSheet.getRow(1).height = 36;
  const nutrientHeader = nutrientsSheet.getRow(3);
  nutrientHeader.values = ["Код", "Нутриент", "Категория", "Единица", "Количество в сутки"];
  styleTableHeader(nutrientHeader);

  const nutrientTotals = new Map<string, { code: string; name: string; category: string; unit: string; amount: number }>();
  enabledItems.forEach((item) => {
    const factor = item.grams / item.product.baseQuantity / divisor;
    item.product.nutrients.forEach((value) => {
      if (value.amount === null) return;
      const current = nutrientTotals.get(value.nutrientId);
      nutrientTotals.set(value.nutrientId, {
        code: value.nutrient.code,
        name: value.nutrient.name,
        category: value.nutrient.category,
        unit: value.nutrient.unit,
        amount: (current?.amount ?? 0) + value.amount * factor,
      });
    });
  });
  [...nutrientTotals.values()]
    .sort((left, right) => `${left.category}-${left.name}`.localeCompare(`${right.category}-${right.name}`, "ru"))
    .forEach((nutrient, index) => {
      const row = nutrientsSheet.getRow(index + 4);
      row.values = [nutrient.code, nutrient.name, nutrient.category, nutrient.unit, nutrient.amount];
      row.getCell(5).numFmt = "0.000";
      row.eachCell((cell) => thinBottom(cell));
    });
  if (!nutrientTotals.size) {
    nutrientsSheet.mergeCells("A4:E4");
    nutrientsSheet.getCell("A4").value = "Для включённых продуктов нутриенты не заполнены";
    nutrientsSheet.getCell("A4").font = { italic: true, color: { argb: MUTED } };
  }
  nutrientsSheet.autoFilter = "A3:E3";

  const productsSheet = workbook.addWorksheet("Состав продуктов", {
    properties: { defaultRowHeight: 20 },
    views: [{ state: "frozen", ySplit: 3, showGridLines: false }],
  });
  productsSheet.columns = [{ width: 38 }, { width: 14 }, { width: 13 }, { width: 13 }, { width: 13 }, { width: 13 }];
  productsSheet.mergeCells("A1:F1");
  productsSheet.getCell("A1").value = "Пищевая ценность продуктов";
  productsSheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
  productsSheet.getCell("A1").font = { bold: true, color: { argb: WHITE }, size: 18 };
  productsSheet.getRow(1).height = 36;
  const productHeader = productsSheet.getRow(3);
  productHeader.values = ["Продукт", "База, г", "Ккал", "Белок, г", "Жир, г", "Углеводы, г"];
  styleTableHeader(productHeader);
  products.forEach((product, index) => {
    const row = productsSheet.getRow(index + 4);
    row.values = [product.name, product.baseQuantity, product.calories, product.protein, product.fat, product.carbs];
    for (let column = 2; column <= 6; column += 1) row.getCell(column).numFmt = "0.00";
    row.eachCell((cell) => thinBottom(cell));
  });
  productsSheet.autoFilter = "A3:F3";

  for (const sheet of workbook.worksheets) {
    sheet.pageSetup.printArea = `A1:${sheet.getColumn(sheet.columnCount).letter}${sheet.rowCount}`;
    sheet.headerFooter.oddFooter = "В меру корми · &D · страница &P из &N";
  }

  return workbook;
}

export async function exportRationXlsx(userId: string, rationId: string) {
  const ration = await findRation(userId, rationId);
  if (!ration) return null;

  const workbook = buildWorkbook(ration);
  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: new Uint8Array(buffer),
    fileName: `${safeFilePart(ration.name)}.xlsx`,
  };
}
