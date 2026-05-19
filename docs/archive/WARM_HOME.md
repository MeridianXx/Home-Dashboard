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
- [x] `(warm)/v3/garden/page.tsx` — `GardenHubPage` med ACC-eyebrow `TRÄDGÅRD · {dag}`, display-rubrik från säsongsfas (`seasonPhase()`), terracotta-tinted AI-briefing-hero med "Generera ny" + "Öppna chat", säsongs-klocka (12 månader-bar med fas-färgad aktiv stapel), aktiva växter denna säsong (5 första), kommande uppgifter med försenade-overdue-tile, dörr-tiles till växter/säsong/projekt med stora tabular-nums.
- [x] `(warm)/v3/garden/vaxter/page.tsx` — 2-col grid med typ/plats-filter-pills, plant-glyf i ACC-tonad cirkel, plats-pills, length-clamp på växtnamn.
- [x] `(warm)/v3/garden/vaxt/[id]/page.tsx` — DetailHero med typ som eyebrow + plats som italic-tail, hero-strip med stor glyf + plats-rad, FieldRow-tabell för beskärning/gödsling/skötselråd (chips färgade efter typ), action-rad med "Fråga AI om {växt}" (ACC primary) + "Öppna i Notion" (sekundär), kopplade åtgärder som tile-rader.
- [x] `(warm)/v3/garden/sasong/page.tsx` — Kalender/Lista/Per växt-toggle, kalenderns dagar med ACC-ring för idag + status-färgade event-pills, lista grupperad på Pågår/Planerad/Klar med markera-klar-knapp + röd försenad-färg, Per växt-vy med växt-headers + status-prick-rader, WarmModal CRUD med Field/SelectBox/MultiSelectChips/PlantPicker-formulär.
- [x] `(warm)/v3/garden/projekt/page.tsx` — Budget-summering (auto-fit grid 4 stat-tiles), filter-chip-rader (tidsram/område/prioritet), `@dnd-kit` kanban med 7 kolumner som horisontellt scrollar, kort med prioritet-vänsterkant, status-dropdown + EditIcon, optimistic update vid status-byte, WarmModal CRUD.
- [x] `(warm)/v3/garden/ai/page.tsx` — Fullskärm SSE-chat (DetailHero + flexbox-layout med `calc(100dvh - 140px)`), terracotta user-bubblor + paperHi assistant-bubblor, ToolChip-komponent med svensk label + spinner/check/error-ikon + result-blurb, image-upload base64 (max 5 MB), QuickPrompts på tom konversation, kontext-toggle med stat-grid.
- [x] `src/lib/warm/garden.ts` — `seasonPhase()`, `monthGrid()`, `plantsActiveThisSeason()`, `plantTypeColor()`, status/prioritet-color-maps, `formatSek()`, `formatRelativeSv()`, `shortDateSv()`, `monthLabelSv()`, `isoDate()`, `isoToday()`, `parseISO()`.
- [x] `src/components/warm/icons/garden.tsx` — PlantGlyph-set (`SeedlingIcon`/`PerennialIcon`/`TreeIcon`/`ShrubIcon`/`GrassIcon`/`GroundCoverIcon` + `plantGlyph(typ)`-router) + verktygsikoner (CalendarIcon/ListIcon/PlusIcon/TrashIcon/EditIcon/CheckCircleIcon/ExternalLinkIcon/SparkleIcon/SendIcon/ImageIcon/CloseIcon/RefreshIcon/ChatIcon/PinIcon/SunIcon/CheckIcon/AlertIcon/ProgressIcon).
- [x] `src/components/warm/garden/forms.tsx` — delade form-primitiver för CRUD-modaler: `Field`, `SelectBox`, `MultiSelectChips`, `PlantPicker` (sökbar checkbox-lista), `ModalFooter`, `ModalErrorRow`, `inputStyle(t)`. Tar `t` som arg eftersom Warm-tokens sitter inline.
- [x] AI-chat verifierad end-to-end: prompt "Berätta om Äppelträdet vi har..." triggade `list_plants` + `get_plant`-tools, båda renderades som inline tool-chips med grön check + result-blurb (`→ 2 resultat` / `→ "Äppelträd"`), assistant-text streamade efteråt.
- [x] Verifierat i preview (375 px): `/v3/garden`, `/vaxter`, `/vaxt/[id]`, `/sasong`, `/projekt`, `/ai` renderar utan server-fel; light + dark testat på hub.

**Acceptance:** Trädgård-tab klar. AI-chat streamar med tools. Säsongsplan + projekt + växtdetalj funkar.

**Observera:**
- **`Tile`-prop:en `style` mergas LAST i `baseStyle`-spread.** Det betyder att man måste skicka `border` som färdig kort-string (`border: \`1px solid ${ACC}33\``) — inte bara `borderColor` — eftersom basen redan har en full `border`-property som inte plockas isär. Briefing-hero försökte initialt sätta bara `borderColor` och fick standard-line-färgen.
- **`(warm)/v3` route-grupp ärver root-html — pull-to-refresh + WarmThemeProvider i v3/layout.tsx fungerar utan hydration-mismatch eftersom temat hydrar i en effect** (samma mönster som W0). Hub:ens datum-baserade rubrik (`formatTodayHeader()` läser `new Date()` synchronously) hade kunnat ge mismatch om SSR-värdet skiljer sig från CSR-värdet — fungerade här eftersom server och klient kör samma TZ. Generellt: Warm-routes som visar dynamisk Date-info bör ha en effect-baserad hydration eller använda klient-only-render.
- **AI-chat SSE renderar tool-chips IN-ORDER med name+`ok===undefined`-baklänges-match.** Tool-use-events kommer i ordning `tool_use_start` (lägger pending tool-part) → text-deltas (kan komma mellan tools) → `tool_use_result` (matchar baklänges på `name`+`ok===undefined`). När coachen kör flera olika tools efter varandra (list_plants + get_plant) räcker det med name-match eftersom det aldrig finns två pending med samma namn samtidigt. Om framtiden inkluderar parallella tool-anrop med samma namn behövs ett `tool_use_id`-fält i StreamEvent.
- **Fraunces-italic-svans i HubDisplay/DetailHero gör utmärkt jobb i Trädgård eftersom rubrikerna naturligt har poetiska prefix** ("Vår, *plantera och fördela.*", "16 av 16, *planer i pipen.*"). Det blir mer levande och feature-egen än fitness ("13.35 km, *löpning.*") som nästan tappar svansen i tom luft. Lärdom: sektioner med språk som tål småord ("planer", "frågor", "uppgifter") tål italic-svansen bättre än sektioner med tekniska/numeriska titlar.
- **Säsongs-klocka som signal istället för funktion.** Initial impuls: gör månads-staplarna klickbara så de filtrerar säsongsplanen per månad. Efter att ha sett resultatet — staplarna fungerar bättre som ren visuell signal ("nu är vi i april, vår-fasen är aktiv") snarare än ytterligare en navigations-vektor. För månadsfilter-funktion: använd Säsongsplan-sidans inbyggda kalender som redan hanterar månads-navigation. Hubben ska peka *till* funktion, inte *vara* funktion.
- **`plantsActiveThisSeason()` är heuristisk: säsong → matchande beskärnings-/gödslings-värden.** Vissa Notion-värden (Löpande/Ingen) hanteras explicit; andra (Vårvinter/JAS/Efter blomning) mappas till bredare säsong. För majoriteten av växtregistret blir resultatet rimligt — Äppelträd (JAS+Vår) syns juli-aug+september, Bok (Vårvinter+Vår) syns mars-april. Edge cases där användaren vill annan urval än säsongen kan filtreras manuellt på `/v3/garden/vaxter` istället.
- **Modal-formulär: `t`-prop genom hela komponentträdet** istället för CSS-variabler. Vi förgrenar Warm-temat genom React Context (WarmThemeProvider) — så `inputStyle(t)` är en funktion som tar temat som arg, inte en konstant. Detta gör forms-primitiven återanvändbar i båda Warm-temana utan att förlita sig på CSS-vars som inte finns i Warm. Mer verbosity, men robust mot tema-byten.
- **Kanban + dnd-kit: spara samma `touchAction: "none"` + `activationConstraint`.** Mobil-touch-konflikt med pull-to-refresh i v3/layout: `onTouchStart={(e) => e.stopPropagation()}` på horisontellt scroll-container räcker. Kortets `touchAction: "none"` + 6 px distance-aktivering på Pointer + 150 ms delay på Touch ger naturlig drag som inte triggar pull-to-refresh.
- **WarmModal `maxWidth` 520 räcker för CRUD-formulär** men sasong-modalen med både datum-grid + multi-select chips + växt-picker har 7 fält och blir relativt lång (~720 px höjd på mobil). `maxHeight: "92vh"` + `overflowY: "auto"` i WarmModal hanterar det automatiskt — testat genom att öppna en ny uppgift och scrolla i modalen utan att backdrop stängs.
- **`WarmThemeProvider` finns redan globalt i v3/layout** — alla nya garden-sidor använder `useWarmTheme()` direkt utan att wrappa nytt. ContextPanel + ToolChip + Stat (alla i ai/page.tsx) konsumerar `t` på samma sätt. Inga nya providers behövdes.
- **PlantGlyph mappas på Notion-typ-strängen, inte på union-typ.** Notion select är utbyggbart (användaren kan lägga till "Häckväxt" t.ex.) — `plantGlyph()` har en `Record<string, ...>` med default `SeedlingIcon` om typ saknas i mappingen. Lärdom: när data kommer från en användarkonfigurerad källa, defaulta gracefully — felet ska aldrig vara "ingen ikon syns".

