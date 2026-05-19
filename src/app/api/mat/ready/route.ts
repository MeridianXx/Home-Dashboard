// ─── Mat — ready-gate ───────────────────────────────────────────────────────
// Återanvänds av hubben + alla mat-sidor för att avgöra om Notion-DB:erna är
// konfigurerade. Returnerar alltid 200 (även när inte ready) — det är inte
// ett fel, bara en konfigurationsstatus. Övriga `/api/mat/*`-routes svarar
// 501 när inte ready och då har vi den här som hjälpsam side-channel.

import { NextResponse } from "next/server";
import { isMatReady, missingMatEnv } from "@/lib/mat/notion";
import type { MatReadyResponse } from "@/lib/mat/types";

export const dynamic = "force-dynamic";

export function GET() {
  const body: MatReadyResponse = {
    matReady: isMatReady(),
    missing: missingMatEnv(),
  };
  return NextResponse.json(body);
}
