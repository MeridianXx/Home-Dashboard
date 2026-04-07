// Media — Plex, arr-suite (Sonarr, Radarr, Prowlarr), nedladdningsklient.
// Mock-data för Fas 1. Real API-integration i Fas 2.

function Card({
  children,
  className = "",
  style = {},
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-2xl p-5 ${className}`}
      style={{
        backgroundColor: "var(--color-surface-container-lowest)",
        boxShadow: "0px 8px 24px rgba(56,56,51,0.06)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-widest mb-3"
      style={{ color: "var(--color-on-surface-variant)" }}>
      {children}
    </p>
  );
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
      style={{
        backgroundColor: ok ? "var(--color-secondary-container)" : "rgba(175,59,80,0.1)",
        color: ok ? "var(--color-secondary)" : "var(--color-error)",
      }}>
      {label}
    </span>
  );
}

// ─── Mock-data ────────────────────────────────────────────────────────────────

const PLEX_SESSIONS = [
  { user: "Adam", title: "Dune: Del Två", type: "film", progress: 42, quality: "4K HDR", player: "Apple TV" },
  { user: "Sara", title: "The Bear", episode: "S03E05", type: "serie", progress: 71, quality: "1080p", player: "iPhone" },
];

const PLEX_LIBRARIES = [
  { name: "Filmer", count: 1842, icon: "movie" },
  { name: "Serier", count: 312, icon: "tv" },
  { name: "Musik", count: 4210, icon: "music_note" },
  { name: "Foton", count: 28400, icon: "photo_library" },
];

const SONARR = [
  { title: "Severance", episode: "S03E01", status: "Övervakad", downloaded: false, airDate: "14 apr" },
  { title: "The Last of Us", episode: "S02E04", status: "Nedladdad", downloaded: true, airDate: "13 apr" },
  { title: "Andor", episode: "S02E06", status: "Nedladdad", downloaded: true, airDate: "22 apr" },
  { title: "House of the Dragon", episode: "S03E01", status: "Saknas", downloaded: false, airDate: "Okänd" },
];

const RADARR = [
  { title: "Sinners", year: 2025, status: "Övervakad", downloaded: false, quality: "Väntar på release" },
  { title: "Thunderbolts*", year: 2025, status: "Nedladdad", downloaded: true, quality: "4K Remux" },
  { title: "A Minecraft Movie", year: 2025, status: "Nedladdad", downloaded: true, quality: "1080p WEB" },
];

const DOWNLOADS = [
  { name: "Dune.Part.Two.2024.4K.BluRay.REMUX", size: "82 GB", progress: 100, status: "Klar", speed: "" },
  { name: "Severance.S03E01.2160p.WEB", size: "18 GB", progress: 67, status: "Laddar ned", speed: "45 MB/s" },
  { name: "The.Bear.S03.1080p.WEB-DL", size: "24 GB", progress: 12, status: "Laddar ned", speed: "38 MB/s" },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MediaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight font-headline"
          style={{ color: "var(--color-on-surface)" }}>
          Media
        </h1>
        <p className="text-sm font-medium mt-1" style={{ color: "var(--color-on-surface-variant)" }}>
          Plex · Sonarr · Radarr · nedladdningar
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Plex — aktiva sessioner */}
        <Card className="xl:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[20px]" style={{ color: "var(--color-primary)" }}>
              play_circle
            </span>
            <SectionLabel>Plex — aktiva sessioner</SectionLabel>
            <span className="ml-auto">
              <StatusBadge ok label="Online" />
            </span>
          </div>

          {PLEX_SESSIONS.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "var(--color-outline)" }}>
              Inga aktiva sessioner
            </p>
          ) : (
            <div className="space-y-3">
              {PLEX_SESSIONS.map(({ user, title, episode, type, progress, quality, player }) => (
                <div key={user} className="p-4 rounded-xl"
                  style={{ backgroundColor: "var(--color-surface-container)" }}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-sm font-bold" style={{ color: "var(--color-on-surface)" }}>
                        {title}
                        {episode && <span className="font-normal ml-1" style={{ color: "var(--color-on-surface-variant)" }}>{episode}</span>}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="material-symbols-outlined text-[14px]" style={{ color: "var(--color-outline)" }}>
                          {type === "film" ? "movie" : "tv"}
                        </span>
                        <span className="text-xs" style={{ color: "var(--color-outline)" }}>
                          {user} · {player} · {quality}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-bold shrink-0" style={{ color: "var(--color-primary)" }}>
                      {progress}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: "var(--color-surface-container-high)" }}>
                    <div className="h-full rounded-full"
                      style={{ width: `${progress}%`, backgroundColor: "var(--color-primary)" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Plex — bibliotek */}
        <Card>
          <SectionLabel>Bibliotek</SectionLabel>
          <div className="space-y-2">
            {PLEX_LIBRARIES.map(({ name, count, icon }) => (
              <div key={name} className="flex items-center justify-between p-3 rounded-xl"
                style={{ backgroundColor: "var(--color-surface-container)" }}>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]"
                    style={{ color: "var(--color-primary)" }}>{icon}</span>
                  <span className="text-sm font-medium" style={{ color: "var(--color-on-surface)" }}>{name}</span>
                </div>
                <span className="text-sm font-bold" style={{ color: "var(--color-on-surface-variant)" }}>
                  {count.toLocaleString("sv-SE")}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Sonarr */}
        <Card className="xl:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[20px]" style={{ color: "var(--color-secondary)" }}>
              tv
            </span>
            <SectionLabel>Sonarr — kommande avsnitt</SectionLabel>
            <span className="ml-auto">
              <StatusBadge ok label="Online" />
            </span>
          </div>
          <div className="space-y-2">
            {SONARR.map(({ title, episode, status, downloaded, airDate }) => (
              <div key={title + episode} className="flex items-center gap-3 p-3 rounded-xl"
                style={{ backgroundColor: "var(--color-surface-container)" }}>
                <span className="material-symbols-outlined text-[18px] shrink-0"
                  style={{ color: downloaded ? "var(--color-secondary)" : "var(--color-outline)" }}>
                  {downloaded ? "check_circle" : "schedule"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--color-on-surface)" }}>
                    {title}
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-outline)" }}>{episode}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold" style={{
                    color: downloaded ? "var(--color-secondary)" : status === "Saknas" ? "var(--color-error)" : "var(--color-on-surface-variant)"
                  }}>
                    {status}
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--color-outline)" }}>{airDate}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Radarr */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[20px]" style={{ color: "var(--color-tertiary)" }}>
              movie
            </span>
            <SectionLabel>Radarr — filmer</SectionLabel>
          </div>
          <div className="space-y-2">
            {RADARR.map(({ title, year, status, downloaded, quality }) => (
              <div key={title} className="flex items-start gap-3 p-3 rounded-xl"
                style={{ backgroundColor: "var(--color-surface-container)" }}>
                <span className="material-symbols-outlined text-[18px] mt-0.5 shrink-0"
                  style={{ color: downloaded ? "var(--color-secondary)" : "var(--color-outline)" }}>
                  {downloaded ? "check_circle" : "schedule"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--color-on-surface)" }}>
                    {title} <span className="font-normal text-xs" style={{ color: "var(--color-outline)" }}>({year})</span>
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-outline)" }}>{quality}</p>
                </div>
                <span className="text-xs font-bold shrink-0"
                  style={{ color: downloaded ? "var(--color-secondary)" : "var(--color-on-surface-variant)" }}>
                  {status}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Nedladdningar */}
        <Card className="xl:col-span-3">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[20px]" style={{ color: "var(--color-primary)" }}>
              download
            </span>
            <SectionLabel>Nedladdningar</SectionLabel>
            <span className="ml-auto text-xs font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
              83 MB/s totalt
            </span>
          </div>
          <div className="space-y-3">
            {DOWNLOADS.map(({ name, size, progress, status, speed }) => (
              <div key={name} className="p-3 rounded-xl"
                style={{ backgroundColor: "var(--color-surface-container)" }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold truncate flex-1 mr-4 font-mono"
                    style={{ color: "var(--color-on-surface)", fontSize: "0.8rem" }}>
                    {name}
                  </p>
                  <div className="flex items-center gap-3 shrink-0">
                    {speed && (
                      <span className="text-xs font-bold" style={{ color: "var(--color-primary)" }}>{speed}</span>
                    )}
                    <span className="text-xs" style={{ color: "var(--color-outline)" }}>{size}</span>
                    <StatusBadge ok={progress === 100} label={status} />
                  </div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden"
                  style={{ backgroundColor: "var(--color-surface-container-high)" }}>
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: progress === 100 ? "var(--color-secondary)" : "var(--color-primary)",
                    }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

      </div>
    </div>
  );
}
