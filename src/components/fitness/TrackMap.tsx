"use client";

import { MapContainer, TileLayer, Polyline, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { FitTrackPoint } from "@/lib/fitness/fit-parser";
import type { FitnessProfile } from "@/lib/fitness/types";
import { hrZone } from "@/lib/fitness/profile";

interface Props {
  track: FitTrackPoint[];
  bounds: [number, number, number, number] | null;
  /** Höjd i px. Bredd följer container. */
  height?: number;
  /** Användarens zoner — behövs för färgkodning per pulsintervall. */
  zones?: FitnessProfile["zones"];
}

const ZONE_COLOR: Record<"Z1" | "Z2" | "Z3" | "Z4" | "Z5" | "none", string> = {
  Z1: "#a7c4ff",
  Z2: "#7fb8a3",
  Z3: "#fab849",
  Z4: "#ef8a5c",
  Z5: "#e5484d",
  none: "#fab849",
};

const ZONE_LABELS: Record<"Z1" | "Z2" | "Z3" | "Z4" | "Z5", string> = {
  Z1: "Mycket lätt",
  Z2: "Lätt",
  Z3: "Måttlig",
  Z4: "Hårt",
  Z5: "Mycket hårt",
};

/**
 * Plocka tomma segment av punkter med samma zon-färg, så vi kan rendera en
 * polyline per zon-sekvens i stället för en enda. Lägre DOM-antal än att
 * emittera två-punkts-polylines per steg, och tydligare färg-gradient.
 */
interface Segment { color: string; points: [number, number][] }

function segmentByZone(
  track: FitTrackPoint[],
  zones: FitnessProfile["zones"] | undefined,
): Segment[] {
  const segs: Segment[] = [];
  let current: Segment | null = null;

  for (const p of track) {
    if (!p.ll) continue;
    const z = zones && typeof p.hr === "number" ? hrZone(p.hr, zones) : null;
    const color = ZONE_COLOR[z ?? "none"];
    const prev: Segment | null = current;
    if (prev === null || prev.color !== color) {
      // Inled nytt segment men inkludera förra punkten för sömlös övergång
      const joiner = prev ? prev.points[prev.points.length - 1] : undefined;
      const next: Segment = { color, points: joiner ? [joiner, p.ll] : [p.ll] };
      segs.push(next);
      current = next;
    } else {
      prev.points.push(p.ll);
    }
  }
  return segs.filter((s) => s.points.length >= 2);
}

/**
 * GPS-spår på Carto Positron. Varje segment färgas efter pulszon (Z1→Z5 = blå→röd)
 * om `zones` anges. Annars enfärgad amber-linje.
 */
export default function TrackMap({ track, bounds, height = 260, zones }: Props) {
  const positions = track.filter((p) => p.ll).map((p) => p.ll as [number, number]);

  if (!bounds || positions.length === 0) {
    return (
      <div
        style={{
          height,
          borderRadius: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--color-surface-container)",
          color: "var(--color-on-surface-variant)",
          fontSize: 13,
        }}
      >
        Ingen GPS-data i FIT-filen
      </div>
    );
  }

  const [minLat, minLon, maxLat, maxLon] = bounds;
  const start = positions[0];
  const end = positions[positions.length - 1];
  const segments = zones ? segmentByZone(track, zones) : null;

  return (
    <div>
      <div
        style={{
          height,
          borderRadius: 16,
          overflow: "hidden",
          position: "relative",
        }}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <MapContainer
          // Unik key per pass så Leaflet inte försöker återanvända sin DOM-container
          // vid HMR / navigation mellan pass → undviker "Map container is being
          // reused by another instance"-felet.
          key={`${minLat.toFixed(4)},${minLon.toFixed(4)}`}
          bounds={[[minLat, minLon], [maxLat, maxLon]]}
          boundsOptions={{ padding: [20, 20] }}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%", backgroundColor: "var(--color-surface-container)" }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          {segments
            ? segments.map((seg, i) => (
                <Polyline
                  key={i}
                  positions={seg.points}
                  pathOptions={{ color: seg.color, weight: 5, opacity: 0.95, lineCap: "round", lineJoin: "round" }}
                />
              ))
            : (
                <Polyline
                  positions={positions}
                  pathOptions={{ color: "#fab849", weight: 4, opacity: 0.9 }}
                />
              )}
          <CircleMarker center={start} radius={6} pathOptions={{ color: "#ffffff", fillColor: "#2f8f3b", fillOpacity: 1, weight: 2 }} />
          <CircleMarker center={end} radius={6} pathOptions={{ color: "#ffffff", fillColor: "#e5484d", fillOpacity: 1, weight: 2 }} />
        </MapContainer>
      </div>
      {segments && (
        <div className="flex items-center gap-3 mt-3 flex-wrap" style={{ fontSize: 10 }}>
          {(["Z1", "Z2", "Z3", "Z4", "Z5"] as const).map((z) => (
            <div key={z} className="flex items-center gap-1.5">
              <span style={{ width: 18, height: 3, borderRadius: 2, backgroundColor: ZONE_COLOR[z] }} />
              <span style={{ color: "var(--color-on-surface-variant)" }}>{z} · {ZONE_LABELS[z]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
