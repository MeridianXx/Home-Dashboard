const BASE = process.env.UNRAID_URL ?? "";
const API_KEY = process.env.UNRAID_API_KEY ?? "";

const QUERY = `
  query DashboardData {
    info {
      os { hostname platform uptime }
      cpu { brand cores threads }
      memory { layout { size } }
    }
    metrics {
      cpu { percentTotal }
      memory { percentTotal total }
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
          os: { hostname: string; platform: string; uptime: string };
          cpu: { brand: string; cores: number; threads: number };
          memory: { layout: Array<{ size: number }> };
        };
        metrics: {
          cpu: { percentTotal: number };
          memory: { percentTotal: number; total: number };
        };
        array: {
          state: string;
          capacity: { kilobytes: { total: string; used: string; free: string } };
          parities: Array<{ name: string; status: string; temp: number | null; isSpinning: boolean; numErrors: number }>;
          disks: Array<{ name: string; status: string; temp: number | null; isSpinning: boolean; numErrors: number; fsSize: number | null; fsUsed: number | null; fsFree: number | null }>;
          caches: Array<{ name: string; status: string; temp: number | null; isSpinning: boolean; numErrors: number; fsSize: number | null; fsUsed: number | null; fsFree: number | null }>;
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
    const memTotalGb = +(metrics.memory.total / 1073741824).toFixed(1);
    const memUsedGb = +((metrics.memory.total * metrics.memory.percentTotal / 100) / 1073741824).toFixed(1);

    return Response.json({
      system: {
        hostname: info.os.hostname,
        uptime: fmtUptime(info.os.uptime),
        cpu_brand: info.cpu.brand,
        cpu_cores: info.cpu.cores,
        cpu_threads: info.cpu.threads,
        cpu_pct: Math.round(metrics.cpu.percentTotal),
        mem_used_gb: memUsedGb,
        mem_total_gb: memTotalGb,
        mem_pct: Math.round(metrics.memory.percentTotal),
      },
      array: {
        state: array.state,
        total_tb: +(capTotal / 1073741824).toFixed(1),
        used_tb: +(capUsed / 1073741824).toFixed(1),
        free_tb: +(capFree / 1073741824).toFixed(1),
        used_pct: Math.round((capUsed / capTotal) * 100),
        parity_ok: array.parities.every(p => p.status === "DISK_OK"),
      },
      disks: [
        ...array.disks.map(d => ({
          name: d.name, status: d.status, temp: d.temp,
          spinning: d.isSpinning, errors: d.numErrors,
          used_tb: d.fsUsed ? +(d.fsUsed / 1073741824).toFixed(1) : null,
          total_tb: d.fsSize ? +(d.fsSize / 1073741824).toFixed(1) : null,
          used_pct: d.fsSize && d.fsUsed ? Math.round((d.fsUsed / d.fsSize) * 100) : null,
          type: "disk" as const,
        })),
        ...array.caches.map(c => ({
          name: c.name, status: c.status, temp: c.temp,
          spinning: c.isSpinning, errors: c.numErrors,
          used_tb: c.fsUsed ? +(c.fsUsed / 1073741824).toFixed(1) : null,
          total_tb: c.fsSize ? +(c.fsSize / 1073741824).toFixed(1) : null,
          used_pct: c.fsSize && c.fsUsed ? Math.round((c.fsUsed / c.fsSize) * 100) : null,
          type: "cache" as const,
        })),
      ],
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
