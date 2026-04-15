import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Nominatim kräver User-Agent och tillåter max 1 req/s. Vi cachar i minnet
// per (lat,lon) avrundad till 3 decimaler (~100 m) — en löprunda stannar i
// samma bucket så vi drar inte en extern request per omladdning av sidan.
interface GeocodeCacheEntry { timestamp: number; name: string | null; }
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h
const cache = new Map<string, GeocodeCacheEntry>();

interface NominatimResponse {
  address?: {
    hamlet?: string;
    neighbourhood?: string;
    quarter?: string;
    suburb?: string;
    village?: string;
    town?: string;
    city_district?: string;
    city?: string;
    municipality?: string;
    county?: string;
    state?: string;
  };
  name?: string;
}

function pickName(a: NominatimResponse): string | null {
  const r = a.address ?? {};
  // Välj den mest lokala klassen först — Nominatim returnerar alla som gäller.
  return (
    r.hamlet
    ?? r.neighbourhood
    ?? r.quarter
    ?? r.suburb
    ?? r.village
    ?? r.town
    ?? r.city_district
    ?? r.city
    ?? r.municipality
    ?? r.county
    ?? r.state
    ?? null
  );
}

/**
 * GET /api/fitness/geocode?lat=57.7&lon=12.7
 *   Returnerar närmaste tätort/by (suburb/village/town) via Nominatim.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const lat = url.searchParams.get("lat");
  const lon = url.searchParams.get("lon");
  if (!lat || !lon) return NextResponse.json({ error: "Ange lat och lon" }, { status: 400 });

  const key = `${Number(lat).toFixed(3)},${Number(lon).toFixed(3)}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ name: cached.name, cached: true });
  }

  try {
    // zoom=16 (suburb-nivå) ger mer lokala namn (Sjömarken) än zoom=14 (stadsnivå → Borås).
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2&zoom=16&accept-language=sv&addressdetails=1`;
    const res = await fetch(nominatimUrl, {
      headers: {
        // Nominatim's usage policy kräver en identifierande UA
        "User-Agent": "inicio-home-dashboard/1.0 (https://dash.inicio.cloud)",
        "Accept-Language": "sv",
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);
    const data = (await res.json()) as NominatimResponse;
    const name = pickName(data);
    cache.set(key, { timestamp: Date.now(), name });
    return NextResponse.json({ name, cached: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ name: null, error: message }, { status: 200 });
  }
}
