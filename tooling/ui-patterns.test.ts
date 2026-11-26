import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getModalStackSnapshot, getModalZIndex, pushModalStack, popModalStack, subscribeModalStack } from "../src/shared/ui/kit/modal/modalStack";
import { createUniversalTableSavedQuery, readUniversalTableSavedQuery, mergeUniversalTableSavedQuery } from "../src/shared/ui/kit/universal-table/table-settings/savedState";
import { mergeColumnsConfig } from "../src/shared/ui/kit/universal-table/lib/mergeColumnsConfig";
import { getTableOptions } from "../src/shared/ui/kit/universal-table/table-settings/api/getTableOptions";
import { textButtonTypography } from "../src/shared/ui/kit/buttons/textButtonTypography";
import { toast } from "sonner";
import { notify } from "../src/shared/ui/notifications/api/notify";

test("standard editor keeps the optional owner selector inside its auto-sized header", () => {
  const editor = readFileSync(new URL("../src/features/edit-standard/ui/breed-standard-editor.tsx", import.meta.url), "utf8");
  const stylesheet = readFileSync(new URL("../src/features/edit-standard/ui/breed-standard-editor.module.css", import.meta.url), "utf8");
  const sharedStyles = readFileSync(new URL("../src/shared/ui/styles/ui.module.css", import.meta.url), "utf8");
  assert.match(editor, /<header className=\{styles\.header\}>[\s\S]*?<h1>[\s\S]*?Сохранить эталоны[\s\S]*?owners\.length > 0[\s\S]*?Эталоны пользователя[\s\S]*?<\/header>\s*<div className=\{`\$\{ui\("standardEditorGrid"\)\} \$\{styles\.content\}`\}>/);
  assert.match(stylesheet, /\.page\s*\{[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\) auto;/);
  assert.match(stylesheet, /\.header\s*\{[^}]*gap:\s*16px;[^}]*padding-bottom:\s*18px;/);
  assert.match(stylesheet, /\.identity\s*\{[^}]*min-width:\s*0;[^}]*overflow-wrap:\s*anywhere;/);
  assert.match(stylesheet, /\.titleRow > button\s*\{[^}]*flex-shrink:\s*0;/);
  assert.match(stylesheet, /@media \(max-width: 780px\), \(max-height: 600px\)[\s\S]*?\.page\s*\{[^}]*grid-template-rows:\s*auto minmax\(320px, 1fr\) auto;[^}]*overflow:\s*auto;/);
  assert.doesNotMatch(sharedStyles, /\.standardEditorPage\b/);
});

test("recipe forms hide classification controls without deleting stored metadata", () => {
  const form = readFileSync(new URL("../src/features/edit-product/ui/product-form.tsx", import.meta.url), "utf8");
  const creation = readFileSync(new URL("../src/features/edit-product/ui/product-creation-dialog.tsx", import.meta.url), "utf8");
  assert.match(form, /const recipe = draft\.kind === "RECIPE"/);
  assert.match(form, /className=\{recipe \? undefined : styles\.grid\}/);
  assert.match(form, /\{!recipe && <>\s*<label[\s\S]*?<Select value=\{draft\.kind\}[\s\S]*?<EntitySelect entity="groups"[^\n]*\/>\s*<\/>\}/);
  assert.match(form, /\{!recipe && <section[^>]*><h2>Теги и доступность<\/h2>/);
  assert.doesNotMatch(form, /Продукты и добавки, без вложенных рецептов|Ингредиентов нет\. Можно заполнить|По умолчанию — сумма ингредиентов/);
  assert.match(form, /useState<ProductDraft>\(initial\)/);
  assert.match(form, /JSON\.stringify\(\{ \.\.\.draft, expectedRevision:/);
  assert.match(creation, /kind: initial\.kind === "RECIPE" && !initial\.ingredientOnly \? "RECIPE"/);
});

test("product editor aligns its header and form within a focus-safe scrolling column", () => {
  const editor = readFileSync(new URL("../src/features/edit-product/ui/product-editor.tsx", import.meta.url), "utf8");
  const stylesheet = readFileSync(new URL("../src/features/edit-product/ui/product-form.module.css", import.meta.url), "utf8");
  assert.match(editor, /<div className=\{styles\.editorContent\}>\s*<header[\s\S]*<\/header>\s*<div className=\{styles\.panel\}>/);
  assert.match(stylesheet, /\.editorContent\s*\{[^}]*width:\s*100%;/);
  assert.doesNotMatch(stylesheet, /\.editorContent\s*\{[^}]*max-width:/);
  assert.match(stylesheet, /\.page\s*\{[^}]*overflow:\s*auto;[^}]*padding:\s*8px 8px 0;[^}]*scroll-padding:\s*8px;/);
  assert.match(stylesheet, /\.editorContent\s*\{[^}]*padding-bottom:\s*24px;/);
  assert.match(stylesheet, /\.editorContent\s*>\s*\.editorHeader\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/);
  assert.match(stylesheet, /\.editorHeader h1\s*\{[^}]*overflow-wrap:\s*anywhere;/);
  assert.match(stylesheet, /\.footer\s*\{[^}]*position:\s*sticky;[^}]*bottom:\s*0;/);
});

