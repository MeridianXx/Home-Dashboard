#!/usr/bin/env node
// Skapar Notion-DB:erna "Träningslogg" och "Profil" under coach-sidan.
//
// Krav: Sidan 31e9b5da-2245-805a-a8b3-e676a81fbb8b måste vara delad med
// integrationen *Träningscoach* (Notion → sidan → … → Connections → Add).
//
// Körs med: `node --env-file=.env.local scripts/create-fitness-notion-dbs.mjs`
//
// Efter körning — klistra in returnerade ID:n i .env.local och GitHub-secrets:
//   NOTION_FITNESS_LOG_DB=<id>
//   NOTION_FITNESS_PROFILE_DB=<id>

import { Client } from "@notionhq/client";

const COACH_PAGE_ID = "31e9b5da-2245-805a-a8b3-e676a81fbb8b";
const PLANS_DB_ID = process.env.NOTION_FITNESS_PLANS_DB ?? "31e9b5da-2245-8082-9fb2-ea3c5fadbc51";
const TOKEN = process.env.NOTION_TOKEN;

if (!TOKEN) {
  console.error("NOTION_TOKEN saknas — kör med `node --env-file=.env.local ...`");
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
      parent: { type: "page_id", page_id: COACH_PAGE_ID },
      title: [{ type: "text", text: { content: title } }],
      initial_data_source: { properties },
    });
    console.log(`✅ ${title} skapad: ${db.id}`);
    console.log(`   → sätt ${envVar}=${db.id}`);
    return db.id;
  } catch (err) {
    console.error(`❌ ${title}:`, err.body ?? err.message);
    if (err.code === "object_not_found") {
      console.error(`\nSidan ${COACH_PAGE_ID} är inte delad med integrationen.`);
      console.error("Öppna coach-sidan → … → Connections → Add connection → Träningscoach.");
    }
    throw err;
  }
}

// ── Träningslogg ──────────────────────────────────────────────────────────────

const plansDsId = await dataSourceId(PLANS_DB_ID);

await createIfMissing(
  "Träningslogg",
  {
    "Passnamn":       { title: {} },
    "Datum":          { date: {} },
    "Typ":            { select: { options: [{ name: "Löpning" }, { name: "Cykling" }, { name: "Styrka" }, { name: "Annat" }] } },
    "Distans":        { number: { format: "number" } },
    "Total tid":      { rich_text: {} },
    "Snittempo":      { rich_text: {} },
    "Avg HR":         { number: { format: "number" } },
    "Max HR":         { number: { format: "number" } },
    "Avg Power":      { number: { format: "number" } },
    "TRIMP":          { number: { format: "number" } },
    "RPE":            { number: { format: "number" } },
    "HRZ0":           { number: { format: "number" } },
    "HRZ1":           { number: { format: "number" } },
    "HRZ2":           { number: { format: "number" } },
    "HRZ3":           { number: { format: "number" } },
    "HRZ4":           { number: { format: "number" } },
    "HRZ5":           { number: { format: "number" } },
    "FIT-fil":        { rich_text: {} },
    "Planerat pass":  { relation: { data_source_id: plansDsId, single_property: {} } },
    "AI-analys":      { rich_text: {} },
  },
  "NOTION_FITNESS_LOG_DB",
);

// ── Profil ────────────────────────────────────────────────────────────────────

await createIfMissing(
  "Profil",
  {
    "Nyckel":     { title: {} },
    "Värde":      { rich_text: {} },
    "Kategori":   { select: { options: [{ name: "profil" }, { name: "zon" }, { name: "mål" }] } },
    "Deadline":   { date: {} },
    "Uppdaterad": { last_edited_time: {} },
  },
  "NOTION_FITNESS_PROFILE_DB",
);

console.log("\nKlar. Uppdatera .env.local och GitHub-secrets enligt ovan, sedan starta om dev-servern.");
