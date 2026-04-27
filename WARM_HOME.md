# Warm Home — Dashboard v3

> Parallell visuell + arkitektonisk omdesign av Villa Björkdalen, baserad på `Warm Home — Mobile v4`-prototypen från Claude Design (apr 2026).
>
> **Detta dokument är single source of truth för Warm Home-arbetet.** AGENTS.md fortsätter beskriva v2 (nuvarande, dagligen använd dashboard). Den här filen ska auto-laddas på `warm-home`-branchen via `@WARM_HOME.md` i AGENTS.md.

---

## Branch + route-strategi

- **Branch:** `warm-home`, utgår från `v2`. Mergas inte tillbaka förrän hela bytet är komplett.
- **Route-strategi:** parallell route-grupp `src/app/(warm)/` med egen `layout.tsx` och egen `globals.warm.css`. Alla Warm Home-routes ligger under prefix `/v3/...` (t.ex. `/v3/home`, `/v3/lab/host/proxmox`).
- **v2-routes (`/home`, `/garden`, `/fitness`, `/homelab`) rörs INTE under bygget.** Daglig användning fortsätter på v2 tills v3 är komplett.
- **Cutover:** sista session (W6) flippar root-redirect så `/` → `/v3/home` istället för `/home`. v2-koden kan rip:as i en separat städning EFTER att v3 körts skarpt en period.
- **Deploy:** samma image, samma `dash.inicio.cloud`, samma GitHub Actions. Inga env-vars läggs till — Warm Home använder samma backend som v2.

---

## Designtokens (verbatim från `Warm Home - Mobile v4.html`)

```ts
// src/lib/warm/tokens.ts
export const ACC    = '#C96F4A';   // terracotta — primärt accent
export const SAGE   = '#7A9475';   // ok, växter, lugn
export const LINGON = '#A83E4A';   // hård varning
export const AMBER  = '#D9954B';   // coach, observera
export const SKY    = '#6E8AA6';   // info, blå nyans

export const lightT = {
  bg:'#F5EEDE', paper:'#FBF6EA', paperHi:'#FFFBF0', line:'#E5DAC0',
  ink:'#2B241B', mute:'#6E6456', dim:'#9C907B',
  ok:'#5A7F4A', bad:'#B0452E', warn:'#B87823',
  tint:'rgba(201,111,74,0.12)', tintSage:'rgba(122,148,117,0.14)',
  tintAmber:'rgba(217,149,75,0.14)', tintSky:'rgba(110,138,166,0.14)',
};
export const darkT = {
  bg:'#1A1712', paper:'#221E18', paperHi:'#2B2620', line:'#3A332B',
  ink:'#F3ECDE', mute:'#B5AA95', dim:'#7A7163',
  ok:'#8FAE70', bad:'#D17A6B', warn:'#E0A455',
  tint:'rgba(201,111,74,0.18)', tintSage:'rgba(122,148,117,0.18)',
  tintAmber:'rgba(217,149,75,0.20)', tintSky:'rgba(110,138,166,0.18)',
};
```

**Typografi:** `Fraunces` (serif, display + ital tail) + `DM Sans` (body, lab-caps, tabular nums). Båda via `next/font/google` parallellt med befintliga Syne+Inter (som blir kvar för v2).

```ts
const serif = `"Fraunces", Georgia, serif`;
const body  = `"DM Sans", system-ui, sans-serif`;

// Text-helpers (returnerar style-objekt — ingen Tailwind-utility, alla inline)
const lab  = (t, e={}) => ({ fontFamily:body, fontSize:10, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:t.mute, ...e });
const num  = (t, s, w=400) => ({ fontFamily:serif, fontSize:s, fontWeight:w, letterSpacing:'-0.02em', color:t.ink });
const ital = (t, s=12, c) => ({ fontFamily:serif, fontStyle:'italic', fontSize:s, color:c||t.mute, fontWeight:400 });
```

