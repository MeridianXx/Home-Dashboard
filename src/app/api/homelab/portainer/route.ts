import https from "node:https";

const BASE = process.env.PORTAINER_URL ?? "https://192.168.1.24:9443";
const TOKEN = process.env.PORTAINER_API_TOKEN ?? "";
const ENDPOINT_ID = process.env.PORTAINER_ENDPOINT_ID ?? "3";

// Derive the docker host IP from the Portainer URL
const DOCKER_HOST = (() => {
  try { return new URL(BASE).hostname; } catch { return "192.168.1.24"; }
})();

function portainerGet(path: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE}${path}`);
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: "GET",
        headers: { "X-API-Key": TOKEN },
        rejectUnauthorized: false,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(e); }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

type DockerPort = { IP?: string; PrivatePort: number; PublicPort?: number; Type: string };

type DockerContainer = {
  Id: string;
  Names: string[];
  Image: string;
  State: string;
  Status: string;
  Ports: DockerPort[];
};

// Ports that are internal/agent ports and should never be shown as web UIs
const SKIP_PORTS = new Set([8000, 8001]);

function buildWebUi(port: number): string {
  const proto = port === 443 || port === 9443 || port === 8443 ? "https" : "http";
  return `${proto}://${DOCKER_HOST}:${port}`;
}

// 80/443 are almost always reverse-proxy pass-through ports — use only as last resort
const PROXY_PORTS = new Set([80, 443]);

function pickBestPort(ports: Array<{ public: number; private: number; webui: string }>) {
  const candidates = ports.filter(p => !SKIP_PORTS.has(p.public));
  if (!candidates.length) return null;

  // Prefer non-proxy ports; within those, prefer HTTPS admin ports (9443, 8443)
  const preferred = candidates.filter(p => !PROXY_PORTS.has(p.public));
  const pool = preferred.length ? preferred : candidates;

  return pool.sort((a, b) => {
    const httpsA = a.public === 9443 || a.public === 8443;
    const httpsB = b.public === 9443 || b.public === 8443;
    if (httpsA && !httpsB) return -1;
    if (!httpsA && httpsB) return 1;
    return 0;
  })[0];
}

export async function GET() {
  if (!TOKEN) {
    return Response.json({ error: "PORTAINER_API_TOKEN saknas" }, { status: 503 });
  }

  try {
    const containers = await portainerGet(
      `/api/endpoints/${ENDPOINT_ID}/docker/containers/json?all=0`
    ) as DockerContainer[];

    return Response.json({
      containers: containers.map((c) => {
        // Deduplicate ports (Portainer returns each port twice for IPv4+IPv6)
        const seen = new Set<number>();
        const ports = c.Ports
          .filter(p => p.PublicPort && p.Type === "tcp" && !seen.has(p.PublicPort!) && seen.add(p.PublicPort!))
          .map(p => ({ public: p.PublicPort!, private: p.PrivatePort, webui: buildWebUi(p.PublicPort!) }));

        const best = pickBestPort(ports);

        return {
          id: c.Id.slice(0, 12),
          name: c.Names[0]?.replace(/^\//, "") ?? "?",
          state: c.State,
          status: c.Status,
          ports,
          webui: best?.webui ?? null,
          webuiLabel: best ? `${DOCKER_HOST}:${best.public}` : null,
        };
      }),
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}
