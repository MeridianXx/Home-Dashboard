import { NextResponse } from "next/server";
import {
  downloadFitFile,
  findFitFileForWorkout,
  listFitFiles,
} from "@/lib/fitness/drive";
import { parseFit, type ParsedFit } from "@/lib/fitness/fit-parser";

export const dynamic = "force-dynamic";
// FIT-parsning är tyngre än de andra endpoints — ge lite längre timeout.
export const maxDuration = 30;

export interface FitResponse extends ParsedFit {
  sourceFile: string;
  updatedAt: string;
}

/**
 * GET /api/fitness/fit?date=YYYY-MM-DD&time=HH:MM&type=Running
 *   eller
 * GET /api/fitness/fit?fileId=<driveId>
 *   eller (list-mode)
 * GET /api/fitness/fit?list=1&date=YYYY-MM-DD
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const list = url.searchParams.get("list");
  const fileId = url.searchParams.get("fileId");
  const date = url.searchParams.get("date");
  const time = url.searchParams.get("time") ?? undefined;
  const type = url.searchParams.get("type") ?? undefined;

  try {
    if (list) {
      const files = await listFitFiles(date ?? undefined);
      return NextResponse.json({ files });
    }

    let resolvedFileId = fileId;
    if (!resolvedFileId) {
      if (!date) {
        return NextResponse.json(
          { error: "Ange date (och valfritt time, type) eller fileId" },
          { status: 400 },
        );
      }
      const match = await findFitFileForWorkout(date, time, type);
      if (!match) {
        return NextResponse.json(
          { error: `Ingen FIT-fil hittades för ${date}${time ? ` ${time}` : ""}` },
          { status: 404 },
        );
      }
      resolvedFileId = match.id;
    }

    const downloaded = await downloadFitFile(resolvedFileId);
    if (!downloaded) {
      return NextResponse.json({ error: "Kunde inte ladda ner FIT-fil" }, { status: 404 });
    }

    const parsed = await parseFit(downloaded.buffer);
    const body: FitResponse = {
      ...parsed,
      sourceFile: downloaded.filename,
      updatedAt: new Date().toISOString(),
    };
    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
