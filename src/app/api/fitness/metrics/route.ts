import { NextResponse } from "next/server";
import { getLatestHealthMetricsXlsx } from "@/lib/fitness/drive";
import { parseHealthMetrics } from "@/lib/fitness/parser";

export const dynamic = "force-dynamic";

export interface MetricsResponse {
  weightKg: number | null;
  restingHR: number | null;
  restingHRDate: string | null;
  vo2Max: number | null;
  vo2MaxDate: string | null;
  hrvMs: number | null;
  hrv7dAvg: number | null;
  /** Filnamn på källan — Health Metrics_vN */
  sourceFile: string | null;
  /** Drive `modifiedTime` = när HealthFit senast skrev Health Metrics-filen */
  sourceModifiedAt: string | null;
  updatedAt: string;
}

export async function GET(req: Request) {
  const skipCache = new URL(req.url).searchParams.get("refresh") === "1";
  try {
    const healthFile = await getLatestHealthMetricsXlsx({ skipCache });
    const metrics = healthFile
      ? parseHealthMetrics(healthFile.buffer)
      : {
          weightKg: null, restingHR: null, restingHRDate: null,
          vo2Max: null, vo2MaxDate: null, hrvMs: null, hrv7dAvg: null,
        };

    const body: MetricsResponse = {
      weightKg: metrics.weightKg,
      restingHR: metrics.restingHR,
      restingHRDate: metrics.restingHRDate,
      vo2Max: metrics.vo2Max,
      vo2MaxDate: metrics.vo2MaxDate,
      hrvMs: metrics.hrvMs,
      hrv7dAvg: metrics.hrv7dAvg,
      sourceFile: healthFile?.filename ?? null,
      sourceModifiedAt: healthFile?.modifiedTime ?? null,
      updatedAt: new Date().toISOString(),
    };
    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
