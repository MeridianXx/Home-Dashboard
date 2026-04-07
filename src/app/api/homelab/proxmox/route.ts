import { Agent } from "undici";

const BASE = process.env.PROXMOX_URL ?? "https://192.168.1.20:8006";
const TOKEN_ID = process.env.PROXMOX_TOKEN_ID ?? "";
const TOKEN_SECRET = process.env.PROXMOX_TOKEN_SECRET ?? "";

// Self-signed cert on Proxmox — safe to skip verification on LAN
const agent = new Agent({ connect: { rejectUnauthorized: false } });

async function pveGet(path: string) {
  const res = await fetch(`${BASE}/api2/json${path}`, {
    headers: { Authorization: `PVEAPIToken=${TOKEN_ID}=${TOKEN_SECRET}` },
    // @ts-expect-error undici dispatcher not in fetch types
    dispatcher: agent,
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Proxmox ${path}: ${res.status}`);
  const json = await res.json() as { data: unknown };
  return json.data;
}

export async function GET() {
  if (!TOKEN_ID || !TOKEN_SECRET) {
    return Response.json({ error: "PROXMOX_TOKEN_ID / PROXMOX_TOKEN_SECRET saknas" }, { status: 503 });
  }

  try {
    const nodes = await pveGet("/nodes") as Array<{
      node: string; status: string; cpu: number; maxcpu: number;
      mem: number; maxmem: number; uptime: number;
    }>;

    const vmsPerNode = await Promise.all(
      nodes.map(async (n) => {
        const [qemu, lxc] = await Promise.all([
          pveGet(`/nodes/${n.node}/qemu`) as Promise<Array<{
            vmid: number; name: string; status: string;
            cpu: number; cpus: number; mem: number; maxmem: number; uptime: number;
          }>>,
          pveGet(`/nodes/${n.node}/lxc`) as Promise<Array<{
            vmid: number; name: string; status: string;
            cpu: number; cpus: number; mem: number; maxmem: number; uptime: number;
          }>>,
        ]);
        return { node: n.node, vms: [...qemu.map(v => ({ ...v, type: "qemu" })), ...lxc.map(v => ({ ...v, type: "lxc" }))] };
      })
    );

    return Response.json({
      nodes: nodes.map((n) => ({
        node: n.node,
        status: n.status,
        cpu_pct: Math.round(n.cpu * 100),
        cpu_cores: n.maxcpu,
        mem_used_gb: +(n.mem / 1073741824).toFixed(1),
        mem_total_gb: +(n.maxmem / 1073741824).toFixed(1),
        uptime_s: n.uptime,
      })),
      vms: vmsPerNode.flatMap(({ node, vms }) =>
        vms.map((v) => ({
          vmid: v.vmid,
          name: v.name,
          type: v.type,
          node,
          status: v.status,
          cpu_pct: Math.round((v.cpu ?? 0) * 100),
          mem_used_gb: +(v.mem / 1073741824).toFixed(1),
          mem_total_gb: +(v.maxmem / 1073741824).toFixed(1),
          uptime_s: v.uptime,
        }))
      ).sort((a, b) => a.vmid - b.vmid),
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}