**Geometri:** tile-radius 14px · floating tab-pill 26px · 1px borders med `t.line` · 1.5–1.6px stroke på SVG-glyfer.

**`globals.warm.css`** definierar Warm-tokens via Tailwind v4 `@theme` så vi kan använda både inline-style (vanligaste) och className där det passar.

---

## Designprinciper (icke-förhandlingsbara)

1. **Inga sub-tabs.** Hub-skärmen ÄR navigationen. Korten = dörrar.
2. **Drill-down med back-chevron i header** ("‹ Hem"). Funktionellt — måste navigera tillbaka. Ingen sub-router-state.
3. **Bottom-pillen är alltid synlig**, även på detaljskärmar (4 tabs, glasmorf, 22px från botten).
4. **Klimat har INGEN egen tab.** Lever på Hem-hubben (väderkort + rum-rad med temperatur). Per-rum-klimat ligger på rum-detaljen.
5. **Belysningsscener är en rad direkt på Hem-hubben.** Sex pills (Morgon/Dag/Kväll/Natt/Film/Borta), aktiv scen är fylld terracotta.
6. **Estetiken är låst.** Inga "förbättringar" av typografi/palett/spacing. Disciplin > kreativitet. Detalj-skärmarna är där vi får uppfinna inom språket — inte bredvid det.
7. **Inline-style för all visuell tuning.** Tailwind-utilities används bara där de inte stör. Anledning: `tw.css`-builden i repon hanterar inte alla utility-kombinationer på mobil (se AGENTS.md "Kritiska tekniska regler").
8. **Material Symbols ersätts med egna SVG-glyfer** i Warm Home. 1.5–1.6px stroke, outline, 13–22px storlek. Varje sektion får ett litet eget set (TabIcon, SceneGlyph, CareIcon, PlantGlyph etc.) — håll dem i `src/components/warm/icons/`.

---

## IA-mappning v2 → Warm Home

| v2-route | Warm Home-route | Anteckning |
|---|---|---|
| `/home` | `/v3/home` | Hub. Innehåller väderkort, scener, Tibber+bilar, rum-rad. |
| `/home/lighting` | `/v3/home/belysning` | Drill-down från "se alla"-länk. Behåller våning-grupperingen + "släck allt". |
| `/home/lighting` (per rum) | `/v3/home/rum/[slug]` | Drill-down från rum-rad på hubben. Master-dimmer + per-lampa + klimat-strip + senaste-aktivitet. |
| `/home/media` | `/v3/home/media` | Drill-down. Sonos + Apple TV med albumart + volym. |
| `/homelab` | `/v3/lab` | Hub. Tillstånd, hosts som tappable cards, services-strip. |
| `/homelab` (Proxmox-block) | `/v3/lab/host/proxmox` | Drill-down. Ringar, containrar, actions. |
| `/homelab` (Unraid-block) | `/v3/lab/host/unraid` | Drill-down. Array, cache pools, disktemp. |
| `/homelab/media` | `/v3/lab/services` *(eller absorberas)* | Beslut i W2: egen sida eller bara strip på hub. |
| `/fitness` | `/v3/fitness` | Hub. Readiness-ring, dagens pass, vecka, streak, coach-tagline. |
| `/fitness/pass/[slug]` | `/v3/fitness/pass/[slug]` | Drill-down. Karta + grafer + AI-analys i Warm-stil. |
| `/fitness/coach` | `/v3/fitness/coach` | Egen skärm (kalender + CRUD + AI-planering). Ingen hub-detalj-relation, men drill-down från "kommande pass"-länk på hubben. |
| `/fitness/history` | `/v3/fitness/historik` | Egen skärm (paginerad + typ-filter). Drill-down från "all historik" på hubben. |
| `/garden` | `/v3/garden` | Hub. Säsong-klocka + växtlista + AI-prompt. AI-briefing-hero. |
| `/garden/vaxter` | `/v3/garden/vaxter` | Drill-down. Full grid med typ/plats-filter. |
| `/garden/vaxter/[id]` | `/v3/garden/vaxt/[id]` | Drill-down. Livscykel + skötsel + anteckningar + per-växt AI. |
| `/garden/sasongsplan` | `/v3/garden/sasong` | Drill-down. Kalender/lista/per växt + CRUD-modal. |
| `/garden/projekt` | `/v3/garden/projekt` | Drill-down. Kanban i terracotta/sage. |
| `/garden/ai` | `/v3/garden/ai` | Drill-down. Streaming-chat + tools + bilder. |

