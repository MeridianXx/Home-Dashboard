// Proxmox API proxy — node:https för att hantera self-signed cert
import https from "node:https";

const BASE = process.env.PROXMOX_URL ?? "https://192.168.1.20:8006";
const TOKEN_ID = process.env.PROXMOX_TOKEN_ID ?? "";
const TOKEN_SECRET = process.env.PROXMOX_TOKEN_SECRET ?? "";

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
          try { resolve((JSON.parse(data) as { data: unknown }).data); }
          catch (e) { reject(e); }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

function fmtUptime(secs: number) {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  return d > 0 ? `${d}d ${h}h` : `${h}h`;
}

function fmtBytes(bps: number) {
  if (bps >= 1_048_576) return `${(bps / 1_048_576).toFixed(1)} MB/s`;
  if (bps >= 1024) return `${(bps / 1024).toFixed(0)} KB/s`;
  return `${Math.round(bps)} B/s`;
}

export async function GET() {
  if (!TOKEN_ID || !TOKEN_SECRET) {
    return Response.json({ error: "PROXMOX_TOKEN_ID / PROXMOX_TOKEN_SECRET saknas" }, { status: 503 });
  }

  try {
    const nodes = await pveGet("/nodes") as Array<{
      node: string; status: string; cpu: number; maxcpu: number;
      mem: number; maxmem: number; uptime: number;
      // Disk = root-fs på själva noden (systemdisken). Kan saknas på äldre PVE.
      disk?: number; maxdisk?: number;
    }>;

    const perNode = await Promise.all(
      nodes.map(async (n) => {
        const [qemu, lxc, rrd, status] = await Promise.all([
          pveGet(`/nodes/${n.node}/qemu`) as Promise<Array<{
            vmid: number; name: string; status: string;
            cpu: number; mem: number; maxmem: number; uptime: number;
          }>>,
          pveGet(`/nodes/${n.node}/lxc`) as Promise<Array<{
            vmid: number; name: string; status: string;
            cpu: number; mem: number; maxmem: number; uptime: number;
          }>>,
          pveGet(`/nodes/${n.node}/rrddata?timeframe=hour&cf=AVERAGE`) as Promise<Array<{
            netin?: number; netout?: number;
          }>>,
          // status-endpointen ger garanterad rootfs.used/total — disk på
          // /nodes är ibland 0 eller saknas. Hämtas alltid som fallback.
          pveGet(`/nodes/${n.node}/status`) as Promise<{
            rootfs?: { used?: number; total?: number };
          }>,
        ]);

        // last non-null RRD point
        const netPoint = [...rrd].reverse().find(p => p.netin != null) ?? {};

        // Systemdisk: föredra status.rootfs (alltid färska bytes), fallback
        // till nodes-listans disk/maxdisk.
        const diskUsed = status?.rootfs?.used ?? n.disk ?? 0;
        const diskTotal = status?.rootfs?.total ?? n.maxdisk ?? 0;
        const diskPct = diskTotal > 0 ? Math.round((diskUsed / diskTotal) * 100) : 0;

        return {
          node: n.node,
          status: n.status,
          cpu_pct: Math.round(n.cpu * 100),
          cpu_cores: n.maxcpu,
          mem_used_gb: +(n.mem / 1073741824).toFixed(1),
          mem_total_gb: +(n.maxmem / 1073741824).toFixed(1),
          mem_pct: Math.round((n.mem / n.maxmem) * 100),
          disk_used_gb: +(diskUsed / 1073741824).toFixed(1),
          disk_total_gb: +(diskTotal / 1073741824).toFixed(0),
          disk_pct: diskPct,
          uptime: fmtUptime(n.uptime),
          net_in: netPoint.netin ? fmtBytes(netPoint.netin) : null,
          net_out: netPoint.netout ? fmtBytes(netPoint.netout) : null,
          vms: [...qemu.map(v => ({ ...v, type: "qemu" })), ...lxc.map(v => ({ ...v, type: "lxc" }))]
            .map(v => ({
              vmid: v.vmid,
              name: v.name,
              type: v.type,
              status: v.status,
              cpu_pct: Math.round((v.cpu ?? 0) * 100),
              mem_used_gb: +(v.mem / 1073741824).toFixed(1),
              mem_total_gb: +(v.maxmem / 1073741824).toFixed(1),
            }))
            .sort((a, b) => a.vmid - b.vmid),
        };
      })
    );

    return Response.json({ nodes: perNode });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}
