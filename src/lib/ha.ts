// ─── Home Assistant API utility ───────────────────────────────────────────────

const BASE  = process.env.HA_URL   ?? "";
const TOKEN = process.env.HA_TOKEN ?? "";

function headers() {
  return { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };
}

export async function haGet<T>(path: string): Promise<T> {
  if (!BASE || !TOKEN) throw new Error("HA_URL / HA_TOKEN saknas");
  const res = await fetch(`${BASE}${path}`, {
    headers: headers(),
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`HA ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function haPost(path: string, body: unknown): Promise<unknown> {
  if (!BASE || !TOKEN) throw new Error("HA_URL / HA_TOKEN saknas");
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HA POST ${path}: ${res.status}`);
  return res.json();
}

// ─── Entity state ─────────────────────────────────────────────────────────────

export type HAState = {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
};

export async function getStates(domain?: string): Promise<HAState[]> {
  const all = await haGet<HAState[]>("/api/states");
  return domain ? all.filter(s => s.entity_id.startsWith(`${domain}.`)) : all;
}

export async function getState(entityId: string): Promise<HAState> {
  return haGet<HAState>(`/api/states/${entityId}`);
}

// ─── Area / entity registry (in-process cache, 60 s TTL) ─────────────────────

type Area        = { area_id: string; name: string };
type EntityEntry = { entity_id: string; area_id: string | null; device_id: string | null; disabled_by: string | null };
type DeviceEntry = { id: string; area_id: string | null };

let _reg: { entityArea: Record<string, string>; areas: Record<string, Area>; ts: number } | null = null;

export async function getRegistry(): Promise<{
  entityArea: Record<string, string>;   // entity_id → area_id
  areas: Record<string, Area>;          // area_id   → Area
}> {
  if (_reg && Date.now() - _reg.ts < 60_000) return _reg;

  const [areaList, entities, devices] = await Promise.all([
    haGet<Area[]>("/api/config/area_registry/list"),
    haGet<EntityEntry[]>("/api/config/entity_registry/list"),
    haGet<DeviceEntry[]>("/api/config/device_registry/list"),
  ]);

  const deviceArea: Record<string, string> = {};
  for (const d of devices) { if (d.area_id) deviceArea[d.id] = d.area_id; }

  const entityArea: Record<string, string> = {};
  for (const e of entities) {
    if (e.disabled_by) continue;
    const aid = e.area_id ?? (e.device_id ? (deviceArea[e.device_id] ?? null) : null);
    if (aid) entityArea[e.entity_id] = aid;
  }

  const areas = Object.fromEntries(areaList.map(a => [a.area_id, a]));
  _reg = { entityArea, areas, ts: Date.now() };
  return _reg;
}