---

## Öppna designfrågor (svaras inom respektive session)

- **W0:** Var bor theme-toggle (dark/light) i Warm Home? Förslag: liten ikon i toppen av Hem-hubben + replikering på alla hubbar, eller dold under en profilmeny.
- **W1:** Pull-to-refresh — Warm Home-stilad spinner + "uppdaterat"-bekräftelse. Färg = SAGE eller ACC?
- **W1:** Expand/collapse-animationer (rumlistor) — `AnimatePresence` med samma height/opacity-mönster som v2 men i Warm-färgskala.
- **W2:** "Services-strip" på Lab-hub — bara namn + status-prick, eller ska den inkludera latency/CPU mini-bars?
- **W3:** Coach-kalendern (CRUD-modal) — modal-portal i Warm-stil. Backdrop-färg + tile-stil för modal-content.
- **W4:** Garden-AI-chat — chat-bubblor i Warm-stil. User-bubbla i terracotta, assistant i `paperHi`?
- **W5:** Desktop — sidebar bredd, hub-och-detalj som två kolumner eller bara hub + drill till full skärm?
- **W6:** Theme-toggle persisterar lokalt eller följer system-pref? V2 har egen toggle — vi gör samma.

---

## Sessionsplan

Varje session är **en egen chatt**, en egen commit-cykel, eget acceptance-test. Lessons learned skrivs tillbaka in i denna fil under respektive session-block (`Observera:` likt AGENTS.md-mönstret).

### Session W0 — Setup (branch, fonts, tokens, primitiver)
**Mål:** En tom, bootbar `/v3/home`-route som visar bara "Hello Warm Home" med rätt fonts + tokens laddade. Inget UI än.

**Levererar:**
- [ ] Skapar branch `warm-home` från `v2`, pushar till origin
- [ ] Lägger `@WARM_HOME.md` på toppen av `AGENTS.md` (bara på warm-home-branchen)
- [ ] `next/font/google`: lägger till Fraunces (300/400/500/600 + ital 300/400/500) + DM Sans (400/500/600/700) i `src/app/layout.tsx` parallellt med Syne+Inter
- [ ] Skapar `src/app/(warm)/layout.tsx` som sätter `font-warm` CSS-variabel
- [ ] Skapar `src/app/(warm)/globals.warm.css` med Warm-tokens via `@theme` (eller importerar tokens.ts via inline-style — beslut i sessionen)
- [ ] Skapar `src/lib/warm/tokens.ts` med ACC/SAGE/AMBER/LINGON/SKY + lightT/darkT + lab/num/ital text-helpers
- [ ] Skapar `src/lib/warm/theme.ts` med `useWarmTheme()` hook (returnerar `{ t, dark, setDark }`)
- [ ] Skapar `src/components/warm/primitives.tsx` med Tile, Pill, Stat, Bar, HubHeader, DetailHeader, TabBar, Spark, Ring
- [ ] Skapar `src/components/warm/icons/` med TabIcon (hem/lab/fit/gard) + grundläggande SceneGlyph
- [ ] `src/app/(warm)/v3/home/page.tsx` med en placeholder som visar tokens (alla färger som swatches + typografi-prov)
- [ ] Verifiera i `preview_start("home-dashboard")` att `/v3/home` renderar utan SSR/hydration-fel