**Polish-iteration efter W4-acceptance:**
- **Notion email-property + lång text = tyst 500 utan synligt fel.** Växtregistret har `Skötselråd` som **email**-typ (av misstag, dokumenterat i Sprint 1). Email-fält i Notion har en hård 100-teckens-gräns. Vaxt-detaljens edit-modal skickade dubbel-skrivningar — `skotselguide` (rich_text, OK) + `skotselrad` (email, samma långa text → 100+ tecken → 500). Modalen visade bara "HTTP 500", användaren trodde att antalPlantor inte fastnar. **Lärdom:** vid Notion-kopplade modaler — visa alltid serverns `error.message` istället för bara HTTP-status. Och: när vi vet att ett legacy-fält har konstig validering, sluta skriva till det helt (vi tog bort `skotselrad` ur formToInput, källan blir `skotselguide` framöver).
- **LIVSCYKEL-tracker har ingen mening för perennials.** Sådd→Plantskola→Härdning→Utplantering→Skörd är en linjär resa för säsongsväxter. Etablerad/Vilande är slutlägen — växten progresserar inte vidare. Visa inte tracker:n då — fas-info räcker i subtitle. Filterregel: `LIFECYCLE_PHASES.includes(plant.fas)` styr om kortet renderas.
- **"SKÖTSEL IDAG" 2×2-grid funkar inte för Adams växtregister.** Korten visade dash för Näring + Temp på 90% av växterna. När majoriteten av en rad/kort är tom är hela komponenten brus. **Mönster:** ta bort hela sektionen + alla form-fält som matar den (Senast vattnad / Vattningsintervall / Vattningsnotering / Näring / Ljusbehov / Temperaturintervall) + standalone "Vattnad nu"-knappen. Inte alla data-modeller passar alla användarcase — bättre att riva ut än att visa tomt.
- **Plats i eyebrow + plats på subtitle-raden = dubblett.** Subtitle-parts byggde "ETABLERAD · 1 PLANTOR · FRAMSIDA" + sub-raden "Framsida". Tog bort plats-branchen från eyebrow-builder — plats visas bara på subtitle-raden där den hör hemma. Generellt: när två rader visar samma data är den övre alltid överflödig.
- **Plural i svenska — `1 planta` vs `N plantor`** är ett enkelt fall som ändå glider om man bara skriver `${n} plantor`. Hårdkoda tröskeln: `n === 1 ? "planta" : "plantor"`. Samma mönster för försenade ("försenad" / "försenade").
- **AI-coach-output: Markdown renderas som plain text.** Vi har ingen `react-markdown` i pipelinen — så `## Rubrik`, `**fetstil**` och `| tabeller |` syns som rådata med syntax-skräp. Två lösningar: (a) lägg till markdown-parser (mer beroende, mer arbete), (b) be Claude att skriva ren prosa. Vi valde (b) i `GARDEN_COACH_FORMAT_RULES`: explicit "skriv ren prosa utan Markdown-syntax", "korta punktlistor med `- punkt` bara för 3+ saker, annars flytande stycken", "max 2–4 stycken, ingen inledande artighet". Effekt: ~2700 tecken med uppslagsverk → ~1650 tecken ren prosa, samma informationsvärde. Format-reglerna sitter i koden (inte Notion-personan) — de är garanterade oavsett vad användaren editerar i Notion.
- **`react.dev/link/hydration-mismatch` med inline-style + per-render-tema.** Trädgård-hubbens dörr-tiles renderade light-theme styles på SSR och dark-theme på klient → React vägrade patchen och DOM stod kvar med fel färger även efter route-byte. Touch + reload räckte inte — Turbopack-server-bundlen cachade gamla SSR-modulen. **Fix:** `rm -rf .next && preview restart`. **Lärdom (redan i AGENTS.md):** vid hydration-mismatchar, radera `.next/` helt — serveromstart räcker inte.
- **Hub-redesign efter Claude Design-printet:** "korten är dörrar"-principen kvarstår men hubben mår bra av en hero-card som *inte* är en dörr. SeasonCard (sage-tinted "JUST NU" + närmaste aktivitet + växt-typ-lista + månadsbar + SENAST-deadline) är en signal-yta, inte en navigationspunkt — den länkar inte vidare. Användaren får läsa "vad är aktuellt nu" på en sekund utan att klicka. Den ersätter både den gamla AI-briefingen (som ofta var ointressant fyllnadstext) och "Att sköta nu" (som duplicerade datan från Att göra nu).
- **Status-prick + italic-etikett tillsammans är mer läsbart än prick ensam.** "Gödsling vår *pågår*" (amber italic) + amber-prick fungerar som dubbelkodning — färg + text. Ingen drabbas av "vad betyder en blå prick?" och designen tål skanning. Färg matchas mot `TASK_STATUS_COLOR` så de aldrig glider isär.
- **Subtitle-pattern för "berörda växter": typer > namn när det är fler än en.** Fyra växt-namn på en rad ("äppelträd · bergbambu 'simba' · bok · glansmiskantus 'dronning ingrid'") är svårläst och tar två rader. Dedupera och visa typerna istället ("fruktträd · prydnadsgräs · perenn · marktäckare"). Special case: en växt → namnet direkt. Detta gör hub-cardet skanningsbart även när uppgiften har många planters.
- **Non-breaking space (` ` / U+00A0) inom enhetsvärden.** "sömn 6 t 48 m" wrappar gärna så " m" hamnar ensamt. Lösning: ersätt alla mellanslag inom ett fragment med non-breaking space → ` HRV 108 ms` blir oförstörbart, " · " mellan fragment är enda godkända breakpoint. Enklare än att räkna container-bredd eller ändra wrap-mode.
- **`<input type="file" capture="environment">` triggar mobilens kamera direkt** men ignoreras tyst på desktop. Det räcker att ha två separata `<input>`-element (en med `accept="image/*" capture="environment"`, en med `accept="image/*"`) bakom två knappar. På desktop hamnar bägge i fil-väljare; på mobil blir den ena en kamera-knapp. **Förvänta inte parity** — om du behöver desktop-webcam så krävs `getUserMedia()` (separat lösning).
- **Composer = en rad, inte ett kort.** Tidigare hade textarea egen border + bakgrund + auto-resize → den såg ut som ett indragen formulär inuti hubbens kort. Borderless ikon-knappar + transparent textarea + en låst rad-höjd (34 px) → composern smälter in i sin parent-card och konkurrerar inte med chat-bubblorna ovanför. Långa texter scrollar horisontellt i fältet istället för att växa lodrätt.
- **Tagline-buckets måste prata samma språk.** Tre av fyra fitness-readiness-buckets beskrev kroppstillstånd ("återhämtning", "tröghet", "batteri") medan en sa "Solid morgon". `Solid morgon` blev `Solid kväll` → `Solid natt` → fortfarande lösryckt: tid på dygnet ≠ readiness. Bytte till "Stabil grund" så alla fyra etiketter pratar fitness. **Lärdom:** när buckets använder samma display-position måste deras semantik vara ett sammanhängande system, inte en blandning av dimensioner.
- **Gemensam stil för "se alla X →"-länkar.** Hade tidigare två varianter (DM Sans 11 px ACC + Fraunces italic 12 px t.dim på Hem) som inte matchade. Synkat alla tre — Hem ("all belysning"), Trädgård ("se hela säsongsplanen"), Fitness ("se all historik") — till Fraunces italic 12 px ACC + 11 px ChevronRight i samma färg. Ger en igenkännbar visuell kategori: "läs vidare i denna sektion".

