// SWR fetcher functions for all data sources.
// Currently returns mock data. Replace with real API calls in Fas 2+.

export async function fetchJSON(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${url} (${res.status})`);
  return res.json();
}

// ─── Mock data shapes ────────────────────────────────────────────────────────

export type HAEntityState = {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
};

export type ProxmoxNode = {
  node: string;
  status: "online" | "offline";
  cpu: number;
  mem: number;
  maxmem: number;
  uptime: number;
};

export type EnergySnapshot = {
  spotPrice: number;         // øre/kWh
  spotLevel: "low" | "medium" | "high";
  todayCost: number;         // SEK
  solarPower: number;        // kW
  gridImport: number;        // kW
};

// ─── SWR keys ────────────────────────────────────────────────────────────────
// Use these as the `key` argument to useSWR().

export const SWR_KEYS = {
  energy: "/api/energy",
  climate: "/api/climate",
  proxmox: "/api/proxmox",
  unraid: "/api/unraid",
  portainer: "/api/portainer",
} as const;
