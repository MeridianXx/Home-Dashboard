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

**Status (alla bullets):**
- [x] Branch `warm-home` skapad från `v2`, pushad till `origin/warm-home`
- [x] `@WARM_HOME.md` lagd som första rad i `AGENTS.md` (auto-laddas på warm-home-branchen)
- [x] Fraunces (300/400/500/600 + ital) + DM Sans (400/500/600/700) i `src/app/layout.tsx` parallellt med Syne+Inter — `--font-fraunces` + `--font-dm-sans` exponerade som CSS-variabler
- [x] `src/app/(warm)/layout.tsx` — `warm-root`-wrapper, importerar `globals.warm.css`. Ingen ny html/body — ärver root-layouten med alla font-variabler
- [x] `src/app/(warm)/globals.warm.css` — minimal baseline för `.warm-root`. Beslut: **inte** Tailwind `@theme`. Visuell tuning sker via inline-style från `tokens.ts` per princip 7
- [x] `src/lib/warm/tokens.ts` — ACC/SAGE/LINGON/AMBER/SKY + lightT/darkT + serif/body + lab/num/ital text-helpers (returnerar CSSProperties) + RADII + STROKE
- [x] `src/lib/warm/theme.ts` — `useWarmTheme()` med localStorage `warm-theme` + `prefers-color-scheme`-fallback. Renderar light på SSR, hydrerar i effect (undviker flash)
- [x] `src/components/warm/primitives.tsx` — Tile, Pill, Stat, Bar, HubHeader, DetailHeader, TabBar, Spark (med `fluid`-prop), Ring
- [x] `src/components/warm/icons/` — TabIcon-set (HemIcon/LabIcon/FitIcon/GardIcon) + 6 SceneGlyph (morgon/dag/kvall/natt/film/borta) + ThemeIcon. 1.6 px stroke, outline
- [x] `src/app/(warm)/v3/home/page.tsx` — token-prov: accents-swatches, tema-spegelpanel (active + invers), typografi-prov (Display/Headline/Body/Lab/Tabular num), primitiver (Stat-grid, Bar, Pill-tonsvariationer, scen-glyfer, Ring + Spark), tab-ikon-grid + floating TabBar
- [x] Verifierat i `preview_start("home-dashboard")` — `/v3/home` 200, inga server- eller console-fel, både light + dark renderar; v2 `/home` svarar 200 oförändrat

**Observera (lessons learned):**
- **`(warm)` route-grupp ärver root-layoutens `<html>`/`<body>`** — så next/font-variablerna räcker att deklareras i root. `(warm)/layout.tsx` får INTE returnera `<html>`/`<body>` igen; en enkel wrapper-`<div className="warm-root">` räcker. Skulle dubbel-html ha lagts till hade det blivit hydration-mismatch.
- **`useWarmTheme()` defaultar till `light` på första render**, hydrerar `dark` i en effect. Alternativet (läsa `localStorage`/`matchMedia` synkront i state-init) ger SSR-mismatch eftersom servern inte har dem. Korta vita blink är acceptabel kostnad jämfört med hydration-fel; om det skär kan det lösas senare med `next-themes`-mönstret (`<script>` i `<head>` som sätter klass innan React mount:ar).
- **Spark behövde `fluid`-prop** — fast `width`/`height` på SVG bryter när container är smal. `width="100%"` + `viewBox` + `preserveAspectRatio="none"` ger fluid horisontell sträckning utan att förvränga stroke-bredden nämnvärt. Mönstret återanvänds förmodligen för Bar/HR-grafer i W3.
- **TabBar med längre svenska labels (`Trädgård`) krävde `minWidth: 70` + `padding: 10px 6px` + `gap: 4`** för att få plats inuti 375 px-viewporten. Container `borderRadius: 30` + `padding: 8` matchar Claude Design-printen. Aktiv-pill `borderRadius: 18` (rundad fyrkant, inte full pill) — viktig visuell skillnad.
- **Fitness-ikonen är hantel, inte blixt.** Initial tolkning från `WARM_HOME.md`-prosa landade på blixt; printen från användaren visade hantel (handtag + två viktblock + små kapsylstreck). Lärdom: be om referensbilden direkt när det finns en när designen är "låst" (princip 6) — gissa inte från text.
- **Ring + Spark passar inte i 2-kolumns-grid** på mobil — 165 px content-bredd räcker inte för 72 px ring + label + tagline (vågrätt). Lösning: full bredd, ring + label-stack horisontellt, Spark får hela kortbredden för en läsbar 12-punkts trend. Generellt: mobil-default = stack, opt-in i 2-kolumner endast när båda kort är genuint kompakta (Stat-trios fungerar; rich content gör inte det).
- **Inline-style + token-helpers (`num(t, 28)`) är ergonomiskt** — `style={{ ...num(t, 28), lineHeight: 1 }}` läser rent. Spread:a alltid token-helpern först så man kan override:a enskilda fält efter. Tabular nums via `className="warm-tab-nums"` (definierad i `globals.warm.css`) håller siffrorna ordnade i Stat/Bar.

