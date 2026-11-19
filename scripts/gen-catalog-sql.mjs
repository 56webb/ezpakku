import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const seed = readFileSync(join(root, "src/lib/seed.ts"), "utf8");

function categoryId(index) {
  return `10000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}
function itemId(index) {
  return `20000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}
function esc(value) {
  return String(value).replace(/'/g, "''");
}

const catKeyToId = {};
for (const match of seed.matchAll(/(\w+):\s*categoryId\((\d+)\)/g)) {
  catKeyToId[match[1]] = categoryId(Number(match[2]));
}

const categories = [];
for (const match of seed.matchAll(
  /\{\s*id:\s*categoryIds\.(\w+),\s*name:\s*"([^"]+)",\s*isSystem:\s*true,\s*userId:\s*null,\s*sortOrder:\s*(\d+)\s*\}/g,
)) {
  categories.push({
    id: catKeyToId[match[1]],
    name: match[2],
    sortOrder: Number(match[3]),
  });
}

const idByKey = Object.fromEntries(
  [...seed.matchAll(/(\w+):\s*itemId\((\d+)\)/g)].map((m) => [m[1], itemId(Number(m[2]))]),
);

const itemsWithIds = [];
for (const match of seed.matchAll(
  /item\(\s*itemIds\.(\w+),\s*categoryIds\.(\w+),\s*"([^"]+)",\s*"([^"]*)"(?:,\s*affiliate\("([^"]+)"\))?\s*\)/g,
)) {
  itemsWithIds.push({
    id: idByKey[match[1]],
    categoryId: catKeyToId[match[2]],
    name: match[3],
    description: match[4],
    affiliateUrl: match[5] ? `https://example.com/go/${match[5]}` : null,
    categoryKey: match[2],
  });
}

const categoryPrefs = {
  clothes: ["suitcase", "backpack", "sling"],
  toiletry: ["pouch", "suitcase", "backpack", "sling"],
  electronics: ["backpack", "anti_theft", "sling", "suitcase"],
  docs: ["anti_theft", "wallet", "backpack", "sling"],
  health: ["backpack", "pouch", "anti_theft", "suitcase"],
  misc: ["suitcase", "backpack", "sling"],
  skincare: ["pouch", "suitcase", "backpack"],
  makeup: ["pouch", "suitcase", "backpack"],
  outdoor: ["backpack", "suitcase", "sling"],
  event: ["suitcase", "backpack", "sling"],
};

function prefsFor(item) {
  if (item.name.includes("行動電源") || item.name.includes("充電器") || item.name.includes("充電線")) {
    return ["backpack", "anti_theft", "sling"];
  }
  if (item.name.includes("護照") || item.name.includes("駕照") || item.name.includes("信用卡") || item.name.includes("錢包")) {
    return ["anti_theft", "wallet", "backpack", "sling"];
  }
  if (item.name.includes("指甲剪") || item.name.includes("小剪刀")) {
    return ["suitcase", "backpack", "sling"];
  }
  if (
    item.name.includes("體溫計") ||
    item.name.includes("口罩") ||
    item.name.includes("常備藥")
  ) {
    return ["backpack", "pouch", "sling", "anti_theft"];
  }
  return categoryPrefs[item.categoryKey] ?? ["suitcase", "backpack", "sling"];
}

function defaultBag(prefs) {
  const first = prefs[0];
  if (["anti_theft", "wallet", "backpack", "sling", "pouch"].includes(first)) return "personal";
  return "main";
}

const catSql = categories
  .map((c) => `  ('${c.id}', '${esc(c.name)}', true, null, ${c.sortOrder})`)
  .join(",\n");

const itemSql = itemsWithIds
  .map((item, i) => {
    const prefs = prefsFor(item);
    const tags = item.name.includes("行動電源") ? "ARRAY['powerbank']::text[]" : "'{}'::text[]";
    const aff = item.affiliateUrl ? `'${esc(item.affiliateUrl)}'` : "null";
    const prefsSql = `ARRAY[${prefs.map((p) => `'${p}'`).join(", ")}]::text[]`;
    return `  ('${item.id}', '${item.categoryId}', '${esc(item.name)}', '${esc(item.description)}', ${aff}, true, '${defaultBag(prefs)}', ${prefsSql}, ${tags}, ${i})`;
  })
  .join(",\n");

const sql = `-- Expand catalog + bag preference order for packing defaults.
alter table public.items
  add column if not exists bag_prefs text[] not null default '{}';

insert into public.categories (id, name, is_system, user_id, sort_order) values
${catSql}
on conflict (id) do update set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_system = true,
  user_id = null;

insert into public.items (
  id, category_id, name, description, affiliate_url, is_active, default_bag, bag_prefs, tags, sort_order
) values
${itemSql}
on conflict (id) do update set
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  affiliate_url = excluded.affiliate_url,
  is_active = excluded.is_active,
  default_bag = excluded.default_bag,
  bag_prefs = excluded.bag_prefs,
  tags = excluded.tags,
  sort_order = excluded.sort_order;

update public.catalog_meta
set version = version + 1,
    published_at = now(),
    notes = 'bag preference order + packing defaults from reference lists'
where id = 1;
`;

const out = join(root, "supabase/migrations/20261110160000_bag_prefs_and_defaults.sql");
writeFileSync(out, sql);
console.log(`wrote ${out}`);
console.log(`categories=${categories.length} items=${itemsWithIds.length}`);
