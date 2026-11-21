import assert from "node:assert/strict";
import test from "node:test";
import { formulaTemplates, getFormulaTemplate, resolveParameters } from "@backend/domain/nutrition/parameters";
import { coefficientHint, energyFactorHelp, parameterHelp } from "./formula-help";

test("all 13 formulas explain every input and coefficient, not just its code or default", () => {
  assert.equal(formulaTemplates.length, 13);
  for (const template of formulaTemplates) {
    for (const key of template.fields) {
      const help = parameterHelp(template, key);
      assert.ok(help.hint.length > 40, `${template.key}: ${key}`);
      assert.equal(Boolean(help.rules?.length), template.automatic.includes(key));
    }
    for (const coefficient of template.coefficients) {
      const hint = coefficientHint(template, coefficient.key);
      assert.ok(hint?.length > 40, `${template.key}: ${coefficient.key}`);
      assert.notEqual(hint, coefficient.label);
    }
  }
  assert.match(energyFactorHelp.hint, /обменной энергии/);
  assert.match(energyFactorHelp.note, /Пусто или 1/);
});

test("mass and literal explanations use the selected formula's meaning", () => {
  const adult = getFormulaTemplate("cat-adult:v1")!;
  const kitten = getFormulaTemplate("cat-kitten:v1")!;
  const pregnancy = getFormulaTemplate("dog-pregnancy-2:v1")!;
  const lactation = getFormulaTemplate("dog-lactation:v1")!;
  assert.match(parameterHelp(adult, "IW").hint, /целевой упитанности/);
  assert.match(parameterHelp(kitten, "IW").hint, /во взрослом возрасте/);
  assert.match(parameterHelp(kitten, "AW").hint, /текущая масса/);
  assert.match(coefficientHint(adult, "C2"), /идеальной массы IW/);
  assert.match(coefficientHint(kitten, "C2"), /фактической массы AW/);
  assert.match(coefficientHint(kitten, "C3"), /Множитель роста/);
  assert.match(coefficientHint(kitten, "C4"), /AW \/ IW/);
  assert.match(coefficientHint(kitten, "C5"), /вычитается/);
  assert.match(coefficientHint(pregnancy, "C3"), /второй фазе беременности/);
  assert.match(coefficientHint(lactation, "C3"), /первых щенков N/);
  assert.match(coefficientHint(lactation, "C4"), /следующих щенков M/);
});

test("displayed cat K rules agree with the calculator at every boundary, including zero", () => {
  const template = getFormulaTemplate("cat-lactation:v1")!;
  const rules = parameterHelp(template, "K").rules!;
  assert.match(rules[0], /От 0 до 2/);
  assert.match(rules[1], /3–4/);
  assert.match(rules[2], /5 и более/);
  for (const [children, ruleIndex] of [[0, 0], [1, 0], [2, 0], [3, 1], [4, 1], [5, 2], [9, 2]]) {
    const values = resolveParameters(template, { IW: 5, CHILDREN: children, LACTATION_WEEK: 1 });
    assert.ok(rules[ruleIndex].includes(`K = ${values.K}.`));
  }
});

test("displayed L rules match each species and include weeks beyond the last boundary", () => {
  for (const moduleId of ["cat-lactation", "dog-lactation"]) {
    const template = getFormulaTemplate(`${moduleId}:v1`)!;
    const rules = parameterHelp(template, "L").rules!;
    const ruleIndices = moduleId === "cat-lactation" ? [0, 0, 1, 1, 2, 3, 3, 3] : [0, 1, 2, 3, 3, 3, 3, 3];
    for (const [index, ruleIndex] of ruleIndices.entries()) {
      const values = resolveParameters(template, { IW: 5, CHILDREN: 4, LACTATION_WEEK: index + 1 });
      assert.ok(rules[ruleIndex].includes(`L = ${values.L.toLocaleString("ru-RU")}.`), `${moduleId}: week ${index + 1}`);
    }
  }
  assert.notDeepEqual(parameterHelp(getFormulaTemplate("cat-lactation:v1")!, "L").rules, parameterHelp(getFormulaTemplate("dog-lactation:v1")!, "L").rules);
});

test("N and M explanations disclose the eight-puppy automatic limit and manual dependencies", () => {
  const template = getFormulaTemplate("dog-lactation:v1")!;
  const nextRules = parameterHelp(template, "M").rules!;
  assert.match(parameterHelp(template, "N").rules![1], /N = 4/);
  assert.match(nextRules[0], /0–4.*M = 0/);
  assert.match(nextRules[1], /5–8.*минус 4/);
  assert.match(nextRules[2], /9 и более.*M = 4.*не более 8/);
  for (const [children, first, next] of [[0, 0, 0], [3, 3, 0], [4, 4, 0], [5, 4, 1], [6, 4, 2], [8, 4, 4], [9, 4, 4], [12, 4, 4]]) {
    const values = resolveParameters(template, { IW: 5, CHILDREN: children, LACTATION_WEEK: 1 });
    assert.deepEqual([values.N, values.M], [first, next]);
  }
  assert.match(parameterHelp(template, "CHILDREN").hint, /оба заданы вручную/);
  assert.match(parameterHelp(template, "LACTATION_WEEK").hint, /при ручном L/);
});
