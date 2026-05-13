// Proxmox API proxy — node:https för att hantera self-signed cert.
// Kluster-aware: gör health-check mot primär först, faller över till
// sekundär nod om primären inte svarar (klustret är delad state så samma
// token funkar mot vilken medlem som helst).
import https from "node:https";

// `||` (inte `??`) — så att tomma secret-värden i deploy.yml faller tillbaka
// på defaulten i stället för att skicka tom sträng till URL-konstruktorn.
const PRIMARY = process.env.PROXMOX_URL || "https://192.168.1.20:8006";
const FALLBACK = process.env.PROXMOX_URL_FALLBACK || "https://192.168.1.21:8006";
const TOKEN_ID = process.env.PROXMOX_TOKEN_ID ?? "";
const TOKEN_SECRET = process.env.PROXMOX_TOKEN_SECRET ?? "";

type PveSource = "primary" | "fallback";

type PveResult =
  | { ok: true; data: unknown; status: number }
  | { ok: false; status: number | null; error: string };

function pveGetRaw(base: string, path: string, timeoutMs = 5000): Promise<PveResult> {
  return new Promise((resolve) => {
    const url = new URL(`${base}/api2/json${path}`);
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: "GET",
        headers: { Authorization: `PVEAPIToken=${TOKEN_ID}=${TOKEN_SECRET}` },
        rejectUnauthorized: false,
        timeout: timeoutMs,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          const status = res.statusCode ?? 0;
          if (status >= 200 && status < 300) {
            try {
              resolve({ ok: true, data: (JSON.parse(data) as { data: unknown }).data, status });
            } catch (e) {
              resolve({ ok: false, status, error: `parse: ${String(e)}` });
            }
          } else {
            resolve({ ok: false, status, error: `HTTP ${status}` });
          }
        });
      }
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", (e) => resolve({ ok: false, status: null, error: e.message }));
    req.end();
  });
}