**Öppna frågor (skickas vidare till W1+):**
- **Theme-toggle-placering:** Vi satte den som rund knapp uppe till höger på token-prov-sidan. För Hem-hubben i W1 — flytta in i `HubHeader.right`-slotten eller hellre under en profil-meny? Förslag: behåll i hub-headern på alla fyra hubbar (konsekvent), gömd från detaljskärmar (där `DetailHeader` redan har `right`-slot för andra actions).
- **Fraunces ital tail (`fontStyle: "italic"`)** används brett i taglines — verifiera på äkta hårdvara att kursiv-vikten 400 inte ser för tunn ut i mörkt tema. Möjligen bumpa till 500 italic för dark-mode kursiv om det skär.
- **Ikon-fidelity:** TabIcons är freehand-tolkade från `WARM_HOME.md`-prosa + en print från användaren. Om Claude Design-prototypens HTML-fil hittas (sökt i ~/Downloads, ~/Documents, ~/Desktop — finns inte lokalt) bör SVG-paths portas verbatim i W6 polish-passen.
- **Material Symbols stylesheet** laddas fortfarande via root-layouten (för v2). Det är OK under övergångsperioden — men i W6-cutover bör den lazy-laddas eller flyttas till `(dashboard)`-layouten så den inte påverkar `(warm)` Network Idle.

---

### Session W1 + W1.5 — Hem-spåret (hub + klimat + energi + belysning + media + rum-detalj)
**Mål:** Hela Hem-sektionen i Warm Home, mot riktig HA-data.

**Levererar (W1 + W1.5 komplett):**
- [x] `(warm)/v3/home/page.tsx` — `HemHub` mot `/api/homeassistant/{weather,sensors,scenes,lights,energy,cars}`. Rum-rad med dot-toggle + Link-chevron. "all belysning →"-länk under listan. Sol-arc med `sun.sun`-data.
- [x] `(warm)/v3/home/rum/[slug]/page.tsx` — rum-detalj med interaktiv ArcGauge (master-dimmer), per-lampa-lista med brightness-slider + K-pill, SENASTE-händelselista (lampor/media/klimat/rörelse deduperade mot scen-aktiveringar), klimat som individuella kort per mätvärde.
- [x] `(warm)/v3/home/belysning/page.tsx` — full våningsindelad lampgrid + scener + "släck allt" + "släckt sedan HH:MM"-status.
- [x] `(warm)/v3/home/media/page.tsx` — Sonos per rum + Apple TV (albumart-proxy via befintlig `/api/homeassistant/image`).
- [x] `(warm)/v3/home/klimat/page.tsx` — väderkortets drill-down. Nibe S735 (BT1/BT50/varmvatten/kompressor/fläkt + Kaminläge/Ökad ventilation/Mer varmvatten/Nattsvalka/Solkyla-switchar), Hero luftvärmepump (target-temp-slider + Värme/Kyla/Från-lägen), temperaturgrafer (inomhus + utomhus, `TempGraph`-komponent med `useChartSize`), dammsugare (Chomper) kompakt strip.
- [x] `(warm)/v3/home/energi/page.tsx` — Tibber drill-down (spotpris-spark 24h + prognos, månadskostnad, effekt) + bilar (Enyaq + Polestar 2 med SOC/räckvidd/laddstatus) + laddboxar (vänster/höger).
- [x] `(warm)/v3/home/klimat/page.tsx` — chevron-destination från väderkortets tile.
- [x] `WarmErrorBanner.tsx` — Warm-variant av ErrorBanner-mönstret från v2.
- [x] `WarmPress.tsx` — scale 0.97 + opacity vid press + spinner-overlay. Används på alla action-knappar (Nibe-switchar, Hero-lägen, Vacuum-knappar, master-dimmer på/av).
- [x] `ArcGauge.tsx` — interaktiv 270°-arc med `setPointerCapture`, invers polärmatematik, `onChange`/`onCommit`-callbacks, thumb-cirkel vid fill-endpoint.
- [x] `LightEditSheet.tsx` — bottom-sheet per lampa med K-slider (2200–6500 K) + Adaptiv belysning-toggle (binding mot `adaptive_lighting`-integration).
- [x] `TempGraph.tsx` — SVG-baserad temperaturhistorik-graf med `useChartSize` (ResizeObserver), 15-min bucketing via `/api/homeassistant/history`.
- [x] `src/lib/warm/events.ts` — `formatEvents()` (deduplication av lamp-events mot scen-aktiveringar ±3 s), `sceneEventsFromScenes()` (historiska scen-aktiveringar som events).
- [x] `src/lib/scenes.ts` — `activeSceneByLastChanged()` ersätter `detectActiveScene()`: grace period 8 s (trust last_changed) + state-verifiering (≥50 % av on-targets fortfarande on). Hanterar att HA rampar upp brightness efter scen-aktivering.
- [x] `src/app/api/homeassistant/events/route.ts` — HA history utan `minimal_response` (behöver attributes: brightness, friendly_name, media_title, target_temp). Filtrerar no-op events.
- [x] `src/app/api/homeassistant/room-entities/route.ts` — HA-registry → kategoriserade entiteter per rum (lights, media, climate, motion).
- [x] `src/app/api/homeassistant/weather/route.ts` — utökat med `sunrise`/`sunset`/`elevation` från `sun.sun`-entiteten.
- [x] `src/app/api/homeassistant/lights/route.ts` — `LightEntry` utökat med `last_changed: string | null` + `color_temp_kelvin`.
- [x] `src/app/api/homeassistant/scenes/route.ts` — `ScenePayload` utökat med `last_changed: string | null`.
- [x] `WarmThemeProvider` React Context i `(warm)/v3/layout.tsx` — theme-toggle propagerar globalt, löser kritisk bug där varje hook hade lokalt state.
- [x] Pull-to-refresh i Warm-stil — ACC-spinner under drag, SAGE-bock + "Uppdaterat" på release.
- [x] Delade primitiver: `RoomLightRow`, `WarmSwitch`, ikoner (`extra.tsx`, `weather.tsx`), slug/rumsnamn-mappare (`rooms.ts`).

