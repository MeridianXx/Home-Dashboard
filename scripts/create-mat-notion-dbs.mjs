#!/usr/bin/env node
// Skapar Notion-DB:erna "Recept" och "Veckoplan" under en föräldra-sida.
//
// Krav:
//   1. Skapa en sida i Notion (förslag: "🥘 Mat & Recept") som ska husera
//      både kökschef-persona-texten OCH de två DB:erna.
//   2. Dela sidan med din mat-integration (Sidan → … → Connections → Add).
//   3. Kopiera sidans id (UUID från URL:n eller "Copy link") och sätt
//      som `NOTION_MAT_COACH_PAGE` i `.env.local` — den används både som
//      parent för DB-skapningen här och som persona-källa i M3.
//
// Körs med: `node --env-file=.env.local scripts/create-mat-notion-dbs.mjs`
//
// Efter körning — klistra in returnerade ID:n i .env.local och GitHub-secrets:
//   NOTION_MAT_RECIPES_DB=<id>
//   NOTION_MAT_PLAN_DB=<id>
//
// Idempotent: om en env-var redan är satt hoppas DB-skapningen över. Kör
// utan rädsla — den skapar inte dubbletter.

import { Client } from "@notionhq/client";

const TOKEN = process.env.NOTION_TOKEN;
const PARENT_PAGE_ID = process.env.NOTION_MAT_COACH_PAGE;

if (!TOKEN) {
  console.error("❌ NOTION_TOKEN saknas — kör med `node --env-file=.env.local ...`");
  process.exit(1);
}
if (!PARENT_PAGE_ID) {
  console.error("❌ NOTION_MAT_COACH_PAGE saknas i env.");
  console.error("");
  console.error("   1. Skapa en sida i Notion (t.ex. '🥘 Mat & Recept').");
  console.error("   2. Dela sidan med mat-integrationen (… → Connections → Add).");
  console.error("   3. Kopiera sidans id och sätt NOTION_MAT_COACH_PAGE=<id>");
  console.error("      i .env.local, kör sedan skriptet igen.");
  process.exit(1);
}

const notion = new Client({ auth: TOKEN });

async function dataSourceId(databaseId) {
  const db = await notion.databases.retrieve({ database_id: databaseId });
  const id = db.data_sources?.[0]?.id;
  if (!id) throw new Error(`Ingen data_source för DB ${databaseId}`);
  return id;
}

async function createIfMissing(title, properties, envVar) {
  if (process.env[envVar]) {
    console.log(`↷ ${title}: hoppar över — ${envVar} redan satt till ${process.env[envVar]}`);
    return process.env[envVar];
  }
  try {
    const db = await notion.databases.create({
      parent: { type: "page_id", page_id: PARENT_PAGE_ID },
      title: [{ type: "text", text: { content: title } }],
      initial_data_source: { properties },
    });
    console.log(`✅ ${title} skapad: ${db.id}`);
    console.log(`   → sätt ${envVar}=${db.id}`);
    return db.id;
  } catch (err) {
    console.error(`❌ ${title}:`, err.body ?? err.message);
    if (err.code === "object_not_found") {
      console.error("");
      console.error(`Sidan ${PARENT_PAGE_ID} är inte delad med integrationen.`);
      console.error("Öppna sidan i Notion → … → Connections → Add connection.");
    }
    throw err;
  }
}

// ── Recept ───────────────────────────────────────────────────────────────────
// Schema enligt M0-bullets i docs/archive/WARM_HOME.md.
// `BildURL` lagras som url-property per användarens val (vs. files-property)
// — direktlänk till extern OG-bild, ingen Notion-uppladdning. Enklast och
// matchar designens "ingen bild ↔ ingen emoji-fallback"-policy: blir
// receptkortet bildlöst om importen inte hittade en OG-bild, blir det också
// bildlöst i UI.

const RECIPES_DB_ID = await createIfMissing(
  "Recept",
  {
    "Namn":          { title: {} },
    "Lede":          { rich_text: {} },
    "Ingredienser":  { rich_text: {} },          // JSON-blob `[{v,u,n}]`
    "Steg":          { rich_text: {} },          // Newline-separerade steg
    "MinTotal":      { number: { format: "number" } },
    "Svårighet":     { number: { format: "number" } }, // 1–3
    "BasPortioner":  { number: { format: "number" } }, // default 4 vid skapa
    "Taggar":        { multi_select: { options: [] } }, // Användaren bygger ut
    "Vintips":       { rich_text: {} },
    "BildURL":       { url: {} },                // OG-/schema.org-image, ev. tom
    "KällURL":       { url: {} },
    "Källa":         { rich_text: {} },          // Domännamn, t.ex. "ica.se"
    "AISkapad":      { checkbox: {} },
    "Skapad":        { created_time: {} },
  },
  "NOTION_MAT_RECIPES_DB",
);

// ── Veckoplan ────────────────────────────────────────────────────────────────
// Slot-värden: Lunch / Middag (ingen frukost — användaren har bestämt).
// Recept-relationen pekar in i Recept-DB:n och kräver dess data_source_id
// (Notion API 2025-09-03). Om vi just skapade Recept-DB:n hämtar vi det
// nyss, annars resolvar vi via env-var:n.

const recipesDsId = await dataSourceId(RECIPES_DB_ID);

await createIfMissing(
  "Veckoplan",
  {
    "Datum":     { date: {} },
    "Slot":      { select: { options: [{ name: "Lunch" }, { name: "Middag" }] } },
    "Recept":    { relation: { data_source_id: recipesDsId, single_property: {} } },
    "EgetNamn":  { rich_text: {} },                // Fritext: "Rester från igår"
    "TidMin":    { number: { format: "number" } }, // Override för fritext-slot
  },
  "NOTION_MAT_PLAN_DB",
);

console.log("");
console.log("Klar. Uppdatera .env.local och GitHub-secrets enligt ovan, sedan starta om dev-servern.");