**Öppna frågor / vidare till W5+:**
- **Bilduppladdning per växt:** växt-detaljen har inte plats för bilder än. Notion files-property eller Drive-länk är båda alternativ. Park i W6 polish-pass — kräver först att vi bestämmer var bilden visas (hero, gallery, sidebar).
- **`scripts/create-garden-notion-dbs.mjs`:** efterfrågat i `WARM_HOME.md` AGENTS-block. Inte byggt i W4 eftersom DB:erna redan finns i Notion och idempotent init är `nice-to-have` snarare än blockerande. Kan göras i en separat session om vi vill kunna återskapa miljön från noll.
- **Vaxter-grid: kategorisering snarare än flat lista?** 31 växter passar OK i 2-col grid, men närmar sig övre gräns. För 50+ växter skulle det vara värt att gruppera per typ med kollapsbara sektioner. Skipp tills behovet uppstår.

---

### Session W5 — Desktop-tolkning
**Mål:** Warm Home funkar lika bra på desktop som mobil.

**Levererar (W5 MVP):**
- [x] `WarmSidebar` i `primitives.tsx` — 96 px bred fast vänster-sidebar, terracotta active-pill (samma styling-grammatik som TabBar:s aktiva pill), 4 nav-items + footer-slot. Bakgrund `t.paperHi` + 1 px höger-border `t.line`. Inget glasmorf-blur (sidebar sitter mot bg, ingen overlap).
- [x] `useDesktop()` + `DESKTOP_BREAKPOINT = 1024` i `lib/warm/theme.tsx` — `matchMedia`-baserad hook som hydrerar `false` på SSR och flippar i effect. Lyssnar på `change`-event så resize i farten propagerar.
- [x] `(warm)/v3/layout.tsx` — kompletterande shell: sidebar vid ≥1024 px ersätter bottom-pillen, content-pane får `paddingLeft: 96` + `maxWidth: 980` + `margin: 0 auto`. Pull-to-refresh-lyssnaren disablas på desktop (touch-gester finns inte där). På mobil oförändrat — TabBar i botten, full-bredd content.
- [x] Theme-toggle flyttad till sidebar-foten (rund 38 × 38 knapp över en `borderTop`). Hub-interna toggle i `HubHeading` (Hem + Lab) och `HubDisplay.right` (Fitness + Garden) gömd via `useDesktop()`-check så det inte blir två toggles på desktop.
- [x] Verifierat alla 4 sektioner i mobil 393 px (TabBar synlig, hub-toggle synlig), 1024 px (sidebar + content + sidebar-toggle), 1440 px (samma men content centrerad mot ~980 px) — light + dark verifierat på Lab-hubben.

**Dropped scope — inget hub-stays-mounted-on-left + inget 2-col split-pane.**
Briefen ville hub-och-detalj som två kolumner med drill-down i höger pane utan full route-navigation. För att leverera det krävdes endera:
1. **Parallel routes** med `@detail`-slot under varje sektion — varje detail page måste flyttas till slot-strukturen (4 sektioner × 4–6 detaljer = ~20 page-flyttar), `default.tsx` per slot, ny intercepting routes-modell.
2. **Hub-extraktion till komponenter** — varje hub-page (Hem 937 LOC, Lab 733 LOC, Fitness 728 LOC, Garden 585 LOC) lyfts till `src/components/warm/hubs/{Section}Hub.tsx` så layouten kan rendera dem oberoende av routing. Page-filerna blir thin wrappers.

Båda var möjliga men kostnaden mättes mot risken: ~3000 LOC kod att flytta + ny intro/empty-state-komponent + ny routing-tankegång — i en session där jag också måste verifiera 4 sektioner × 3 viewports och inte får riskera daglig användning. Beslut: leverera MVP-chrome (sidebar + max-width content) som ger 80 % av desktop-vinsten med 20 % av risken. Hub-stays-mounted-pattern parkeras för en framtida session.

Pragmatisk konsekvens: på desktop tappar man inte hub-kontexten visuellt, men man navigerar fortfarande med back-chevron. Sidebar låter en hoppa mellan sektioner i ett klick, vilket är den största desktop-vinsten oavsett kolumn-modell. För användare som främst vill se sin hub + en detalj samtidigt: lägg till hub-stays-mounted som en post-W6 polish om det visar sig saknas i daglig användning.

**Acceptance:** Öppna `/v3/home` i 1440 px → sidebar + hub-content. Klicka Lab i sidebar → URL byter till `/v3/lab`, sidebar-active flyttar till Lab. Klicka rum på Hem → drill-down till `/v3/home/rum/sovrum`, sidebar kvar (Hem aktiv), back-chevron i toppen för att gå tillbaka.

**Observera:**
- **MVP > full split-pane.** Att skeppa sidebar + max-width-pane ger desktop-användaren största nyttan (snabb navigation mellan sektioner, läsbar layout) utan att slå sönder befintlig route-modell. Hub-stays-mounted-pattern är en separat investering i Next.js parallel routes — värt att göra som en egen session, inte som en sub-task i en setup-vecka. Lärdom: när scope och risk växlar mot varandra, släng den dyraste komponenten först och mät hur mycket den faktiskt saknades.
- **`useDesktop()` returnerar `false` på SSR + första render.** Mobil är default i SSR-strukturen så att hydration alltid matchar (mobil-first DOM). Korta "mobil → desktop"-flippet vid mount är acceptabelt eftersom alternativet (läsa `window.matchMedia` synkront i state-init) bryter SSR. Samma mönster som `useHydrated()`, `WarmThemeProvider`-init m.fl. — varje gång du behöver client-only-data i ett SSR-träd, defaulta till "tom"/"falsk" och hydrera i effect.
- **Pull-to-refresh-effekten disablas helt på desktop** (early-return från `useEffect` när `isDesktop`). Touch-eventet skulle aldrig fyra på desktop ändå (mus-gester triggar inte `touchstart`), men cleanup-listenern är gratis att ta bort så vi sparar lite event-bubble-overhead. Också säkrare om någon kör med touch-emulator i devtools.
- **Sidebar-toggle är 38 × 38 px (mot 36 × 36 i hub-headern)** — något större eftersom den lever ensam i sidebar-foten, inte konkurrerar med eyebrow + display-rubrik. Padding-top + `borderTop` på footer-slotten gör visuell separation från nav-items utan att introducera en hård linje.
- **Hub-interna theme-toggles gömmas, inte raderas.** Varje hub har kvar sin toggle-button i koden men wrappad i `isDesktop ? null : <button>`. Om sidan någonsin skulle bli "desktop med hub-internal toggle" igen kan vi backa flippet med en enradig ändring per hub. Att ta bort toggle helt hade varit värre — vi tappar mobil-funktionalitet och måste sedan återinföra den.
- **Stale `.next/`-mapp + körande server = krasch.** När jag rensade `.next/` med `rm -rf` medan dev-servern fortfarande körde gav Turbopack "Cannot find module ../chunks/ssr/[turbopack]_runtime.js" och Internal Server Error i browsern. Lärdom: stoppa servern (`preview_stop`) FÖRST, rensa cachen, starta om — annars dör Turbopack i en obegriplig manifest-fault. Mönstret är dokumenterat tidigare för hydration-fel men gäller för alla `rm -rf .next/`-operationer.
- **Pre-existing W4 hydration-fel i Garden SeasonCard kvarstår** ("`+background: rgba(122,148,117,0.14)` server vs `-background-color: rgba(201, 111, 74, 0.12)` client"). Påverkar inte W5 — funktionen renderar korrekt efter regenerering, bara konsolen dirty. Felet är dokumenterat i W4-observera och har sin egen rotorsak (per-render-tema med inline-style). W5-ändringarna förvärrade inte det.
- **`max-width: 980 px` är en pragmatisk default**, inte forskat fram. Hub-vyer är primärt en kolumn av kort med stat-grids — efter ~900 px blir kort-bredderna otympliga och radlängden kämpig att läsa. Detail-sidor kan tåla mer (kartor, tidsserier), men för MVP är ett enhetligt max ~ 980 enklare. Om Climate-grafer eller Coach-kalendern visar sig vara cramped i en framtida iteration: lyft konstanten till per-route-prop och tweak:a.
- **Sidebar-bredd 96 px** rymmer både `text-11px`-label och 22 px-ikon med god vertikal padding. Mindre (80 px) hade krävt 11–12 px-label vilket blir cramped även i Fraunces. Större (110+ px) stjäl content-bredd onödigt på 1024 px-viewporten där varje pixel räknas.