**Acceptance:** öppna `/v3/home` i preview, se en token-prov-sida med rätt fonter och färger i både light + dark. v2-routes (`/home`, `/garden`, etc.) ska fortfarande funka oförändrat.

**Observera (skrivs efter sessionen):**
*tomt — fylls vid avslut*

---

### Session W1 — Hem-spåret (hub + belysning + media + rum-detalj)
**Mål:** Hela Hem-sektionen i Warm Home, mot riktig HA-data.

**Levererar:**
- [ ] `(warm)/v3/home/page.tsx` — `HemHub` mot `/api/homeassistant/{weather,sensors,scenes,lights,energy,cars}`
- [ ] `(warm)/v3/home/rum/[slug]/page.tsx` — generisk rum-detalj (master-dimmer-ring, per-lampa-lista med slider, klimat-strip 3-stat, senaste-aktivitet från HA history). Slugs matchar v2:s rumindelning (vardagsrum/kok/sovrum/etc.).
- [ ] `(warm)/v3/home/belysning/page.tsx` — full våningsindelad lampgrid + scener + "släck allt" i Warm-stil
- [ ] `(warm)/v3/home/media/page.tsx` — Sonos per rum + Apple TV (albumart-proxy via befintlig `/api/homeassistant/image`)
- [ ] Återanvänder ErrorBanner-mönstret från v2 (skapar Warm-variant: `WarmErrorBanner.tsx`)
- [ ] Pull-to-refresh i Warm-stil (Fraunces "uppdaterat" + SAGE-bock)
- [ ] Verifiera scen-aktiv-detektion fungerar (`detectActiveScene` från `src/lib/scenes.ts` är data-only, oförändrad)

**Acceptance:** Hem-tab klar i Warm Home med riktig data. Drill-down från rum-rad → rum-detalj → tillbaka funkar. Light/dark-toggle bevaras mellan navigationer.

**Observera:** *tomt*

---

### Session W2 — Lab-spåret (hub + Proxmox + Unraid)
**Mål:** Hela Homelab-sektionen i Warm Home.

**Levererar:**
- [ ] `(warm)/v3/lab/page.tsx` — `LabHub` med tillstånds-card, hosts (Proxmox/Unraid/eventuellt TrueNAS om det finns), services-strip
- [ ] `(warm)/v3/lab/host/proxmox/page.tsx` — `LabDetalj`-mönstret: 3 ringar (CPU/RAM/Disk), Foot-rad (Temp/IO/Nät/Last), container-lista, actions (Backup/SSH/Starta om)
- [ ] `(warm)/v3/lab/host/unraid/page.tsx` — anpassad efter Unraid: array-status, parity, cache pools, disk-temp-lista
- [ ] Beslut i sessionen: services-strip vs egen `/v3/lab/services` (om det blir mer än 8 services rekommenderar designen ingenting — ta beslut och dokumentera)
- [ ] Återanvänder `/api/proxmox/*`, `/api/unraid/*`, `/api/portainer/*` (alla data-only, oförändrade)
- [ ] Action-knappar (Backup nu / SSH / Starta om) — bestäm om de faktiskt körs eller bara visuella i v3 (V2 har inte alla actions implementerade)

**Acceptance:** Lab-tab klar. Hosts klickbara → host-detalj → tillbaka.

**Observera:** *tomt*

---

### Session W3 — Fitness-spåret (hub + pass-detalj + coach + historik)
**Mål:** Hela Fitness-sektionen i Warm Home.

