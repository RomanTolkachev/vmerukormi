import assert from "node:assert/strict";
import test from "node:test";
import { calculateEnergy } from "./calculator";
import { MODULES } from "./modules";
import { calculateWithParameters, cleanParameters, formulaTemplates, getFormulaTemplate, requiredParameters, resolveCoefficients, displayFormula } from "./parameters";

test("all fixed templates preserve existing formula results with standard coefficients", () => {
  for (const definition of MODULES) {
    const template = getFormulaTemplate(`${definition.id}:v1`)!;
    const parameters = cleanParameters(Object.fromEntries(Object.entries({ AW: 3, IW: 5, LACTATION_WEEK: 3, CHILDREN: 5 }).filter(([key]) => template.fields.some(field => field === key))), template);
    const expected = calculateEnergy({ moduleId: definition.id, actualWeight: 3, idealWeight: 5, bcs: 5, lactationWeek: 3, childrenCount: 5, energyFactor: 1.2 });
    const actual = calculateWithParameters(template, parameters, {}, 1.2);
    assert.equal(actual.baseEnergy, expected.baseEnergy, definition.id);
    assert.equal(actual.adjustedEnergy, expected.adjustedEnergy, definition.id);
  }
});

test("pregnancy needs only ideal mass; no pregnancy-week field or validation remains", () => {
  for (const key of ["cat-pregnancy", "dog-pregnancy-1", "dog-pregnancy-2"]) {
    const template = getFormulaTemplate(`${key}:v1`)!;
    assert.deepEqual(template.fields, ["IW"]);
    assert.ok(calculateWithParameters(template, { IW: 5 }).adjustedEnergy > 0);
    assert.throws(() => cleanParameters({ IW: 5, PREGNANCY_WEEK: 4 }, template), /не используется/);
    assert.throws(() => calculateWithParameters(template, {}), /Идеальная масса/);
  }
});

test("empty unused fields never turn into zero or cause adult calculation failure", () => {
  const template = getFormulaTemplate("cat-adult:v1")!;
  assert.deepEqual(cleanParameters({ IW: 5, LACTATION_WEEK: "", CHILDREN: null }, template), { IW: 5 });
  for (const invalid of [0, -1, NaN, Infinity, true, " ", "oops"]) assert.throws(() => cleanParameters({ IW: invalid }, template));
  assert.throws(() => calculateWithParameters(template, cleanParameters({ IW: "" }, template)), /Заполните/);
});

test("each template defines its form, species and expected-adult-weight meaning", () => {
  assert.equal(formulaTemplates.length, MODULES.length);
  for (const template of formulaTemplates) {
    assert.ok(template.speciesCodes.length);
    assert.equal(template.growing, template.fields.includes("AW"));
    assert.equal(template.fields.includes("LACTATION_WEEK"), template.profile !== "MANUAL");
    assert.ok(template.coefficients.every(coefficient => coefficient.label));
  }
});

test("lactation auto coefficients retain boundary behavior for both species", () => {
  const cat = getFormulaTemplate("cat-lactation:v1")!, dog = getFormulaTemplate("dog-lactation:v1")!;
  for (const [children, expected] of [[2, 18], [3, 60], [4, 60], [5, 70]]) assert.equal(calculateWithParameters(cat, { IW: 5, CHILDREN: children, LACTATION_WEEK: 1 }).variables.K, expected);
  for (const [week, expected] of [[1, 0.9], [2, 0.9], [3, 1.2], [4, 1.2], [5, 1.1], [6, 1]]) assert.equal(calculateWithParameters(cat, { IW: 5, CHILDREN: 4, LACTATION_WEEK: week }).variables.L, expected);
  for (const [week, expected] of [[1, 0.75], [2, 0.95], [3, 1.1], [4, 1.2]]) {
    const result = calculateWithParameters(dog, { IW: 5, CHILDREN: 7, LACTATION_WEEK: week });
    assert.equal(result.variables.L, expected);
    assert.equal(result.variables.N, 4); assert.equal(result.variables.M, 3);
  }
  assert.throws(() => calculateWithParameters(cat, { IW: 5 }), /Количество детёнышей/);
  assert.throws(() => calculateWithParameters(cat, { IW: 5, CHILDREN: 4 }), /Неделя лактации/);
});

test("manual automatic-coefficient override distinguishes zero from empty and removes only its dependencies", () => {
  const template = getFormulaTemplate("cat-lactation:v1")!;
  const manual = calculateWithParameters(template, { IW: 5, K: 0, L: 1 });
  assert.equal(manual.variables.K, 0);
  assert.deepEqual([...requiredParameters(template, { K: "0", L: "1" })], ["IW", "K", "L"]);
  assert.deepEqual([...requiredParameters(template, { K: "", L: "" })], ["IW", "CHILDREN", "LACTATION_WEEK"]);
  const automatic = calculateWithParameters(template, cleanParameters({ IW: 5, K: "", L: "", CHILDREN: 3, LACTATION_WEEK: 4 }, template));
  assert.equal(automatic.variables.K, 60); assert.equal(automatic.variables.L, 1.2);
  for (const invalid of [0, -1, 1.5]) assert.throws(() => cleanParameters({ LACTATION_WEEK: invalid }, template), /Неделя лактации/);
});

test("numeric coefficients can change without changing structure, defaults or future calculations", () => {
  const template = getFormulaTemplate("cat-adult:v1")!;
  const result = calculateWithParameters(template, { IW: 5 }, { C1: 120, C2: 2 });
  assert.equal(result.baseEnergy, 3000);
  assert.equal(displayFormula(template, { C1: 120, C2: 2 }), "(120) * IW ^ (2)");
  assert.deepEqual(resolveCoefficients(template, {}), { C1: 100, C2: 0.67 });
  assert.notEqual(calculateWithParameters(template, { IW: 5 }).baseEnergy, result.baseEnergy);
});

test("invalid coefficients, injected structure, nonpositive, overflow and unpersistable results are rejected", () => {
  const template = getFormulaTemplate("cat-adult:v1")!;
  for (const invalid of ["", " ", "1 + IW", NaN, Infinity]) assert.throws(() => resolveCoefficients(template, { C1: invalid }));
  assert.throws(() => resolveCoefficients(template, { constructor: 1 }), /Неизвестный/);
  const invalidOverrides: Record<string, number>[] = [{ C1: 0 }, { C1: -1 }, { C1: 1e308 }, { C2: 1e308 }, { C1: 0.0000001 }];
  for (const overrides of invalidOverrides) assert.throws(() => calculateWithParameters(template, { IW: 5 }, overrides));
  assert.ok(calculateWithParameters(template, { IW: 5 }, { C1: 1000, C2: 3 }).adjustedEnergy > 100000);
});
