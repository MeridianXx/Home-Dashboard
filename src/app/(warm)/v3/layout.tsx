// Server-wrapper som läser Authelia-header (`X-Forwarded-Email`) och slår upp
// användarprofilen. Klient-shellen (`WarmV3Chrome`) får profilen som prop och
// exponerar den via `WarmUserProvider` så HubHeading + TabBar/Sidebar kan
// filtrera tabs och visa namnet. Saknad header → `DEFAULT_USER` (Adam, full
// åtkomst) — det matchar dev-flödet utan Authelia.

import { headers } from "next/headers";
import type { ReactNode } from "react";
import WarmV3Chrome from "./chrome";
import { getUserByEmail } from "@/lib/users";
import { DESKTOP_BREAKPOINT } from "@/lib/warm/theme";

export default async function WarmV3Layout({
  children,
}: {
  children: ReactNode;
}) {
  const h = await headers();
  const email = h.get("x-forwarded-email");
  const user = getUserByEmail(email);
  return <WarmV3Chrome user={user}>{children}</WarmV3Chrome>;
}

export { DESKTOP_BREAKPOINT };