**Levererar:**
- [ ] `(warm)/v3/fitness/page.tsx` — `FitHub` med ReadinessRing (mot `/api/fitness/readiness`), idag-pass (från coach-plans), vecka-grid (M–S med ✓/idag-ring), streak, coach-tagline (cachead AI-sentens)
- [ ] `(warm)/v3/fitness/pass/[slug]/page.tsx` — full pass-detalj (Stat-grid, övningar med PR-pill, ask-coach-strip, karta + grafer från befintliga `TrackMap`/`PassCharts` i Warm-färgskala)
- [ ] `(warm)/v3/fitness/coach/page.tsx` — vecko/månadskalender + CRUD-modal i Warm-stil (modal-portal med Warm tile-bakgrund)
- [ ] `(warm)/v3/fitness/historik/page.tsx` — paginerad lista, typ-filter som chip-rad, månadsgruppering med Fraunces-rubriker
- [ ] AI-chat-mönstret återanvänds (samma SSE-stream-parser, ny chrome) för coach-revisering
- [ ] AI-analys-stjärna-badgen flyttar med (sparkle-glyph i Warm-stil)
- [ ] Behåll matchnings-logiken från `src/lib/fitness/match.ts` (data-only)

**Acceptance:** Fitness-tab klar. Pass-detalj med karta + grafer renderar. AI-analys + coach-CRUD funkar end-to-end.

**Observera:** *tomt*

---

### Session W4 — Trädgård-spåret (hub + växt-detalj + säsong + projekt + AI)
**Mål:** Hela Trädgård-sektionen i Warm Home.

**Levererar:**
- [ ] `(warm)/v3/garden/page.tsx` — `GardHub` med säsong-klocka (12 månader-bar), aktiva växter (lista), AI-quickprompt + AI-briefing-hero (mot `/api/garden/briefing`)
- [ ] `(warm)/v3/garden/vaxter/page.tsx` — full grid med typ/plats-filter
- [ ] `(warm)/v3/garden/vaxt/[id]/page.tsx` — `VaxtDetalj` med Lifecycle, Care-strip, guide-text, anteckningar, per-växt AI-prompt
- [ ] `(warm)/v3/garden/sasong/page.tsx` — kalender/lista/per växt-vyer + CRUD-modal i Warm-stil
- [ ] `(warm)/v3/garden/projekt/page.tsx` — kanban (`@dnd-kit` oförändrad, kort i Warm-stil med terracotta/sage prio-färger)
- [ ] `(warm)/v3/garden/ai/page.tsx` — chat (samma SSE + tools + bilder, ny chrome med Fraunces-italic citat-stil för coach-svar)
- [ ] PlantGlyph-set — seedling vs grown (från designen)

**Acceptance:** Trädgård-tab klar. AI-chat streamar med tools. Säsongsplan + projekt + växtdetalj funkar.

**Observera:** *tomt*

---

### Session W5 — Desktop-tolkning
**Mål:** Warm Home funkar lika bra på desktop som mobil.

**Levererar:**
- [ ] Sidebar i Warm-språk (Fraunces-rubriker + 4 nav-items, terracotta active-pill, glasmorf bakgrund) som ersätter bottom-pillen vid `≥1024px`
- [ ] Hub-och-detalj som **två kolumner** vid desktop-bredd: hub kvar i vänsterkolumn (max-bredd ~430px), detalj-route i höger (resten av bredden). Drill-down öppnar höger kolumn istället för full route-navigation.
- [ ] `(warm)/v3` layout är responsiv — switcher mellan mobile-stack vs desktop-split via container query (eller media query)
- [ ] Theme-toggle flyttar från mobil-position (TBD i W0) till sidebar-fot på desktop
- [ ] Verifiera alla 4 sektioner i 1440px och 1024px viewport

**Acceptance:** Öppna `/v3/home` i 1440px och se sidebar + hub + tom detalj-pane. Klicka rum-rad → rum-detalj öppnas i höger pane utan att hub töms.

**Observera:** *tomt*

---

### Session W6 — Polish + cutover
**Mål:** v3 går skarpt. v2 hibernerar.

