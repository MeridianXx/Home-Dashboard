// Proxmox API proxy — node:https för att hantera self-signed cert
import https from "node:https";

const BASE = process.env.PROXMOX_URL ?? "https://192.168.1.20:8006";
const TOKEN_ID = process.env.PROXMOX_TOKEN_ID ?? "";
const TOKEN_SECRET = process.env.PROXMOX_TOKEN_SECRET ?? "";

// Self-signed cert on Proxmox — safe to skip verification on LAN
function pveGet(path: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE}/api2/json${path}`);
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: "GET",
        headers: { Authorization: `PVEAPIToken=${TOKEN_ID}=${TOKEN_SECRET}` },
        rejectUnauthorized: false,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data) as { data: unknown };
            resolve(json.data);
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
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