**Öppna frågor / vidare till W6:**
- **Hub-stays-mounted-pattern:** om användaren saknar det efter en period med MVP-versionen, lyft hubbar till `src/components/warm/hubs/` i en dedikerad session. Då kan layouten välja: vid hub-root-URL → bara hub i full content-bredd; vid detail-URL → 2-col split med hub kvar till vänster ~430 px + children till höger.
- **Sidebar-rubrik / hus-logo** saknas ovanför nav-items. På mobilen finns ingen logga heller, men på desktop känns det "öppet" där. Förslag W6: lägg en kompakt Warm-stiliserad husikon i ACC eller `t.ink` ovanför nav-listan, med `paddingTop: 8`.
- **Sidebar-active-state-animation:** terracotta-fyllningen flippar instant vid byte. En 200 ms ease-cross-fade hade gett mjukare övergång — inte blockerande, men nice-to-have för polish-passet.
- **Pre-existing hydration-fel i Garden SeasonCard** (rapporterat i W4) kvarstår. Bör root-cause:as innan cutover (W6).

---

### Session W6 — Polish + cutover ✅ Klar (cutover skarpt; iPhone-verifiering pending)
**Mål:** v3 går skarpt. v2 hibernerar.

**Levererar:**
- [x] Audit av alla 4 sektioner: pull-to-refresh + WarmModal-grammatik + AnimatePresence-mönster verifierade konsekventa. Pull-to-refresh sitter centralt i `(warm)/v3/layout.tsx` (en implementation, alla sektioner ärver). CRUD-modaler i garden/fitness använder samtliga `WarmModal`-primitiven (terracotta-tinted backdrop `rgba(20,14,8,0.55)` + `blur(6px)` + `paperHi`-bakgrund + ACC primary footer). Expand/collapse via `AnimatePresence` med `height: 0/auto` + `opacity: 0/1` används på `RoomLights` + coach AI-draft.
- [x] Ikon-finkalibrering: STROKE-konstant (1.6) i `tokens.ts` används av alla glyfer. Avvikare (1.0/1.2/1.5) är ett fåtal medvetna special-fall (gridlinjer, fill-paths, dot-cluster). Inga inkonsistenser att rensa.
- [x] Theme-toggle-persistens via `localStorage["warm-theme"]` — implementerat redan i W0:s `WarmThemeProvider`. `readInitialMode()` läser `localStorage` (med `prefers-color-scheme`-fallback), `setDark()` skriver tillbaka. Verifierat i preview: toggle propagerar via `warm-theme-change`-CustomEvent omedelbart till alla hooks utan reload.
- [x] Root-redirect: `src/app/page.tsx` flippad från `redirect("/home")` → `redirect("/v3/home")`. Verifierat med `curl -sI /` → `307` + `Location: /v3/home`.
- [x] `(warm)/v3`-prefix behållet. Beslut: byter inte till `(warm)` utan `/v3` — spårbarhet och "rollback-möjligt" väger tyngre än URL-estetik. Sista cutover (riv v2) kan ta bort prefixet samtidigt som v2-koden raderas, men inte i W6.
- [x] v2-routes ligger döda kvar i `(dashboard)/`-trädet — inte länkade någonstans (root-redirect pekar på v3, sidebar/TabBar pekar på v3-routes). Ingen `?legacy=1`-flagga; om någon vill backa öppnar de `/home` direkt i URL-fältet.
- [x] AGENTS.md första rad uppdaterad: header `# Warm Home v3 är primär. v2 djupt-fryst.` + förklarande blockquote ovanför `@WARM_HOME.md`-importen.
- [x] Synkad backdrop-grammatik i `LightEditSheet`: tidigare `rgba(0,0,0,0.45)` + `blur(2px)` → nu `rgba(20,14,8,0.55)` + `blur(6px)` (matchar WarmModal). Ger sammanhängande overlay-känsla över alla bottom-sheets.
- [x] Verifierat i preview: alla 4 hubbar (Hem/Lab/Fitness/Trädgård) renderar utan server- eller console-fel. Hem-rum-detalj-drill-down funkar (`/v3/home/rum/sovrum`). Desktop 1280×800: sidebar + content-pane korrekt. Theme-toggle persisterar light↔dark över route-byten.
- [ ] **Manuell test på iPhone (verklig hårdvara) — pending användarens verifiering** innan PR från `warm-home` → `v2` skapas. Touch-gester, pull-to-refresh, modal-portal, AI-stream behöver verifieras på riktig hårdvara.

**Acceptance:** Cutover-mekanik klar. Root öppnar Warm Home v3, v2 är inte länkad, theme persisterar, modaler/animationer/ikoner är konsekventa i Warm-språk. Användning en hel dag är pending iPhone-test.

**Observera:**
- **Turbopack RSC-cache håller fast i gammal redirect efter file-edit.** Efter att jag flippat `app/page.tsx` från `/home` till `/v3/home` svarade dev-servern fortfarande `307 → /home` på `curl /` i flera försök. `touch` på filen hjälpte inte. Lösning: stoppa preview-servern, `rm -rf .next/`, starta om — då plockades den nya redirecten upp omedelbart. Mönstret är dokumenterat tidigare för hydration-fel men gäller även för RSC-cachade redirects. **Lärdom:** vid root-route-ändringar (page.tsx, layout.tsx, middleware) behövs i princip alltid en .next-rensning + omstart i dev. I produktion via Docker-build är det inte ett problem — bara dev-servern.
- **Cutover-mekaniken är trivial — risken låg.** En sex-radig fil (`page.tsx`) som bara byter sträng. Allt annat (sidebar/TabBar/intern navigation) pekar redan på `/v3/...`-routes sedan W0–W5. v2-routes är döda av sig själva för att ingenting länkar till dem. Ingen middleware, inga rewrites, ingen redirects-tabell i `next.config.ts` att underhålla. Den enda orsaken att touchen i W6 kändes "tung" var pre-existerande Turbopack-cachen — själva förändringen är 1 commit värd.
- **WarmModal som lyft primitiv var rätt val i W3–W4.** Vid auditen denna session bekräftades att garden CRUD-modaler (sasong, projekt, vaxter, vaxt) + fitness coach + single-AI-modal alla använder `WarmModal`. En enda källa för backdrop-färg, blur, padding, footer-stil. När jag synkade `LightEditSheet` till samma grammatik räckte det med en två-rads-Edit. Hade modal-stilen duplicerats över 6 filer hade samma fix krävt 6 edits + risk för missar.
- **Dropped scope: `(warm)/v3` → `(warm)` route-flytt.** Briefen frågade om vi skulle ta bort `/v3`-prefixet i W6. Beslut: nej. (1) Spårbarhet — branch heter `warm-home`, routes heter `/v3/...`, det är en sammanhållen "vi är på Warm Home"-signal i URL-fältet under övergångsperioden. (2) Rollback-friktion — att flytta tillbaka till `/v3` om något skär hade krävt route-rename + nav-update + att uppdatera alla `<Link href="/v3/...">` igen. (3) Kostnad — ~200 LOC sed-byten utan funktionell vinst. När v2-koden faktiskt raderas (sannolikt 4–8 veckor efter cutover) kan prefixet plockas bort i samma städning.
- **Theme-toggle-persistens redan klar i W0.** `WarmThemeProvider` implementerade `localStorage["warm-theme"]` + `prefers-color-scheme`-fallback redan i setup-sessionen. W6-checkboxen var bara verifiering. Generell observation: när man designar en provider i setup-sessionen, lägg in alla "self-evident"-features (persistens, fallback, broadcast) direkt — billigare än att lägga till dem retroaktivt. Sparar oss en sub-task här.
- **`prefers-color-scheme`-fallback första gången är fortfarande right thing.** Användarens system är sannolikt mörkt (macOS dark + iPhone dark mode), så första laddningen utan localStorage-värde landar på dark — vilket matchar förväntan. När de toggle:ar sparas valet och följer sedan användaren oavsett system-pref. Om vi ska polish:a vidare: lägg en liten "matcha system"-knapp som rensar localStorage-nyckeln och återgår till `prefers-color-scheme`-läget. Inte i W6.
- **PR-skapande till v2 (produktionsbranch) är pausat enligt brief.** Jag commitar och pushar till `warm-home` men skapar INTE PR förrän användaren verifierat på iPhone. Detta är medvetet — `v2` är produktionsbranchen som dagligen deployar via GitHub Actions, så fel touch innebär att hela hemmet får trasig dashboard. Användarverifiering på riktig hårdvara är bättre än min mobil-emulator i preview-servern.