**Levererar:**
- [ ] Audit av alla 4 sektioner: pull-to-refresh, expand/collapse-anim, modal-stil, toast/loading-states konsekvent i Warm-språk
- [ ] Ikon-finkalibrering (alla SVG-glyfer, samma stroke-bredd, samma optical alignment)
- [ ] Theme-toggle-persistens via localStorage (`warm-theme`-key)
- [ ] Root-layout: `/` → `redirect("/v3/home")` (i `src/app/page.tsx` eller via middleware)
- [ ] `(warm)/v3` flyttas till `(warm)` utan `/v3`-prefix? (Beslut i sessionen — kan vara enklare att lämna `/v3` kvar för spårbarhet)
- [ ] v2-routes blir kvar bakom `?legacy=1` eller bara döda (behåll i kod en månad, ta bort sedan)
- [ ] Manuell test på iPhone (verklig hårdvara) — touch, scroll, modal, AI-stream
- [ ] Update av AGENTS.md: lägg "Warm Home v3 är primär; v2 djupt-fryst" som första rad

**Acceptance:** Du kan använda dashboarden en hel dag på Warm Home utan att sakna något från v2.

**Observera:** *tomt*

---

## Start-/avslutsprompter per session

**Format:** kopiera prompten in i en ny chatt på `warm-home`-branchen. Den är medvetet kort eftersom WARM_HOME.md auto-laddas via `@WARM_HOME.md`-radan i AGENTS.md (lagd in i W0).

### W0 Setup

**Start:**
> Kör Session W0 enligt WARM_HOME.md. Skapa branch `warm-home` från `v2` lokalt + push, lägg `@WARM_HOME.md` överst i AGENTS.md, och leverera alla bullets i W0-blocket. Sluta när token-prov-sidan på `/v3/home` renderar utan fel i preview-servern (verifiera med screenshot, max 1800px längsta sida). Fråga innan du flippar branch eller skapar nya beroenden.

**Avslut:**
> Skriv tillbaka observera-blocket i WARM_HOME.md under W0 med (1) lessons learned, (2) öppna frågor som dyker upp, (3) status på alla bullets. Commita med meddelandet `feat(warm): W0 — setup branch + tokens + primitiver`. Pusha till `origin/warm-home`. Sammanfatta i 3 meningar vad som är gjort och vad som väntar för W1.

---

### W1 Hem

**Start:**
> Kör Session W1 enligt WARM_HOME.md, branch `warm-home` (verifiera med `git branch --show-current`). Bygg Hem-sektionen end-to-end mot riktig HA-data: `/v3/home` (HemHub), `/v3/home/rum/[slug]`, `/v3/home/belysning`, `/v3/home/media`. Återanvänd alla `/api/homeassistant/*`-endpoints orörda. Verifiera scen-aktiv-detektion + drill-down-navigation i preview. Använd ENDAST inline-style för visuell tuning (se WARM_HOME.md princip 7). Fråga innan du löser öppna designfrågor — markera istället förslag i WARM_HOME.md.

**Avslut:**
> Skriv observera-blocket under W1 (lessons + öppna frågor + checklistor). Commita per logisk enhet (hubben separat från rum-detaljen separat från belysning-fullvyn) med `feat(warm): W1 — Hem · {del}`. Pusha. Lägg screenshot på `/v3/home` (mobil viewport) i sammanfattningen.

---

### W2 Lab

**Start:**
> Kör W2 enligt WARM_HOME.md, branch `warm-home`. Bygg Lab-sektionen: `/v3/lab` (LabHub), `/v3/lab/host/proxmox`, `/v3/lab/host/unraid`. Använd befintliga `/api/proxmox`, `/api/unraid`, `/api/portainer`-endpoints. Beslut om services-strip vs egen sida — välj och dokumentera i observera-blocket. Action-knappar (Backup/SSH/Starta om): kontrollera först om actions finns i v2; om inte, gör dem visuellt närvarande men icke-funktionella med en tooltip "ej implementerat".

