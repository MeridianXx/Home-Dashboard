import { getState, haPost } from "@/lib/ha";

const ENTITY_ID = "input_boolean.semesterlage";

export type AwayPayload = {
  active: boolean;
  lastChanged: string | null;
};

export async function GET() {
  try {
    const state = await getState(ENTITY_ID);
    return Response.json({
      active: state.state === "on",
      lastChanged: state.last_changed ?? null,
    } satisfies AwayPayload);
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { active?: boolean };
    if (typeof body.active !== "boolean") {
      return Response.json({ error: "active (boolean) krävs" }, { status: 400 });
    }
    const service = body.active ? "turn_on" : "turn_off";
    await haPost(`/api/services/input_boolean/${service}`, { entity_id: ENTITY_ID });
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

export const dynamic = "force-dynamic";
