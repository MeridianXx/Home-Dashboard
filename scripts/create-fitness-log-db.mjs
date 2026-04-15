#!/usr/bin/env node
// Skapar Notion-databasen "Träningslogg" under coach-sidan.
// Krav: Sidan 31e9b5da-2245-805a-a8b3-e676a81fbb8b måste vara delad med integrationen Träningscoach.
//
// Körs med: `node --env-file=.env.local scripts/create-fitness-log-db.mjs`

import { Client } from "@notionhq/client";

const COACH_PAGE_ID = "31e9b5da-2245-805a-a8b3-e676a81fbb8b";
const PLANS_DB_ID = process.env.NOTION_FITNESS_PLANS_DB ?? "31e9b5da-2245-8082-9fb2-ea3c5fadbc51";
const TOKEN = process.env.NOTION_TOKEN;

if (!TOKEN) {
  console.error("NOTION_TOKEN saknas — kör med `node --env-file=.env.local ...`");
  process.exit(1);
}

const notion = new Client({ auth: TOKEN });

const plansDb = await notion.databases.retrieve({ database_id: PLANS_DB_ID });
const plansDataSourceId = plansDb.data_sources?.[0]?.id;
if (!plansDataSourceId) {
  console.error("Hittade ingen data_source för plans-databasen");
  process.exit(1);
}

const properties = {
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
  "Planerat pass":  { relation: { data_source_id: plansDataSourceId, single_property: {} } },
  "AI-analys":      { rich_text: {} },
};

try {
  const db = await notion.databases.create({
    parent: { type: "page_id", page_id: COACH_PAGE_ID },
    title: [{ type: "text", text: { content: "Träningslogg" } }],
    initial_data_source: { properties },
  });
  console.log(`✅ Databas skapad: ${db.id}`);
  console.log(`\nLägg in i .env.local:\n  NOTION_FITNESS_LOG_DB=${db.id}\n`);
} catch (err) {
  console.error("❌ Fel:", err.body ?? err.message);
  if (err.code === "object_not_found") {
    console.error(`\nSidan ${COACH_PAGE_ID} är inte delad med integrationen.`);
    console.error("Öppna coach-sidan i Notion → … → Connections → Add connection → Träningscoach.");
  }
  process.exit(1);
}