test("calculation panels scroll their fields while actions remain outside the scroller", () => {
  const form = readFileSync(new URL("../src/features/calculate-energy/ui/calculation-form.tsx", import.meta.url), "utf8");
  const stylesheet = readFileSync(new URL("../src/features/calculate-energy/ui/calculation-form.module.css", import.meta.url), "utf8");
  assert.match(form, /<\/fieldset>\s*<\/div>\s*<div className=\{styles\.formActions\}>/);
  assert.match(stylesheet, /\.panel\.formPanel\s*\{[^}]*grid-template-rows:\s*minmax\(0, 1fr\) auto;/);
  assert.match(stylesheet, /\.formContent\s*\{[^}]*overflow:\s*auto;/);
  assert.match(stylesheet, /@media\s*\(max-width:\s*900px\)\s*\{\s*\.layout\s*\{[^}]*grid-auto-rows:\s*100%;/);
});

test("calculation nutrient search stays above scrolling results without filtering saved data", () => {
  const form = readFileSync(new URL("../src/features/calculate-energy/ui/calculation-form.tsx", import.meta.url), "utf8");
  const stylesheet = readFileSync(new URL("../src/features/calculate-energy/ui/calculation-form.module.css", import.meta.url), "utf8");
  assert.match(form, /className=\{styles\.resultHeader\}[\s\S]*<span>Поиск по нутриентам<\/span>[\s\S]*<\/div>\s*<div ref=\{resultScroller\} className=\{styles\.resultContent\}>/);
  assert.match(form, /visibleNutrients\.map/);
  assert.match(form, /nutrients: result\.standardNutrients\.filter/);
  assert.match(stylesheet, /\.panel\.resultPanel\s*\{[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\);[^}]*overflow:\s*hidden;/);
  assert.match(stylesheet, /\.resultContent\s*\{[^}]*overflow:\s*auto;/);
});

test("workspace loading leaves navigation outside the blocked region", () => {
  const shell = readFileSync(new URL("../src/app/ui/app-shell.tsx", import.meta.url), "utf8");
  const workspace = readFileSync(new URL("../src/app/ui/workspace-content.tsx", import.meta.url), "utf8");
  const navigation = readFileSync(new URL("../src/shared/lib/navigation/index.tsx", import.meta.url), "utf8");
  assert.match(shell, /<aside[\s\S]*<\/aside>[\s\S]*<WorkspaceContent>\{children\}<\/WorkspaceContent>/);
  assert.match(workspace, /busy=\{pending\}/);
  assert.match(navigation, /startTransition\(\(\) => router\.push\(\.\.\.args\)\)/);
  assert.doesNotMatch(navigation, /addEventListener|setTimeout/);
});

test("table refresh keeps its mounted rows and blocks stale actions", () => {
  const table = readFileSync(new URL("../src/shared/ui/kit/universal-table/UniversalTable.tsx", import.meta.url), "utf8");
  const loading = readFileSync(new URL("../src/shared/ui/loading/index.tsx", import.meta.url), "utf8");
  const stylesheet = readFileSync(new URL("../src/shared/ui/loading/loading.module.css", import.meta.url), "utf8");
  assert.match(table, /rowsQuery\.isFetching \|\| refreshing/);
  assert.match(table, /<BusyRegion[^>]*busy=\{updating\}/);
  assert.match(table, /<Button onClick=\{\(\) => \{ void rowsQuery\.refetch/);
  assert.match(loading, /inert=\{busy \|\| undefined\} aria-busy=\{busy\}>\{children\}/);
  assert.match(stylesheet, /prefers-reduced-motion: reduce/);
});

test("shared buttons and dialogs expose loading without removing form drafts", () => {
  const buttons = readFileSync(new URL("../src/shared/ui/controls/index.tsx", import.meta.url), "utf8");
  const dialog = readFileSync(new URL("../src/shared/ui/form-dialog/index.tsx", import.meta.url), "utf8");
  assert.match(buttons, /disabled=\{disabled \|\| loading\} aria-busy=\{loading \|\| undefined\}/);
  assert.match(dialog, /<LoadingStatus label=/);
  assert.match(dialog, /inert=\{busy \|\| undefined\} aria-busy=\{busy\}>\{children\}/);
});

test("ordered table uses one table and native sticky scrolling without scroll synchronization", () => {
  const component = readFileSync(new URL("../src/shared/ui/kit/universal-table/ordered-table/OrderedTable.tsx", import.meta.url), "utf8");
  const stylesheet = readFileSync(new URL("../src/shared/ui/kit/universal-table/ordered-table/OrderedTable.module.css", import.meta.url), "utf8");
  assert.equal((component.match(/<table\b/g) ?? []).length, 1);
  assert.equal((component.match(/<thead\b/g) ?? []).length, 1);
  assert.equal((component.match(/<tbody\b/g) ?? []).length, 1);
  assert.doesNotMatch(component, /use(?:Layout)?Effect|ResizeObserver|requestAnimationFrame|onScroll|scrollLeft|scrollbarGutter/);
  assert.match(stylesheet, /\.outer\s*\{[^}]*overflow:\s*auto;/);
  assert.match(stylesheet, /\.header\s*\{[^}]*position:\s*sticky;[^}]*top:\s*0;/);
  assert.doesNotMatch(stylesheet, /headerXScroll|bodyXScroll|headerGutter/);
});

test("shared notifications retain message deduplication and explicit identifiers", context => {
  const success = context.mock.method(toast, "success", () => "test");
  const info = context.mock.method(toast, "info", () => "test");
  notify.success("Сохранено");
  notify.success("Сохранено");
  notify.info("Подсказка", { id: "table-reminder" });
  assert.deepEqual(success.mock.calls.map(call => call.arguments), [
    ["Сохранено", { id: "success:Сохранено" }],
    ["Сохранено", { id: "success:Сохранено" }],
  ]);
  assert.deepEqual(info.mock.calls[0].arguments, ["Подсказка", { id: "table-reminder" }]);
});

test("shared notifications map warning/error types and support dismissal", context => {
  const warning = context.mock.method(toast, "warning", () => "test");
  const error = context.mock.method(toast, "error", () => "test");
  const dismiss = context.mock.method(toast, "dismiss", () => "test");
  notify.alert("Проверьте данные");
  notify.error("Не удалось сохранить");
  notify.dismiss("table-reminder");
  assert.deepEqual(warning.mock.calls[0].arguments, ["Проверьте данные", { id: "alert:Проверьте данные" }]);
  assert.deepEqual(error.mock.calls[0].arguments, ["Не удалось сохранить", { id: "error:Не удалось сохранить" }]);
  assert.deepEqual(dismiss.mock.calls[0].arguments, ["table-reminder"]);
});

test("regular buttons use body text instead of heading typography", () => {
  assert.deepEqual(textButtonTypography, { sm: "body3", md: "body2", lg: "body2" });
});

test("modal stack keeps nested dialogs ordered and tolerates repeated cleanup", () => {
  let changes = 0;
  const unsubscribe = subscribeModalStack(() => { changes += 1; });
  try {
    pushModalStack("parent");
    const snapshot = getModalStackSnapshot();
    pushModalStack("parent");
    assert.equal(snapshot, getModalStackSnapshot());
    pushModalStack("child");
    assert.deepEqual(getModalStackSnapshot(), ["parent", "child"]);
    assert.ok(getModalZIndex(1) > getModalZIndex(0));
    popModalStack("child");
    assert.deepEqual(getModalStackSnapshot(), ["parent"]);
    pushModalStack("child");
    popModalStack("parent");
    assert.deepEqual(getModalStackSnapshot(), ["child"]);
    popModalStack("parent");
    assert.equal(changes, 5);
  } finally {
    unsubscribe();
    popModalStack("parent");
    popModalStack("child");
  }
  assert.deepEqual(getModalStackSnapshot(), []);
});

test("table preferences exclude transient search/page and preserve independent filter settings", () => {
  const initial = createUniversalTableSavedQuery({ page: 4, per_page: 25, search: "temporary", tagId: "tag-1", sort_col: "name", sort_dir: "asc" });
  const changed = createUniversalTableSavedQuery({ page: 1, per_page: 50, search: "", tagId: "tag-2" });
  assert.deepEqual(readUniversalTableSavedQuery(initial), { per_page: 25, tagId: "tag-1", sort_col: "name", sort_dir: "asc" });
  assert.deepEqual(readUniversalTableSavedQuery(mergeUniversalTableSavedQuery(initial, changed, "listSettings")), { tagId: "tag-1", per_page: 50, sort_col: undefined, sort_dir: undefined });
  assert.deepEqual(readUniversalTableSavedQuery(mergeUniversalTableSavedQuery(initial, changed, "filters")), { per_page: 25, sort_col: "name", sort_dir: "asc", tagId: "tag-2" });
});

test("column preferences retain widths and order without pinning removed or hidden columns", () => {
  const result = mergeColumnsConfig({ order: ["removed", "name", "value"], visible: { value: false }, resized: { name: 240, removed: 100 }, pinned: { left: ["removed", "name"], right: ["value"] } }, { order: ["value", "name", "new"], visible: {}, resized: {} });
  assert.deepEqual(result.order, ["name", "value", "new"]);
  assert.deepEqual(result.pinned, { left: ["name"], right: [] });
  assert.deepEqual(result.resized, { name: 240 });
  assert.deepEqual(result.visible, { value: false });
});

test("legacy table settings are read without discarding hidden columns", async context => {
  context.mock.method(globalThis, "fetch", async () => Response.json({ order: ["name"], visible: { code: false } }));
  assert.deepEqual(await getTableOptions("workspace-products"), { columns: { order: ["name"], visible: { code: false }, resized: {} }, query: null });
});