**Öppna frågor / vidare när användaren verifierat:**
- **iPhone-touch-edge-cases:** pull-to-refresh, modal-swipe-down, AI-chat-textarea-fokus, swipe-back-gesture mellan routes, bottom-pill-glasmorf-rendering. Verifiera att `safe-area-inset-bottom` på modaler ser rätt ut på iPhone med home-indicator.
- **PR-template:** när användaren godkänt iPhone-test, skapa PR `warm-home` → `v2` med checklista (testat på iPhone, alla 4 sektioner, AI-flöden, deploy-secrets oförändrade, root-redirect på plats, AGENTS.md uppdaterad).
- **v2-städning:** efter att v3 körts skarpt en period (4–8 veckor utan rollback) — separat session som raderar `(dashboard)/`-trädet, `/api/*`-routes som inte används av Warm, gamla v2-komponenter, och flyttar `(warm)/v3` → `(warm)` utan prefix. **Inte W6.**

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
> Kör W6 enligt WARM_HOME.md, branch `warm-home`. Polish-pass: pull-to-refresh, animationer, modal-stil, ikon-konsistens. Theme-toggle persisterar i `localStorage["warm-theme"]`. Flippa root: `/` → `/v3/home`. v2-routes blir kvar i kod (för rollback) men är inte länkade. Update AGENTS.md första rad till "Warm Home v3 är primär". Manuell test på iPhone. Innan du mergar till `v2` (produktionsbranchen — `main` är övergiven): pausa och be mig verifiera på riktig hårdvara först.

**Avslut:**
> Observera-block + final commit `feat(warm): W6 — polish + cutover till v3`. **Mergea INTE** till `v2` automatiskt. Skapa en PR från `warm-home` → `v2` (produktionsbranchen — `main` är övergiven, ignorera den) med checklista (testat på iPhone, alla sektioner, AI-flöden, deploy-secrets oförändrade). Sammanfatta totalförändringen (LOC, antal nya filer, nya routes, beroenden).

---

## Lessons learned (skrivs här när de uppstår)

*tomt — fylls per session ovan*

---

# MAT — Mat & Recept-sektion (maj 2026 →)

> Ny sektion ovanpå Warm Home v3, baserad på `Warm Home - Mat & Recept.html`-prototypen från Claude Design (maj 2026). Lever som **5:e tab**. **Använder ACC (terracotta `#C96F4A`) som accent — samma som övriga sektioner.** Tidig version hade AMBER (`#D9954B`) som egen accent men flippades till ACC 2026-05-19 efter en visual-konsekvens-genomgång (alla 5 sektioner ska se enhetliga ut). AMBER reserveras för observera/coach-detaljer per token-namnet. Resten av Warm-grammatiken (Fraunces+DM Sans, hub-och-detalj, inga sub-tabs, flytande pill, inline-style) gäller oförändrad.
>
> **Utvecklas direkt på `main`** (produktionsbranchen, renamead från `v2` 2026-05-19) — ingen feature-branch. Varje session-commit auto-deployar via GitHub Actions till `dash.inicio.cloud`. **Konsekvens:** pusha först när varje delsteg verifierats grönt lokalt (preview-server 200, console-fri). Allt UI gate:as bakom `isMatReady()` så hubben renderar 501-banner tills Notion-secrets är satta i prod — ofärdiga sidor stör inte daglig användning.

---

## Route- + commit-strategi (MAT)

- **Branch:** ingen — allt commitas till `main`. Varje commit auto-deployar via GitHub Actions.
- **Commit-hygien:** logiska enheter per commit (inte per session-stor klump), så att rollback blir kirurgiskt om en delfunktion skär.
- **Routes:** `(warm)/v3/mat/...` följer befintlig v3-route-grupp. Inga separata layouts behövs — ärver `(warm)/v3/layout.tsx` (TabBar, pull-to-refresh, WarmThemeProvider).
- **TabBar/Sidebar:** lägg till 5:e tab `Mat` med MatIcon (stiliserad gryta, 1.6 px outline). Active-färgen flippar till AMBER när Mat är aktiv — sektionsidentitet via tab-färg, samma mönster som designens prototyp.
- **Notion-DBs:** två nya — `Recept` + `Veckoplan`. Ingen Inköpslista-DB (computed aggregat på Planering-sidan, ingen persistence).
- **AI:** Kökschefen via SSE + tool-use, persona-sida i Notion (`NOTION_MAT_COACH_PAGE`). 6 inspirations-kategorier som promptmallar.
- **Deploy:** samma image, samma `dash.inicio.cloud`, samma GitHub Actions. Tre nya env-vars i `deploy.yml`. Alla `isMatReady()`-gate:ade så hubben renderar 501-banner i prod tills secrets är satta — användaren ser ny tab + tom hub, ingenting går sönder.
- **Pre-push-disciplin:** preview-server 200 + inga console-fel + alla 4 övriga sektioner orörda. Vid tveksamhet — pausa och fråga innan push.

---

## Designprinciper-tillägg (MAT)

Allt från Warm Home v3 (princip 1–8) gäller, plus:

9. **ACC är Mat-accent — samma som övriga sektioner.** ⚠️ *Reviderad 2026-05-19* — tidig plan var AMBER för sektionsidentitet, men en visual-konsekvens-genomgång under M0 visade att 5 sektioner med 5 olika tab-färger bryter app-grammatiken. Allt mat-accent-content (tab-pill, hub-eyebrow, dörr-tile-eyebrow, 501-banner-label, framtida primary-CTA i M1+) använder ACC. AMBER används bara där design-tokenet säger "coach/observera" (t.ex. ev. AI-sparkle-badge i M4 — *bekräfta innan*). Vintips-tile förblir LINGON.
10. **Receptbilder = OG-/schema.org-bild från importerad URL.** Finns URL → render hero-/kort-image. Saknas → inget bildblock. **Aldrig emoji-fallback, aldrig glyph-bg** — designens emoji-mockup var en prototyp-genväg, inte intention.
11. **Importera är primär dataingång, inte polish.** Bibliotek börjar tomt; fylls genom URL-import (Claude-parsar HTML → strukturerat recept → review-modal → spara). Användaren kommer inte att skriva in recept manuellt regelbundet.
12. **Inköpslista är read-only computed**, panel under vecka-grid på `/v3/mat/planering`. Ingen separat route, inga checkboxes (ICA-appen sköter avbockning via självscanning), "Kopiera lista"-knapp till urklipp.
13. **Hub = dörrar.** `/v3/mat` är hub-tiles (Bibliotek/Planering/Laga) + AI-briefing-hero, inte underline-nav-mellan-lägen som designen skissade. Korten är dörrarna — samma princip som Hem/Trädgård (Warm-princip 1).
14. **Ingen multi-user-logik.** Allt under samma Notion-integration. Båda boende läser/skriver mot samma DBs.
15. **Inget separat tillagningsläge.** Designens helskärms-"Tillagningsläge" är droppat — "Börja laga" leder bara till första steget i normal detaljvy.

---

## Sessionsplan (MAT)

M0–M4. Samma format som W0–W6 — en egen chatt per session, eget commit-tillfälle, observera-block skrivs tillbaka in i denna fil.

