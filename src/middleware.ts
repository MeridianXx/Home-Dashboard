import { NextResponse, type NextRequest } from "next/server";

// ─── Server-side auth-guard ──────────────────────────────────────────────────
// Hela dashboarden sitter bakom Authelia + Nginx Proxy Manager. NPM sätter
// `Remote-Email` (Authelia /api/verify-respons via auth_request_set) eller
// `X-Forwarded-Email` på inkommande request. Saknas båda i prod → 401.
//
// VIKTIGT — NPM-config: `proxy_set_header Remote-Email "";` MÅSTE finnas
// före auth_request så att en remote attacker inte kan sätta headern själv
// och spoofa identitet. Authelia injicerar sedan headern på nytt vid
// auth-success. Utan strippen är hela auth-guarden bypassbar.
//
// Dev: NODE_ENV=development → bypass (Authelia kör inte lokalt).
// Cron: /api/fitness/weekly-summary har egen secret-gate (x-weekly-secret),
// så middleware hoppar den så GitHub Actions kommer åt.

const SKIP_AUTH = new Set<string>([
  "/api/fitness/weekly-summary",
]);

export function middleware(req: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }

  if (SKIP_AUTH.has(req.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const email =
    req.headers.get("remote-email") ??
    req.headers.get("x-forwarded-email");

  if (!email || !email.includes("@")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  // Skippa Next-interna asset-paths. Allt annat (sidor + API) går igenom.
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
