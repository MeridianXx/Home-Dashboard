// ─── Home Assistant API utility ───────────────────────────────────────────────

const BASE    = process.env.HA_URL   ?? "";
const TOKEN   = process.env.HA_TOKEN ?? "";
const TIMEOUT = 5_000; // ms — abort if HA doesn't respond

function headers() {
  return { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };
}

function signal() {
  return AbortSignal.timeout(TIMEOUT);
}

export async function haGet<T>(path: string): Promise<T> {
  if (!BASE || !TOKEN) throw new Error("HA_URL / HA_TOKEN saknas");
  const res = await fetch(`${BASE}${path}`, {
    headers: headers(),
    cache: "no-store",
    signal: signal(),
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
    signal: signal(),
  });
  if (!res.ok) throw new Error(`HA POST ${path}: ${res.status}`);
  return res.json();
}

/** Render a Jinja2 template via /api/template and return the raw string result */
async function haTemplate(template: string): Promise<string> {
  if (!BASE || !TOKEN) throw new Error("HA_URL / HA_TOKEN saknas");
  const res = await fetch(`${BASE}/api/template`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ template }),
    cache: "no-store",
    signal: signal(),
  });
  if (!res.ok) throw new Error(`HA template: ${res.status}`);
  return res.text();
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

// ─── Scene config — target states per entity ──────────────────────────────────

export type SceneEntityTarget = {
  state: string;
  brightness?: number;
  [key: string]: unknown;
};

export type SceneConfig = {
  id: string;
  name: string;
  entities: Record<string, SceneEntityTarget>;
};

export async function getSceneConfig(id: string): Promise<SceneConfig> {
  return haGet<SceneConfig>(`/api/config/scene/config/${id}`);
}

// ─── Area / entity registry — HA template API, 60 s in-process cache ─────────

type Area = { area_id: string; name: string };

let _reg: {
  entityArea: Record<string, string>;   // entity_id → area_id
  areas: Record<string, Area>;          // area_id   → Area
  ts: number;
} | null = null;

export async function getRegistry(): Promise<{
  entityArea: Record<string, string>;
  areas: Record<string, Area>;
}> {
  if (_reg && Date.now() - _reg.ts < 60_000) return _reg;

  // Single template call returns all areas + their entity lists
  const tpl = [
    "{% set ns = namespace(r=[]) %}",
    "{% for a in areas() %}",
    "{% set ns.r = ns.r + [{",
    "\"id\": a,",
    "\"name\": area_name(a),",
    "\"entities\": area_entities(a) | list",
    "}] %}",
    "{% endfor %}",
    "{{ ns.r | tojson }}",
  ].join("");

  const raw      = await haTemplate(tpl);
  const areaList = JSON.parse(raw) as Array<{ id: string; name: string; entities: string[] }>;

  const entityArea: Record<string, string> = {};
  const areas: Record<string, Area>        = {};

  for (const area of areaList) {
    areas[area.id] = { area_id: area.id, name: area.name };
    for (const entityId of area.entities) {
      entityArea[entityId] = area.id;
    }
  }

  _reg = { entityArea, areas, ts: Date.now() };
  return _reg;
}
