// ─── Lista pass-nycklar som har AI-analys i Notion ───────────────────────────
// Används av fitness-listorna för att visa en liten markering på ikoner vars
// pass redan analyserats. Nycklar är samma format som `logKey(w)`: date|HHMM|type.

import { NextResponse } from "next/server";
import { isLogDbReady, listAnalysedKeys } from "@/lib/fitness/notion";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!isLogDbReady()) {
      return NextResponse.json({ keys: [], logDbReady: false });
    }
    const keys = await listAnalysedKeys();
    return NextResponse.json({ keys, logDbReady: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