**Acceptance:** Hem-tab komplett med riktig HA-data. Hub → rum-detalj → tillbaka, Hub → klimat → tillbaka, Hub → energi → tillbaka, Hub → belysning → tillbaka fungerar. Light/dark-toggle propagerar till alla lager. Verifierad mot live preview i 375 px viewport, both light + dark.

**Observera (W1 — ursprungliga lessons learned):**
- **`Spotpris × 100` är en fälla — `/api/homeassistant/energy` returnerar redan öre.** Endpointen multiplicerar `tibber_pulse_villa_bjorkdalen_elpris` (`SEK/kWh`) med 100 vid serialisering; UI ska visa värdet rakt av, inte mångfaldiga igen. Lärdom: läs alltid v2-route innan du tweakar enheter på UI-sidan.
- **HA-scener är 4, design-prototypen visar 6.** `(scene.god_morgon, scene.hemma, scene.kvall, scene.natt)` är allt som finns. WARM_HOME.md princip 5 visar 6 pills (Morgon/Dag/Kväll/Natt/Film/Borta) men `Film`/`Borta` saknar HA-scener. Beslut: visa bara 4 pills, mappa `hemma → "Dag"` (UI-etiketten är fri, scen-key:n är HA-bunden). Att uppfinna pills som inte gör något hade brutit "korten är dörrar"-principen i p1.
- **Köket har en sensor som rapporterar 60° i `/api/homeassistant/sensors`.** Pre-existerande v2-data-bug — sannolikt en jalusi/fläktbelysningsenhet som är felklassad som `device_class: temperature` i HA. Syns nu på Hem-hubbens rum-rad. Workaround: `isKitchen`-guard i rum-detaljen gömmer sensor-datan; hubben visar "ljus av" utan temp. Kandidat för W6: utöka `SYSTEM_PREFIXES` eller lägg denylist per entity_id i `sensors/route.ts`.
- **`(warm)`-route-grupp + `(warm)/v3/`-undergrupp = två lager layouts.** Pull-to-refresh + TabBar bor i `(warm)/v3/layout.tsx`, inte i `(warm)/layout.tsx`. Mönster: lägg layout på det innersta omfånget som faktiskt motsvarar feature-omfattningen.
- **Pull-to-refresh: globala `window`-touchlyssnare + `router.refresh()`.** `router.refresh()` re-runs RSCs och invaliderar Next-cachen; SWR-hookarna revaliderar automatiskt. Tröskel: 80 px. Spinner i ACC under drag, SAGE-bock + "Uppdaterat" på release.
- **`Tile`-prop:en `style.border` override:as korrekt** — `Tile`s baseStyle spreadar `...style` sist. Border-color för aktiv-state är skarpare än background-fyllning mot `t.paper`.
- **Albumart 60×60 (vs v2:s 68×68) ger plats åt transport-knappar utan trångbod på 375 px-mobil.**
- **`useParams<{ slug: string }>()`-typningen ljuger:** Next typar utdata som `string | string[]` även för singular `[slug]`-routes. Inget run-time-problem; värt att veta vid refactor.
- **HubHeader.right-slot är perfekt theme-toggle-plats.** Lås in mönstret för alla 4 hubbar i W2–W4.