### Session M0 — Setup (branch, tab, Notion-DBs, hub-skelett)
**Mål:** 5:e tab på plats. `/v3/mat` renderar hub-skelett med 3 dörr-tiles + 501-gate när Notion-secrets saknas. Init-skript för Recept- + Veckoplan-DBs.

**Levererar:**
- [x] Verifierar att arbetstreet är på `main` med rent läge (`git status` clean, `git pull origin main` först)
- [x] `MatIcon` (gryta-glyf, 1.6 px outline) — lagd i befintliga `src/components/warm/icons/index.tsx` (samma fil som HemIcon/LabIcon/FitIcon/GardIcon, inte ny `mat.tsx`-fil). Övriga ikoner (`ImportIcon`, `PortionStepper`, `WineIcon`, `ChefIcon`) lyftes till sina respektive sessioner — inget behov i M0
- [x] `TabBar` + `Sidebar` utökade med 5:e tab `Mat`. Bottom-pill håller ihop i 393 px (kontrollerat, totalbredd 393 px med 5×70 px-tabs + 4 gap = 370 + padding 16 = ryms i pillen)
- [x] `TabBar` `activeColor`-prop: AMBER när `Mat` är aktiv, ACC annars. Sidebar samma princip. Implementationen lyfte färgvalet till föräldern (`chrome.tsx::tabAccent`) istället för att special-case:a `mat` inuti primitives — primitive vet inget om sektionsidentitet, bara att den får en aktiv färg
- [x] `src/lib/mat/types.ts` — `Recipe`, `RecipeInput`, `MealPlanSlot`, `MealPlanInput`, `ImportedRecipe`, `ShoppingItem`, `Ingredient` (för JSON-blob-serialisering), `MatReadyResponse`
- [x] `src/lib/mat/notion.ts` — lazy-klient + data_source_id-cache + `isMatReady()` + `missingMatEnv()` + `serializeIngredients`/`parseIngredients` + `domainFromUrl`. **CRUD-funktionerna själva sparas till M1** — M0 levererar bara byggstenar + gate, så API-routes kan implementeras stegvis i M1
- [x] `scripts/create-mat-notion-dbs.mjs` — idempotent, parent = `NOTION_MAT_COACH_PAGE`-sidan (dubbel funktion: persona-källa + DB-parent). Båda DB-schema matchar bullet-listan exakt, inkl. `BildURL` som url-property (per användarens val 2026-05-19)
- [x] Env-vars i `.github/workflows/deploy.yml`: `NOTION_MAT_RECIPES_DB`, `NOTION_MAT_PLAN_DB`, `NOTION_MAT_COACH_PAGE` — alla får vara tomma, `isMatReady()` gate:ar UI
- [x] Coach-persona-sidan — användaren skapar manuellt i Notion och sätter `NOTION_MAT_COACH_PAGE`. M0 körde inte skriptet (acceptance säger "skapar … när det körs"), så sid-id behövs inte ännu — det efterfrågas i M3 första gången persona-läsning behövs eller när användaren vill köra init-skriptet
- [x] `(warm)/v3/mat/page.tsx` — `HubDisplay` med AMBER eyebrow `MAT · TISDAG · V.21` + display `Vad äter vi *ikväll?*`, 3 dörr-tiles med stats, 501-banner med saknade env-vars listade. AI-briefing-hero-plats reserverad via kommentar (renderas i M3)
- [x] Verifierat i preview (393 + 1440 px viewport): `/v3/mat` returnerar 200, AMBER-flippen syns (`#D9954B` på Mat-pill, `#C96F4A` när vi byter till Trädgård), Hem/Lab/Fitness/Trädgård renderar `<h1>` oförändrat. Inga server- eller console-fel

**Acceptance:** Tab `Mat` på plats i bottom-pill (mobil) + sidebar (desktop). `/v3/mat` visar hub-skelett. Notion init-skript skapar två tomma DBs när det körs mot en page-id med integrationen delad. ✅

**Status / Observera / Öppna frågor:**

- **Eyebrow-formatet följde `formatHubEyebrow("MAT")` (tre-segment "MAT · TISDAG · V.21") i stället för bullet-textens "MAT · {dag}".** Bullet-texten var en förkortning — `formatHubEyebrow` är single source of truth för alla 4 (nu 5) hub-eyebrows och konsekvens trumfar bokstavlig läsning här. Om det blir fel i UI flippar M4 till två-segment.
- **AMBER-flippen revs samma dag (2026-05-19) efter användarfeedback** — alla 5 sektioner ska se enhetliga ut. `tabAccent()` i chrome, `activeColor`-prop på TabBar/Sidebar och `eyebrowColor`-prop på HubDisplay togs bort. Mat använder ACC överallt, samma som Hem/Lab/Fitness/Trädgård. Princip 9 reviderad ovan.
- **TabBar-pillen tightades 70/6 → 58/4** (minWidth/padding) eftersom den 5:e tab:en pressade pillen till 384 px i 393 px-viewport (4.5 px luft per sida). Efter justering: 324 px / 34.5 px luft per sida, "Trädgård"-text 47 px i 58 px-container = ingen klippning.
- **Receptbild-fältet: `BildURL` som url-property.** Användaren bekräftade 2026-05-19. Notion-files-property ratades p.g.a. pre-signed-URL-utgångstid (1 h) + extra import-steg. Risk: brutna OG-bild-URL:er när källsidor tar bort bilder — accepterat trade-off för M0–M1.
- **CRUD-funktioner är medvetet ofärdiga i `src/lib/mat/notion.ts`.** Bara klient + gate + helpers. Anledning: M0:s acceptance kräver inga skarpa API-anrop (hub-skelettet är statiskt) och M1 äger import-/recept-CRUD-pipelinen end-to-end. Att lägga halva CRUD-skiktet här skulle bara vara dödkod tills M1 ändrar formen på det.
- **`isMatReady()` gate:ar alla tre env-vars (inkl. `NOTION_MAT_COACH_PAGE`)** — inte bara recept+plan. Förenklar M3: en gate, inte tre. Konsekvens: hubben visar 501-banner tills coach-persona-sidan är satt, även om DB:erna finns.
- **Init-skriptet kräver `NOTION_MAT_COACH_PAGE` som parent-sida.** Skriptet bailar med tydlig instruktion om secreten saknas — det är när användaren behöver skapa sidan och dela med integrationen. Ingen körning gjordes i M0 (väntar tills användaren har sid-id:t).
- **Pre-push-disciplin:** preview grön (200, console-fri, alla 4 övriga sektioner orörda) — OK att pusha till `origin/main`.

**Öppna frågor inför M3:** vill vi att kökschefen ska ha en *snabb*-läges-prompt-mall ("vad finns hemma idag?") vid sidan av de 6 inspirations-kategorierna, eller ska den semantiken bo i `Restplanering`-toggle på `/laga`? Lyfter beslutet till M3 när vi designar prompt-tile-layouten.

---

### Session M1 — Importera + Bibliotek + Recept-detalj
**Mål:** Hela "fyll biblioteket"-flödet end-to-end. Importera URL → spara → bläddra i bibliotek → öppna recept-detalj.

