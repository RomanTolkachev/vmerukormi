import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import ExcelJS, { type Cell, type Workbook } from "exceljs";
import { referenceNutrients, requiredRationNutrients } from "@backend/domain/catalog/nutrient-conventions";
import { buildRationWorkbook, type RationWorkbookInput } from "./ration-workbook";

function nutrient(code: string) {
  const definition = referenceNutrients.find((value) => value.code === code)!;
  return { ...definition, id: code };
}

function fixture(): RationWorkbookInput {
  const values = (water: number, zinc: number) => [
    { nutrientId: "MO", amount: water, nutrient: nutrient("MO") },
    { nutrientId: "Zn", amount: zinc, nutrient: nutrient("Zn") },
  ];
  const chicken = { id: "chicken", name: "Куриная грудка", baseQuantity: 200, calories: 400, protein: 40, fat: 20, carbs: 20, nutrients: [...values(140, 4), { nutrientId: "CP", amount: 999, nutrient: nutrient("CP") }] };
  const rice = { id: "rice", name: "Рис", baseQuantity: 50, calories: 50, protein: 5, fat: 0, carbs: 10, nutrients: values(10, 0) };
  const excluded = { id: "excluded", name: "Отключённый продукт", baseQuantity: 100, calories: 300, protein: 30, fat: 10, carbs: 5, nutrients: values(40, 6) };
  return {
    name: "Проверка формул", mode: "DAILY", targetEnergy: 300, tolerancePercent: 10, note: null,
    pet: { name: "Барсик", breed: null, customer: { name: "Тестовый клиент" } },
    calculation: { nutrients: [{ nutrientId: "CP", nutrient: nutrient("CP"), targetAmount: 30 }] },
    items: [
      { productId: chicken.id, product: chicken, day: 1, enabled: true, quantity: 2, grams: 100, measure: { name: "Порция", grams: 50 } },
      { productId: rice.id, product: rice, day: 2, enabled: true, quantity: 100, grams: 100, measure: null },
      { productId: excluded.id, product: excluded, day: 3, enabled: false, quantity: 300, grams: 300, measure: null },
    ],
  };
}

function value(cell: Cell): unknown {
  const current = cell.value;
  return cell.formula ? cell.result ?? "" : current ?? "";
}

function close(actual: unknown, expected: unknown, message = "") {
  if (typeof expected === "number") {
    assert.equal(typeof actual, "number", message);
    assert.ok(Math.abs(Number(actual) - expected) <= Math.max(1, Math.abs(expected)) * 1e-10, `${message}: ${actual} != ${expected}`);
  } else assert.equal(actual, expected, message);
}

function nutrientRow(workbook: Workbook, code: string) {
  const sheet = workbook.getWorksheet("Нутриенты")!;
  const name = nutrient(code).name;
  let result = 0;
  sheet.eachRow((row) => { if (row.getCell(1).value === name) result = row.number; });
  assert.ok(result, `Missing nutrient ${code}`);
  return sheet.getRow(result);
}