**Observera (W1.5 — polish-passet):**
- **`WarmThemeProvider` React Context är enda pålitliga lösningen för global theme-toggle.** `localStorage` + `storage`-event sprider inte inom samma tab. Varje `useWarmTheme()`-anrop med lokalt `useState` skapar isolerade instanser. Lösningen: en enda Provider i `(warm)/v3/layout.tsx` med `useState` + `useEffect` (SSR-safe). Alla sidor under `/v3/` delar nu ett enda tema-objekt utan Zustand eller extra dependencies.
- **HA rampar upp brightness EFTER scen-aktivering.** En rakt `detectActiveScene()`-matchning på state + brightness direkt efter aktivering ger false negative eftersom lamporna fortfarande håller ~1 % brightness. Fix: `activeSceneByLastChanged()` med grace period 8 s — inom grace period litar vi på `last_changed`; efter grace period verifierar vi ≥ 50 % av on-targets fortfarande on. Hybridansats: snabbhet på direkt-UI + korrekthet när användaren manuellt ändrar ljus.
- **Scen förblir "aktiv" trots att alla lampor är släckta** om man bara tittar på `last_changed`. Fix: state-verifiering — om inga on-targets är on returneras `null` och UI visar "släckt sedan HH:MM" i stället. `lastDarkenedAt()` hittar senaste off-tidsstämpel ur lamporna.
- **SENASTE-listan deduplicerar lamp-events mot scen-aktiveringar.** Lampor som tänds av en scen filtreras bort (±3 s window) — scen-raden dyker upp istället. `sceneEventsFromScenes()` läser `ScenePayload.last_changed` för historiska scen-aktiveringar oberoende av nuvarande aktiv-status.
- **"auto" dyker upp som källa i SENASTE.** HA:s `context.user_id` är inte tillgänglig utan att hämta fullt history-record per event (stor payload). Teknisk begränsning — "auto" visas istället för "adaptiv belysning" tills ett bättre alternativ finns. Källan är inte fel, bara oinformativ.
- **ArcGauge kräver `overflow: visible` på SVG** annars clippar thumb-cirkeln vid fill-endpoint när den hamnar nära viewBox-kanten. `setPointerCapture` + `pointermove` på SVG-elementet ger smooth drag utan att tappa capture vid snabb rörelse.
- **Sol-arc-theta var inverterad.** `theta = Math.PI * (1 - progress)` ritade solen höger → vänster (solnedgång vid vänster = fel). Rätt: `theta = Math.PI * progress` ger p=0 vid vänster (soluppgång), p=0.5 vid topp (middag), p=1 vid höger (solnedgång).
- **`flexShrink: 0` måste explicit sättas på ALLA SVG-ikoner i `baseSvg()`.** Flex-container-föräldrar (knappar med `display: inline-flex`) krymper SVG-element som standard. `getBoundingClientRect()` på Morgon-ikonen visade 5.7 px bred trots `size={16}`. Fix: spread `style={{ flexShrink: 0, ...style }}` i alla `baseSvg()`-instanser.
- **Hub-rum-rad: dot = `<button onClick=toggleArea>`, chevron = `<Link href=rum/slug>`.** Skapar två separata touch-targets på en rad utan att kapsla interaktiva element i varandra. Ger haptic-klar toggle direkt på hubben utan drill-down.
- **`LightEditSheet` bottom-sheet + `adaptive_lighting`-binding.** Sheet renderas via `createPortal` mot `document.body` för att komma ovanför TabBar (samma stacking-context-fälla som fitness-modalen). Adaptive-lighting-instansen matchas via `manual_control`-array (exakt entity_id) eller fallback på `configuration_id` som slug.
- **`TempGraph` är SVG-baserad, inte Recharts.** Recharts + `ResponsiveContainer` ger -1 width/height inuti AnimatePresence och statiska flex-containers på klimatsidan. Alternativet: custom SVG med `useChartSize()` (ResizeObserver) + explicit `width/height`. Ger full kontroll över stroke, fill-gradient och gridlinjer utan Recharts-overhead.
- **Klimat som individuella kort per mätvärde.** `ClimateCards` (tidigare `ClimateTriplet`) renderar TEMP / LUFTFUKT / UTE som separata `flex: 1`-tiles med `border-radius: 14`. Rum utan inomhussensor visar bara UTE-kortet. Varje kort har label (TEMP etc), stort seriff-värde (26 px) + enhet + kursiv sublabel ("inomhus"). Inget `grid` — `display: flex; gap: 10` delar ytan jämnt för 1–3 kort.
- **Dammsugaren hör hemma på klimatsidan, inte en egen route.** Chomper är inte klimat men "hemstatus" passar bättre under klimat-drill-down (väderkort-destination) än som en separat tab-destination. Kompakt strip med statusbricka + städad yta + batteri + start/stop-knappar.
- **Temperaturgrafer = klimatsidan, inte belysningssidan.** Konfirmat med användaren vid session-start. `/api/homeassistant/history` med `?entities=sensor.nibe_utomhustemperatur_bt1,sensor.nibe_inomhustemperatur_bt50,sensor.vardagsrum_temperatur,...` + `hours=24` ger 15-min-buckad data.

**Öppna frågor / vidare till W2+:**
- **Köket sensor-bug:** workaround finns (`isKitchen`-guard) men root cause (felklassad `device_class: temperature` i HA) är oåtgärdad. Lägg till i HA-konfigurationen: `customize: sensor.XXX: device_class: null`. Entity-ID behöver identifieras via HA-debugger.
- **Theme-toggle på detaljskärmar:** gömmer vi den avsiktligt (detaljsidorna har ingen header-right). Om användaren vill kunna toggla från rum-detalj — lägg till i `RumHeading`-headern som en liten moon/sun-pill längst upp till höger.
- **SENASTE-källan "auto":** kan förbättras om HA-historyendpointen utökas med `context.user_id → entity_id`-mappning via HA:s logbook-endpoint (separat request per tidsfönster). Inte prioriterat — "auto" är acceptabelt.

---

### Session W2 — Lab-spåret (hub + Proxmox + Unraid)
**Mål:** Hela Homelab-sektionen i Warm Home.

**Levererar:**
- [x] `(warm)/v3/lab/page.tsx` — `LabHub` med tillstånds-card, två host-cards (Proxmox + Unraid), services-strip (3 räknare: VM/LXC, Docker · proxmox, Docker · unraid).
- [x] `(warm)/v3/lab/host/proxmox/page.tsx` — back-chevron, ring-duo (CPU/RAM), foot-rad (NÄT IN/UT, VM/LXC, DOCKER), VM/LXC-lista, Portainer-containerlista med klickbara webui-pills, ÅTGÄRDER med Backup/SSH/Starta om som visuella platshållare.
- [x] `(warm)/v3/lab/host/unraid/page.tsx` — back-chevron, ring-trio (CPU/RAM/ARRAY), foot-rad (DISKAR/PARITET/CACHE/LEDIGT), array-låda med `started`-state + 91 %-bar + disk-rader, cache-pool-lådor, docker-lista (8 default + "Visa alla N"), ÅTGÄRDER (Paritetscheck/Spin down/SSH).
- [x] `src/components/warm/icons/lab.tsx` — `ServerIcon`, `StorageIcon`, `ContainerIcon`, `DiskDot`, `StatusDot`. 1.6 px stroke + utlinjeform.
- [x] Återanvänder `/api/homelab/proxmox`, `/api/homelab/unraid`, `/api/homelab/portainer` orörda. (Path är `/api/homelab/...`, inte `/api/proxmox/...` som WARM_HOME.md tidigare antydde.)
- [x] Action-knappar = visuella platshållare. `title="Ej implementerat — visuell platshållare"` + dashed-border + `cursor: not-allowed` + `aria-disabled` + footer-not "Åtgärderna är visuella platshållare och anropar inga tjänster ännu."
- [x] **Beslut: services-strip på hubben, ingen egen `/v3/lab/services`.** Räknare i 3 boxar (VM/LXC, Docker · proxmox, Docker · unraid). Containrar listas i sin helhet på respektive host-detalj — separat tjänstesida hade bara duplicerat data.

