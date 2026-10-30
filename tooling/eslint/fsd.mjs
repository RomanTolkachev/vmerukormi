import path from "node:path";

const layers = ["shared", "entities", "features", "widgets", "_pages", "app"];
const sliced = new Set(["entities", "features", "widgets", "_pages"]);

export const boundaries = {
  meta: { type: "problem", schema: [], messages: { boundary: "{{reason}}" } },
  create(context) {
    const root = path.resolve("src");
    const filename = context.filename ?? context.getFilename();
    const current = path.relative(root, filename).split(path.sep);
    function check(node) {
      const value = node.source?.value;
      if (typeof value !== "string") return;
      const resolved = value.startsWith("@/") ? path.resolve(root, value.slice(2)) : value.startsWith(".") ? path.resolve(path.dirname(filename), value) : null;
      if (!resolved) return;
      const target = path.relative(root, resolved).split(path.sep);
      if (!layers.includes(target[0])) return;
      let reason;
      const sameSlice = current[0] === target[0] && current[1] === target[1];
      const crossApi = current[0] === "entities" && target[0] === "entities" && target[2] === "@x" && target[3]?.replace(/\.ts$/, "") === current[1] && target.length === 4;
      if (layers.includes(current[0]) && layers.indexOf(target[0]) > layers.indexOf(current[0])) reason = "FSD: импорт из вышележащего слоя запрещён.";
      else if (sliced.has(current[0]) && current[0] === target[0] && !sameSlice && !crossApi) reason = "FSD: слайсы одного слоя изолированы.";
      else if (sliced.has(target[0]) && !sameSlice && target.length > 2 && !(target.length === 3 && ["index", "index.ts"].includes(target[2])) && !crossApi) reason = "FSD: используйте публичный API слайса.";
      if (reason) context.report({ node, messageId: "boundary", data: { reason } });
    }
    return { ImportDeclaration: check, ExportNamedDeclaration: check, ExportAllDeclaration: check, ImportExpression(node) { check({ ...node, source: node.source }); } };
  },
};
