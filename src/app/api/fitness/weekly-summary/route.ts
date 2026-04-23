// ─── /api/fitness/weekly-summary ─────────────────────────────────────────────
// Trigger: POST med shared-secret-header. Anropas av GitHub Actions varje
// måndag (se .github/workflows/weekly-summary.yml). GET ger dry-run/preview.

import { NextResponse } from "next/server";
import { generateWeeklySummary } from "@/lib/fitness/weekly-summary";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const HEADER = "x-weekly-secret";

function checkSecret(req: Request): { ok: true } | { ok: false; reason: string } {
  const expected = process.env.FITNESS_WEEKLY_SECRET ?? "";
  if (!expected) return { ok: false, reason: "FITNESS_WEEKLY_SECRET saknas i env" };
  const provided =
    req.headers.get(HEADER) ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  if (!provided || provided !== expected) {
    return { ok: false, reason: "Ogiltig eller saknad secret" };
  }
  return { ok: true };
}

/** GET — dry-run, returnerar genererad text utan att skriva till Notion. */
export async function GET(req: Request) {
  const auth = checkSecret(req);
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 });
  const url = new URL(req.url);
  const week = url.searchParams.get("week") ?? undefined;
  try {
    const result = await generateWeeklySummary({ week, dryRun: true });
    return NextResponse.json({
      ok: true,
      dryRun: true,
      week: result.week,
      title: result.title,
      text: result.text,
      workoutsCount: result.workoutsCount,
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      sourceFile: result.sourceFile,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST — genererar sammanfattning OCH skriver till Notion. */
export async function POST(req: Request) {
  const auth = checkSecret(req);
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 });
  const url = new URL(req.url);
  const week = url.searchParams.get("week") ?? undefined;
  try {
    const result = await generateWeeklySummary({ week });
    return NextResponse.json({
      ok: true,
      week: result.week,
      title: result.title,
      pageId: result.pageId,
      replacedPageId: result.replacedPageId,
      workoutsCount: result.workoutsCount,
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      sourceFile: result.sourceFile,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
