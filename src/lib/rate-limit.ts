// ─── In-memory rate limiter ─────────────────────────────────────────────────
// Skyddar dyra AI-endpoints (Claude-anrop) mot en runaway-bot eller fastnande
// klient som loop:ar refresh. Single-container deploy → ett process-state
// räcker. Skalas vi nånsin till flera instanser måste detta flyttas till
// Redis e.dyl. (per-instans buckets ger ineffektiv enforcement).
//
// Identitet bygger på `remote-email`/`x-forwarded-email`-headern som Authelia
// sätter. Saknas båda (dev, eller om middleware släpper igenom) faller vi
// tillbaka på `unknown` — gemensam bucket för alla anonyma, vilket är mer
// restriktivt än per-email.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfter: number };

export function checkRateLimit(
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return { ok: true };
  }

  if (bucket.count >= options.limit) {
    return {
      ok: false,
      retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count++;
  return { ok: true };
}

function getIdentity(req: Request): string {
  return (
    req.headers.get("remote-email") ??
    req.headers.get("x-forwarded-email") ??
    "unknown"
  );
}

// Returnera en 429-respons om limit:en överskrids, annars null så caller
// fortsätter med sin riktiga logik.
export async function rateLimitOr429(
  req: Request,
  route: string,
  options: RateLimitOptions
): Promise<Response | null> {
  const key = `${route}:${getIdentity(req)}`;
  const result = checkRateLimit(key, options);
  if (result.ok) return null;
  return Response.json(
    { error: "För många anrop, vänta lite", retryAfter: result.retryAfter },
    {
      status: 429,
      headers: { "Retry-After": String(result.retryAfter) },
    }
  );
}

// Standardprofiler så vi inte upprepar limit-värden överallt.
export const RATE_LIMIT_AI_CHAT: RateLimitOptions = {
  limit: 30,
  windowMs: 5 * 60_000,
};
export const RATE_LIMIT_AI_EXPENSIVE: RateLimitOptions = {
  limit: 10,
  windowMs: 5 * 60_000,
};
export const RATE_LIMIT_AI_CACHED: RateLimitOptions = {
  limit: 20,
  windowMs: 5 * 60_000,
};

// Städa bort utgångna buckets så minnet inte växer obegränsat över tid.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt < now) buckets.delete(key);
    }
  }, 60_000).unref?.();
}
