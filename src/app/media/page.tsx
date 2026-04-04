import DashboardShell from "@/components/layout/DashboardShell";

function Card({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-[1.25rem] p-6 ${className}`}
      style={{ backgroundColor: "var(--color-surface-container-lowest)", boxShadow: "0px 12px 32px rgba(56,56,51,0.06)", ...style }}
    >
      {children}
    </div>
  );
}

const recentMovies = ["Poor Things", "Oppenheimer", "The Bear", "Elemental"];

const sonosSpeakers = [
  { room: "Kitchen", playing: true, track: "Midnight City", artist: "M83 • Hurry Up, We're Dreaming" },
  { room: "Office", playing: false, track: null, artist: null },
];

const appleTVs = [
  { name: "Bedroom Apple TV", active: true, app: "Netflix" },
  { name: "Patio Apple TV", active: false, app: "Standby" },
];

const mediaServices = [
  { name: "Sonarr", icon: "tv", episodes: 4, label: "Downloading" },
  { name: "Radarr", icon: "movie", episodes: 2, label: "Queued" },
];

export default function MediaPage() {
  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="text-4xl font-extrabold tracking-tight font-headline" style={{ color: "var(--color-on-surface)" }}>
          Media Center
        </h1>
        <p className="font-medium mt-1" style={{ color: "var(--color-on-surface-variant)" }}>
          Orchestrating local and cloud streaming services
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Plex — spans 2 cols */}
        <section className="xl:col-span-2 space-y-4">
          <div className="flex items-center gap-2 px-1">
            <span className="material-symbols-outlined" style={{ color: "var(--color-tertiary)" }}>stadium</span>
            <h2 className="text-lg font-bold font-headline" style={{ color: "var(--color-on-surface)" }}>Plex Media Server</h2>
          </div>
          <Card>
            {/* Now Playing */}
            <div className="flex gap-4 items-start mb-6">
              <div
                className="w-24 h-36 rounded-xl flex-shrink-0 flex items-center justify-center"
                style={{ backgroundColor: "var(--color-surface-container)", aspectRatio: "2/3" }}
              >
                <span className="material-symbols-outlined text-4xl opacity-20" style={{ color: "var(--color-on-surface)" }}>movie</span>
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest block mb-1" style={{ color: "var(--color-primary)" }}>Now Playing</span>
                  <h3 className="font-bold text-xl leading-tight font-headline" style={{ color: "var(--color-on-surface)" }}>Dune: Part Two</h3>
                  <p className="text-xs italic" style={{ color: "var(--color-on-surface-variant)" }}>Playing on Living Room TV • 4K HDR</p>
                </div>
                <div>
                  <div
                    className="h-1.5 w-full rounded-full overflow-hidden"
                    style={{ backgroundColor: "var(--color-surface-container-high)" }}
                  >
                    <div className="h-full rounded-full" style={{ width: "66%", backgroundColor: "var(--color-primary)" }} />
                  </div>
                  <div className="flex justify-between text-[10px] font-medium mt-1" style={{ color: "var(--color-on-surface-variant)" }}>
                    <span>01:42:05</span>
                    <span>02:46:00</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent additions */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-4" style={{ color: "var(--color-on-surface-variant)" }}>
                Recent Additions
              </p>
              <div className="grid grid-cols-4 gap-3">
                {recentMovies.map((title) => (
                  <div key={title} className="space-y-1">
                    <div
                      className="aspect-[2/3] rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: "var(--color-surface-container)" }}
                    >
                      <span className="material-symbols-outlined text-2xl opacity-20" style={{ color: "var(--color-on-surface)" }}>movie</span>
                    </div>
                    <p className="text-[10px] font-semibold truncate" style={{ color: "var(--color-on-surface)" }}>{title}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </section>

        {/* Sonos */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <span className="material-symbols-outlined" style={{ color: "var(--color-secondary)" }}>speaker_group</span>
            <h2 className="text-lg font-bold font-headline" style={{ color: "var(--color-on-surface)" }}>Sonos Audio</h2>
          </div>
          <div className="space-y-4">
            {sonosSpeakers.map(({ room, playing, track, artist }) => (
              <Card key={room} className={playing ? "" : "opacity-60"}>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold" style={{ color: "var(--color-on-surface)" }}>{room}</span>
                  <div className="flex gap-2">
                    {playing && (
                      <>
                        <button className="material-symbols-outlined text-lg" style={{ color: "var(--color-on-surface-variant)" }}>skip_previous</button>
                        <button className="material-symbols-outlined text-lg" style={{ color: "var(--color-primary)", fontVariationSettings: "'FILL' 1" }}>pause_circle</button>
                        <button className="material-symbols-outlined text-lg" style={{ color: "var(--color-on-surface-variant)" }}>skip_next</button>
                      </>
                    )}
                    {!playing && (
                      <button className="material-symbols-outlined text-lg" style={{ color: "var(--color-on-surface-variant)" }}>play_circle</button>
                    )}
                  </div>
                </div>
                {playing && track ? (
                  <>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg flex-shrink-0" style={{ backgroundColor: "var(--color-surface-container)" }} />
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold truncate" style={{ color: "var(--color-on-surface)" }}>{track}</p>
                        <p className="text-[10px] truncate" style={{ color: "var(--color-on-surface-variant)" }}>{artist}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-sm" style={{ color: "var(--color-on-surface-variant)" }}>volume_down</span>
                      <div className="flex-1 h-1 rounded-full relative" style={{ backgroundColor: "var(--color-surface-container)" }}>
                        <div className="absolute left-0 top-0 h-full w-2/5 rounded-full" style={{ backgroundColor: "var(--color-on-surface)" }} />
                      </div>
                      <span className="material-symbols-outlined text-sm" style={{ color: "var(--color-on-surface-variant)" }}>volume_up</span>
                    </div>
                  </>
                ) : (
                  <p className="text-[11px] text-center py-2" style={{ color: "var(--color-on-surface-variant)" }}>Nothing playing in this room</p>
                )}
              </Card>
            ))}
          </div>
        </section>

        {/* Apple TV + Management */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <span className="material-symbols-outlined" style={{ color: "var(--color-primary)" }}>tv</span>
            <h2 className="text-lg font-bold font-headline" style={{ color: "var(--color-on-surface)" }}>Apple TV Units</h2>
          </div>
          <div className="space-y-3">
            {appleTVs.map(({ name, active, app }) => (
              <Card
                key={name}
                className="flex items-center justify-between"
                style={{ borderLeft: active ? "4px solid var(--color-primary)" : undefined }}
              >
                <div>
                  <h3 className="text-xs font-bold" style={{ color: active ? "var(--color-on-surface)" : "var(--color-on-surface-variant)" }}>{name}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: active ? "var(--color-secondary)" : "var(--color-outline-variant)" }}
                    />
                    <span className="text-[10px] font-medium uppercase" style={{ color: "var(--color-on-surface-variant)" }}>{app}</span>
                  </div>
                </div>
                <span
                  className="material-symbols-outlined"
                  style={{ color: active ? "var(--color-primary)" : "var(--color-outline-variant)" }}
                >
                  {active ? "cast_connected" : "power_settings_new"}
                </span>
              </Card>
            ))}
          </div>

          <div className="flex items-center gap-2 px-1 mt-6">
            <span className="material-symbols-outlined" style={{ color: "var(--color-error)" }}>cloud_download</span>
            <h2 className="text-lg font-bold font-headline" style={{ color: "var(--color-on-surface)" }}>Management</h2>
          </div>
          <div className="space-y-3">
            {mediaServices.map(({ name, icon, episodes, label }) => (
              <Card key={name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined" style={{ color: "var(--color-primary)" }}>{icon}</span>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "var(--color-on-surface)" }}>{name}</p>
                    <p className="text-[10px]" style={{ color: "var(--color-on-surface-variant)" }}>{episodes} items {label.toLowerCase()}</p>
                  </div>
                </div>
                <span
                  className="text-[10px] font-bold px-2 py-1 rounded"
                  style={{ backgroundColor: "rgba(71,91,194,0.1)", color: "var(--color-primary)" }}
                >
                  {label.toUpperCase()}
                </span>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