**Acceptance:** Lab-tab klar. Hosts klickbara → host-detalj → tillbaka. Verifierat i mobile (375 px) viewport, både ljust och mörkt tema. Inga route-fel i `/v3/lab`-grenen (de fel som syns i `preview_logs` är pre-existerande W1-issues i `/v3/home/klimat` + `/v3/home/rum/[slug]`).

**Observera:**
- **Services-strip-beslut motiverat av datavolym.** Total = 7 Portainer-containers + 29 Unraid-containers + 5 Proxmox VM/LXC = 41 entiteter. En egen `/v3/lab/services`-sida hade dubbelt-listat det som redan finns på host-detaljerna. Hubben äger summan + tagline, host-detaljerna äger listan. Mönstret är samma som "korten är dörrar"-principen (W1 p1) — strippen är alltså inte en dörr utan en sammanställning.
- **`Bar`-primitiven tar `t={t}` som första prop** (inte bara `value` och `color`). Den läser `t.line` som track-färg — utelämnas det får man "Cannot read properties of undefined". Värt att kolla primitivens signatur i `primitives.tsx` när man återanvänder den från ny kod.
- **Foot-stat-funktionen återanvändbar men inte lyft än** — Proxmox och Unraid behöver båda en kompakt 3–4-kolumns mätar-rad med små tabular-nums. Skrev `FootRow` lokalt i Proxmox-filen och `FootStat` lokalt i Unraid (lite olika prop-set) hellre än att lyfta ut för tidigt; om W3 (Fitness) eller W4 (Trädgård) får liknande behov, plocka upp till `primitives.tsx` då.
- **"Visa alla N"-button på Unraid-docker-listan** är en `<button>` direkt på sektionslådans bottensektion med `borderTop`. `useState` sparar expand-state. Default 8, expand → alla. Användaren behöver sällan se hela listan — alla `nextcloud-aio-*` paddar listan. Stoppade containers visas i samma ordning som API:t returnerar dem; kandidat: sortera stoppade först eller flagga rad-kant. Lämnas till W6.
- **`cache2` rapporterar `spinning=true` + `temp=49°` men `used_pct=null`** från Unraid. UI:t visar "standby" italic även där eftersom `disk.used_pct == null`. Samma bug i v2 (samma villkor i `DiskTableRow`). Verklig orsak: cache2 är slav-disken i en BTRFS-mirror — Unraid-GraphQL exponerar inte fs-storlek per slav, bara på master. "standby" är vilseledande i det fallet, men eftersom det är en data-modellbegränsning (inte UI-bug) lämnas det. Kandidat till fix på API-sidan: i `/api/homelab/unraid` rapportera "BTRFS-slav" istället för null när disken är spinning men saknar fsSize. Skippas i W2.
- **Tagline-logiken är optimistisk** ("Homelab, allt rullar.") även när 9 services är stoppade, så länge båda hostarna är online. Stoppade services är ofta avsiktliga (homepage LXC, gamla nextcloud-aio-pre-services). Att flagga rött för avstängd `homepage` hade gjort hemmet alltid larmigt. Tröskeln "host nere" är striktare än "service avstängd" — bra default.
- **`(warm)/v3/lab/host/[host]`-pattern ej använt** — endast två konkreta hosts finns och deras dataformer är så olika (Proxmox = VM/LXC + Portainer-Docker, Unraid = array + cache + Docker) att en delad mall hade krävt union-types som inte gav vinst. Två separata route-filer är enklare.
- **`SectionBox`/`StorageBox` är lokala duplikater** (Proxmox-filen har sin variant, Unraid har en annan med `summary`-prop). Ej lyfta till primitives ännu — vänta på W3/W4 för att se om mönstret stabiliseras eller om var sektion behöver sina specialfält.
- **`StatusDot` som hollow ring (no fill, border only) vid `ok=false`** är ett mer subtilt sätt att signalera "inte aktivt" än röd punkt. Använd genomgående: tomma cirkel = vilande/avstängd, fylld = aktiv. Disk `DiskDot` följer samma princip (spinning=fyllt, standby=tomt).
- **Portainer-webui-pillar har `onClick stopPropagation`** så klickar inte triggar förälderns Link. Pillen själv är `<a target="_blank">` direkt — användaren öppnar i ny flik, host-detaljen håller sig kvar.
- **`<a>` i `<a>` är ogiltig HTML** — `HostCard` var en `<Link>` (renderas som `<a>`) med en WebUI-länk (`<a>`) inuti. React rapporterar det som hydration-fel. Lösning: byt `<Link>` mot `<div onClick={() => router.push(href)}>` + `useRouter` från `next/navigation`. Inre `<a>`-element behöver inte `stopPropagation` längre — de bubblar till `<div>`, inte en `<a>`. Mönstret gäller generellt: alla klickbara kort som också behöver innehålla `<a>`-element måste använda `div + onClick`, inte `Link` eller `<a>`.
- **Displaynamn vs. tekniskt hostname** — `unraid?.system?.hostname` returnerade "unraid01" (serverns faktiska hostname). Displaynamnet är semantiskt, inte tekniskt — hårdkoda det om det avviker. Samma princip som `proxNode?.node ?? "proxmox"` som redan returnerade rätt.
- **Italic tail inline i h1 orsakar radbrytning** — `unraid, lagring snart full.` och `proxmox, 4 VM/LXC + 7 containrar.` tog mer plats än titeln ensam och bröt till två rader på 375 px. Fix: separera tagline till en `<p style={{ ...ital(t, 14, t.dim), marginTop: -2 }}>` under `<h1>`. Titeln förblir ren, tagline sitter på egen rad utan risk för radbrytning i mitten av h1-strängen.
- **StatBlock (boxar i boxar) ersatt med `FlatStatRow`** — nästlade bordered boxes (`background: t.paperHi, border: 1px solid t.line`) inuti ett kort-border kändes som dubbel ram. `FlatStatRow` = label + bar + value i en horisontell rad, ingen bakgrund, ingen border. Ger samma information med ett visuellt djuplager färre.
- **Namngivna service-tiles slår räknare** — "7 Docker" säger ingenting om vilken tjänst som kör. Named tiles (HA, Nextcloud, Adguard, Portainer, Seerr, Sonarr, Radarr, Torrent) med grön SAGE-dot och klickbar URL är mer informativa och sparar ett navigationssteget till respektive WebUI.
- **WebUI-pill på två nivåer** — diskret `uppercase 10px` pill med `t.mute`-text, `1px solid t.line`-border och `t.paperHi`-bakgrund sitter (1) bredvid chevron på hubkorten och (2) i back-button-raden på detaljsidorna. Öppnar `target="_blank"`. Positionen i back-button-raden (justify-content: space-between) är logisk: "gå tillbaka" vänster, "gå framåt till extern UI" höger.

