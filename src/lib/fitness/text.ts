// ─── Fitness · Text-utils ────────────────────────────────────────────────────
// Notion-fält som rör fritext (passdetaljer, syfte, etc.) lagras ibland med
// literala "\n"-sekvenser (backslash + bokstaven n) istället för faktiska
// newlines — vanligast när AI-genererade förslag skickas in via API:t med
// JSON-escapad text utan att avescapas innan persist. Konsekvens: render med
// `whiteSpace: pre-wrap` bryter inte raderna, och `text.split(/\n/)` hittar
// ingen radbrytning.
//
// `unescapeNewlines()` återställer faktiska newlines. Säkert eftersom svensk
// löpande text aldrig innehåller `\n`-sekvensen meningsfullt — om en sådan
// finns är det med 99,99 % sannolikhet en escape som ska tolkas.

export function unescapeNewlines(s: string | undefined | null): string {
  if (!s) return "";
  return s.replace(/\\n/g, "\n");
}
