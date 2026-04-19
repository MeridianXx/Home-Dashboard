#!/usr/bin/env node
// Städa Notion "Planerade pass"-DB:n från historisk skräp.
//
// Behåller:
//   - Alla framtida pass (datum >= idag)
//   - Alla historiska pass med status "Genomfört"
// Arkiverar:
//   - Historiska pass med status "Planerat" eller "Inställt"
//
// Körs med:
//   node --env-file=.env.local scripts/cleanup-old-plans.mjs            # dry-run
//   node --env-file=.env.local scripts/cleanup-old-plans.mjs --confirm  # arkivera på riktigt

import { Client } from "@notionhq/client";

const TOKEN = process.env.NOTION_TOKEN;
const PLANS_DB = process.env.NOTION_FITNESS_PLANS_DB;
const CONFIRM = process.argv.includes("--confirm");

if (!TOKEN || !PLANS_DB) {
  console.error("NOTION_TOKEN / NOTION_FITNESS_PLANS_DB saknas — kör med `node --env-file=.env.local ...`");
  process.exit(1);
}

const notion = new Client({ auth: TOKEN });

async function dataSourceId(dbId) {
  const db = await notion.databases.retrieve({ database_id: dbId });
  const id = db.data_sources?.[0]?.id;
  if (!id) throw new Error(`Ingen data_source för DB ${dbId}`);
  return id;
}

async function* iterateAllPages(dsId) {
  let cursor;
  do {
    const res = await notion.dataSources.query({
      data_source_id: dsId,
      start_cursor: cursor,
      page_size: 100,
    });
    for (const p of res.results) yield p;
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
}

function plainText(rich) {
  if (!Array.isArray(rich)) return "";
  return rich.map((r) => r.plain_text ?? "").join("");
}

const today = new Date().toISOString().slice(0, 10);
const dsId = await dataSourceId(PLANS_DB);

const keep = [];
const archive = [];

for await (const page of iterateAllPages(dsId)) {
  const props = page.properties ?? {};
  const datum = props["Datum"]?.date?.start ?? null;
  const status = props["Status"]?.status?.name ?? "";
  const title = plainText(props["Passnamn"]?.title) || "(namnlöst)";
  const typ = props["Typ"]?.select?.name ?? "";

  const isHistorical = datum && datum < today;
  const shouldArchive = isHistorical && status !== "Genomfört";

  const row = { id: page.id, datum, status, title, typ };
  (shouldArchive ? archive : keep).push(row);
}

keep.sort((a, b) => (a.datum ?? "").localeCompare(b.datum ?? ""));
archive.sort((a, b) => (a.datum ?? "").localeCompare(b.datum ?? ""));

console.log(`Totalt: ${keep.length + archive.length} pass (idag = ${today})\n`);

console.log(`BEHÅLLS (${keep.length} st):`);
for (const r of keep) {
  console.log(`  ✓ ${r.datum ?? "—"} · ${r.status.padEnd(10)} · ${r.typ.padEnd(12)} · ${r.title}`);
}

console.log(`\nARKIVERAS (${archive.length} st):`);
for (const r of archive) {
  console.log(`  ✗ ${r.datum ?? "—"} · ${r.status.padEnd(10)} · ${r.typ.padEnd(12)} · ${r.title}`);
}

if (!CONFIRM) {
  console.log(`\n[DRY-RUN] Ingen ändring gjord. Kör om med --confirm för att arkivera ${archive.length} pass.`);
  process.exit(0);
}

if (archive.length === 0) {
  console.log("\nInget att arkivera.");
  process.exit(0);
}

console.log(`\nArkiverar ${archive.length} pass…`);
let ok = 0, fail = 0;
for (const r of archive) {
  try {
    await notion.pages.update({ page_id: r.id, archived: true });
    ok++;
  } catch (err) {
    fail++;
    console.error(`  ✗ ${r.datum} ${r.title}: ${err.message}`);
  }
}
console.log(`\nKlart: ${ok} arkiverade, ${fail} fel.`);