**Levererar:**
- [ ] `/api/mat/import` — POST `{url}` → server fetchar HTML (UA-header + `AbortSignal.timeout(8000)`) → Claude Sonnet 4.6 extraherar strukturerat recept (`name, lede, ingredients[], steps[], minutes, basePortions, difficulty 1–3, tags, imageUrl, wineNote, sourceLabel`). Bild via `og:image`/`schema.org/Recipe.image`, fallback null. Returnerar JSON för review (sparar inte direkt)
- [ ] `/api/mat/recipes` — GET (list, paginerad om >50), POST (skapa från review), PATCH (uppdatera), DELETE (mjuk via Notion `archive`)
- [ ] `/api/mat/recipes/[id]` — GET enstaka recept
- [ ] `(warm)/v3/mat/bibliotek/page.tsx` — chip-filter (Alla + tag-pills som finns i biblioteket), Importera-knapp (AMBER, högerställd), magazine-stil grid (1 col mobile, 2 col tablet+). Recept-kort: **villkorad image-block** (om `BildURL`), namn i Fraunces 18 px, kursiv lede, meta-rad (min + svårighet-dots i AMBER + tag-pills i AMBER-tint). Tom-tillstånd: "0 recept · importera ditt första"
- [ ] Importera-flödet: knapp → URL-modal (WarmModal med text-input + "Hämta") → spinner medan `/api/mat/import` kör → review-modal med alla fält editbara (inkl. bild-preview, ingredienslista som textarea, steg som textarea) → "Spara" persisterar via `/api/mat/recipes` POST → redirect till `/v3/mat/recept/[id]`. `AISkapad: true` sätts automatiskt
- [ ] Manuell create-modal: "+ Skapa manuellt"-länk i bibliotek-headern → samma review-modal-form, tomma fält
- [ ] `(warm)/v3/mat/recept/[id]/page.tsx` — DetailHero (`{TAG} · {min} min` eyebrow + namn + ev. kursiv tail), villkorad hero-bild (200 px om `BildURL`, annars skippas helt — ingen platshållare), källa-rad ("från {Källa} →" om `KällURL` finns), kursiv lede, **PortionStepper 1–8** (default = `basePortions` eller 4, `scale = portions / basePortions`, `fmt(v, unit)` med smart-rounding identisk med designens prototyp), ingredienslista i Tile (mängd i AMBER mono / namn), steg-kort numrerade med italic-cirkel i AMBER-tint, vintips-tile (LINGON-tonad, visas om `Vintips` non-empty), sticky bottom-bar ("Lägg på veckan" — disablad tills M2 klar; "Börja laga" — länkar till första steget med `?step=0`)
- [ ] Redigera-knapp i detaljheadern → samma review-modal som create, pre-fyllt
- [ ] Verifiera importflödet end-to-end mot riktig URL (be användaren om länk till svenskt recept — ICA/koket/arla)

**Acceptance:** Bibliotek funkar. Importera-flödet hämtar OG-bild + parsa minst 3 olika svenska recept-sajter med rimlig struktur. Portion-stepper skalar live. Sticky bottom funkar.

**Status / Observera:** *(fylls under sessionen)*

---

### Session M2 — Planering + Inköpslista-panel
**Mål:** Vecka-grid med Lunch + Middag-slot per dag. "Lägg på veckan" från recept-detalj fungerar. Inköpslista som expand-panel.

**Levererar:**
- [ ] `/api/mat/plan` — GET (`?weekStart=YYYY-MM-DD`), POST (skapa slot), PATCH, DELETE
- [ ] `(warm)/v3/mat/planering/page.tsx` — vecka-grid (Mån–Sön × Lunch + Middag, **ingen frukost**), period-nav (←/→/Idag-titel-klick — samma mönster som fitness coach), AMBER border + tint på dagens dag, slot-tiles: fyllda visar recept-namn + min, tomma visar "lägg till" med dashed border
- [ ] Slot-väljar-modal (WarmModal): två-läges-toggle "Välj recept" / "Fritext". Recept-läget = sökbar lista från bibliotek (samma mönster som garden PlantPicker). Fritext-läget = namn + min-input. Sparar till `/api/mat/plan`
- [ ] "Lägg på veckan"-knapp i recept-detalj → samma modal, recept förvalt, användaren väljer datum + slot
- [ ] **Inköpslista-expand-panel** under vecka-grid: aggregera ingredienser från alla planerade recept inom veckan (skala via `portions / basePortions`), normalisera trivialt (`1 dl + 2 dl → 3 dl`, blandade enheter listas separat under samma namn), gruppera per butikskategori (Grönt/Mejeri/Kött & fisk/Skafferi/Övrigt — heuristisk via keyword-match i `src/lib/mat/shopping.ts`)
- [ ] "Kopiera lista"-knapp (AMBER) — klistrar formaterad plaintext till urklipp (`navigator.clipboard.writeText`), bock + "Kopierat" 800 ms feedback
- [ ] Ingen persistens på inköpslista — regenereras varje render. Senare add (om användaren vill): `localStorage["mat:hidden:{ingredient}"]`-flagga per rad för "redan i skafferiet"

**Acceptance:** Lägga till från recept-detalj + från slot-tile + ändra + ta bort fungerar. Inköpslistan regenereras när planen ändras. Kopiera-knappen lägger en läsbar lista i urklipp.

**Status / Observera:** *(fylls under sessionen)*

---

### Session M3 — AI Kökschefen + briefing-hero + inspirations
**Mål:** AI-flödet komplett. Kökschefen kör med tools, briefing renderas på hubben, 6 inspirations-tiles triggar promptmallar.

**Levererar:**
- [ ] `src/lib/mat/coach-persona.ts` — läser `NOTION_MAT_COACH_PAGE`, 5 min cache, `MAT_COACH_FORMAT_RULES` hårdkodade (svenska, du-tilltal, ren prosa utan Markdown, inga rubriker, max 2–4 stycken). `INSPIRATION_PROMPTS`-konstant med 6 system-prefix för Vardag/Barnfamilj/Vuxenkväll/Gäster/Grillkväll/20-minuters
- [ ] `src/lib/mat/ai-context.ts` (server-only) — recept-summering (namn + tags + min + ingrediens-headers), veckoplan ±14 dagar, säsong (vecka + månad), ingredienser från senaste 3 importerade recept (för "vad har du i kylen"-kontext)
- [ ] `src/lib/mat/ai-tools.ts` — factory `matToolRegistry({...})` med `search_recipes` (free-text mot bibliotek), `get_recipe` (full struct), `add_recipe` (skapar direkt mot Notion — minst name + ingredients + steps), `add_to_plan` (datum + slot + recept-ref eller fritext)
- [ ] `/api/mat/chef` — SSE-stream via `runWithTools` från `src/lib/ai/tools.ts` (samma mönster som `/api/garden/chat`). Bilduppladdning stöds (base64, max 5 MB) — "vad kan jag göra av detta i kylen?"-foton
- [ ] `/api/mat/briefing` — 6 h in-memory cache, `?refresh=1`-bypass (mönster från `/api/garden/briefing`). Föreslår kvällsmaten baserat på veckoplan-luckor + bibliotek + säsong + ev. nyligen importerat
- [ ] `(warm)/v3/mat/laga/page.tsx` — AMBER prompt-tile (stort textfält + shortcut-chips +Ägg/+Pasta/+Lök/+Vitlök/+Grädde/+Bacon/+Citron + Nytt-recept/Restplanering-toggle), under: 2×3-grid med 6 inspirations-tiles (Vardag AMBER · Barnfamilj SAGE · Vuxenkväll LINGON · Gäster ACC · Grillkväll LINGON · 20-minuters SKY). Varje tile triggar `/api/mat/chef` med matchande system-prefix
- [ ] AI-briefing-hero på `(warm)/v3/mat/page.tsx` (AMBER-tinted, "Generera ny" + "Öppna kökschefen"-länk — samma layout som garden briefing)
- [ ] Verifiera SSE-stream end-to-end mot prompt som triggar tool-anrop (`search_recipes` synligt i tool-chip-raden)

**Acceptance:** Kökschefen svarar med tool-användning. Inspirations-tiles fungerar. Briefing-hero renderas och kan refreshas.

**Status / Observera:** *(fylls under sessionen)*

---

### Session M4 — Polish + PR
**Mål:** AI-sparkle, tom-tillstånd, audit av alla mat-sidor, iPhone-test, PR till main.

**Levererar:**
- [ ] AI-sparkle-badge (AMBER-fylld, 11 px) i nedre högra hörnet av recept-kort-ikon — alla recept med `AISkapad: true`
- [ ] Tom-tillstånd polished: bibliotek ("0 recept · importera från en URL"), planering ("0 slottar denna vecka")
- [ ] WarmModal-grammatik-audit: backdrop `rgba(20,14,8,0.55)` + blur 6 px. Mat-modaler — *bekräfta med användaren innan flipp* från ACC- till AMBER-primary för konsekvens med sektionsidentitet
- [ ] Pull-to-refresh-spinner-audit: AMBER på mat-sidor eller behåll ACC globalt — *bekräfta innan ändring*
- [ ] Kursiv-svans-rytm-audit i HubDisplay/DetailHero ("Vad äter vi *ikväll?*", "Vad har vi *hemma idag?*", "Veckan *framför.*", "Pannbiff *med löksås.*")
- [ ] Verifiera 393 px / 1024 px / 1440 px viewports, light + dark
- [ ] **Manuell test på iPhone — pausa och be mig verifiera på riktig hårdvara innan PR**

