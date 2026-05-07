// Debug-endpoint för att verifiera att Authelia/NPM vidarebefordrar
// rätt headers. Returnerar alla auth-relaterade request-headers som
// faktiskt når servern. Plocka bort när profilen funkar.

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getUserByEmail } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function GET() {
  const h = await headers();
  const allHeaders: Record<string, string> = {};
  h.forEach((value, key) => {
    allHeaders[key] = value;
  });

  const email = h.get("remote-email") ?? h.get("x-forwarded-email");
  const profile = getUserByEmail(email);

  return NextResponse.json({
    resolved: {
      email,
      name: profile.name,
      tabs: profile.tabs,
    },
    auth_headers: {
      "remote-email": h.get("remote-email"),
      "remote-user": h.get("remote-user"),
      "remote-name": h.get("remote-name"),
      "remote-groups": h.get("remote-groups"),
      "x-forwarded-email": h.get("x-forwarded-email"),
      "x-forwarded-user": h.get("x-forwarded-user"),
    },
    all_headers: allHeaders,
  });
}