**Öppna frågor / vidare till W3+:**
- **Tagline-styrka:** "Hemlab, allt rullar." är samma evergreen oavsett antal stoppade services. Kandidat: visa antal nere i tagline-kursiven när det är ovanligt högt (`> 10`). Kommer först om det blir ett verkligt problem.
- **Action-knappar — när hänger på riktigt?** Backup/SSH/Starta om/Paritetscheck/Spin down är verkliga behov, men kräver separata API-endpoints (`POST /api/homelab/proxmox/backup`, `POST /api/homelab/unraid/spin_down`, etc.). Var och en är icke-trivial (auth, error-states, async polling). Park i W6+ och kom tillbaka när dashboarden är komplett.
- **TrueNAS / annan host:** finns inte i hemmet idag. Om en tredje host läggs till, är `lab/page.tsx` lätt att utöka med ett tredje `<HostCard>` — strukturen är list-driven men just nu hårdkodade två rader.

---

### Session W3 — Fitness-spåret (hub + pass-detalj + coach + historik)
**Mål:** Hela Fitness-sektionen i Warm Home.

**Levererar:**
- [x] `(warm)/v3/fitness/page.tsx` — `FitHub` enligt designspec: ACC-eyebrow `FITNESS · {dag}`, display-tagline härledd från dagsformen ("Bra återhämtning, *kör tungt.*" / "OK form, *håll planen.*" / "Lite slö, *ta det lugnare.*"), terracotta-tonad readiness-tile med ring + numerisk score + italic-tail (HRV/form/sömn), idag-block som hero-tile med tag-pills från `passdetaljer`, 7-rutors VECKAN-grid med ACC-fyllda checks, STREAK-tile, terracotta-tonad COACH-tile med italic-quote, senaste-pass-list med sparkle-badge för AI-analyserade pass.
- [x] `(warm)/v3/fitness/pass/[slug]/page.tsx` — pass-detalj med ACC-eyebrow + display-headline med italic-tail (`13.35 km, *löpning.*`), 3-up StatBox för Distans/Tid/Snittpuls, 2-up extra-stats (höjd, kraft, kadens, kalorier, TRIMP, RPE-ansträngning), Warm-stilad TrackMap, SVG-baserad HR-tidsserie + zon-band + zon-fördelning, elevations-profil, intervall-kategorisering, plan-match, ACC-tonad AI-analys-tile.
- [x] `(warm)/v3/fitness/coach/page.tsx` — vecko/månadskalender med plan-pillar (sport-ikon + ACC-vänsterkant + grön-bock-länk för matchade pass), period-nav, "+ Nytt pass" + "AI-pass"-knappar, CRUD-modal i Warm-stil via portal-renderad WarmModal, SingleAI-modal, AIPlanSection med multi-pass förslag, per-pass regen, feedback-revise och "spara = visat".
- [x] `(warm)/v3/fitness/historik/page.tsx` — paginerad lista (30/sida + Visa fler), typ-filter som chip-rad (7 kategorier), månadsgrupper med Fraunces-rubriker, tile-rader med sport-ikon + AI-sparkle + zon-pill.
- [x] AI-stream verifierat end-to-end: prompt → `/api/fitness/coach` → 3 strukturerade pass renderade i Warm-tinted draft-panel (sonnet-4-6, ~20 s, JSON-svar parseat utan fel).
- [x] AI-analys-sparkle (ACC-fylld) renderar i nedre högra hörnet av pass-ikonen för analyserade pass — både på FitHub och i historik.
- [x] Återanvänder `src/lib/fitness/match.ts`, `slug.ts`, `parser.ts` (paceString/durationString), `profile.ts`/`useHydrateProfile`, samt befintliga API-routes (`/api/fitness/{workouts,plans,readiness,fit,analyse,analysed,coach}`) oförändrat.

