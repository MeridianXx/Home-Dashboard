const BASE = process.env.UNRAID_URL ?? "";
const API_KEY = process.env.UNRAID_API_KEY ?? "";

const QUERY = `
  query DashboardData {
    info {
      os { hostname version uptime }
      cpu { brand cores threads usage }
      memory { total used free }
    }
    array {
      state
      capacity { kilobytes { total used free } }
      parities { name device status temp spinning errors }
      disks { name device status temp spinning errors fsSize fsUsed fsFree }
      caches { name device status temp spinning errors fsSize fsUsed fsFree }
    }
    docker {
      containers { names image state status autoStart }
    }
  }
`;

function kb(n: number | null | undefined) {
  if (!n) return null;
  return +(n / 1073741824).toFixed(2); // KB → GB
}

function fmtUptime(iso: string) {
  const started = new Date(iso).getTime();
  const secs = Math.floor((Date.now() - started) / 1000);
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
          os: { hostname: string; version: string; uptime: string };
          cpu: { brand: string; cores: number; threads: number; usage: number };
          memory: { total: number; used: number; free: number };
        };
        array: {
          state: string;
          capacity: { kilobytes: { total: number; used: number; free: number } };
          parities: Array<{ name: string; device: string; status: string; temp: number | null; spinning: boolean; errors: number }>;
          disks: Array<{ name: string; device: string; status: string; temp: number | null; spinning: boolean; errors: number; fsSize: number; fsUsed: number; fsFree: number }>;
          caches: Array<{ name: string; device: string; status: string; temp: number | null; spinning: boolean; errors: number; fsSize: number; fsUsed: number; fsFree: number }>;
        };
        docker: {
          containers: Array<{ names: string[]; image: string; state: string; status: string; autoStart: boolean }>;
        };
      };
      errors?: Array<{ message: string }>;
    };

    if (json.errors?.length) throw new Error(json.errors.map(e => e.message).join(", "));
    if (!json.data) throw new Error("Tomt svar från Unraid");

    const { info, array, docker } = json.data;
    const cap = array.capacity.kilobytes;

    return Response.json({
      system: {
        hostname: info.os.hostname,
        version: info.os.version,
        uptime: fmtUptime(info.os.uptime),
        cpu_brand: info.cpu.brand,
        cpu_cores: info.cpu.cores,
        cpu_threads: info.cpu.threads,
        cpu_pct: Math.round(info.cpu.usage),
        mem_used_gb: kb(info.memory.used),
        mem_total_gb: kb(info.memory.total),
        mem_pct: Math.round((info.memory.used / info.memory.total) * 100),
      },
      array: {
        state: array.state,
        total_tb: +(cap.total / 1073741824).toFixed(1),
        used_tb: +(cap.used / 1073741824).toFixed(1),
        free_tb: +(cap.free / 1073741824).toFixed(1),
        used_pct: Math.round((cap.used / cap.total) * 100),
        parity_ok: array.parities.every(p => p.status === "DISK_OK"),
      },
      disks: [
        ...array.disks.map(d => ({
          name: d.name, device: d.device, status: d.status,
          temp: d.temp, spinning: d.spinning, errors: d.errors,
          used_tb: d.fsUsed ? +(d.fsUsed / 1073741824).toFixed(1) : null,
          total_tb: d.fsSize ? +(d.fsSize / 1073741824).toFixed(1) : null,
          used_pct: d.fsSize ? Math.round((d.fsUsed / d.fsSize) * 100) : null,
          type: "disk" as const,
        })),
        ...array.caches.map(c => ({
          name: c.name, device: c.device, status: c.status,
          temp: c.temp, spinning: c.spinning, errors: c.errors,
          used_tb: c.fsUsed ? +(c.fsUsed / 1073741824).toFixed(1) : null,
          total_tb: c.fsSize ? +(c.fsSize / 1073741824).toFixed(1) : null,
          used_pct: c.fsSize ? Math.round((c.fsUsed / c.fsSize) * 100) : null,
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
