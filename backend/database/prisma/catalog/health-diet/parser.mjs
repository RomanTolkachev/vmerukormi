import { createHash } from "node:crypto";

export function fingerprint(value) {
  return createHash("sha256").update(value).digest("hex");
}

const aliases = {
  "Калорийность": ["Energy", "ккал"],
  "Белки": ["CP", "г"],
  "Жиры": ["CFa", "г"],
  "Углеводы": ["CH", "г"],
  "Пищевые волокна": ["Fiber", "г"],
  "Вода": ["MO", "г"],
  "Зола": ["CAs", "г"],
  "Кальций, Ca": ["Ca", "мг"],
  "Фосфор, P": ["P", "мг"],
  "Калий, K": ["K", "мг"],
  "Магний, Mg": ["Mg", "мг"],
  "Натрий, Na": ["Na", "мг"],
  "Железо, Fe": ["Fe", "мг"],
  "Медь, Cu": ["Cu", "мг"],
  "Цинк, Zn": ["Zn", "мг"],
  "Марганец, Mn": ["Mn", "мг"],
  "Йод, I": ["J", "мг"],
  "Селен, Se": ["Se", "мкг"],
  "Витамин А, РЭ": ["A_RE", "мкг"],
  "Ретинол": ["Retinol", "мг"],
  "бета Каротин": ["Carotene", "мг"],
  "Витамин D, кальциферол": ["D", "мкг"],
  "Витамин D3, холекальциферол": ["D3_MCG", "мкг"],
  "Витамин Е, альфа токоферол, ТЭ": ["E", "мг"],
  "Витамин В1, тиамин": ["B1", "мг"],
  "Витамин В2, рибофлавин": ["B2", "мг"],
  "Витамин В4, холин": ["B4", "мг"],
  "Витамин В5, пантотеновая": ["B5", "мг"],
  "Витамин В6, пиридоксин": ["B6", "мг"],
  "Витамин В9, фолаты": ["B9", "мкг"],
  "Витамин В12, кобаламин": ["B12", "мкг"],
  "Витамин C, аскорбиновая": ["C", "мг"],
  "Омега-3 жирные кислоты": ["O3", "мг"],
  "Омега-6 жирные кислоты": ["O6", "мг"],
};

const mass = { "г": 1, "мг": 0.001, "мкг": 0.000001 };
const categories = new Set(["Витамины", "Макроэлементы", "Микроэлементы", "Усвояемые углеводы", "Незаменимые аминокислоты", "Заменимые аминокислоты", "Жирные кислоты", "Стеролы (стерины)"]);

export const requiredNutrients = [
  ["Energy", "Калорийность", "ккал", "Основные"],
  ["CP", "Белок", "г", "Основные"],
  ["CFa", "Жир", "г", "Основные"],
  ["CH", "Углеводы", "г", "Основные"],
  ["MO", "Влага", "г", "Основные"],
  ["CFi", "Сырая клетчатка", "г", "Основные"],
  ["CAs", "Зола", "г", "Основные"],
  ["Ca", "Кальций", "мг", "Минералы"],
  ["P", "Фосфор", "мг", "Минералы"],
  ["A", "Витамин A", "МЕ", "Витамины"],
  ["D3", "Витамин D3", "МЕ", "Витамины"],
  ["E", "Витамин E", "мг", "Витамины"],
  ["Tau", "Таурин", "мг", "Аминокислоты"],
  ["Carotene", "Бета-каротин", "мг", "Витамины"],
].map(([code, name, unit, category]) => ({ code, name, unit, category }));

export function parseRows(rows) {
  let category = "Основные";
  const nutrients = new Map();
  for (const [rawName, rawAmount] of rows) {
    const name = rawName.replace(/\s+/g, " ").trim();
    const cell = rawAmount.replace(/[\u00a0\u202f]/g, " ").trim();
    if (!cell && categories.has(name)) {
      category = name;
      continue;
    }
    if (!cell || /^(?:~|—|-|нет данных)$/i.test(cell)) continue;
    const match = cell.match(/^(\d+(?:[.,]\d+)?)\s*(ккал|г|мг|мкг|МЕ)$/i);
    if (!match) throw new Error(`Неизвестное значение: ${name}: ${cell}`);
    const sourceUnit = match[2].toLowerCase() === "ме" ? "МЕ" : match[2].toLowerCase();
    const [code, unit] = aliases[name] ?? [`HD_${fingerprint(`${name}|${sourceUnit}`).slice(0, 12)}`, sourceUnit];
    const factor = sourceUnit === unit ? 1 : mass[sourceUnit] / mass[unit];
    if (!Number.isFinite(factor)) throw new Error(`Несовместимые единицы: ${name}`);
    const amount = Number((Number(match[1].replace(",", ".")) * factor).toPrecision(12));
    if (nutrients.has(code)) throw new Error(`Повтор нутриента: ${code}`);
    nutrients.set(code, { code, name, unit, category, amount });
  }
  const calories = nutrients.get("Energy")?.amount;
  if (calories === undefined || calories > 1000 || nutrients.size < 5) throw new Error("Неполная таблица состава");
  for (const code of ["CP", "CFa", "CH", "MO", "CAs", "Fiber"]) {
    if ((nutrients.get(code)?.amount ?? 0) > 100) throw new Error(`Больше 100 г: ${code}`);
  }
  return [...nutrients.values()];
}

function decodeHtml(value) {
  return value.replace(/<[^>]*>/g, " ")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, entity) => String.fromCodePoint(entity[0].toLowerCase() === "x" ? parseInt(entity.slice(1), 16) : Number(entity)))
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ").trim();
}

export function extractHtml(html) {
  const heading = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const title = heading ? decodeHtml(heading[1]) : "";
  if (!title.startsWith("Калорийность ") || /Рецепт/i.test(title)) throw new Error("Не базовый продукт");
  const name = title.replace(/^Калорийность /, "").split(". Химический")[0].trim();
  const table = [...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)]
    .find(([value]) => /Нутриент/.test(value) && /Количество/.test(value));
  if (!table) throw new Error("Таблица нутриентов не найдена");
  const rows = [...table[0].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map(([, row]) => [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(([, cell]) => decodeHtml(cell)))
    .filter((cells) => cells.length && cells[0] !== "Нутриент")
    .map((cells) => [cells[0], cells[1] ?? ""]);
  parseRows(rows);
  return { name, rows };
}

export function validateProduct(product, manifest) {
  const allowed = manifest.find((entry) => entry.id === product.id);
  if (!allowed || allowed.name !== product.name || allowed.group !== product.group || allowed.preparation !== product.preparation) throw new Error(`Продукт не прошёл ручной отбор: ${product.id}`);
  if (product.url !== `https://health-diet.ru/base_of_food/sostav/${product.id}.php`) throw new Error("Неверный источник");
  if (/алкоголь|водка|вино\b|пиво|шоколад|какао|кофе|ксилит|виноград|изюм|макадам|чеснок|лук\b|колбас|сосиск|соус|маринад|рецепт|лазанья|блинчик|авокадо/i.test(product.name)) throw new Error(`Исключённый продукт: ${product.name}`);
  return parseRows(product.rows);
}