**Delade Warm Home-primitiver tillförda i W3:**
- `src/lib/warm/fit.ts` — `sportCategory/Color/Label`, `zoneColor/Label`, `rpeColor/Label`, `formatSec`, `shortDateSv`, `monthLabelSv`, `daysUntil`.
- `src/components/warm/fit/parts.tsx` — `HubDisplay` (ACC-eyebrow + display + italic-tail + subtitle), `DetailHero` (back-chevron + samma display-pattern), `SectionLabel`, `StatBox`, re-exporterade `ChevronLeft/Right`.
- `src/components/warm/Modal.tsx` — `WarmModal`: portal-renderad bottom-sheet med terracotta-tinted backdrop (`rgba(20,14,8,0.55)` + blur 6px), `paperHi`-bakgrund, ACC primary-knapp i footer.
- `src/components/warm/icons/fit.tsx` — sport-glyfer (RunIcon/WalkIcon/BikeIcon/StrengthIcon/CoreIcon/SwimIcon/SkiIcon/PadelIcon/YogaIcon), SparkleIcon, RefreshIcon, SendIcon, PlusIcon, TrashIcon, CalendarIcon, FlagIcon, HistoryIcon, BoltIcon, MapPinIcon, MountainIcon, HeartIcon, CloseIcon, ErrorIcon, samt `sportIcon(type, size, color)`-router.
- `src/components/warm/fit/PassCharts.tsx` — Warm-stilade `HRSeriesChart`, `ElevationChart`, `ZoneDistribution`, `HeartRateCard`, `LapsList`, `ZonePill` (alla SVG, inga Recharts/CSS-variabel-beroenden — färger sitter rätt i light/dark utan global mapping).
- `src/components/warm/fit/TrackMap.tsx` — Leaflet-wrapper med Carto Positron-tiles, polyline-segment per pulszon, Warm-tinted bakgrund, `ssr: false`.
- `src/components/warm/fit/AIAnalysisCard.tsx` — terracotta-tonad analys-tile, kommentar-toggle, ACC primary-knapp för Generera/Regenerera.

