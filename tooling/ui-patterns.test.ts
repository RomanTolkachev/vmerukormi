import assert from "node:assert/strict";
import test from "node:test";
import { getModalStackSnapshot, getModalZIndex, pushModalStack, popModalStack, subscribeModalStack } from "../src/shared/ui/kit/modal/modalStack";
import { createUniversalTableSavedQuery, readUniversalTableSavedQuery, mergeUniversalTableSavedQuery } from "../src/shared/ui/kit/universal-table/table-settings/savedState";
import { mergeColumnsConfig } from "../src/shared/ui/kit/universal-table/lib/mergeColumnsConfig";
import { getTableOptions } from "../src/shared/ui/kit/universal-table/table-settings/api/getTableOptions";
import { textButtonTypography } from "../src/shared/ui/kit/buttons/textButtonTypography";
import { toast } from "sonner";
import { notify } from "../src/shared/ui/notifications/api/notify";

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
