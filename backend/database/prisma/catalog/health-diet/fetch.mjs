import { readFileSync } from "node:fs";
import { setTimeout } from "node:timers/promises";
import { extractHtml, validateProduct } from "./parser.mjs";

const manifest = JSON.parse(readFileSync(new URL("./manifest.json", import.meta.url), "utf8"));
const products = [];
for (const entry of manifest) {
  const url = `https://health-diet.ru/base_of_food/sostav/${entry.id}.php`;
  let parsed;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { "user-agent": "VmerukormiCatalogImporter/1.0", accept: "text/html" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.headers.get("content-type")?.includes("text/html")) throw new Error("Ожидался HTML");
      parsed = { ...entry, url, ...extractHtml(await response.text()) };
      validateProduct(parsed, manifest);
      break;
    } catch (error) {
      if (attempt === 2) throw error;
      await setTimeout(2000 * (attempt + 1));
    }
  }
  products.push(parsed);
  await setTimeout(1000);
}
process.stdout.write(`${JSON.stringify({ retrievedAt: new Date().toISOString(), extraction: "direct HTML main nutrient table; reference-intake columns discarded", products }, null, 2)}\n`);