function assertNoErrors(workbook: Workbook) {
  workbook.eachSheet((sheet) => sheet.eachRow((row) => row.eachCell((cell) => {
    const current = value(cell);
    assert.ok(!(current && typeof current === "object" && "error" in current), `${sheet.name}!${cell.address}: ${JSON.stringify(current)}`);
    if (typeof current === "number") assert.ok(Number.isFinite(current), cell.address);
    if (cell.formula) assert.ok(!/#REF!|\[[^\]]+\.xlsx\]/.test(cell.formula), cell.formula);
  })));
}

test("export contains template nutrients, product contributions and correct cached totals", () => {
  const workbook = buildRationWorkbook(fixture(), []);
  for (const definition of requiredRationNutrients) nutrientRow(workbook, definition.code);
  const sheet = workbook.getWorksheet("Рацион")!;
  close(value(sheet.getCell("D8")), 200);
  close(value(sheet.getCell("J8")), 300);
  close(value(sheet.getCell("D9")), 90);
  close(value(sheet.getCell("J9")), 110);
  close(value(sheet.getCell("G18")), 0);
  close(value(sheet.getCell("H16")), 0.5);
  const protein = nutrientRow(workbook, "CP");
  close(value(protein.getCell(3)), 30);
  close(value(protein.getCell(4)), 15);
  close(value(protein.getCell(5)), 30 / 110 * 100);
  close(value(protein.getCell(9)), "В диапазоне");
  close(value(nutrientRow(workbook, "Ca").getCell(3)), 0);
  close(value(nutrientRow(workbook, "Ca").getCell(10)), 2);
  close(value(nutrientRow(workbook, "Zn").getCell(10)), 0);
  assertNoErrors(workbook);
});

test("export preserves all units, disabled-product and norm-only nutrients but excludes unrelated definitions", () => {
  const ration = fixture();
  ration.items[2].product.nutrients.push({ nutrientId: "Cu", nutrient: nutrient("Cu"), amount: 1 });
  ration.items[0].product.nutrients.push({ nutrientId: "hidden", nutrient: { ...nutrient("Fe"), isReferenceOnly: true }, amount: 100 });
  ration.calculation!.nutrients.push({ nutrientId: "Se", nutrient: nutrient("Se"), targetAmount: 0.005 });
  const workbook = buildRationWorkbook(ration, [nutrient("Fe"), nutrient("B12")]);
  close(value(nutrientRow(workbook, "Cu").getCell(3)), 0);
  close(value(nutrientRow(workbook, "Se").getCell(6)), 0.005);
  assert.throws(() => nutrientRow(workbook, "Fe"));
  assert.throws(() => nutrientRow(workbook, "B12"));
  for (const code of ["A", "D", "E", "Tau", "Ca", "Se"]) close(value(nutrientRow(workbook, code).getCell(2)), nutrient(code).unit);
});

test("weekly, empty, tiny portions and historical measures are exported without rounding", async () => {
  const ration = fixture();
  ration.mode = "WEEKLY";
  ration.items[0].measure!.grams = 999;
  ration.items[1].quantity = 0.005;
  ration.items[1].grams = 0.005;
  const workbook = buildRationWorkbook(ration, []);
  close(value(workbook.getWorksheet("Рацион")!.getCell("F16")), 50);
  close(value(workbook.getWorksheet("Рацион")!.getCell("D8")), 100.005 / 7);
  const saved = new ExcelJS.Workbook();
  await saved.xlsx.load(await workbook.xlsx.writeBuffer());
  close(value(saved.getWorksheet("Рацион")!.getCell("E17")), 0.005);
  assert.equal(saved.getWorksheet("Рацион")!.getCell("E17").numFmt, "0.00######");
  ration.items = [];
  const empty = buildRationWorkbook(ration, []);
  close(value(empty.getWorksheet("Рацион")!.getCell("D8")), 0);
  close(value(empty.getWorksheet("Рацион")!.getCell("J9")), "Нет данных");
  close(value(nutrientRow(empty, "CP").getCell(9)), "Нет продуктов");
  assertNoErrors(saved);
  assertNoErrors(empty);
});

test("unknown moisture blocks dry-matter calculations; invalid product bases are rejected", () => {
  const ration = fixture();
  ration.items[0].product.nutrients[0].amount = null;
  const workbook = buildRationWorkbook(ration, []);
  close(value(workbook.getWorksheet("Рацион")!.getCell("J9")), "Нет данных");
  close(value(nutrientRow(workbook, "CP").getCell(5)), "");
  close(value(nutrientRow(workbook, "MO").getCell(10)), 1);
  ration.items[0].product.baseQuantity = 0;
  assert.throws(() => buildRationWorkbook(ration, []), /Базовое количество/);
});

test("macro targets match the ration widgets, not legacy nutrient targets", () => {
  const ration = fixture();
  Object.assign(ration.calculation!, { protein: 10, fat: 0, carbs: 20 });
  const workbook = buildRationWorkbook(ration, []);
  close(value(nutrientRow(workbook, "CP").getCell(6)), 10);
  close(value(nutrientRow(workbook, "CFa").getCell(6)), "");
  close(value(nutrientRow(workbook, "CH").getCell(6)), 20);
});

test("native spreadsheet engine recalculates saved XLSX after changes", { skip: !process.env.XLSX_RECALC_COMMAND, timeout: 120000 }, async () => {
  const root = await mkdtemp(path.join(tmpdir(), "ration-xlsx-"));
  const output = path.join(root, "recalculated");
  await mkdir(output);
  const profile = path.join(root, "profile");
  await mkdir(path.join(profile, "user"), { recursive: true });
  await writeFile(path.join(profile, "user", "registrymodifications.xcu"), '<?xml version="1.0" encoding="UTF-8"?><oor:items xmlns:oor="http://openoffice.org/2001/registry"><item oor:path="/org.openoffice.Office.Calc/Formula/Load"><prop oor:name="OOXMLRecalcMode" oor:op="fuse"><value>0</value></prop></item></oor:items>');
  const cases: { name: string; setup?: (ration: RationWorkbookInput) => void; edit?: (workbook: Workbook) => void; check: (workbook: Workbook) => void }[] = [
    { name: "baseline", check: (workbook) => {
      const original = buildRationWorkbook(fixture(), []);
      original.eachSheet((sheet) => sheet.eachRow((row) => row.eachCell((cell) => {
        if (cell.formula) close(value(workbook.getWorksheet(sheet.name)!.getCell(cell.address)), value(cell), `${sheet.name}!${cell.address}`);
      })));
    } },
    { name: "quantity", edit: (workbook) => { workbook.getWorksheet("Рацион")!.getCell("E16").value = 4; }, check: (workbook) => {
      close(value(workbook.getWorksheet("Рацион")!.getCell("D8")), 300);
      close(value(workbook.getWorksheet("Рацион")!.getCell("J8")), 500);
      close(value(workbook.getWorksheet("Рацион")!.getCell("J9")), 140);
      close(value(nutrientRow(workbook, "CP").getCell(3)), 50);
      close(value(nutrientRow(workbook, "CP").getCell(5)), 50 / 140 * 100);
    } },
    { name: "measure", edit: (workbook) => { workbook.getWorksheet("Рацион")!.getCell("F16").value = 100; }, check: (workbook) => { close(value(workbook.getWorksheet("Рацион")!.getCell("J8")), 500); } },
    { name: "enable", edit: (workbook) => { workbook.getWorksheet("Рацион")!.getCell("A18").value = "Да"; }, check: (workbook) => {
      close(value(workbook.getWorksheet("Рацион")!.getCell("D8")), 500);
      close(value(workbook.getWorksheet("Рацион")!.getCell("J8")), 1200);
      close(value(workbook.getWorksheet("Рацион")!.getCell("J9")), 290);
      close(value(nutrientRow(workbook, "Ca").getCell(10)), 3);
    } },
    { name: "weekly", setup: (ration) => { ration.mode = "WEEKLY"; }, check: (workbook) => {
      close(value(workbook.getWorksheet("Рацион")!.getCell("D8")), 200 / 7);
      close(value(nutrientRow(workbook, "CP").getCell(3)), 30 / 7);
      close(value(nutrientRow(workbook, "CP").getCell(5)), 30 / 110 * 100);
      close(value(nutrientRow(workbook, "CP").getCell(6)), 30);
    } },
    { name: "empty", setup: (ration) => { ration.items = []; }, check: (workbook) => {
      close(value(workbook.getWorksheet("Рацион")!.getCell("D8")), 0);
      close(value(nutrientRow(workbook, "CP").getCell(9)), "Нет продуктов");
    } },
    { name: "zero-portions", edit: (workbook) => { for (const address of ["E16", "E17"]) workbook.getWorksheet("Рацион")!.getCell(address).value = 0; }, check: (workbook) => {
      close(value(workbook.getWorksheet("Рацион")!.getCell("D8")), 0);
      close(value(nutrientRow(workbook, "CP").getCell(5)), "");
      close(value(nutrientRow(workbook, "CP").getCell(9)), "Нет продуктов");
    } },
    { name: "missing-water", edit: (workbook) => { workbook.getWorksheet("Состав продуктов")!.getCell("C7").value = null; }, check: (workbook) => {
      close(value(workbook.getWorksheet("Рацион")!.getCell("J9")), "Нет данных");
      close(value(nutrientRow(workbook, "MO").getCell(10)), 1);
      close(value(nutrientRow(workbook, "CP").getCell(5)), "");
    } },
    { name: "zero-water", edit: (workbook) => { for (const address of ["C6", "C7"]) workbook.getWorksheet("Состав продуктов")!.getCell(address).value = 0; }, check: (workbook) => {
      close(value(workbook.getWorksheet("Рацион")!.getCell("J9")), 200);
      close(value(nutrientRow(workbook, "CP").getCell(5)), 15);
    } },
    { name: "pure-water", edit: (workbook) => { for (const address of ["C6", "C7"]) workbook.getWorksheet("Состав продуктов")!.getCell(address).value = 100; }, check: (workbook) => {
      close(value(workbook.getWorksheet("Рацион")!.getCell("J9")), 0);
      close(value(nutrientRow(workbook, "CP").getCell(5)), "");
    } },
    { name: "prices", edit: (workbook) => {
      workbook.getWorksheet("Состав продуктов")!.getCell("B6").value = 500;
      workbook.getWorksheet("Состав продуктов")!.getCell("B7").value = 100;
    }, check: (workbook) => { close(value(workbook.getWorksheet("Рацион")!.getCell("J10")), 60); } },
    { name: "free", edit: (workbook) => { for (const address of ["B6", "B7"]) workbook.getWorksheet("Состав продуктов")!.getCell(address).value = 0; }, check: (workbook) => { close(value(workbook.getWorksheet("Рацион")!.getCell("J10")), 0); } },
    { name: "partial-price", edit: (workbook) => { workbook.getWorksheet("Состав продуктов")!.getCell("B6").value = 500; }, check: (workbook) => { close(value(workbook.getWorksheet("Рацион")!.getCell("J10")), "Нет цены"); } },
    { name: "energy-target", edit: (workbook) => { workbook.getWorksheet("Рацион")!.getCell("D6").value = 600; }, check: (workbook) => {
      close(value(nutrientRow(workbook, "Energy").getCell(8)), 0.5);
      close(value(nutrientRow(workbook, "Energy").getCell(9)), "Недобор");
    } },
    { name: "tolerance", edit: (workbook) => {
      workbook.getWorksheet("Рацион")!.getCell("D6").value = 250;
      workbook.getWorksheet("Рацион")!.getCell("J5").value = 0.5;
    }, check: (workbook) => {
      close(value(nutrientRow(workbook, "Energy").getCell(7)), 375);
      close(value(nutrientRow(workbook, "Energy").getCell(9)), "В диапазоне");
    } },
    { name: "tiny", edit: (workbook) => { workbook.getWorksheet("Рацион")!.getCell("E17").value = 0.005; }, check: (workbook) => {
      close(value(workbook.getWorksheet("Рацион")!.getCell("D8")), 100.005);
      close(value(workbook.getWorksheet("Рацион")!.getCell("J8")), 200.005);
      close(value(workbook.getWorksheet("Рацион")!.getCell("J9")), 30.004);
    } },
  ];
  try {
    for (const scenario of cases) {
      const ration = fixture();
      scenario.setup?.(ration);
      const workbook = buildRationWorkbook(ration, []);
      scenario.edit?.(workbook);
      await workbook.xlsx.writeFile(path.join(root, `${scenario.name}.xlsx`));
    }
    await promisify(execFile)(process.env.XLSX_RECALC_COMMAND!, [`-env:UserInstallation=${pathToFileURL(profile).href}`, "--headless", "--convert-to", "xlsx", "--outdir", output, ...cases.map((scenario) => path.join(root, `${scenario.name}.xlsx`))], { timeout: 90000 });
    for (const scenario of cases) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(path.join(output, `${scenario.name}.xlsx`));
      assertNoErrors(workbook);
      try { scenario.check(workbook); } catch (error) { throw new Error(`Scenario ${scenario.name}`, { cause: error }); }
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});
