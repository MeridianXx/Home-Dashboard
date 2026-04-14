/**
 * Skickar en HA-action via Next.js API-route.
 * Kastar ett Error om servern svarar med icke-ok status.
 */
export async function callAction(
  domain: string,
  service: string,
  entity_id: string | string[],
  service_data?: Record<string, unknown>,
): Promise<void> {
  const res = await fetch("/api/homeassistant/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain, service, entity_id, service_data }),
  });
  if (!res.ok) throw new Error(`${domain}.${service} misslyckades: ${res.status}`);
}