**Acceptance:** Alla 4 sidor + recept-detalj funkar i hela viewport-spektrumet, båda teman. iPhone-touch-edge-cases verifierade (slot-tile-tap, importera-flödet, AI-chat-textarea-fokus, PortionStepper-touch-target ≥ 44 px, hero-bild-aspekt).

**Status / Observera:** *(fylls under sessionen)*

---

## Start-/avslutsprompter per session (MAT)

**Format:** kopiera prompten in i en ny chatt. **Allt commitas direkt på `main` med auto-deploy** — ingen feature-branch. Pusha först när delsteget verifierats grönt lokalt (preview 200 + console-fri + övriga 4 sektioner orörda).

### M0 Setup

**Start:**
> Kör Session M0 enligt MAT-blocket i `docs/archive/WARM_HOME.md`. Verifiera att vi är på `main` med rent läge (`git status` + `git pull origin main`). **Allt commitas direkt på main, ingen feature-branch.** Leverera alla bullets i M0-blocket: 5:e tab `Mat` (MatIcon = gryta, 1.6 px outline) i `TabBar` + `WarmSidebar` med AMBER-flipp av active-färgen, `src/lib/mat/{types,notion}.ts` med `isMatReady()`, `scripts/create-mat-notion-dbs.mjs` (idempotent, Recept + Veckoplan-schema enligt M0-bullets), env-vars i `.github/workflows/deploy.yml` (`NOTION_MAT_RECIPES_DB`, `NOTION_MAT_PLAN_DB`, `NOTION_MAT_COACH_PAGE`), och `(warm)/v3/mat/page.tsx` med HubDisplay + 3 dörr-tiles + 501-gate. Coach-persona-sidan skapar jag manuellt i Notion och delar med integrationen — be mig om sid-id:t när du behöver det. Verifiera i `preview_start("home-dashboard")` att `/v3/mat` 200, tab fungerar i både 393 px + 1440 px viewport, **och att övriga 4 sektioner (Hem/Lab/Fitness/Trädgård) renderar oförändrat**. Fråga innan du löser receptbild-fält-schemat (default: `url`-property `BildURL`) — markera förslag i M0-blocket och vänta.

**Avslut:**
> Skriv tillbaka observera-blocket under M0 i `docs/archive/WARM_HOME.md` (lessons learned + öppna frågor + status på alla bullets). Commit `feat(mat): M0 — setup tab + Notion + hub-skelett` (en commit räcker för M0). Pusha till `origin/main` först när preview är grön. Sammanfatta i 3 meningar vad som är gjort, att det auto-deployats, och vad som väntar M1.

---

### M1 Importera + Bibliotek + Recept-detalj

**Start:**
> Kör Session M1 enligt MAT-blocket i `docs/archive/WARM_HOME.md`. Verifiera `main` + rent läge (`git status`, `git pull origin main`). **Commitar direkt på main per delsteg — pusha bara grönt.** Bygg hela "fyll biblioteket"-flödet end-to-end enligt M1-bullets: `/api/mat/import` (POST URL → fetcha HTML → Claude Sonnet 4.6 extraherar strukturerat recept med `og:image`-bild, returnerar JSON för review), `/api/mat/recipes` CRUD, `(warm)/v3/mat/bibliotek/page.tsx` (chip-filter, Importera-knapp i AMBER, magazine-grid med **villkorade bilder** — ingen emoji-fallback, ingen glyph-bg), Importera-flödet (URL-modal → review-modal → spara), manuell create-modal, `(warm)/v3/mat/recept/[id]/page.tsx` (DetailHero + villkorad hero-bild + källa-rad + lede + PortionStepper 1–8 som skalar ingredienser live + ingredienslista i Tile + steg-kort + vintips-tile + sticky bottom). Verifiera importflödet end-to-end — be mig om en URL till svenskt recept att testa mot.

**Avslut:**
> Observera-block under M1. Commits per logisk enhet (push var och en bara om preview är grön): `feat(mat): M1 — import-pipeline`, `feat(mat): M1 — bibliotek-grid`, `feat(mat): M1 — recept-detalj`. Skärmdumpar (max 1800 px längsta sida, mobil 393 px): bibliotek-grid, importera-review-modal, recept-detalj. Sammanfatta i 3 meningar.

---

### M2 Planering + Inköpslista

**Start:**
> Kör Session M2 enligt MAT-blocket i `docs/archive/WARM_HOME.md`. Verifiera `main` + rent läge. **Commitar direkt på main per delsteg.** Bygg `(warm)/v3/mat/planering/page.tsx`: vecka-grid (Mån–Sön × Lunch + Middag, **ingen frukost**), period-nav, AMBER på dagens dag, slot-väljar-modal (välj recept eller fritext). "Lägg på veckan" från recept-detalj öppnar samma modal. **Inköpslista som expand-panel på samma sida** — ingen separat route, ingen Notion-DB, ingen checkbox-state. Aggregera ingredienser från veckans planerade recept (skalade till recept-portioner), normalisera enheter där trivialt, gruppera per butikskategori (Grönt/Mejeri/Kött & fisk/Skafferi/Övrigt) via `src/lib/mat/shopping.ts`. "Kopiera lista"-knapp till urklipp. CRUD mot `/api/mat/plan`.

**Avslut:**
> Observera-block under M2. Commits: `feat(mat): M2 — veckoplanering`, `feat(mat): M2 — inköpslista-aggregat`. Pusha. Skärmdump på planering med inköpslistan expanderad. Sammanfatta i 3 meningar.

---

### M3 AI Kökschefen + briefing + inspirations

**Start:**
> Kör Session M3 enligt MAT-blocket i `docs/archive/WARM_HOME.md`. Verifiera `main` + rent läge. **Commitar direkt på main per delsteg.** Bygg AI-pipelinen enligt M3-bullets med samma mönster som garden (Sprint 2): `src/lib/mat/coach-persona.ts` (persona från Notion-sida, 5 min cache, `MAT_COACH_FORMAT_RULES`, `INSPIRATION_PROMPTS`), `src/lib/mat/ai-context.ts` (recept + veckoplan ±14 dagar + säsong + senaste importerade ingredienser), `src/lib/mat/ai-tools.ts` (`matToolRegistry()` med search_recipes/get_recipe/add_recipe/add_to_plan), `/api/mat/chef` SSE (`runWithTools`), `/api/mat/briefing` 6 h cache + `?refresh=1`. `(warm)/v3/mat/laga/page.tsx` med AMBER prompt-tile + chips + Nytt/Rest-toggle + 6 inspirations-tiles (Vardag/Barnfamilj/Vuxenkväll/Gäster/Grillkväll/20-minuters) som triggar chef med olika system-prefix. AI-briefing-hero på `/v3/mat`-hubben. Verifiera SSE end-to-end mot prompt som triggar tool-anrop.

**Avslut:**
> Observera-block under M3. Commits: `feat(mat): M3 — AI-pipeline + persona`, `feat(mat): M3 — laga-sida + inspirations`, `feat(mat): M3 — briefing-hero`. Pusha. Skärmdumpar: laga-sidan med tom prompt, en aktiv chef-konversation med tool-chip synlig, briefing-hero på hubben. Sammanfatta i 3 meningar.

---

### M4 Polish

**Start:**
> Kör Session M4 enligt MAT-blocket i `docs/archive/WARM_HOME.md`. Verifiera `main` + rent läge. **Commitar direkt på main per delsteg.** Polish-pass enligt M4-bullets: AI-sparkle-badge (AMBER, 11 px) på recept med `AISkapad: true`, tom-tillstånd för bibliotek + planering, WarmModal-grammatik-audit (**bekräfta innan du flippar** mat-modaler från ACC- till AMBER-primary), pull-to-refresh-spinner-audit (AMBER eller behåll ACC globalt — **bekräfta**), kursiv-svans-rytm-audit i HubDisplay/DetailHero. Verifiera 393 px / 1024 px / 1440 px viewports, light + dark. **Manuell test på iPhone — pausa och be mig verifiera på riktig hårdvara innan sista commit pushas.**

**Avslut:**
> Slutligt observera-block under M4. Final commit `feat(mat): M4 — polish + tom-tillstånd + sparkle-badges`. Pusha först när iPhone-test är OK. Sammanfatta totalförändringen för hela M0–M4 (antal nya routes, nya filer, LOC, nya beroenden — ingen ny dependency förväntas).
