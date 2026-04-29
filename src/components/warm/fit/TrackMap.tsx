"use client";

// ─── Warm Home · Fitness · TrackMap ──────────────────────────────────────────
// Leaflet-baserad karta med Carto Positron-tiles. Polyline färgad per pulszon.
// Måste laddas client-side (inga ssr-imports från denna fil).

import { MapContainer, TileLayer, Polyline, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { FitTrackPoint } from "@/lib/fitness/fit-parser";
import type { FitnessProfile } from "@/lib/fitness/types";
import { hrZone } from "@/lib/fitness/profile";
import { useWarmTheme } from "@/lib/warm/theme";
import { ACC, body, ital } from "@/lib/warm/tokens";
import { zoneColor as zoneClr, zoneLabel as zoneLbl } from "@/lib/warm/fit";

interface Props {
  track: FitTrackPoint[];
  bounds: [number, number, number, number] | null;
  height?: number;
  zones?: FitnessProfile["zones"];
}

interface Segment {
  color: string;
  points: [number, number][];
}

function segmentByZone(track: FitTrackPoint[], zones: FitnessProfile["zones"] | undefined): Segment[] {
  const segs: Segment[] = [];
  let current: Segment | null = null;
  for (const p of track) {
    if (!p.ll) continue;
    const z = zones && typeof p.hr === "number" ? hrZone(p.hr, zones) : null;
    const color = z ? zoneClr(z) : ACC;
    if (current === null || current.color !== color) {
      const joiner = current ? current.points[current.points.length - 1] : undefined;
      const next: Segment = { color, points: joiner ? [joiner, p.ll] : [p.ll] };
      segs.push(next);
      current = next;
    } else {
      current.points.push(p.ll);
    }
  }
  return segs.filter((s) => s.points.length >= 2);
}

export default function WarmTrackMap({ track, bounds, height = 260, zones }: Props) {
  const { t } = useWarmTheme();
  const positions = track.filter((p) => p.ll).map((p) => p.ll as [number, number]);

  if (!bounds || positions.length === 0) {
    return (
      <div
        style={{
          height,
          borderRadius: 14,
          background: t.paperHi,
          border: `1px solid ${t.line}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: t.mute,
          fontFamily: body,
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
          borderRadius: 14,
          overflow: "hidden",
          position: "relative",
          background: t.paperHi,
          border: `1px solid ${t.line}`,
        }}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <MapContainer
          key={`${minLat.toFixed(4)},${minLon.toFixed(4)}`}
          bounds={[
            [minLat, minLon],
            [maxLat, maxLon],
          ]}
          boundsOptions={{ padding: [20, 20] }}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%", background: t.paperHi }}
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
              <Polyline positions={positions} pathOptions={{ color: ACC, weight: 4, opacity: 0.9 }} />
            )}
          <CircleMarker
            center={start}
            radius={6}
            pathOptions={{ color: "#FFFBF0", fillColor: "#7A9475", fillOpacity: 1, weight: 2 }}
          />
          <CircleMarker
            center={end}
            radius={6}
            pathOptions={{ color: "#FFFBF0", fillColor: "#A83E4A", fillOpacity: 1, weight: 2 }}
          />
        </MapContainer>
      </div>
      {segments ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
          {(["Z1", "Z2", "Z3", "Z4", "Z5"] as const).map((z) => (
            <div key={z} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 16, height: 3, borderRadius: 2, background: zoneClr(z) }} />
              <span style={{ ...ital(t, 10) }}>
                {z} · {zoneLbl(z)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
