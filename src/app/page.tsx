import { redirect } from "next/navigation";

// Root redirect — Warm Home v3 är primär (W6 cutover, 2026-04-29).
// v2-routes (/home, /garden, /fitness, /homelab) finns kvar i kod för rollback
// men är inte länkade. Pekas in via direktnavigering om något skulle behöva backas.
export default function RootPage() {
  redirect("/v3/home");
}