**Avslut:**
> Observera-block + commits per host (`feat(warm): W2 — Lab hub`, `... Proxmox detalj`, `... Unraid detalj`). Pusha. Skärmdump på Lab-hub + en host-detalj.

---

### W3 Fitness

**Start:**
> Kör W3 enligt WARM_HOME.md, branch `warm-home`. Bygg hela Fitness: `/v3/fitness` (FitHub), `/v3/fitness/pass/[slug]`, `/v3/fitness/coach`, `/v3/fitness/historik`. Återanvänd `TrackMap`, `PassCharts`, `match.ts`, AI-stream-parsing — färglägg om allt i Warm-palett. AI-analys-stjärnan på pass-ikoner ska följa med (sparkle-glyph i ACC). Coach-CRUD-modalen är en portal-renderad modal i Warm-stil — bestäm modal-backdrop + tile-stil och dokumentera. Verifiera AI-stream end-to-end på en planeringsförfrågan.

**Avslut:**
> Observera-block + commits per yta. Pusha. Skärmdumpar: FitHub, ett pass-detalj med karta + AI-analys, coach-kalendern öppen.

---

### W4 Trädgård

**Start:**
> Kör W4 enligt WARM_HOME.md, branch `warm-home`. Bygg hela Trädgård: `/v3/garden` (GardHub med säsong-klocka + briefing-hero), `/v3/garden/vaxter`, `/v3/garden/vaxt/[id]`, `/v3/garden/sasong`, `/v3/garden/projekt`, `/v3/garden/ai`. Återanvänd `@dnd-kit` för kanban + SSE-chat-parsern oförändrade. PlantGlyph (seedling/grown) från designen + ett par till om det behövs (utomhus, inomhus). Verifiera AI-chat med en växtfråga som triggar `get_plant`-tool.

**Avslut:**
> Observera-block + commits per yta (hub, vaxter-grid, vaxt-detalj, sasong, projekt, ai). Pusha. Skärmdumpar: GardHub med briefing, en växtdetalj, kanban-vyn, AI-chat med ett tool-call synligt.

---

### W5 Desktop

**Start:**
> Kör W5 enligt WARM_HOME.md, branch `warm-home`. Mål: Warm Home funkar på desktop. Bygg sidebar i Warm-språk som ersätter bottom-pillen vid `≥1024px`, och hub-och-detalj som två kolumner (hub vänster ~430px, detalj höger). Drill-down öppnar i höger pane utan att hub töms. Använd container query om Tailwind v4 stödjer det rent, annars media query. Theme-toggle flyttar till sidebar-fot. Verifiera alla 4 sektioner i 1440px + 1024px + 393px (mobil) viewport.

**Avslut:**
> Observera-block + commit `feat(warm): W5 — desktop sidebar + split-pane`. Pusha. Skärmdumpar i 3 viewport-storlekar för en sektion (Hem räcker).

---

### W6 Cutover

**Start:**
> Kör W6 enligt WARM_HOME.md, branch `warm-home`. Polish-pass: pull-to-refresh, animationer, modal-stil, ikon-konsistens. Theme-toggle persisterar i `localStorage["warm-theme"]`. Flippa root: `/` → `/v3/home`. v2-routes blir kvar i kod (för rollback) men är inte länkade. Update AGENTS.md första rad till "Warm Home v3 är primär". Manuell test på iPhone. Innan du mergar till `main`: pausa och be mig verifiera på riktig hårdvara först.

**Avslut:**
> Observera-block + final commit `feat(warm): W6 — polish + cutover till v3`. **Mergea INTE** till `v2` eller `main` automatiskt. Skapa en PR från `warm-home` → `main` med checklista (testat på iPhone, alla sektioner, AI-flöden, deploy-secrets oförändrade). Sammanfatta totalförändringen (LOC, antal nya filer, nya routes, beroenden).

---

## Lessons learned (skrivs här när de uppstår)

*tomt — fylls per session ovan*