// Plocka första svarande host. Auth-fel (401/403) hoppar fallback eftersom
// samma token gäller över hela klustret — då hjälper det inte att prova nästa.
async function pickHost(): Promise<{ base: string; source: PveSource } | { error: string; status?: number }> {
  const candidates: Array<{ base: string; source: PveSource }> = [
    { base: PRIMARY, source: "primary" },
  ];
  if (FALLBACK && FALLBACK !== PRIMARY) {
    candidates.push({ base: FALLBACK, source: "fallback" });
  }
  let lastError = "";
  let lastStatus: number | null = null;
  for (const c of candidates) {
    const r = await pveGetRaw(c.base, "/version", 2500);
    if (r.ok) return c;
    if (r.status === 401 || r.status === 403) {
      return { error: "Token saknas eller är ogiltig.", status: r.status };
    }
    lastError = `${c.source} (${c.base}): ${r.error}`;
    lastStatus = r.status;
  }
  return { error: `Ingen Proxmox-nod svarar — ${lastError}`, status: lastStatus ?? undefined };
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

  const picked = await pickHost();
  if ("error" in picked) {
    return Response.json({ error: picked.error }, { status: picked.status ?? 503 });
  }
  const { base, source } = picked;

  // Bind pveGet till vald host så resterande anrop går samma väg.
  async function pveGet(path: string): Promise<unknown> {
    const r = await pveGetRaw(base, path);
    if (!r.ok) throw new Error(r.error);
    return r.data;
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
        // Offline-noder svarar inte på sina egna endpoints — hoppa dem och
        // markera som offline med tomma värden. Annars kraschar hela svaret
        // när vi failovrar till en nod som tappat sikten på den andra.
        if (n.status !== "online") {
          return {
            node: n.node,
            status: n.status,
            cpu_pct: 0,
            cpu_cores: n.maxcpu,
            mem_used_bytes: 0,
            mem_total_bytes: 0,
            mem_used_gb: 0,
            mem_total_gb: 0,
            mem_pct: 0,
            disk_used_bytes: 0,
            disk_total_bytes: 0,
            disk_used_gb: 0,
            disk_total_gb: 0,
            disk_pct: 0,
            uptime: "—",
            uptime_secs: 0,
            net_in_bps: null,
            net_out_bps: null,
            net_in: null,
            net_out: null,
            vms: [],
          };
        }

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
          mem_used_bytes: n.mem,
          mem_total_bytes: n.maxmem,
          mem_used_gb: +(n.mem / 1073741824).toFixed(1),
          mem_total_gb: +(n.maxmem / 1073741824).toFixed(1),
          mem_pct: Math.round((n.mem / n.maxmem) * 100),
          disk_used_bytes: diskUsed,
          disk_total_bytes: diskTotal,
          disk_used_gb: +(diskUsed / 1073741824).toFixed(1),
          disk_total_gb: +(diskTotal / 1073741824).toFixed(0),
          disk_pct: diskPct,
          uptime: fmtUptime(n.uptime),
          uptime_secs: n.uptime,
          net_in_bps: netPoint.netin ?? null,
          net_out_bps: netPoint.netout ?? null,
          net_in: netPoint.netin ? fmtBytes(netPoint.netin) : null,
          net_out: netPoint.netout ? fmtBytes(netPoint.netout) : null,
          vms: [...qemu.map(v => ({ ...v, type: "qemu" })), ...lxc.map(v => ({ ...v, type: "lxc" }))]
            .map(v => ({
              vmid: v.vmid,
              name: v.name,
              node: n.node,
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

    // Cluster-totaler. Behåll bytes-precision under summering, runda först
    // när vi serialiserar — annars driver heltal/GB-avrundning isär.
    const onlineNodes = perNode.filter((n) => n.status === "online");
    const totalCores = onlineNodes.reduce((s, n) => s + n.cpu_cores, 0);
    const totalMemUsed = onlineNodes.reduce((s, n) => s + n.mem_used_bytes, 0);
    const totalMemTotal = onlineNodes.reduce((s, n) => s + n.mem_total_bytes, 0);
    const totalDiskUsed = onlineNodes.reduce((s, n) => s + n.disk_used_bytes, 0);
    const totalDiskTotal = onlineNodes.reduce((s, n) => s + n.disk_total_bytes, 0);
    const totalNetIn = onlineNodes.reduce((s, n) => s + (n.net_in_bps ?? 0), 0);
    const totalNetOut = onlineNodes.reduce((s, n) => s + (n.net_out_bps ?? 0), 0);
    // Weighted CPU% — varje nod bidrar med (cpu_pct × cores) av total core-pool.
    const weightedCpu = totalCores > 0
      ? onlineNodes.reduce((s, n) => s + n.cpu_pct * n.cpu_cores, 0) / totalCores
      : 0;
    const allVms = perNode.flatMap((n) => n.vms);
    const vmsRunning = allVms.filter((v) => v.status === "running").length;
    const vmsStopped = allVms.length - vmsRunning;
    const nodesOnline = onlineNodes.length;

    const cluster = {
      node_count: perNode.length,
      nodes_online: nodesOnline,
      status: nodesOnline === perNode.length ? "online" : nodesOnline > 0 ? "degraded" : "offline",
      cpu_pct: Math.round(weightedCpu),
      cpu_cores: totalCores,
      mem_used_gb: +(totalMemUsed / 1073741824).toFixed(1),
      mem_total_gb: +(totalMemTotal / 1073741824).toFixed(0),
      mem_pct: totalMemTotal > 0 ? Math.round((totalMemUsed / totalMemTotal) * 100) : 0,
      disk_used_gb: +(totalDiskUsed / 1073741824).toFixed(1),
      disk_total_gb: +(totalDiskTotal / 1073741824).toFixed(0),
      disk_pct: totalDiskTotal > 0 ? Math.round((totalDiskUsed / totalDiskTotal) * 100) : 0,
      net_in: totalNetIn > 0 ? fmtBytes(totalNetIn) : null,
      net_out: totalNetOut > 0 ? fmtBytes(totalNetOut) : null,
      vms_running: vmsRunning,
      vms_stopped: vmsStopped,
      source,
    };

    return Response.json({ cluster, nodes: perNode, source });
  } catch (err) {
    return Response.json({ error: String(err), source }, { status: 502 });
  }
}
