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

function buildWebUi(port: number): string {
  const proto = port === 443 || port === 9443 || port === 8443 ? "https" : "http";
  return `${proto}://${DOCKER_HOST}:${port}`;
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

        return {
          id: c.Id.slice(0, 12),
          name: c.Names[0]?.replace(/^\//, "") ?? "?",
          state: c.State,
          status: c.Status,
          ports,
          // Primary webUI: prefer non-80/443 admin ports (e.g. 81 for NPM, 9443 for Portainer)
          webui: ports.find(p => p.public !== 80 && p.public !== 443)?.webui
            ?? ports[0]?.webui
            ?? null,
        };
      }),
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}
