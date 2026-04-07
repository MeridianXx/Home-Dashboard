import { haPost } from "@/lib/ha";

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      domain: string;
      service: string;
      entity_id: string | string[];
      service_data?: Record<string, unknown>;
    };

    const { domain, service, entity_id, service_data } = body;
    if (!domain || !service || !entity_id) {
      return Response.json({ error: "domain, service och entity_id krävs" }, { status: 400 });
    }

    await haPost(`/api/services/${domain}/${service}`, {
      entity_id,
      ...service_data,
    });

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}
