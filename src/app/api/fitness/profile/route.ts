import { NextResponse } from "next/server";
import { getProfile, isProfileDbReady, updateProfile } from "@/lib/fitness/notion";
import { DEFAULT_PROFILE } from "@/lib/fitness/profile-defaults";
import type { FitnessProfile } from "@/lib/fitness/types";

export const dynamic = "force-dynamic";

export interface ProfileResponse {
  profile: FitnessProfile;
  dbReady: boolean;
  source: "notion" | "default";
  updatedAt: string;
}

export async function GET() {
  try {
    if (!isProfileDbReady()) {
      return NextResponse.json<ProfileResponse>({
        profile: DEFAULT_PROFILE,
        dbReady: false,
        source: "default",
        updatedAt: new Date().toISOString(),
      });
    }
    const fromNotion = await getProfile(DEFAULT_PROFILE);
    return NextResponse.json<ProfileResponse>({
      profile: fromNotion ?? DEFAULT_PROFILE,
      dbReady: true,
      source: fromNotion ? "notion" : "default",
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    if (!isProfileDbReady()) {
      return NextResponse.json(
        { error: "Profil-DB saknas — kör scripts/create-fitness-notion-dbs.mjs och sätt NOTION_FITNESS_PROFILE_DB" },
        { status: 501 },
      );
    }
    const patch = (await req.json()) as Partial<FitnessProfile>;
    await updateProfile(patch);
    return NextResponse.json({ ok: true, updatedAt: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
