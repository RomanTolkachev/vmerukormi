import assert from "node:assert/strict";
import test from "node:test";
import { Linter } from "eslint";
import { boundaries } from "./fsd.mjs";

const linter = new Linter();
const cases = [
  ["downward public API", "src/_pages/rations/ui/editor.js", '@/entities/ration', 0],
  ["upward import", "src/shared/ui/menu.js", '@/features/auth', 1],
  ["peer slice", "src/features/create-pet/api/create.js", '@/features/delete-pet', 1],
  ["deep import", "src/_pages/rations/ui/editor.js", '@/entities/ration/model/ration', 1],
  ["relative upward import", "src/shared/ui/menu.js", '../../features/auth', 1],
  ["internal import", "src/features/auth/ui/menu.js", '../api/logout', 0],
  ["explicit entity relationship", "src/entities/pet/model/pet.js", '@/entities/breed/@x/pet', 0],
  ["wrong relationship consumer", "src/entities/module/model/module.js", '@/entities/breed/@x/pet', 1],
  ["index is not a directory escape", "src/_pages/rations/ui/editor.js", '@/entities/ration/index/private', 1],
];

for (const [name, filename, source, errors] of cases) {
  test(name, () => {
    for (const code of [`import { value } from '${source}';`, `export { value } from '${source}';`, `import('${source}');`]) {
      const messages = linter.verify(code, [{ plugins: { fsd: { rules: { boundaries } } }, rules: { "fsd/boundaries": "error" } }], { filename });
      assert.equal(messages.length, errors, JSON.stringify(messages));
    }
  });
}
