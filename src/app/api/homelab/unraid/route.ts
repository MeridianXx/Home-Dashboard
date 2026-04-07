const BASE = process.env.UNRAID_URL ?? "";
const API_KEY = process.env.UNRAID_API_KEY ?? "";

const QUERY = `
  query DashboardData {
    info {
      os { hostname platform uptime }
      cpu { brand cores threads }
    }
    metrics {
      cpu { percentTotal }
      memory { total used percentTotal }
    }
    array {
      state
      capacity { kilobytes { total used free } }
      parities { name status temp isSpinning numErrors }
      disks { name status temp isSpinning numErrors fsSize fsUsed fsFree }
      caches { name status temp isSpinning numErrors fsSize fsUsed fsFree }
    }
    docker {
      containers { names image state status autoStart }
    }
  }
`;

function fmtUptime(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Group caches by pool: "cache" + "cache2" → "cache", "cache_ssd" + "cache_ssd2" → "cache_ssd" */
function poolName(name: string) {
  return name.replace(/\d+$/, "");
}

type Disk = { name: string; status: string; temp: number | null; isSpinning: boolean; numErrors: number; fsSize: number | null; fsUsed: number | null; fsFree: number | null };

function mapDisk(d: Disk, type: "disk" | "cache") {
  return {
    name: d.name,
    status: d.status,
    temp: d.temp,
    spinning: d.isSpinning,
    errors: d.numErrors,
    used_tb: d.fsUsed ? +(d.fsUsed / 1e9).toFixed(1) : null,
    total_tb: d.fsSize ? +(d.fsSize / 1e9).toFixed(1) : null,
    used_pct: d.fsSize && d.fsUsed ? Math.round((d.fsUsed / d.fsSize) * 100) : null,
    type,
  };
}

export async function GET() {
  if (!BASE || !API_KEY) {
    return Response.json({ error: "UNRAID_URL / UNRAID_API_KEY saknas" }, { status: 503 });
  }

  try {
    const res = await fetch(`${BASE}/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
      body: JSON.stringify({ query: QUERY }),
      next: { revalidate: 0 },
    });

    if (!res.ok) throw new Error(`Unraid GraphQL: ${res.status}`);

    const json = await res.json() as {
      data?: {
        info: {
          os: { hostname: string; uptime: string };
          cpu: { brand: string; cores: number; threads: number };
        };
        metrics: {
          cpu: { percentTotal: number };
          memory: { total: number; used: number; percentTotal: number };
        };
        array: {
          state: string;
          capacity: { kilobytes: { total: string; used: string; free: string } };
          parities: Disk[];
          disks: Disk[];
          caches: Disk[];
        };
        docker: {
          containers: Array<{ names: string[]; image: string; state: string; status: string; autoStart: boolean }>;
        };
      };
      errors?: Array<{ message: string }>;
    };

    if (json.errors?.length) throw new Error(json.errors.map(e => e.message).join(", "));
    if (!json.data) throw new Error("Tomt svar från Unraid");

    const { info, metrics, array, docker } = json.data;
    const cap = array.capacity.kilobytes;
    const capTotal = Number(cap.total);
    const capUsed = Number(cap.used);
    const capFree = Number(cap.free);

    // Group caches by pool name
    const cacheGroups: Record<string, ReturnType<typeof mapDisk>[]> = {};
    for (const c of array.caches) {
      const pool = poolName(c.name);
      if (!cacheGroups[pool]) cacheGroups[pool] = [];
      cacheGroups[pool].push(mapDisk(c, "cache"));
    }

    return Response.json({
      system: {
        hostname: info.os.hostname,
        uptime: fmtUptime(info.os.uptime),
        cpu_brand: info.cpu.brand,
        cpu_cores: info.cpu.cores,
        cpu_pct: Math.round(metrics.cpu.percentTotal),
        // percentTotal matches Unraid's own RAM widget (excludes page cache, ~16%)
        // metrics.memory.used includes all page cache and is ~4x higher than Unraid shows
        mem_pct: Math.round(metrics.memory.percentTotal),
        mem_used_gb: +((metrics.memory.total * metrics.memory.percentTotal / 100) / 1073741824).toFixed(1),
        mem_total_gb: +(metrics.memory.total / 1073741824).toFixed(1),
      },
      array: {
        state: array.state,
        total_tb: +(capTotal / 1e9).toFixed(1),
        used_tb: +(capUsed / 1e9).toFixed(1),
        free_tb: +(capFree / 1e9).toFixed(1),
        used_pct: Math.round((capUsed / capTotal) * 100),
        parity_ok: array.parities.every(p => p.status === "DISK_OK"),
        disks: array.disks.map(d => mapDisk(d, "disk")),
      },
      cache_pools: Object.entries(cacheGroups).map(([name, disks]) => ({
        name,
        disks,
        total_tb: +(disks.reduce((s, d) => s + (d.total_tb ?? 0), 0)).toFixed(1),
        used_tb: +(disks.reduce((s, d) => s + (d.used_tb ?? 0), 0)).toFixed(1),
        used_pct: (() => {
          const withData = disks.filter(d => d.used_pct != null);
          return withData.length ? Math.round(withData.reduce((s, d) => s + (d.used_pct ?? 0), 0) / withData.length) : null;
        })(),
      })),
      containers: docker.containers.map(c => ({
        name: c.names[0]?.replace(/^\//, "") ?? "?",
        image: c.image,
        state: c.state,
        status: c.status,
        auto_start: c.autoStart,
      })),
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}