**Observera:**
- **Designvalet "korten är dörrar" gäller även Fitness-hubben.** Senaste-pass-listan är inte en navigerbar tab utan en kompakt rad-tile med "se all historik →"-länk i högerkanten. Detaljnivåerna (`/historik`, `/coach`, `/pass/[slug]`) nås via dörrar — dörrarna sitter i COACH-tile-länken, "se all historik →"-länken och pass-rader. Inga sub-tabs.
- **Display-tagline härleds, AI-cachas inte i W3.** Briefen pratar om en "cachead AI-sentens" som tagline. För hub:en valde jag att härleda `{title, italicTail}` direkt från readiness-poängen (4 buckets) i stället för att lägga till en ny endpoint. Coach-quote i COACH-tile genereras likadant. Det är gratis (ingen Claude-körning per render), känns alltid färskt, och kan lyftas till AI-driven cache i W6 om användaren vill ha mer specifika formuleringar. Behåll readiness-baserade taglines som fallback i alla fall.
- **`useChartTheme`/`useChartSize` från v2 är CSS-variabel-tunga och passar inte Warm.** Att bara byta färgkonstanter räckte inte — `var(--color-surface-container)` är v2-tokens som inte mappas till Warm-tema. Lösning: bygg om HR-, elevations- och zon-charts som rena SVG i Warm-stil (samma pattern som `TempGraph` i W1.5) med inline-style från `tokens.ts`. Lap-list-kategoriseringen återanvänder dock `categorizeLaps()` från v2-modulen direkt — den är ren JS-logik utan styling.
- **Map-bakgrund: Carto Positron-tiles funkar i båda teman** (de har en mjuk creme/varmgrå palett som passar Warm bättre än v2:s gråskala). Container-bakgrund + border är tema-känsliga via `t.paperHi`/`t.line`. Polyline-segment per pulszon är samma logik som v2 — bytte bara färgerna mot Warm-zone-paletten.
- **`WarmErrorBanner` är default-export.** Importerar man den som `{ WarmErrorBanner }` får man build-fel. Mönster: alla Warm-komponenter exporteras `default` när det är en single-component-fil (matchar v1-konventionen), och specifika utility-filer (`fit.ts`, `parts.tsx`) exporterar named members. Den tar också `t` som prop — bygg-fel om det missas.
- **Hero-tile på Hub: planerat först, genomfört som fallback.** Om dagen har en planerad pass — visa det med taggar, ACC-eyebrow `pass · {tid} · {typ}`. Annars: om ett pass redan är genomfört utan koppling till plan, visa det som "Genomfört"-hero. Annars: om nästa pass finns inom 7 dagar, visa "Nästa · imorgon"-hero som länkar till coach. Annars tom-state. Tre fallback-nivåer som täcker normal användning.
- **Tag-pills i hero-tile parsas ur `passdetaljer`-fritext.** Plan-objekten har inte strukturerade övningar, så tag-pills härleds genom att splitta passdetaljer på newlines/komma/semi-kolon och plocka första 6 segment under 32 tecken. Designprintet visar 5 övningar — 6 är max så raden inte spränger. För pass utan passdetaljer (t.ex. ren tid + tempo): skippa pillarna och fall tillbaka på syfte/tid-rad.
- **AI-stream är inte SSE i Coach.** `/api/fitness/coach` är JSON-endpoint som returnerar full plan när Claude är klar (~20 s). Briefen använder ordet "AI-stream" — i context betyder det "AI-genererat innehåll levererat live", inte server-side SSE. Coach-flödet renderar generating-spinner i 20 s och flippar sedan till draft-panel. För framtida iterationer: skulle kunna konvertera till SSE för progressiv plan-visualisering, men det kräver att Claude också emiterar partial JSON som vi parsar progressivt — komplexitet utan stor UX-vinst.
- **Plan-modalen är portal-renderad till `document.body`.** Samma stacking context-fälla som dokumenterats i flera tidigare sessions: framer-motion-wrapper i `(warm)/v3/layout.tsx` (för pull-to-refresh) skapar en isolerad context, så `z-index: 1000` på en modal inuti page-komponenten förlorar mot z-50 på TabBar:en. Lösning: `createPortal(modal, document.body)` med `mounted`-guard. WarmModal-primitiven implementerar mönstret en gång — använd den för all framtida Warm-dialog.
- **Display-headline + italic-tail som mönster** (HubDisplay/DetailHero) — fungerar utmärkt för korta, medvetna formuleringar som låter naturligt i italic. För mer formella titlar (t.ex. "Alla pass *genom åren.*") fungerar det också. Mindre lyckade fall: tekniska titlar som inte tål kursivering. Håll kursiv-svansen kort (max 3 ord) för bästa rytm.
- **Cache-stale Turbopack-fel i `preview_logs`.** När jag första gången bytte `(warm)/v3/fitness/page.tsx` från en tidig draft till färdig version visade `preview_logs --level=error` fortfarande gamla "Module not found"-fel från den raderade versionen i flera minuter. Filen var ren, browsern kompilerade utan fel — men logbufferten höll kvar gamla rader. Strategi: sök i loggen efter den specifika filen (`search="page"`) och ignorera cachelade fel som inte längre matchar källa, eller lita på `preview_screenshot` + DOM-eval för verifiering.
- **Sparkle-badge är liten med flit.** På 36×36 sport-ikon-cirklar sitter `SparkleIcon size={11}` i nedre högra hörnet med `position: absolute; right: -3; bottom: -3` så ikonen sticker lite utanför cirkeln men förblir inom raden. Större size (14+) konkurrerar med sport-glyfen. Färg = ACC + fill ACC ger optisk tyngd även vid 11 px.
- **Plan-match: gjord dagen efter slår dagen före.** Återanvänder `matchWorkoutsToPlans()` från W2 (egentligen Session D.5 i v2) — när en användare gör ett pass dagen efter planen flyttas vecko-grid:ens grön-bock till samma rad som planen, och en liten `→ tis 21`-svans visas i pill:en. Mönster är samma som v2 men med Warm-färger.
- **Recharts ersattes — Tremor/visx-alternativ inte testade.** För framtida charts (om vi får mer komplexa behov än linjer + areor + zon-band) kan visx vara värt att testa. För W3 räckte rena SVG-implementationer som inte beror på CSS-variabler.
- **Pass-sport-kategorisering: härled från slug, inte från workout-objektet.** På pass-detaljsidan kommer `parsed.type` från slug-parsern (t.ex. "Outdoor Running") medan `workout.type` kommer från xlsx (samma sträng). Använd `parsed.type` för display-eyebrow och kategori-test så att routen funkar även när workout-objektet ännu inte hämtats. Pass-titel ("13.35 km") tar dock från workout om det finns, fallback till FIT-summary.
- **Hero-eyebrow för pass-detalj är `PASS · {LÖPNING/CYKLING/...}`** — inte `LÖPNING · 13:35`. Designprintet visar "PASS · PUSH" så jag följer formatet `PASS · {sport}` rakt av. Tid + datum sitter i italic subtitle nedanför.

**Öppna frågor / vidare till W4+:**
- **Coach-tagline som AI-cache:** Nu härleds quote ur readiness-data (4 buckets). En 6 h-cachad AI-tagline (à la Garden-briefing) skulle ge mer kontextuell text — "varför just det här passet idag?". Implementeras som `/api/fitness/coach-tagline` med samma cache-pattern som garden/briefing, hookas in i COACH-tile.
- **Strength-pass-detalj saknar strukturerade övningar.** Designprintet visar named exercises ("Bänkpress", "Hantelpress") med set/rep/RPE — den datan finns inte i HealthFit-exporten eller Notion-planen idag. För styrketräning visas idag bara HR + RPE + tid + plan-match. Senare arbete: läsa `passdetaljer`-fritext och försöka strukturera, eller importera från en separat strength-app.
- **PR-pill ("PR" badge) saknas.** Designprintet visar PR-pill bredvid `Bänkpress`-titeln. Vi har ingen PR-detektering i v2 idag — kandidat till framtida session: jämför vikt × reps mot historik, flagga PR.
- **Apple-Fitness-stil "Ansträngning"-rad** med RPE-ring + signal-staplar saknas på pass-detalj-sidan i Warm. RPE syns istället som vanlig stat-cell. Lägg till om det visar sig sakna optisk tyngd.

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
