# Warm Home v3 är primär. v2 djupt-fryst.

> Cutover skedde 2026-04-29 (W6). Root `/` redirectar till `/v3/home`. v2-routes
> (`/home`, `/garden`, `/fitness`, `/homelab`) ligger kvar i kod för rollback men
> är inte länkade någonstans. All ny utveckling sker mot `(warm)/v3/`-trädet —
> se [WARM_HOME.md](WARM_HOME.md) för designprinciper, primitiver och sessionsplan.

@WARM_HOME.md

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Home Assistant — entitetsreferens

> Använd alltid dessa entity-ID:n. De är genomgångna och namngivna enligt projektets namnstandard.
> Ändra aldrig entity-ID:n i koden utan att uppdatera denna fil samtidigt.

## Namnstandard
- Format: `rum_beskrivning` i snake_case, svenska är OK
- Systemprefix för rumslösa enheter: `nibe_`, `tibber_`, `chomper_`, `polestar_`, `enyaq_`, `hero_`, `router_`
- Tibber-prefix `tibber_pulse_villa_bjorkdalen_` är integrationsgenerad — ändra ej
- Etiketter i HA: `belysning`, `klimat`, `energi`, `media`, `dammsugare`, `fordon` + `dashboard` på allt som visas

## Rum
`vardagsrum` · `allrum` · `kök` · `sovrum` · `barnrum` (Elvira) · `adrians rum` · `kontor` · `walk-in` · `hall` · `entré` · `stora badrummet` · `lilla badrummet` · `tvättstuga` · `utomhus` · `växthus`

---

## Belysning

```
Vardagsrum:        light.vardagsrum_ner, light.vardagsrum_mitten, light.vardagsrum_upp,
                   light.vardagsrum_sidobord, light.vardagsrum_stingray,
                   light.vardagsrum_matbord, light.vardagsrum_trad

Allrum:            light.allrum_golvlampa, light.allrum_gang, light.allrum_fonster,
                   light.allrum_ljuslist, light.allrum_spottar, light.allrum_trappa

Kök:               light.kok_under_kokso, light.kok_kokso, light.kok_koksbank,
                   light.kok_ljuslist, light.kok_jalusi, light.kok_flaktbelysning

Sovrum:            light.sovrum_sanggavel

Barnrum (Elvira):  light.barnrum, light.elvira_golvlampa

Walk-in:           light.walkin_ljuslist

Kontor:            light.kontor_skrivbord, light.adrian_bokhylla

Hall/Entré:        light.hall_spottar, light.hall_ljuslist, light.entre_spottar

Stora badrummet:   light.stora_badrummet_spottar, light.stora_badrummet_taklampa

Lilla badrummet:   light.lilla_badrummet_spottar

Tvättstuga:        light.tvattstuga_fonster

Utomhus:           light.utomhus_altan, light.utomhus_fasad

Ignorera (ej inkopplade/dolda):
                   light.vancouver, light.fonster, light.hall_2
```

---

## Klimat

### NIBE S735 — bergvärmepump (golvvärme + varmvatten + ventilation)
```
climate.nibe

sensor.nibe_utomhustemperatur_bt1      Utetemperatur
sensor.nibe_inomhustemperatur_bt50     Inomhustemperatur
sensor.nibe_inomhusklimat              Inomhusklimat
sensor.nibe_franluft                   Frånluft
sensor.nibe_varmvattenmangd            Varmvattenmängd
sensor.nibe_varmvatten_topp            Varmvatten temperatur
sensor.nibe_aktuell_elforbrukning      Elförbrukning (W)
sensor.nibe_aktuell_kompressoreffekt   Kompressoreffekt (Hz)
sensor.nibe_flakthastighet             Fläkthastighet (%)
sensor.nibe_systemeffekt               Systemeffekt (kW)
sensor.nibe_effekt_elpatron            Effekt elpatron

switch.nibe_kaminlage                  Kaminläge (stänger av fläkten)
switch.nibe_okad_ventilation           Ökad ventilation
switch.nibe_mer_varmvatten             Mer varmvatten
switch.nibe_nattsvalka                 Nattsvalka
switch.nibe_snabb_vattenuppvarmning    Snabb vattenuppvärmning

binary_sensor.nibe_larm                Larm
```

### Luftvärmepump — Hero/Midea (stödvärme + kyla, sitter i vardagsrum)
```
climate.vardagsrum_luftvarmepump

sensor.hero_rumstemperatur             Rumstemperatur
sensor.hero_energi                     Förbrukad energi (kWh)
```

### Klimatsensorer per rum (Timmerflotte-sensorer)
```
sensor.vardagsrum_temperatur    sensor.vardagsrum_luftfuktighet
sensor.sovrum_temperatur        sensor.sovrum_luftfuktighet
sensor.elvira_temperatur        sensor.elvira_luftfuktighet
sensor.vaxthus_temperatur       sensor.vaxthus_luftfuktighet
```

---

## Energi — Tibber Pulse

```
sensor.tibber_pulse_villa_bjorkdalen_elpris                      Spotpris (SEK/kWh) — multiplicera ×100 för öre
sensor.tibber_pulse_villa_bjorkdalen_manadskostnad               Månadskostnad (SEK)
sensor.villa_bjorkdalen_manatlig_nettoforbrukning                Månatlig nettoförbrukning (kWh)
sensor.tibber_pulse_villa_bjorkdalen_effekt                      Aktuell effekt (W)
sensor.tibber_pulse_villa_bjorkdalen_genomsnittlig_effekt        Genomsnittlig effekt (W)
sensor.tibber_pulse_villa_bjorkdalen_min_effekt                  Min effekt (W)
sensor.tibber_pulse_villa_bjorkdalen_max_effekt                  Max effekt (W)
sensor.tibber_pulse_villa_bjorkdalen_ackumulerad_forbrukning     Ackumulerad förbrukning idag (kWh)
sensor.villa_bjorkdalen_ackumulerad_kostnad                      Ackumulerad kostnad idag (SEK)
```

---

## Media — Sonos + TV

```
media_player.vardagsrum_hifi       HiFi (Sonos, vardagsrum)
media_player.allrum_playbar        Playbar (Sonos, allrum)
media_player.allrum_sonos          Sonos (allrum)
media_player.kok_sonos             Sonos (kök)
media_player.elvira_sonos          Sonos (Elviras rum)
media_player.adrian_sonos          Sonos (Adrians rum)
media_player.vardagsrum_appletv    Apple TV
media_player.vardagsrum_tv         TV (ofta unavailable)
```

---

## Dammsugare — Roborock (Chomper)

```
vacuum.chomper
sensor.chomper_status
sensor.chomper_batteri
sensor.chomper_nuvarande_rum
sensor.chomper_stadad_area
binary_sensor.chomper_laddning
binary_sensor.chomper_stadar
switch.chomper_stor_inte
select.chomper_vald_karta
select.chomper_moppintensitet
select.chomper_mopplage
number.chomper_volym
time.chomper_starttid_stor_ej_lage
time.chomper_sluttid_stor_ej_lage
image.chomper_nedervaning
image.chomper_overvaning
image.chomper_villa_bjorkdalen
button.chomper_after_meals
button.chomper_vac_followed_by_mop

Basstation:
select.chomper_dock_tomningslage
switch.chomper_dock_barnlas
binary_sensor.chomper_dock_torkning_av_mopp
binary_sensor.chomper_dock_dirty_water_box
binary_sensor.chomper_dock_clean_water_box
```

---

## Fordon

### Polestar 2
```
sensor.polestar_batteriniva       Batterinivå (%)
sensor.polestar_rackvidd          Räckvidd (m → dela med 1000 för km)
sensor.polestar_laddningsgrans    Laddningsgräns (%)
binary_sensor.polestar_laddning   Laddar
binary_sensor.polestar_kontakt    Inkopplad
```

### Enyaq
```
sensor.enyaq_batteriniva          Batterinivå (%)
sensor.enyaq_rackvidd             Räckvidd (m → dela med 1000 för km)
sensor.enyaq_laddningsgrans       Laddningsgräns (%)
binary_sensor.enyaq_laddning      Laddar
binary_sensor.enyaq_kontakt       Inkopplad
```

### Laddboxar (garage)
```
binary_sensor.vanster_kontakt     Vänster laddbox — inkopplad
binary_sensor.vanster_laddning    Vänster laddbox — laddar
binary_sensor.hoger_kontakt       Höger laddbox — inkopplad
binary_sensor.hoger_laddning      Höger laddbox — laddar
```

---

## Projektläge

**Aktiv branch:** `main` (origin/main — enda aktiva branchen, deploy triggas härifrån. Hette `v2` fram till 2026-05-19 då den rename:ades till `main`.)  
**Preview-server:** konfigurerad i `.claude/launch.json`, starta med `preview_start("home-dashboard")`  
**Färdiga sektioner:** Hem/Översikt (med grafer), Hem/Belysning (med våningsplan + scener), Hem/Media (Sonos + Apple TV), Homelab (Servrar/Containers/Media/Nätverk), **Fitness/Dashboard (Session A+B+C+E — Dagsform-kort (HRV/sömn/TSB × 1/3 var) + målkort med tidsprogress, nästa pass, passhistorik med Apple Fitness-stil detaljvy inkl. färgkodad GPS-karta per HR-zon, spetsig elevationsprofil, HR-tidsserie med zon-band, tempo-baserad intervalluppdelning, zondistribution, RPE-baserad färgskala för ansträngning), Notion-synkad profil (inkl. heightCm) + Träningslogg (idempotent, med AI-analys-kolumn), PMC-metriker (CTL/ATL/TSB/TLR HealthFit-kompatibla med pandas-EMA och yesterday-TSB), AI-analys av pass via Claude Sonnet 4.6 med Notion-sida som system-prompt/coach-persona + valfritt kommentarsfält (ephemeral) som viktas in i prompten, paginerad `/fitness/history` med typ-filter (7 kategorier som wrappar) + månadsgruppering, AI-analys-stjärna på pass-ikoner som analyserats**, **Fitness/Coach (Session D+E — vecko-/månadskalender med både planerade pass från Notion och genomförda pass från HealthFit parallellt, CRUD mot Planerade pass-DB via portal-renderad modal, AI-planering via Claude med iterativa verktyg: regen per enskilt pass + feedback-textruta som reviderar hela planen ("fortsätt chatten") + enskilt AI-pass för ett specifikt datum, "spara = visa" så inget regenereras mellan granskning och save)**, **Trädgård (Session 1+2 — översikt med daglig AI-briefing + aggregerade räknare, växtregister-grid med typ/plats-filter och detaljsida med kopplade säsongsåtgärder + per-växt "Fråga AI"-deep-link. Säsongsplan med Kalender/Lista/Per växt-vyer + CRUD-modal med växt-multi-select. Projekt som kanban-board (7 kolumner) med `@dnd-kit` + budget-summering + filter på tidsram/område/prioritet. AI-rådgivare med streaming-chat, tool-use (create_task / update_task / list_plants / search_tasks / create_project / get_weather_forecast / get_plant), bilduppladdning, Notion-persona och Open-Meteo-väderkontext. CRUD-API + AI-API mot tre Notion-DBs: Växtregister, Säsongsplan, Utomhusprojekt.)**

---

## Deploy & GitHub-secrets

**Deploy-flöde:** push till `main` → GitHub Actions (`.github/workflows/deploy.yml`) → bygger Docker-image till `ghcr.io/meridianxx/home-dashboard:latest` → self-hosted runner gör `docker pull` + `docker run` med secrets injicerade som `-e VAR="…"`. `.env.local` läses **bara** av `next dev` lokalt — inte i produktion.

**Alla secrets måste finnas under Repo → Settings → Secrets and variables → Actions innan deploy:**

| Secret | Kommentar |
|---|---|
| `PROXMOX_TOKEN_ID`, `PROXMOX_TOKEN_SECRET` | Hemlab-servrar. Samma token funkar mot alla kluster-medlemmar. |
| `PROXMOX_URL`, `PROXMOX_URL_FALLBACK` | **Valfria** — IP/host till primär resp. sekundär kluster-nod. Tomma secrets → defaultar till `https://192.168.1.20:8006` (proxmox01) / `https://192.168.1.21:8006` (proxmox02). Routen health-checkar primär först (`/version`, 2.5 s timeout) och faller över vid network/timeout/5xx. Auth-fel (401/403) hoppar fallback eftersom samma token gäller över klustret. Svaret innehåller `source: "primary" \| "fallback"` — UI visar "reservnod" när fallback används. |
| `UNRAID_URL`, `UNRAID_API_KEY` | GraphQL-endpoint + API-nyckel |
| `PORTAINER_URL`, `PORTAINER_API_TOKEN`, `PORTAINER_ENDPOINT_ID` | Container-hantering |
| `HA_URL`, `HA_TOKEN` | Home Assistant long-lived access token |
| `GOOGLE_CLIENT_EMAIL` | Service-account e-post |
| `GOOGLE_PRIVATE_KEY` | **PEM på en rad, `\n`-escaped, inkl. omslutande `"`** — kopiera exakt från `.env.local`. Multiradig text bryter `docker run`-kommandot. `drive.ts` kör `.replace(/\\n/g, '\n')` för att återskapa radbrytningarna. |
| `GOOGLE_DRIVE_HEALTHFIT_FOLDER_ID` | ID till HealthFit-mappen i Drive |
| `NOTION_TOKEN` | Integration-token (`ntn_…`) för *Träningscoach*-integrationen |
| `NOTION_FITNESS_PLANS_DB` | DB-id för "Planerade pass" |
| `NOTION_FITNESS_LOG_DB` | **Kan vara tom sträng** tills `scripts/create-fitness-notion-dbs.mjs` körts — `isLogDbReady()` hanterar det gracefully |
| `NOTION_FITNESS_PROFILE_DB` | **Kan vara tom sträng**. Utan denna: profil-GET returnerar `DEFAULT_PROFILE`, PATCH svarar 501, sync-badge visas inte. |
| `NOTION_FITNESS_COACH_PAGE` | Sid-id (UUID) för Notion-sidan som används som coach-persona system-prompt. Saknas → coach kör utan persona (fortfarande med profile + PMC). |
| `ANTHROPIC_API_KEY` | **Full 108-teckens `sk-ant-api03-…`-nyckel** (inte den truncerade "sk-ant-api03-…xxx"-förhandsvisningen i Anthropic-konsolen — det ger ByteString-fel vid fetch). Kopiera hela nyckeln från API-sidan direkt när den skapas. |
| `FITNESS_WEEKLY_SECRET` | Slumpmässig sträng (t.ex. `openssl rand -hex 32`) som delas mellan GitHub Actions-cron och `/api/fitness/weekly-summary`. Skickas som header `x-weekly-secret`. Utan den svarar endpointen 401. |
| `NOTION_GARDEN_PLANTS_DB` | DB-id för 🌿 Växtregister. Saknas → `/api/garden/*` svarar 501, UI visar instruktionskort. |
| `NOTION_GARDEN_SEASON_DB` | DB-id för 📆 Säsongsplan. Samma 501-gate. |
| `NOTION_GARDEN_PROJECTS_DB` | DB-id för 🧑🏻‍🌾 Utomhusprojekt. Samma 501-gate. Alla tre måste vara satta för att `isGardenReady()` ska returnera true. |

**Snabb-sanity efter deploy:**
```bash
curl https://dash.inicio.cloud/api/fitness/metrics
# → { "weightKg": 67.8, "restingHR": 57, "vo2Max": 44.1, ... }
```

Om svaret blir `{"error":"GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY saknas i env"}` → secret saknas eller har fel format. Om det blir `error:1E08010C:DECODER routines::unsupported` → `\n`-escapingen i `GOOGLE_PRIVATE_KEY` är trasig (klistrades sannolikt med riktiga radbrytningar istället för `\n`-tecken).

---

## Multi-user arkitektur

Dashboarden autentiseras via **Authelia** bakom Nginx Proxy Manager. Authelia vidarebefordrar användaridentiteten som HTTP-headers till Next.js:
- `X-Forwarded-User` — användarnamn
- `X-Forwarded-Email` — e-postadress

**Upplägg (förberett från start, aktiveras fullt i ett senare steg):**
```ts
// src/lib/users.ts
const USER_PROFILES = {
  "adam@inicio.cloud": {
    tabs: ["home", "fitness", "garden", "homelab"],
    isAdmin: true,
  },
  "sambo@...": {
    tabs: ["home", "garden"],
    isAdmin: false,
  },
}
```
- Läs identitet server-side: `headers().get('X-Forwarded-Email')` i App Router
- Layout renderar bara tabs användaren har tillgång till
- Otillåten route → redirect till `/home`
- Fitness-data fetchas **bara** om användaren har `fitness` i sin tabs-lista

**Regler för ny kod:**
- Hårdkoda aldrig personlig data inne i komponenter
- Håll user-context separerat från UI-logik
- All fitness-specifik fetch är tab-gatad

---

## Kritiska tekniska regler

### Tailwind / responsivitet
- `tw.css` (public/tw.css) genererar `md:`-klasser **utan** `@media`-wrappers → responsiva Tailwind-klasser fungerar **inte** på mobil
- **Regel:** Använd alltid `style={{}}` inline för mobil-specifik styling. Använd aldrig `md:` prefix för att dölja/visa element på mobil
- Undantag: `md:hidden` på MobileNav fungerar via tw.css och är OK

### Next.js cache
- Vid hydration-mismatchar: radera `.next/`-mappen helt, starta sedan om servern
- Enbart serveromstart räcker inte — Turbopack cachar SSR-HTML

### Screenshot / bilddimensioner
- **Regel:** håll längsta sidan **under 1800 px** för alla screenshots och genererade bilder. Gäller `preview_screenshot`, `mcp__computer-use__screenshot`, Chrome MCP-screenshots och bild-generering för analys
- Om viewporten är större: `preview_resize` ner innan du tar screenshot, eller skala ner bilden innan du läser tillbaka den
- **Varför:** Anthropic-API:t avvisar bilder över dimension-limit med ett `InputValidationError`. Det kraschar hela verktyget och blockerar verifiering tills bilden skalas ner — har kostat en hel fix-session tidigare

### Kända mönster
- **Bottom padding på main:** `style={{ paddingBottom: "140px" }}` (inline, inte Tailwind)
- **Range inputs:** stylas via `globals.css` med `appearance: none` + CSS-variabel `--fill` för amber-fyllning; uppdateras live via `onInput` → `t.style.setProperty("--fill", \`${t.value}%\`)`
- **iOS expanded sections:** expanderade `div`-block utan explicit bakgrund får svart default på iOS → lägg alltid till `backgroundColor: "var(--color-surface-container)"` på expanderade sektioner
- **MobileNav:** glasmorfism-pill med `--nav-glass-bg` / `--nav-glass-border` CSS-variabler definierade per tema i `globals.css`; fasta 76px-breda items
- **CSS Grid lika bredd:** använd alltid `repeat(N, minmax(0, 1fr))` — vanlig `1fr` har implicit `min-width: auto` och låter innehåll tänja ut kolumner på mobil
- **FavTile / knappar i grid:** Tailwinds `w-full` är otillförlitligt på mobil — lägg alltid till `width: "100%"` och `minHeight` som inline style på tiles för konsekvent storlek
- **Haptic feedback:** `navigator.vibrate()` stöds **inte** i iOS Safari — implementera inte haptic för iOS, det är en platform-begränsning
- **TempSlider:** generisk komponent i `home/page.tsx` för temperaturreglage; använd `key={value}` för att tvinga remount när servervärde ändras (uncontrolled input-mönster)
- **Page transitions:** Framer Motion `motion.div` med `key={pathname}` i dashboard layout — ren opacity-crossfade (200ms `[0.4, 0, 0.2, 1]` cubic-bezier), konstant `FADE_EASE`. Horisontell slide ersattes eftersom den kändes "tung". Riktning beräknas **under render** (inte useEffect!) via `prevPathnameRef`/`directionRef` — useEffect körs efter render och missar första mount. `onAnimationComplete` nollställer direction. Undvik `AnimatePresence mode="wait"` (dubbel-laddning), spring (studsar), och Card-level entrance-animationer.
- **iOS app-switch:** `onTouchCancel` + `visibilitychange`-lyssnare krävs för att nollställa inline swipe-transform. Utan det fastnar `translateX` när iOS avbryter touch (app-switch, samtal, notis).
- **Expand/collapse:** `AnimatePresence initial={false}` + `motion.div` med `height: 0/auto` + `opacity: 0/1`, duration 0.2s ease-out, `overflow: hidden`. Används på belysningsrum, temperaturpaneler, HVAC-selects.
- **Delad navigations-config i `src/lib/nav.ts`:** `CONTEXT_META` (sektion → label + sub-tabs) + `getContextKey(pathname)` + `getSuffixes(pathname)` är single source of truth. Importeras av `TopBar` (renderar sub-tabs), `MobileNav`/`Sidebar` (bara top-level) och dashboard-layouten (swipe-navigation + page-transition-riktning). Tidigare duplicerades både `CONTEXT_TABS` i layouten och `CONTEXT_META` i TopBar — gick ur synk när Trädgård fick fler tabs.
- **Sub-tabs på mobil = ikon-only.** Max 5 tabs (Trädgård) scrollar ur 375 px om både ikon + text-label renderas. Lösning: `subnav-label`-klass i `globals.css` som är `display: none` default och får `display: inline` i `@media (min-width: 768px)`-wrapper. tw.css-genererade `md:inline`/`hidden md:inline` funkar inte på mobil (AGENTS.md-note om `md:` utan @media), så riktig CSS med @media krävs för att gömma text selektivt. `aria-label` på varje `<Link>` så screen readers fortfarande får etiketten. Tabs stackade flex-col, ikon 18px.
- **TopBar: mobil = bara tabs + theme-toggle.** Tidigare hade mobilen även huslogon längst till vänster. Den togs bort eftersom (1) MobileNav botten-pill visar redan aktiv sektion, (2) page-header har sektionens titel som h1, (3) tabs behövde horisontellt utrymme. Desktop har Sidebar med logon kvar oförändrat. Avdelare (`borderRight: 1px solid rgba(187,185,178,0.2)`) sitter till höger om tab-gruppen så den separeras från theme-toggle (32×32, 18px ikon för att inte dominera).
- **Pull-to-refresh:** Custom touch-gest i layout.tsx. Kräver `scrollY === 0`, 80px threshold, undviker horisontell swipe-konflikt. Bekräftelse: bock + "Uppdaterat" i 800ms. **Viktigt:** använd `"0px"` (sträng) istället för `0` (number) i inline styles för height — annars hydration-mismatch.
- **Loading-state på toggle-knappar:** Använd `runAction(key, fn)` + `loadingKey` för att spåra in-flight state. Visa `spin-anim` SVG-spinner under laddning, dölj border/active-state. Skicka `loadingKey`/`runAction` som props till subkomponenter som behöver det.
- **Recharts grafer:** Använd `useChartSize()` (ResizeObserver) istället för `ResponsiveContainer` — den ger -1 width/height inuti AnimatePresence. Sätt explicit `width={width} height={height}` på chart-komponenten. `useDeferredMount()` fördröjer mount 2 rAF-frames. Kurvtyp: `type="basis"` (B-spline, mjukast). Tooltip: `cursor={{ stroke: "var(--color-outline)", strokeWidth: 1 }}` för vertikal linje + touch-stöd.
- **Temperaturgrafer:** `mergeByTime()` bucketiserar data i 15-minutersintervall med medelvärde + forward-fill för komplett tooltip. `tightDomain()` beräknar Y-axel med ±1° marginal runt faktisk data.
- **EnergyCard StatRow:** Konsekvent radkomponent med 36px cirkelikon, label/värde/badge, chevron som separat `<button>` (inte inuti Pressable) med `self-stretch` för full radhöjd — matchar belysningskortens expand-mönster.
- **Belysningsundersida våningsplan:** Rum delas in via `NEDERVANING`/`OVERVANING`/`UTOMHUS`-arrayer i `lighting/page.tsx`. "Släck"-pill per sektion, "Släck allt" globalt — båda med spinner-feedback.
- **Scen-aktiv-detektion:** `detectActiveScene()` i `src/lib/scenes.ts` matchar ett snapshot av lampor mot varje scens target-states (state + brightness ±5%). Target-states hämtas via `/api/homeassistant/scenes` som läser HA:s config-endpoint `/api/config/scene/config/{internal_id}` (internal_id från scenens `attributes.id`). Vid flera matches vinner den med flest targets. Ingen localStorage; uppdateras automatiskt via SWR-refresh av lights.
- **Delad FavTile:** `src/components/FavTile.tsx` exporterar `FavTile` och `Pressable` — återanvänds av hem och belysningsundersida. Håll layout-props (minHeight 84, full width, inset shadow-mönster) där.
- **Media-entiteter:** `/api/homeassistant/media` filtrerar till en hårdkodad lista i `route.ts` (Sonos + Apple TV + TV). `unavailable`-players filtreras bort → entiteter som blir online visas automatiskt. Nya entity_ids måste adderas manuellt i `PLAYERS`-listan.
- **Media-artwork-proxy:** HA:s `entity_picture` pekar på intern HA-URL som inte nås publikt. `/api/homeassistant/image?path=…` proxar igenom Next.js-servern. Sniffar magic bytes (PNG/JPEG/GIF/WebP) och forcerar `image/*` MIME eftersom HA returnerar `application/octet-stream`.
- **Apple TV services:** `media_player.media_play_pause` (toggle) är trasig på pyatv-integrationen — returnerar 200 men ändrar aldrig state. Använd specifika `media_play` / `media_pause`. `media_next_track` / `media_previous_track` fungerar. Power: `media_player.turn_on` / `turn_off` på samma entitet. Apple TV exponerar `media_position` + `media_duration` + `entity_picture` när app spelar — visas som progress-bar på mediasidan.
- **Scen-endpoint no-cache:** `/api/homeassistant/scenes` har `export const dynamic = "force-dynamic"` — utan det cachar Next en tom/error-respons om första hit timeout:ar, vilket tystar scen-detektionen externt tills deploy.
- **HealthFit Drive-export — verkliga format:** `Workouts_vN` är en **Google Sheet utan `.xlsx`-suffix** (användaren kan ha konverterat filen). `Health Metrics_vN` har **mellanslag**, inte underscore. Filerna ligger inte nödvändigtvis i HealthFit-mappen utan är `sharedWithMe` med service-kontot. `drive.ts` söker därför med `('${FOLDER_ID}' in parents) or sharedWithMe` och exporterar google-sheets via `files.export(..., xlsx-mimetype)` — `files.get(alt:media)` fungerar bara på native xlsx.
- **HealthFit xlsx-enheter:** Tider lagras som **Excel-dygnsfraktioner (0–1)** → multiplicera × 86400 för sekunder. Distans i **kilometer** (× 1000 för meter). Hastighet i **km/h** (/ 3.6 för m/s). Datum = Excel-serienummer: `new Date((serial - 25569) * 86400 * 1000)`. Råa xlsx-värden liknar seriellt trams (`0.0225...` för tid) om man inte konverterar.
- **HealthFit headers är inkonsekventa:** `Running`-fliken har `Avg HR`, `Workouts`-fliken har `Avg. Heart Rate` — samma semantik, olika namn. Lösning i `parser.ts`: normalisera headers med `lower().replace(/[^a-z0-9]/g, '')` och låt `idx(...alternatives)` plocka första matchen. Spaces i header-padding (`  Date  `) måste också trimmas.
- **Workouts-fliken innehåller alla sporttyper** (Running, Strength, Core, Cycling…) medan `Running` / `Cycling` m.fl. har sport-specifika extrafält (power, stride length, ground contact time). För en "alla pass"-vy: läs `Workouts`. För detaljanalys per sport: läs den specifika fliken. Dedupe på `${date}|${time}|${type}` — exporten kan ha duplikatrader.
- **Notion SDK v5 data-source-modell:** Notion API 2025-09-03 har infört data sources under databaser. Konsekvenser: `databases.create({ initial_data_source: { properties } })` i stället för top-level `properties`. Queries går mot `dataSources.query({ data_source_id })` inte `databases.query({ database_id })`. Relation-properties kräver `data_source_id` — hämta via `databases.retrieve(dbId)` → `data_sources[0].id`. Den äldre API-formen ger `unknownParams: ['properties']`-varning + 400.
- **Notion integration-access:** Att skapa en DB under en page kräver att integrationen är delad på den sidan — annars `object_not_found`. Delning sker manuellt i Notion UI (page → `···` → Connections → Add connection). Kan inte automatiseras. `scripts/create-fitness-log-db.mjs` ger ett tydligt felmeddelande och instruktion när det händer.
- **GitHub Actions secrets med multi-line värden:** `${{ secrets.X }}` substitueras som **rå text i bash-skriptet** i `run: |` blocket. Om en secret (t.ex. PEM-nyckel) innehåller riktiga `\n`-tecken bryter det `-e VAR="..."`-raden i mitten → `docker: invalid reference format: repository name (library/PRIVATE) must be lowercase`. **Regel:** lagra alltid som **en rad med `\n`-escapes**, låt koden konvertera: `process.env.KEY.replace(/\\n/g, '\n')`.
- **Env i produktion ≠ `.env.local`:** `.env.local` läses bara av `next dev`. Varje env måste explicit skrivas in i `.github/workflows/deploy.yml` som `-e VAR="${{ secrets.X }}"`. Om secreten inte finns ger GitHub tom sträng — vilket `isXReady()`-liknande helpers kan använda som signal för "inte konfigurerad än". Redo-signal: `process.env.NOTION_FITNESS_LOG_DB.length > 0`.
- **Stat-kort siffer-alignment:** För att värdesiffror ska hamna på samma vertikala linje över flera kort i grid: `display: flex; flexDirection: column; justifyContent: space-between; minHeight: 86px`. Label överst, värde + enhet stackade i ett block med `leading-none` — så långa enheter (`ml/kg/min`) inte höjer just det kortets baseline relativt andra. Värdelinjen blir identisk oavsett unit-längd.
- **Profil-editor: swap, stackar inte:** När man togglar "Ändra" på `ProfileCard` **renderas `<ProfileEditor />` i stället för read-only-vyn**, inte ovanpå den (tidigare variant med `AnimatePresence` stackade panelen över statsen och kändes ologisk). Förenklar även datumpickers på mobil — inga konflikter med grid-bredder.
- **Zustand + SWR hybrid:** Fitness-profilen kombinerar manuellt redigerade värden (Zustand `persist` i localStorage: namn, födelseår, maxpuls, zoner, mål) med live-metriker från Drive (SWR på `/api/fitness/metrics`: vikt, 7-dagars vilopuls, VO₂ max). `ProfileCard` tar metrics som prop; merge-strategi är **metrics-värde vinner, profil = fallback**. Session B-plan: flytta manuella värden till Notion så de är tvåvägs-synkade (se pending work).
- **Pulszons-visualisering:** Zon-staplar funkar dåligt i statisk vy — Z5 såg alltid "full" ut eftersom stapeln mappade endpoint-% av HR-reserv. Nuvarande form (omvänd ordning Z5→Z1, färgdott + svensk label + `≥ N %` · `N–M bpm`) är mer läsbart. `zoneLabel()` i `fitness/page.tsx` har Svenska etiketter (Mycket hårt/Hårt/Måttlig/Lätt/Mycket lätt). Z5 visas öppen uppåt (`≥` istället för range).
- **HealthFit-enhetsförvirring:** Alla kolumner som uppför sig som "tid" i xlsx-exporten är Excel-dygnsfraktioner — inte bara `Total Time`. Det gäller också `HRZ0–5` (zonfördelning). Kontrollera empiriskt genom att summera raden: om det landar nära `Total_Time / 86400 ≈ 0.02` är kolumnerna dygnsfraktioner som måste konverteras. Regel: "När i tvivel, multiplicera med 86400 och jämför mot sekunder."
- **Leaflet + Next.js (App Router):** Kartan måste laddas via `next/dynamic` med `ssr: false` — Leaflet rör `window`/`document` vid import. Exempel: `const TrackMap = dynamic(() => import("@/components/fitness/TrackMap"), { ssr: false, loading: () => <Placeholder /> })`. Importera `leaflet/dist/leaflet.css` från komponentens toppnivå (inte global), så den lazy-loadas. För styling — `background: var(--color-surface-container)` på MapContainer-wrappen så mörka tema-gapet inte lyser vitt mellan tiles.
- **Horisontella swipes på interaktiva komponenter:** För kartor, chart-svg och lap-listor — `onTouchStart={(e) => e.stopPropagation()}` på wrappen stoppar dashboardens globala pull-to-refresh + tab-swipe. Gör detta till ett mönster för allt som användaren drar i horisontellt. `useChartSize()` returnerar `stopSwipe`-objektet som spreadable prop.
- **Turbopack + utilityklass-kombinationer:** Vissa `inline-flex items-center justify-center` +-kombinationer plockas inte upp i Turbopack dev (computed `display: block`). Ingen tydlig trigger har identifierats. Debug: `preview_inspect` på elementet visar `display` och verifierar `className`. Workaround: flytta `display/align/justify` till `style={{}}` inline så det inte kan tappas bort i build-steget.
- **Recharts kurvtyper:** `type="monotone"` = mjuk (bra för HR, spot-priser), `type="basis"` = B-spline, extra mjuk (bra för sensorer som brusar mycket), `type="linear"` = raka segment (bra för elevation där små spikar är meningsfulla — `monotone` utjämnar topparna så de försvinner). Välj kurvtyp efter datasetets karaktär, inte efter estetik.
- **Geocoding — policy-medveten proxy:** Server-side `User-Agent` + språk-header krävs för Nominatim (annars rate-limited). Cache in-memory per rundad lat/lon (3 decimaler ≈ 100 m) med 24 h TTL — samma runda hamnar alltid i samma bucket. Vid `fetch` utan `AbortSignal.timeout` riskerar en långsam extern tjänst att blockera hela route-handlern; använd `AbortSignal.timeout(5000)` som i övriga API-klienter (`ha.ts`-mönstret).
- **Apple Watch RPE (Borg CR10):** Kolumnen `RPE` i HealthFit-exporten är 1–10. Svenska etiketter (samma som Apple Fitness app): 1 Lätt · 2 Ganska lätt · 3 Måttlig · 4 Lite jobbig · 5 Jobbig · 6 Ganska svår · 7 Svår · 8 Mycket svår · 9 Extremt svår · 10 Maximal. Använd färgskala i buckets (1–3 grön / 4–6 blå / 7–8 lila / 9–10 röd) — rätt antal distinkta nivåer för att göra samma färg lätt tolkbar utan chart-legend.
- **Imperativt DOM-bibliotek (Leaflet, etc.) + React HMR:** Bibliotek som själva äger sin DOM-container (Leaflet `MapContainer`, Chart.js, mapbox, vissa wysiwyg-editorer) kraschar vid HMR eller route-byte med "container is being reused"-fel. **Alltid ge komponenten en stabil, värde-baserad `key`** så React ser det som nytt element och remounter rent istället för att försöka återanvända. Exempel: `key={\`${minLat.toFixed(4)},${minLon.toFixed(4)}\`}`. Index-baserade keys räcker inte — de förblir samma vid route-byte mellan olika instanser.
- **Stale HMR-errors vs faktiska fel:** När man ser ReferenceErrors för variabler som inte längre finns i koden (t.ex. `recovery is not defined`, `ZoneDistribution is not defined`) är det nästan alltid HMR-cache som kör gammal koden. Full reload (`window.location.reload()`) eller radera `.next/` löser det. Verklig kodfel syns i `preview_logs --level=error` (server-side kompileringsfel) — inte bara i `preview_console_logs`.

---

## Pending work

### Session A — Snabbfixar ✅ Klar
- [x] Slider-% live vid drag (uppdatera label utan att släppa)
- [x] Haptisk feedback — iOS Safari stödjer ej Vibration API, skippat
- [x] Färgöversyn — amber/blå text ersatt med `on-surface`, konsekvent ikonanvändning
- [x] Ikoner + text i TopBar-flikar (ikon ovanför label, FILL-animering)
- [x] NIBE börvärde som slider på klimatkortet
- [x] Hero-pump temperaturslider (16–30°C)
- [x] HA-scener i Favoriter (Morgon, Hemma, Kväll, Natt) + Alla av på belysningskortet

### Session B — UX & animationer ✅ Klar
- [x] Swipe-animation med preview (Framer Motion) — smooth horisontell slide, 25% bredd, ease-out tween
- [x] Pull-to-refresh på mobil — spinner + grön bock "Uppdaterat" som bekräftelse
- [x] Visuell feedback vid aktivering på värmepumpskort — spinner, border, transitions (likt FavTile)
- [x] Animationer generellt — expand/collapse (AnimatePresence height), border/shadow-transitions på tiles

### Session C — Grafer ✅ Klar
- [x] HA history-API endpoint (`/api/homeassistant/history`) med 15-min bucketing och nedsampling
- [x] Spotpris-graf (BarChart, neutral färg, expand i EnergyCard)
- [x] Effekt-graf (AreaChart, expand inuti EnergyCard-tile)
- [x] Inomhus-tempgraf (LineChart: NIBE BT50 + Vardagsrum/Sovrum/Elvira, tight Y-domän, legend)
- [x] Utomhus-tempgraf (LineChart: BT1 + Växthus, legend)
- [x] Delad chart-infrastruktur: `useChartTheme` (CSS-variabler + MutationObserver), `useChartSize` (ResizeObserver), tooltip med alla serier, B-spline kurvor
- [x] Redesignad EnergyCard med konsekvent StatRow-layout (cirkelikoner, matchande belysningskort)
- [x] Belysningsundersida uppdelad i Nedervåning/Övervåning/Utomhus med "Släck"/"Släck allt"-pills
- [x] Större expand-touchytor med subtil avdelare på rumskort (home + lighting)
- [x] Fix: layout.tsx duplicate `direction` → `slideDir`

### Session D — Nya sektioner & scener ✅ Klar
- [x] Scen-aktiv-detektion (Apple Home-style) — `/api/homeassistant/scenes` + `src/lib/scenes.ts` `detectActiveScene()`. Ersätter `lastScene` localStorage.
- [x] Alfabetisk sortering av lampor inom varje rum — sker i `/api/homeassistant/lights` med `localeCompare('sv')`.
- [x] Scener på belysningssidan (`/home/lighting`) under egen "SCENER"-rubrik, synkad aktiv-detektion med hemsidan.
- [x] Mediavy som egen undersida `/home/media` (`/api/homeassistant/media` + UI). Sonos per rum med albumart, volym-slider, play/pause, mute. Apple TV med source-badge.
- [x] `FavTile` + `Pressable` extraherade till `src/components/FavTile.tsx` för delning.

### Session E — Branding ✅ Klar
- [x] Logo-symbol (Koncept A: outline-hus med prick, primärfärg #475bc2) ersätter "inicio"-text i TopBar och "inicio.cloud" i Sidebar — delad `src/components/Logo.tsx`
- [x] App-ikon via Next.js icon-konvention: `src/app/icon.svg` (favicon) + `src/app/apple-icon.tsx` (180×180 PNG via `ImageResponse`)
- [x] `public/manifest.json` migrerad till `src/app/manifest.ts` (TypeScript, refererar nya icon-paths). Tom `public/icons/` raderad.

### Session F — Robusthet ✅ Klar
- [x] Timeout mot HA: `AbortSignal.timeout(5000)` i `src/lib/ha.ts` på alla haGet/haPost/haTemplate-anrop
- [x] Delad `callAction` i `src/lib/actions.ts` — kastar vid icke-ok svar; ersätter tre duplicerade lokala kopior (home, lighting, media)
- [x] Delad SWR-fetcher i `src/lib/fetcher.ts` — kastar vid HTTP-fel så att SWR:s `error`-prop faktiskt triggas
- [x] `ErrorBanner`-komponent (`src/components/ErrorBanner.tsx`) — visas vid API-fel på hem-, belysnings- och mediesidan med retry-knapp
- [x] `aria-label` på ljusstyrke-slider (`lighting/page.tsx`) och volym-slider (`media/page.tsx`)

### Fitness — Sessionsplan A–F

> Vision: Personlig PT i dashboarden för löpning och styrketräning. Känner till fysiologi och historik, agerar coach, analyserar pass med AI och utvärderar formen löpande.

#### Datakällor & verifierade ID:n

**Google Drive — mapp `HealthFit/`** (auto-export via HealthFit-appen från Apple Watch):
- `Workouts_vN.xlsx` — flikar per sporttyp: Workouts, Running, Cycling, Others m.fl. En rad per pass, skrivs över vid ny export. Hitta senaste version via filnamn (högst N). Datum = Excel-serienummer: `datetime(1899,12,30) + timedelta(days=N)`. Kolumner Running-fliken: Date, Time, Type, Total Time, Moving Time, Elapsed Time, Temperature, Humidity, Distance, Elevation Gain, Active Calories, Min HR, Avg HR, Max HR, TRIMP, RPE, METs, HR Zone Type, HRZ0–HRZ5, Source, Avg Speed, Max Speed, Avg Power, Max Power, Ground Contact Time, Vertical Oscillation, Stride Length, Steps. HRZ0–5 = andel av total tid per zon (0–1), faktisk tid = `HRZn × Total_Time`.
- `Health_Metrics_vN.xlsx` — flikar: **Daily Metrics (ingen header-rad! — skippa rad 1 vid parsning)**: Active Energy, Resting Energy, Resting HR, HRV, Steps, VO₂ max, Exercise Minutes, Stand Hours. **Sleep**: Date, Main, Start, End, InBed, Asleep, Awake, REM, Core, Deep, Wake Count, Efficiency, Fall Asleep, Min/Max/Avg Respiration Rate, Wrist Temp, Low/High/Avg SpO2, Low/High/Avg HRV (primärkälla för återhämtning — klockan bärs varje natt). **Weight**: Date, Weight, Fat, BMI. **Nutrition**: Date, Water, Dietary Energy, Total Fat, Protein, Carbs. **Mindfulness**: ignorera.
- FIT-filer per pass: `YYYY-MM-DD-HHMMSS-Typ-Enhet.fit`. Innehåll: session (summary), lap, record (per sekund: GPS, HR, power, speed, kadence), workout_step. GPS i semicircles: `grader = semicircles × (180 / 2³¹)`.

**Notion:**
- Träningscoach-sida ID: `31e9b5da-2245-805a-a8b3-e676a81fbb8b`
- Planerade pass DB ID: `31e9b5da-2245-8082-9fb2-ea3c5fadbc51` — schema: Passnamn (title), Datum (date), Typ (select), Status (status), Syfte, Passdetaljer, Pulsintervall, Tempo, Tid, Underlag (select). `Run ID` ignoreras/tas bort.
- Träningslogg DB — skapas i Session A. Schema: Passnamn (title), Datum (date), Typ (select), Distans (number, km), Total tid (text), Snittempo (text, bara löpning), Avg HR (number), Max HR (number), Avg Power (number), TRIMP (number), RPE (number 1–10), HRZ0–5 (number 0–1), FIT-fil (text), Planerat pass (relation → Planerade pass), AI-analys (text).

**Env-variabler (`.env.local`):**
```
GOOGLE_CLIENT_EMAIL=...@....gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"
GOOGLE_DRIVE_FOLDER_ID=...          # mappen HealthFit/ i Drive
NOTION_TOKEN=...                    # finns i traningscoach-app/.env
NOTION_FITNESS_PLANS_DB=31e9b5da-2245-8082-9fb2-ea3c5fadbc51
NOTION_FITNESS_LOG_DB=...           # skapas i Session A (`scripts/create-fitness-notion-dbs.mjs`)
NOTION_FITNESS_PROFILE_DB=...       # skapas i Session B (samma script)
ANTHROPIC_API_KEY=...               # finns i traningscoach-app/.env
```

**Npm-paket:** `googleapis`, `xlsx`, `@notionhq/client`, `fit-file-parser`

**Referenskod (port från traningscoach-app, ändra inte originalet):**
- `traningscoach-app/services/claude.js` → `src/lib/fitness/claude.ts`
- `traningscoach-app/services/notion.js` → `src/lib/fitness/notion.ts`
- `traningscoach-app/services/context.js` → `src/lib/fitness/context.ts`
- `traningscoach-app/profile.json` → `src/lib/fitness/profile.ts`

**Design:** Matchar dashboard design system. Amber (`#fab849`) för pulsdata, indigo för accent. Samma card-mönster som EnergyCard. Inga borders — depth via bakgrundsnivåer. Inline `style={{}}` för all mobilanpassning.

---

#### Session A — Profil, Google Drive & passhistorik ✅ Klar
- [x] `src/lib/fitness/types.ts` — delade typer (Workout, PlannedWorkout, FitnessProfile …)
- [x] `src/lib/fitness/drive.ts` — Google Drive-klient. Söker med `sharedWithMe`-fallback och hanterar både native `.xlsx` och Google Sheets (exporteras via `files.export` som xlsx). 5 min in-memory cache.
- [x] `src/lib/fitness/parser.ts` — Running-fliken i Workouts_vN. Headers normaliseras tolerant (`Avg. Heart Rate` ↔ `Avg HR`), tider konverteras från Excel-dygnsfraktion → sek, distans km → m, hastighet km/h → m/s.
- [x] `src/lib/fitness/profile.ts` — `useFitnessProfile` Zustand-store med `persist` (`fitness-profile`), default från `traningscoach-app/profile.json`. Helper `hrZone(bpm, zones)`.
- [x] `src/lib/fitness/notion.ts` — `getPlannedWorkouts()` via data-source-query (Notion SDK v5 kräver `data_source_id`). `isLogDbReady()` signalerar om träningslogg är konfigurerad.
- [x] `src/app/api/fitness/workouts/route.ts` — senaste N pass från Running-fliken (default 10).
- [x] `src/app/api/fitness/plans/route.ts` — planerade pass + `logDbReady`-flagga.
- [x] `src/app/(dashboard)/fitness/page.tsx` — profilkort med pulszoner + mål, nästa pass (datumrelativ), passhistorik med zonbadge.
- [x] `scripts/create-fitness-log-db.mjs` — skapar Träningslogg-DB under coachsidan. Kräver att sidan delats med integrationen *Träningscoach* i Notion innan körning; skriv in returnerat DB-id i `NOTION_FITNESS_LOG_DB`.

**Observera:**
- Notion-token i `.env.local` rättades till den riktiga `ntn_417056773819…` (den felaktiga `…858940…` gav 401).
- Google Sheets-filen heter `Workouts_v5` (utan `.xlsx`) och ligger inte i HealthFit-mappen — `drive.ts` söker därför även `sharedWithMe` och exporterar via `files.export()`.
- Korrekt env-namn är `GOOGLE_DRIVE_HEALTHFIT_FOLDER_ID` (inte `GOOGLE_DRIVE_FOLDER_ID` som tidigare angavs).

#### Session B — FIT-parsing, detaljvy & Notion-profil ✅ Klar
- [x] `src/lib/fitness/fit-parser.ts` — cascade-mode via `fit-file-parser`. Records plockas från `session.laps[].records` (flatMap-fallback) — de ligger **inte** direkt på session i cascade-mode. Decimerar ~1900 sekundsampler → ~600 punkter.
- [x] `src/lib/fitness/drive.ts` — `listFitFiles(datePrefix?)` + `findFitFileForWorkout(date, time?, type?)` med poängsatt matchning (datum+1, exakt HHMM+10, typ+3). `downloadFitFile(fileId)` med 30 min in-memory cache.
- [x] `src/app/api/fitness/fit/route.ts` — GET via `?date=&time=&type=` eller `?fileId=` eller `?list=1&date=`. `maxDuration=30` för större FIT-filer.
- [x] `src/app/(dashboard)/fitness/pass/[slug]/page.tsx` — slug-format `YYYY-MM-DD-HHMM-Type` (mellanslag → bindestreck). Parse/encode via delad `src/lib/fitness/slug.ts`. Summary-KV + karta + elevationsprofil + HR-serie + zondistribution + planerat pass-match + FIT-fotnot.
- [x] `src/components/fitness/TrackMap.tsx` — Leaflet, Carto Positron-tiles, start/slut-markers, `ssr: false` via `next/dynamic` i detaljsidan.
- [x] `src/components/fitness/PassCharts.tsx` — `HRSeriesChart` (zon-band som `ReferenceArea`), `ElevationChart` (area med gradient), `ZoneDistribution` (horisontell stapelbar från `HRZ0–5`-fraktioner × `totalSec`).
- [x] WorkoutHistoryCard: rader är `<Link>` → `/fitness/pass/<slug>` + chevron.
- [x] `src/lib/fitness/notion.ts` — `syncWorkoutToLog()`/`syncWorkoutsToLog()` idempotent via unik key `date|HHMM|type` i `FIT-fil`-property. `getProfile(fallback)`, `updateProfile(patch)` för Profil-DB.
- [x] `src/app/api/fitness/sync/route.ts` — POST `?limit=N` returnerar `{ total, created, updated, sourceFile }`.
- [x] `src/app/api/fitness/profile/route.ts` — GET returnerar `{ profile, dbReady, source, updatedAt }`; PATCH upsertar rader i `Profil`-DB. Utan DB konfigurerad: GET ger `DEFAULT_PROFILE` + `dbReady=false`, PATCH ger 501.
- [x] `src/lib/fitness/profile-defaults.ts` — `DEFAULT_PROFILE` delad mellan server + client. Behövdes eftersom `profile.ts` har `"use client"` och inte får importeras från routes.
- [x] `src/lib/fitness/profile.ts` — Zustand byter från `persist` till SWR-hydrering. `setProfile()` gör optimistic lokal uppdatering + fire-and-forget `PATCH /api/fitness/profile`. `lastSyncedAt`/`lastError` visas som liten badge under profilkortet.
- [x] `src/lib/fitness/useHydrateProfile.ts` — SWR-hook som anropas från `FitnessPage`, hydrerar Zustand-storen. `revalidateOnFocus: true` + 30-min refresh så Notion-ändringar dyker upp automatiskt.
- [x] `scripts/create-fitness-notion-dbs.mjs` — skapar både `Träningslogg` och `Profil` idempotent (hoppar rätt DB om `NOTION_FITNESS_*_DB` redan satt).
- [x] `.github/workflows/deploy.yml` — `NOTION_FITNESS_PROFILE_DB` injiceras som `-e` i `docker run`.
- [x] `src/components/fitness/PassSummary.tsx` — Apple Fitness-stil 2×N-grid; kompakt layout (`px-4 py-2.5`, `text-xl`). Radordning och färg-palett är fast:
    1. Träningstid (amber) · Distans (indigo)
    2. Aktiva kalorier (röd) · Snittpuls (röd)
    3. Höjdökning (grön, visas alltid; "–" när altituddata saknas) · Snittkraft (grön)
    4. Snittkadens (indigo) · Snittakt (indigo)
    5. Maxpuls (röd) · TRIMP (indigo)
    6. Ansträngning — färgad nummerring + svensk RPE-etikett + signalstapel. Färgen följer RPE-buckets: 1–3 grön, 4–6 blå, 7–8 lila, 9–10 röd.

    HR-enhet: "bpm" (inte "puls").
- [x] `src/components/fitness/PassCharts.tsx` — `HeartRateCard` slår ihop snittpuls-header, HR-tidsserie (med zon-band) och tid-i-zon-rader i en och samma ruta. Pulsåterhämtning exkluderad tills det finns en HealthKit-källa — HealthFit exporterar inte post-pass-HR.
- [x] `src/components/fitness/TrackMap.tsx` — `segmentByZone()` delar upp track i polyline-segment per pulszon (Z1 blå → Z5 röd). Zon-legend under kartan. Fallback till enfärgad amber om `zones` saknas.
- [x] `src/components/fitness/PassCharts.tsx` — `categorizeLaps()` kategoriserar via **session-snittempo** (inte puls eller median): ≤90 % → intervall, ≥120 % → vila, första långa + "slow" → warmup, sista efter sista intervall → cooldown. Micro-laps (<50 m) klassas alltid som vila.
- [x] RPE-färgskala per nivå: 1–3 grön, 4–6 blå, 7–8 lila, 9–10 röd — används på ringens border, siffran, etiketten och signalstaplarna.

**Observera:**
- `fit-file-parser` returnerar `records[]` **under varje lap** (cascade-mode), inte direkt på session. Typerna i `node_modules/fit-file-parser/dist/fit_types.d.ts` bekräftar: `records?: ParsedRecord[]` ligger på `ParsedLap`. Första implementationen antog session-level och gav 0 datapunkter.
- Nodens `Buffer<ArrayBufferLike>` passar inte `fit-file-parser`s `Buffer<ArrayBuffer>`-signatur. Workaround: `buffer.buffer.slice(offset, offset+len) as ArrayBuffer` → `Buffer.from(ab)`.
- Profil-DB har enkel schemalös layout: `Nyckel` (title), `Värde` (rich_text, stringified), `Kategori` (select: profil/zon/mål), `Deadline` (date, bara för mål), `Uppdaterad` (last_edited_time). Nycklar: `name`, `birthYear`, `maxHR`, `restingHR`, `weightKg`, `zone.Z1.lo`/`.hi`…`zone.Z5.hi`, `goal.0`/`goal.1`… Parse i `getProfile()` via `parseInt`/`parseFloat`.
- Notion SDK v5: `parent: { type: "data_source_id", data_source_id: dsId }` vid `pages.create()`, inte `database_id`. Queries mot `client.dataSources.query({ data_source_id })`.
- `syncWorkoutToLog()` använder `FIT-fil`-propertyn (rich_text) för en unik key (`date|HHMM|type`) så pass kan uppdateras idempotent. Filnamn lagras inte separat eftersom det går att härleda från `date+time+type` + sökning i Drive.
- Pass-slug `YYYY-MM-DD-HHMM-Type` använder bindestreck för mellanslag i typnamnet; `parseSlug` i `slug.ts` översätter tillbaka. Nästa gångs förbättring: lägga till tecken-escaping om någon typ innehåller `-` (ingen gör det idag i HealthFit).
- Profile sync-badge (timestamp eller felmeddelande) finns under ProfileCard när storen har `lastSyncedAt`/`lastError`. Inga toasts eller globala statusbar-komponenter behövdes.
- **HRZn i Workouts.xlsx är Excel-dygnsfraktion** (samma enhet som Total_Time), **inte direkt fraktion 0–1** som AGENTS.md sa i Session A. Empirisk kontroll: sum(HRZ0..5) ≈ Total_Time / 86400 = ~0.022. `parser.ts` konverterar via `hrz × 86400 / totalSec` för att få andel av pass (0–1). Första implementationen visade 1 %-zoner överallt.
- **FIT-löpkadens är strides/min** (en fot) — Apple Fitness/xlsx visar SPM (båda fötter). Heuristisk ×2 i `fit-parser.ts` när `sport === "running" && avg_cadence < 120`. Cyklisterkadens (<120 RPM = normalt) påverkas inte.
- **Nominatim reverse-geocode**: `zoom=16` + `accept-language=sv` + adressklass-prioritet `hamlet/neighbourhood/quarter/suburb/village/town/city_district/city/…` ger lokala ortsnamn. Använd **startpunkten**, inte bbox-center (slingor som korsar gränser landar annars i "fel" ort). Nominatims usage policy kräver `User-Agent`. Endpoint finns kvar (`/api/fitness/geocode`) även om UI inte visar platsen just nu — kan återaktiveras när behov uppstår.
- **Coggan PMC-formel**: ATL = 7d-EMA (α = 2/8 = 0.25), CTL = 42d-EMA (α = 2/43 ≈ 0.0465), TSB = CTL − ATL. Iterera dagligen från 90 dagar tillbaka (warmup) för stabilt värde. TLR/ACWR = ATL/CTL; `<0.8` detränar, `0.8–1.3` sweet spot, `1.3–1.5` påfrestning, `>1.5` skaderisk.
- **Training Load Focus** (över 42d): viktar varje pass TRIMP med zon-fraktionerna — `Anaerobic = Σ(TRIMP × HRZ5)`, `High Aerobic = Σ(TRIMP × (HRZ3 + HRZ4))`, `Low Aerobic = Σ(TRIMP × (HRZ1 + HRZ2))`. Visas som andelar + absolut TRIMP per kategori.
- **Dashboardplacering v/s pass-placering av PMC-kort**: testades först på dashboard, sedan flyttades till pass-sidan, slutligen borttaget helt eftersom `CTL=19, ATL=42, TLR=2.14` var vilseledande för en tom backlog (TRIMP-historik på <42 dagar ger aldrig stabil CTL). API-endpointen `/api/fitness/load` finns kvar för framtida statistics-sida när tillräcklig historik har ackumulerats.
- **Turbopack + `inline-flex`**: vissa className-kombinationer med `inline-flex items-center justify-center` plockas inte upp — computed `display: block`. Workaround: `style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}` inline. Händelse-triggad (osäkert vilka kombinationer som krockar); detektera via `preview_inspect` och flytta till inline-style när det kommer upp igen.
- **FIT `session.total_ascent` är ofta 0 eller saknas** trots att altitude-records finns (Apple Watch skriver inte summary-fältet konsekvent). Lösning i `fit-parser.ts`: när summaryn är 0/null men altitude-records finns, beräkna själv med glidande 3-punkters medelvärde (sample var 5:e sek) och summera positiva deltas. Ger ~105 m för Sjömarken-rundan där `total_ascent=0`. `elevationGainM` är nu `number | null` — null = ingen altitudedata alls (styrkepass), 0 = plant pass (sällsynt, men korrekt).
- **Leaflet `MapContainer` kräver stabil `key`** för att inte kraschna vid HMR eller navigation mellan pass: `"Map container is being reused by another instance"` + `Cannot read properties of undefined (reading 'appendChild')`. Använd något passunikt som key — jag använder bbox-koordinaterna (`${minLat.toFixed(4)},${minLon.toFixed(4)}`). Alternativet är att genom unmounta/remounta föräldern via nyckling, vilket också fungerar. Utan detta overleva HMR-fel mellan fast-refresh-cykler.
- **HR-enhet = "bpm"** i UI, inte "puls". `slag/min` är också OK i läsbar text men `bpm` är koncist nog för kompakta stat-kort.
- **RPE-färgbuckets** (Borg CR10, svensk mapping): 1–3 grön (Lätt/Ganska lätt/Måttlig), 4–6 blå (Lite jobbig/Jobbig/Ganska svår), 7–8 lila (Svår/Mycket svår), 9–10 röd (Extremt svår/Maximal). Färgen drivs av `rpeColor()` och används på ringens border, siffran, etiketten och signalstaplarna samtidigt — en enda sanningskälla.
- **Synkstatus som tvådelad signal:** `modifiedTime` från Drive-filen = när HealthFit-appen senast körde sin export. Datumet på senaste datapunkten (`restingHRDate`, `vo2MaxDate`) = hur färsk själva datan är. De är **olika saker** och användaren vill ofta veta båda: "filen synkades för 11 h sedan MEN datan slutar 14 apr" är ett giltigt tillstånd. Exponera båda via API och visa separat i UI (stat-kort `dataDate`-prop för datapunkter, footer för fil-timestamps). HealthFit batchar dagliga summary-metrics (Resting HR, VO₂ Max, HRV, Sleep) 1–2 dagar efter dagens slut — så stat-kort-raderna visar ofta 1-2 dagar gammal data även direkt efter en ny fil-sync.
- **HealthFit sync-cadence** (iOS-appen vi konsumerar): triggas när Apple Watch → iPhone-sync landar ett nytt pass i HealthKit + ~minut bakgrundskörning, förutsatt att **Background App Refresh är på** för HealthFit. Ingen "sync nu"-knapp i standard-UI:t — öppna appen för att tvinga igenom en export. Daily summary-metrics går en separat cykel och kommer typiskt dagen efter klocka stämplat klar.
- **"Synka nu"-knapp + cachebypass:** `drive.ts` har 5-min in-memory-cache → nya Drive-filer syns först efter utgången. Knappen i dashboard-footern anropar API:erna med `?refresh=1`, som propageras via `{ skipCache: true }` till drive-helpers och tvingar nyhämtning. Mönstret: `getLatestWorkoutsXlsx({ skipCache })` / `getLatestHealthMetricsXlsx({ skipCache })`. Använd samma pattern i andra Drive-endpoints om de läggs till. Efter API-anropet: `mutate()` på SWR-hookarna så UI:t reflekterar det nya svaret direkt.
- **Dashboard-listan = alltid 10 senaste pass.** Tidigare försök: öka till 200 + lokal "Visa alla"-expansion. Det blev kaotiskt när listan växte till 40+ pass + alla ska laddas i hukt minnestillstånd på mobilen. Istället: dashboarden är en **snabb-vy** (10 pass), full historik kommer i en egen `/fitness/history`-sida (paginerad, filtrerbar — byggs i kommande session). AI-coachen får hela historiken via en separat server-side `context.ts`-modul — den behöver aldrig gå via UI-endpoints. Separera UI-context från AI-context från början.
- **`buildFreshnessTooltip()`-pattern:** När man exponerar "synk-status" från batched externa källor (Drive/cloud-export/cron-jobb) vill användaren ofta veta *både* när filen skrevs *och* när senaste datapunkten är från. Bygg en multi-linje-tooltip som listar båda + källfilnamn för debug: `Fil skriven i Drive: 12:12 idag\nSenaste pass: 15 apr.\nKälla: Workouts_v5`. HTML `title`-attributet klarar `\n` och native browser tooltip respekterar det. På mobil: tap-and-hold triggar tooltipen. Helper-formatterare som är bra att ha kvar: `formatAbsoluteSv()` (HH:MM idag / HH:MM igår / 10 apr kl. 13:42), `formatDateSv()` ("16 apr"), `relativeTimeSv()` ("för 3 h sedan"), `pickLatest()` (senaste ISO-datum ur en array med mixade null/undefined).
- **Apple Fitness-stil summary-pattern:** `px-4 py-2.5` + `text-xl` ger kompakt men läsbar stat-grid (2 kolumner × N rader + separat rad för ansträngning). Radordningen för pass-summary är låst:  Träningstid/Distans → Aktiva kalorier/Snittpuls → Höjdökning/Snittkraft → Snittkadens/Snittakt → Maxpuls/TRIMP → Ansträngning. Färg-palett: amber (tid), indigo (distans/kadens/takt/TRIMP), röd (kalorier/puls), grön (höjd/kraft), RPE-färg-buckets (ansträngning). Värden och enheter i samma tokenfärg med `opacity: 0.75` på enheten. Visa "–" när datafältet är `null` så man skiljer "saknar data" från "0".
- **ByteString-fel vid fetch ("Cannot convert argument to a ByteString because the character at index X has a value of Y which is greater than 255"):** HTTP-headers måste vara Latin-1. Vanlig orsak: API-nyckel eller annan secret har klistrats in som den **truncerade förhandsvisningen** (`sk-ant-api03-…xxx` med faktiskt `…` U+2026 på position 13) istället för det fulla värdet. Felsök genom att räkna index X i strängen och slå upp värdet Y i unicode (t.ex. 8230 = `…`). Alltid: kopiera API-nycklar direkt från skaparens/provider-sidan när de visas i full längd, aldrig från "kopiera preview"-knappar. Lokal `.env.local` gick ofta bra; det är GH-secreten som klistrats fel.
- **Anthropic SDK `system`-prompt separeras från user-prompt:** `messages.create({ system, messages })` — persona/stil/ton bör alltid ligga i `system`, inte inbakat i user-prompten. Två vinster: (1) system-strängen hashas för prompt-caching så upprepade anrop blir billigare, (2) håller user-prompten kort och fokuserad på just detta specifika anrop. Format-regler som "tilltala med du", "2–3 stycken" hör hemma i system, inte i varje user-prompt.
- **Notion-sida som system-prompt (coach-persona):** Istället för hårdkodning i kod eller `rich_text`-kolumn i Profil-DB — en hel Notion-sida med rubriker och block. Hämtas via `blocks.children.list` och plattas till markdown-liknande text via `blockToLines()` (heading_1/2/3, paragraph, bulleted_list_item, numbered_list_item, quote, code, callout, divider). 5 min in-memory cache räcker — användaren redigerar i Notion och ändringar slår igenom utan deploy. Viktigt: sidan måste delas med integrationen (Träningscoach) manuellt i Notion UI — kan inte automatiseras. Lagra page-id som env-var, inte hårdkodat.
- **AI-coach måste anchoras på datum vid analys av äldre data:** När AI analyserar ett pass från t.ex. 16 april ska kontexten (PMC, "senaste pass", veckoaggregat, planerade pass) avspeglas *som den såg ut runt 16 april* — inte idag. `buildContext({ anchorDate })` i `context.ts` filtrerar pass med `w.date <= anchorIso`, räknar PMC fram till anchorIso (inte idag), och planerade pass `>= anchorIso`. Prompten förses också med en explicit "ANALYS AV ÄLDRE PASS"-prefix som berättar för Claude att prata om passet i dåtid. Utan det tolkade coachen framtida pass som om de låg före passet — förvirrande och fel.
- **Claude hallucinerar veckodagar från ISO-datum:** Claude är inte pålitlig på att räkna ut vilken veckodag ett givet datum föll på (sett att den kallade 17/4-fredag för "tisdag" när bara `2026-04-17` fanns i prompten). Lösning: inkludera veckodagen *tillsammans med* ISO-datumet i hela kontexten — "2026-04-17 fre" — via `isoWithDow()` i `context.ts`. Gäller workoutLine, plannedLine, anchor-rubriker, och "DAGENS DATUM"-prefix. Lägg också en explicit instruktion i system-prompten/coach-personan: "använd veckodagen som den står, räkna aldrig själv". Motsvarande problem finns i alla LLM-prompts som refererar till datumsekvenser — lägg alltid till veckodag proaktivt.
- **Notion rich_text 2000-teckens gräns per block:** `saveWorkoutAnalysis()` klipper AI-analysen till 1900 + "…". Gäller alla `rich_text`-kolumner — om du lagrar lång text där, klipp alltid proaktivt. Alternativ är att lagra på sid-content istället (inte kolumn), som har ingen gräns men kräver blocks.children-API.
- **Notion "arkivera" ≠ permanent radering:** `pages.update({ archived: true })` flyttar till papperskorgen. Filtreras automatiskt bort från query-resultat. Användaren kan återställa i Notion UI. Bra för scripts som rensar produktionsdata — `scripts/cleanup-old-plans.mjs` har dry-run som default + `--confirm`-flagga. `notion-update-page` MCP-verktyget stödjer inte archive direkt, så använd `@notionhq/client` i ett Node-skript.
- **Notion data-source paginering:** `dataSources.query({ data_source_id, start_cursor, page_size, has_more })` — glöm inte `start_cursor` i iteration. `DsApi`-typen i `notion.ts` behövde utökas för att stödja det. Default `page_size` 100.
- **Dubblera aldrig data mellan coach-persona-sidan och Profil-DB:** Pulszoner, vikt, mål bor i Profil-DB och bakas in i kontexten via `profileText()`. Persona-sidan innehåller *bara* roll, ton, fysiologisk karaktäristik som inte ändras ofta, träningsmiljö, normalvecka-referens, prioriteringsordning. Om du dubblerar och de kommer ur synk kommer coachen ge motsägelsefulla råd.
- **AI-stjärn-badge på pass-ikoner:** `auto_awesome` (Material Symbols, fylld via `fontVariationSettings: "'FILL' 1"`) + `position: absolute; right: 2; bottom: 2` **inom** parent-cirkeln med `relative`-klass. Opacity ~0.85, samma färg som typikonen (primärfärg), storlek 11px. Ingen bakgrund, ingen border — integrerar i ikonen istället för att sticka ut som ett "ditklistrat badge". Fetchas via `/api/fitness/analysed` → `listAnalysedKeys()` → `Set<string>` av `date|HHMM|type`-nycklar.
- **Tailwind `whitespace-pre-wrap` fungerar INTE via tw.css:** Använd alltid `style={{ whiteSpace: "pre-wrap" }}` inline när texten innehåller `\n\n` som ska bli styckebryt. Samma mönster som andra Tailwind-klasser på mobil — inline är säkraste vägen.
- **Pass-match mellan slug och xlsx är tolerant på typ:** `slug.type === "Outdoor Running"` men xlsx har exakt samma sträng här. För andra fall: matcha via substring (`wType.includes(qType) || qType.includes(wType)`). Tid och datum måste matcha exakt (HHMM-prefix, datum isodate). Tiden i xlsx är aktuellt start-HH:MM, inte FIT-filens HHMMSS — slugga alltid från Workouts-fliken om du har den.
- **`/api/fitness/analyse` GET kontra POST — separera behavior:** GET läser från Notion (snabbt, billigt). POST genererar ny via Claude (långsamt, kostar). Så UI:t kan fetcha GET automatiskt vid sidladdning och visa sparad analys, och POST bara trigga vid knapptryck. `logDbReady: false` signalerar att Notion-DB:n inte är konfigurerad — UI renderar då "analysen genereras men sparas inte"-varning men låter användaren köra ändå.
- **Loading-disabled vs permanent-disabled:** `disabled={generating}` är OK. `disabled={generating || !data.logDbReady}` är INTE OK — det blockerar användaren från att använda feature bara för att optional lagring saknas. Visa varnings-text istället och låt knappen vara klickbar. Samma princip: optional features ska degradera graciöst, inte blockera.
- **Paginerad historik + dashboard-snabb-vy:** Dashboarden = 10 senaste. `/fitness/history` = 500 senaste med typ-filter + månadsgruppering + "Visa fler"-knapp (30/sida). AI-coachen läser hela historiken server-side via `context.ts` — går *aldrig* genom UI-endpoints. Separera UI-context från AI-context från början så de kan utvecklas oberoende.

#### Session C — AI-analys per pass + dedikerad historik-sida ✅ Klar
- [x] Anthropic API (`claude-sonnet-4-6`, Sonnet 4.6) för passanalys — `src/lib/fitness/claude.ts`. Persona läses från Notion-sida och skickas som `system`-prompt separat från user-prompten (bättre cache, kortare body).
- [x] `src/lib/fitness/context.ts` — prompt-paket: profil, PMC, 20-veckors veckoaggregat, senaste 20 pass, hälsovärden (vikt/vilopuls/VO₂ max/HRV), kommande planerade pass. **Anchoras på ett datum** via `buildContext({ anchorDate })` så äldre pass inte får framtida data som kontext. `recentCount`/`weeklyWeeks`/`skipPlans` för tuning.
- [x] `src/lib/fitness/coach-persona.ts` — fetchar `NOTION_FITNESS_COACH_PAGE` via `blocks.children.list`, plattar block → markdown-liknande plain text, 5 min in-memory cache. Saknas sidan → personan är null, coachen kör på vanilj-promptens instruktioner.
- [x] `src/app/api/fitness/analyse/route.ts` — GET/POST. GET läser sparad analys från Notion-träningsloggen, POST genererar ny via Claude + sparar i `AI-analys`-kolumnen (klipper till 1900 tecken + "…"). `maxDuration = 60` eftersom Claude-svaret kan ta 5–15 sek.
- [x] `src/components/fitness/AIAnalysisCard.tsx` — visar sparad analys eller "Generera analys"-knapp. Regenerera-knappen visar spinner + "Analyserar…" under generering; föregående text dämpas till `opacity: 0.5` som signal att uppdatering pågår.
- [x] `src/app/api/fitness/analysed/route.ts` + `listAnalysedKeys()` i `notion.ts` — listar `date|HHMM|type`-nycklar för pass som har AI-analys. Dashboarden + historik-sidan fetchar detta och visar en liten sparkle (`auto_awesome` fylld, primärfärg, opacity 0.85) **inom** typikonens cirkel (nedre höger, `right:2 bottom:2`). Inget utstickande badge — integrerat i cirkeln.
- [x] `src/app/(dashboard)/fitness/history/page.tsx` — paginerad historik (30 pass/sida + "Visa fler"-knapp), typ-filter (9 kategorier), månadsgruppering (`"April 2026" + N pass`). Dashboarden behåller 10 senaste + länk "Se all historik →".
- [x] `heightCm?: number` tillagt i `FitnessProfile`, `DEFAULT_PROFILE` (185 cm/68 kg som nya Adam-defaulter), ProfileEditor + Notion-synk (nyckel `heightCm` i Profil-DB).
- [x] `scripts/cleanup-old-plans.mjs` — engångsverktyg som arkiverar historiska pass i Planerade pass-DB som inte är `Genomfört`. Dry-run som default, `--confirm` för att köra.
- [x] Coach-persona-sidan skapad i Notion under 🏃🏻 Träningscoach: innehåller roll/ton, fysisk+kroppslig profil, träningsmiljö, normalvecka, kadens, prioriteringsordning, anpassning, styrka. Dubbletter med Profil-DB (pulszoner, vikt, mål) ligger *inte* i sidan — de hämtas från strukturerad data.

**Observera:**
- **Format vs. persona** separeras medvetet: persona (hur coachen tänker) bor i Notion-sidan → lätt att justera utan deploy; output-format (du-tilltal, 2–3 stycken, ingen punktlista) hårdkodat i `system`-prompten i `claude.ts` så det alltid är garanterat; profil-fakta (zoner, mål, maxpuls) i Profil-DB.
- **Sonnet 4.6-prissättning:** ett pass med full kontext = ~3100–4400 input-tokens + ~350–410 output-tokens. Om användaren spammar "Generera analys" blir det väldigt billigt — men regenerera-knappen är placerad så det kräver aktivt klick.

#### Session D — Coach-fliken med AI-planering ✅ Klar
- [x] `src/app/(dashboard)/fitness/coach/page.tsx` — vecko-/månadskalender med Notion-planerade pass + HealthFit-genomförda pass parallellt (hollow-dots i månadsvyn, `DonePill` i veckovyn). Typ-ikoner + färger för run/walk/bike/strength/core/swim/ski/padel/yoga täcker både svenska plan-typer och engelska HealthFit-typer.
- [x] CRUD-modal (portal-renderad) för skapa/redigera/arkivera planerade pass — fält: Passnamn, Datum, Typ, Tid, Tempo, Pulsintervall, Underlag, Syfte, Passdetaljer, Status. Arkivera-knapp visas bara i edit-mode.
- [x] `src/lib/fitness/notion.ts` — `createPlannedWorkout()`, `updatePlannedWorkout()`, `archivePlannedWorkout()`, `createPlannedWorkouts()` (batch). `getPlannedWorkouts()` paginerar nu hela DB:n.
- [x] `src/app/api/fitness/plans/route.ts` POST + `src/app/api/fitness/plans/[id]/route.ts` PATCH/DELETE.
- [x] `src/lib/fitness/claude.ts` — `generateTrainingPlan()` (initial), `reviseTrainingPlan()` (chat-revision med feedback), `regeneratePlanItem()` (byt ut ett pass). Alla tre får `calendarOverview()` + `planDatumOverview()` i prompten så Claude inte hallucinerar veckodagar eller räknar fel på veckogränser.
- [x] `src/app/api/fitness/coach/route.ts` — diskriminerar på body: `{ prompt }` / `{ items }` (save-only) / `{ revise: { prompt, plan, feedback } }` / `{ regenerate: { prompt, plan, index, hint? } }`. `PlanParseError` returnerar `rawText` (1500 chars) i 422-body.
- [x] AI-draft-UI: prompt-input döljs när draft finns (originalprompten visas som quote högst upp), refresh-knapp per pass-kort för regen, feedback-textruta längst ner för revise, "Spara N pass"-knapp skickar `items` direkt till Notion utan att regenerera (så visad = sparad).
- [x] `/fitness/history` filter-rad reducerades till 7 kategorier (Alla, Löpning, Styrka, Core, Promenad, Padel, Cykling) och wrappar på två rader istället för horisontell scroll.

**Observera:**
- **React Portal krävs för modaler över MobileNav:** Dashboard-layoutens `motion.div` (opacity-animation vid route-byte) skapar en ny stacking context, så z-index 100 på en modal-backdrop inuti page-komponenten **förlorar** mot z-50 på MobileNav som är utanför. Lösning: `createPortal(modal, document.body)` med `mounted`-guard (`useState(false)` + `useEffect(() => setMounted(true), [])` för att undvika SSR-mismatch). Gäller för alla dialoger som måste täcka hela viewporten.
- **Claude hallucinerar veckodagar + veckogränser lika mycket vid planering som vid analys.** "Nästa vecka" kan bli mån-ons nästa vecka _plus_ mån-tis efter det, och söndag kan benämnas som både "lördag" och "söndag" i samma svar. Fix: `calendarOverview(today, weeks)` injicerar `DAGENS DATUM: 2026-04-20 mån.` + explicit lista (`Denna vecka: mån 2026-04-20 – sön 2026-04-26.` etc.) och `planDatumOverview(plan)` mappar index→datum+veckodag för varje befintligt pass. Plus system-prompt: "En svensk vecka börjar MÅNDAG och slutar SÖNDAG" + "räkna aldrig själv ut veckodagen". Gäller alla coach-prompter (generate/revise/regenerate).
- **"Visa = spara" som arkitektur-pattern:** Första impl av save() regenererade via Claude igen, vilket gjorde att användaren kunde se förslag A men faktiskt spara förslag B. Fix: API-routen har ett `{ items }`-läge som hoppar över Claude helt och batch-skapar i Notion. Generellt: när UI visar ett AI-genererat förslag som användaren kan granska innan commit — skicka själva förslaget till save-endpointen, inte prompten som skapade det.
- **"Fortsätt chatten"-pattern:** I stället för att hålla full message-history (dyrt, komplex state) — skicka bara originalprompten + hela nuvarande planen + adeptens feedback. Claude får all kontext i en prompt och returnerar en ny komplett plan. En revision-iteration = 1 Claude-anrop, ingen history-array i klienten. Enkelt och cache-vänligt.
- **JSON-parsning från LLM ska prova alla start/slut-par:** Första `[` till sista `]` räcker inte eftersom kodstaket, `[pass 1]` i kommentar eller kapslade beskrivningar ("[Z3–Z4]") kan lura parsern. `extractJsonArray`/`extractJsonObject` är O(n²) men texten är kort — prova varje `[`-position mot varje `]`-position tills `JSON.parse` ger en giltig array med minst ett objekt. Samma mönster för `{}`-objekt. När parsning fallerar: kasta en `PlanParseError` med `rawText`-fältet så servern kan logga och klienten kan visa det i en fällbar `<details>` för debug.
- **Claude max_tokens vid "revise"-läget måste vara större:** revise-prompten har hela förra planen JSON-serialiserad i input, och outputen ska också innehålla hela nya planen + kommentar. 2000 tokens räcker bara för ~5-pass-planer innan svaret trunkeras mitt i JSON. Bump till 3500 för 12–14 pass. Upptäck trunkering via `response.stop_reason === "max_tokens"` och ge specifikt felmeddelande ("Svaret blev för långt och avbröts") så användaren vet att det inte är JSON-fel utan längd-fel.
- **`spin-anim` alias-keyframe:** Flera ställen i kodbasen använder inline `animation: "spin-anim 0.8s linear infinite"` — men `globals.css` definierade bara `@keyframes spin` + `.spin-anim`-klassen. Det betyder att inline-spinners **aldrig snurrade**, men det gick obemärkt förbi länge. Fix: lägg till `@keyframes spin-anim` med samma innehåll som `spin` så befintlig inline-kod fungerar utan filomskrivning.
- **Visa genomförda pass jämsides planerade i kalendern, synka INTE:** Genomförda pass från HealthFit visas parallellt (grön check + pass-info) men skrivs aldrig till `Planerade pass`-DB:n. Att auto-synka hade blandat semantiken — "Planerade" skulle inte längre bara innehålla planer utan också pass man aldrig planerade. Håll UI-merge separat från datalagring.
- **Period-titel som klickbar "Idag"-knapp:** På mobilens smala bredd tog en separat "Idag"-knapp för mycket utrymme bredvid pilarna + vy-växlaren. Lösning: gör själva periodtiteln (`13 – 19 apr.`) till en klickbar knapp med `title="Gå till idag"`. Sparar en chip-bredd utan att dölja funktionen.

#### Session D.5 — Matchning mellan planerade & genomförda pass ✅ Klar
- [x] `src/lib/fitness/match.ts` — delad matchnings-modul. Exporter: `matchCategory(type)` (svenska plan-namn + engelska HealthFit-typer → `run|walk|bike|strength|core|swim|ski|padel|yoga|other`), `scoreMatch(workout, plan)`, `findBestPlanMatch()`, `matchWorkoutsToPlans()` (tvåvägs-greedy via global score-sortering), `workoutKey()`.
- [x] Pass-detaljsidan använder matchern i stället för naivt `plans.find(p => p.datum === date)` — felmatchade "Core" som planerat pass för en löpning försvann. Visar "Planerat till fre 17" om planen låg på annan dag.
- [x] Coach-kalendern (vecko + månad): planerade pass som fått ett genomfört pass renderas som `<Link>` till passdetalj med grön bock + "→ tis 21"-dämpad flytt-etikett. Genomförda pass som konsumerats visas inte som fristående `DonePill` längre.
- [x] Fitness-dashboardens `NextPlannedCard` tar nu `workouts` + använder matchern. Dagens klara planer visas som kompakt grön-bock-rad ovanför nästa-pass-blocket, nästa pass hoppar vidare till första okonsumerade planen (oftast imorgon).

**Observera:**
- **Notion-planens `typ`-fält är ofta feltaggat** (t.ex. Core-pass med `typ="Styrka"`, `passnamn="Core"`). `scoreMatch` härleder kategori från **både** `plan.typ` och `plan.passnamn` och accepter:ar match mot någondera. Utan det skulle seriösa andelar av planerna vara omatchbara trots tydliga passnamn.
- **Greedy-ordning via datum är fel strategi.** När två genomförda core-pass kan matcha samma plan (söndag = diff −1, tisdag = diff +1) gav "äldst först" att söndagen snappade planen. Rätt: bygg alla giltiga `(plan, workout)`-par, sortera på score, tilldela i fallande ordning och skippa par där någondera är upptagen. O(P·W) pair-generation + O(n log n) sort, trivialt i praktiken.
- **Tie-break: gjord dagen efter plan (diff = +1) slår gjord dagen före (diff = −1).** Vanligaste verklighet: planen ligger stilla, passet slirar framåt. Score: diff 0 = 100, +1 = 45, −1 = 40, +2 = 15, −2 = 10 + kategori-bonus 20 + substring 5/5.
- **Matcher används INTE i `/api/fitness/analyse`-route.** Den letar upp en xlsx-rad via date+time+type (strikt, slug-inverse) — det är en annan domän än plan-matchning och ska förbli strikt så AI inte analyserar fel pass.
- **Arbitrary Tailwind size-klasser (`text-[9px]`) ingår inte i `tw.css`-builden** i den här repon → skriv inline `style={{ fontSize: 9 }}` för allt som måste bli mindre än `text-[10px]`. Samma mönster som med `md:`-prefix: inline vinner alltid.

#### Session E — Dagsform, mål & AI-analys-kommentar ✅ Klar
- [x] `src/app/api/fitness/readiness/route.ts` — Dagsform-poäng 1–100 (1/3 HRV-avvikelse mot 7d-medel, 1/3 sömn med 7h som full poäng, 1/3 TSB som bonus/minus). Returnerar `score`, `label` (Återhämtad/OK/Lite slö/Trött), `color`, och komponent-breakdown.
- [x] `src/components/fitness/ReadinessCard.tsx` — "Dagsform"-kort med SVG-ring + tre komponent-rader (HRV/Sömn/Form). Ring-färg följer `label`. HRV-rad visar `118/78 ms` (aktuellt/7d-snitt) för att hålla sig på en rad i den smala kolumnen bredvid ringen.
- [x] `src/components/fitness/GoalProgressCard.tsx` — målkort med tidsprogress (antagen 12-veckors förberedelse bakåt från deadline), färgtröskel på `daysLeft` (< 14 d = röd, < 42 d = amber, ≥ 42 d = grön). Målen läses direkt från profil-storens `goals`.
- [x] Enskilt AI-pass: `generateSingleWorkout()` i `claude.ts` + body-variant `{ single: { date, hint? } }` i `/api/fitness/coach` — används av "+ Nytt pass"-knappen i coach-kalendern för att AI-generera ETT pass för ett specifikt datum med valfri hint.
- [x] Kommentarsfält innan AI-analys: textarea i `AIAnalysisCard` (både vid första "Generera analys" och bakom en toggle vid "Regenerera") → skickas som `{ context }` i POST body till `/api/fitness/analyse` → `analyseWorkout(workout, userContext)` i `claude.ts` bakar in kommentaren som ett block i user-prompten ("ADEPTENS EGEN KOMMENTAR"). Spara aldrig kommentaren i Notion — den är ephemeral, bara för denna körning.
- [x] Profil-ordning omdisponerad: mål ovanför "Min profil", VO₂ max ovanför HRV i stats-grid, "Klarat idag" som egen box ovanför "Nästa pass".

**Dropped scope — HealthFit-statistik gick inte att reconcilera.**
Försök #1: `/fitness/statistik`-sida med TLR/TLF + HRV/vilopuls/VO₂ max-trender. CTL/ATL matchade HealthFit exakt efter två iterationer (pandas-EMA + yesterday-TSB). Men Training Load Focus-fördelningen (Anaerobic/High Aerobic/Low Aerobic) landade på 4.5%/37.6%/57.9% medan HealthFit visar 7%/49%/44% för samma fönster (25 mar–21 apr). Olika kategorisering av zoner in i buckets, ingen offentlig docs. Användaren opt:ade ut: "fimpa statistiken, använder HealthFit för det. Är överkurs ändå." Sidan + `/api/fitness/load` + `/api/fitness/trends` + `LoadCards`/`TrendCards` borttagna. TLF-texten i AI-coachens prompt också borttagen. Beredskap idag-kortet behölls — det är självständigt från TLF.

**Observera:**
- **HealthFit använder pandas-stil EMA, inte continuous.** `α = 2/(N+1)` där N är window-length: ATL = `2/8 = 0.25`, CTL = `2/43 ≈ 0.0465`. Continuous-formeln `α = 1 - e^(-1/τ)` ger nära men inte exakt samma värden — och HealthFit-appen är den auktoritativa referensen eftersom användaren jämför sina dashboard-siffror med den dagligen. Gäller både i `/api/fitness/readiness` och `context.ts` (AI-coachens PMC). 180 dagars warmup ger stabilt CTL.
- **TSB = `gårdagens CTL − ATL`, inte dagens.** HealthFit/TrainingPeaks-konvention: TSB representerar "form inför dagens pass", så man räknar EMA:n fram till igår, *inte* inklusive dagens TRIMP. Spåra `ctlPrev`/`atlPrev` i iterationsloopen. Utan det blir TSB ≈ −3 när HealthFit visar +3.
- **Inkluderande fönster för N-dagars aggregat:** `cutoff = today − (N − 1)`, inte `today − N`. `today − N` ger N+1 dagar. Jämför alltid med HealthFit:s period-etikett i hörnet om tillgänglig (de visar `25 mar – 21 apr` för "senaste 28 dagar", inte `24 mar`).
- **HealthFit TLF-kategorisering är inte reverse-engineerable utan officiell docs.** Vi vet TRIMP-viktning × zon-fraktioner är rätt matematisk grund, men zon → bucket-mapping (inkl. vilken HR-zonmodell som används) matchar inte vår Z1+Z2 / Z3+Z4 / Z5-split. Skippa reproduktion — länka ut till appen istället. Mönster: om en extern app är den sanning användaren kollar mot, och reconciliation misslyckas — ta bort feature:n hellre än att visa fel siffror med vår logga bredvid.
- **Kommentarsfält för AI = ephemeral, inte persisted.** `userContext` går in i user-prompten (inte system) och sparas *inte* som egen Notion-kolumn. Två anledningar: (1) kommentaren beskriver ett ögonblickstillstånd ("krockade dagen innan", "magen skötte sig inte") som inte har historiskt värde — analysen som sparas har redan tagit hänsyn till det. (2) Undviker en extra rich_text-kolumn i DB-schemat. Samma mönster bör appliceras på andra valfria "kontext-fält" för AI-flöden.
- **Regenerera-knapp + kommentar-toggle som separat UX:** När en analys redan finns renderar vi två chips bredvid varandra — **Kommentar** (toggle, öppnar textarea under analysen) + **Regenerera** (kör direkt). Användaren kan regenerera utan kommentar (snabbfall) *eller* expandera, skriva, och sen regenerera. Undvik att alltid visa textarean — den dominerar layouten även när användaren bara vill uppdatera utan kontext.
- **Readiness-komponenter väger 1/3 var:** HRV (±20% mot 7d-medel → ±50 poäng kring 50), sömn (7h = 100, 5h = 30, linjärt däremellan), TSB (+10 → 100, −20 → 0, 0 → 65). Om en källa saknas defaultar vi dess del till 50 (neutral) så totalpoängen inte blir missvisande låg. Label-trösklar: ≥75 Återhämtad (grön), ≥55 OK (blå), ≥40 Lite slö (amber), <40 Trött (röd).
- **Trång kolumn inom en lista-i-kort:** När du har en "label · detail ........ value"-rad i en kolumn som kan bli så smal som ~200 px (grid-cell bredvid en ring/circular chart), trunkera detail aggressivt. "118 ms vs 78 ms 7d" blev två rader; "118/78 ms" håller sig på en. Generellt: släng enheter när label redan ger context (HRV = ms är given), släng parenteser ("(7d)" tappas i favör av ren ratio), använd slash för jämförelse istället för "vs ".
- **"Dagsform" > "Beredskap":** Svensk idiomatisk term som atleter och coacher använder. "Beredskap" översätts tekniskt men associeras mer med brandkår/räddningstjänst. Användarfeedback landar alltid på "hitta ett bättre ord" när terminologin skaver — byt utan dröjsmål, lojalitet till first draft är fel optimering.
- **Städning när feature rippas:** När en sida tas bort, följ denna ordning så ingenting lämnas hängande: (1) radera `app/(dashboard)/<route>/`, (2) radera `app/api/<route>/`, (3) radera delade komponenter i `components/`, (4) ta bort link/tab i `TopBar.tsx`, (5) ta bort referenser i prompts/AI-kontext (`context.ts`-prompten fortfarande nämner "Fokus (senaste 28d)" → ta bort), (6) rensa oanvända interfaces/konstanter från kvarvarande filer (`FOCUS_DAYS`, `focus`-fält i `LoadSnapshot`). Utan steg 5–6 står AI-prompten kvar och refererar data som inte längre beräknas.

#### Session F — Polish & veckosammanfattning ✅ Klar
- [x] `src/lib/fitness/weekly-summary.ts` — orkestrerar: föregående ISO-vecka, aggregat (TRIMP, distans, tid, zoner, typer, längsta löppass, tuffaste pass, jämförelse mot veckan innan), PMC vid veckans slut, hälsovärden (HRV/vilopuls/sömn-snitt + senaste VO₂ max), matchning planerat vs genomfört via `match.ts`. Claude får 5-sektioners markdown-struktur (Sammanfattning/Belastning/Återhämtning/Mönster/Framåt), svaret parsas till Notion-block (`## ` → heading_2, paragraf, bullet) och skrivs som undersida till `NOTION_FITNESS_COACH_PAGE`. Idempotent: befintlig sida med samma titel (`Veckosammanfattning · v{N} {year}`) arkiveras innan ny skapas.
- [x] `src/app/api/fitness/weekly-summary/route.ts` — GET (dry-run: returnerar texten utan att skriva Notion) + POST (skriver Notion). Auth via `x-weekly-secret`-header mot `FITNESS_WEEKLY_SECRET`. Valfri `?week=YYYY-Www` för backfill.
- [x] `.github/workflows/weekly-summary.yml` — cron `0 6 * * 1` (måndag 06:00 UTC ≈ 07–08 CET/CEST) + `workflow_dispatch` med `week`-input för manuell backfill. Curl:ar endpointen med secreten.
- [x] `.github/workflows/deploy.yml` — `FITNESS_WEEKLY_SECRET` injiceras som `-e` i `docker run`.
- [x] Mobilanpassning — passlistan på `/fitness` och `/fitness/history` hade distansvärden (`6.82 km`) som wrappade till två rader på mobil (värdet shrinkades i `flex items-baseline`). Fixat med `whitespace-nowrap` + `shrink-0` på värde-diven och `truncate` på duration-diven. Övriga fitness-sidor (`/fitness/coach`, `/fitness/pass/[slug]`) auditerades utan nya fynd.

**Observera:**
- **Dry-run via GET är avsiktligt:** samma endpoint, samma auth, men skriver inte till Notion. Det gör det enkelt att smoke-testa från Actions "Run workflow"-knappen eller curl utan att smutsa ner Notion med testkörningar. POST är den enda vägen som faktiskt skapar en sida.
- **ISO-vecka som stabilt ID:** sidtiteln inkluderar ISO-veckonummer + år (`Veckosammanfattning · v17 2026`), inte datumrange. Det gör idempotency trivial: sök barnsidor under coach-sidan efter exakt titel-match, arkivera befintlig innan ny skapas. Titeln är stabil över kalenderårs-gränser (vecka 1 kan börja i december).
- **"Föregående vecka" beräknas från POST-tidpunkten,** inte från fastställt UTC-datum. Med cron måndag 06:00 UTC hamnar vi alltid på föregående måndag–söndag oavsett tidszon.
- **GitHub Actions `vars.DASHBOARD_URL`:** Optional variable (ej secret) för att peka workflow:en på en annan miljö (staging, self-hosted). Default är `https://dash.inicio.cloud`. Sätts under Settings → Secrets and variables → Variables.
- **Max 100 children per `pages.create`:** Notion API:t tar max 100 block i `children`-arrayen. En 5-sektions sammanfattning (5 rubriker + 5 paragrafer) landar på 10 block med stor marginal. Om framtida format sprängs — batcha via `blocks.children.append` efter skapandet.
- **Matchning planerat→genomfört** återanvänder `matchWorkoutsToPlans()` från `match.ts` istället för naivt `plans.filter(p => p.datum === w.date)`, så kärn-matchlogiken finns på ETT ställe. Räknas per vecka: hur många av veckans planerade pass fick ett genomfört pass inom matchfönstret.

### Trädgård — Sessionsplan

> Vision: Personlig trädgårdsassistent som håller koll på växter, säsongsuppgifter och utomhusprojekt — med Notion som master. Dashboarden är läs- och redigeringsgränssnittet, Notion är datakällan.

#### Datakällor i Notion

Tre databaser under sidan *Villa Björkdalen → Trädgård*:

**🌿 Växtregister** (`NOTION_GARDEN_PLANTS_DB`)
- `Växt` (title), `Typ` (select: Häck/Buske/Prydnadsgräs/Prydnadsträd/Perenn/Gräs/Fruktträd/Marktäckare/Grönsak/Blomma)
- `Plats` (multi_select: Inomhus/Växthus/Altan/Baksida/Framsida)
- `Beskärning` (multi_select: Höst/Efter blomning/Ingen/JAS/Vår/Vårvinter/Löpande)
- `Gödsling` (multi_select: Ingen/Höst/Sommar/Försommar/Vår)
- `Skötselråd` (**email-typ** i Notion — läses via `.email`, skrivs via `{ email: string | null }`)
- `Åtgärder` (relation → Säsongsplan)

**📆 Säsongsplan** (`NOTION_GARDEN_SEASON_DB`)
- `Uppgift` (title), `Datum` (date), `Status` (status: Planerad/Pågår/Klar)
- `Typ` (select: Gräsmatta/Rabatter/Träd & buskar/Grönsaker)
- `Åtgärd` (multi_select: Underhåll/Delning/Beskärning/Gödsling/Inspektion/Plantering)
- `Kommentar` (rich_text)
- `🌿 Växt` (relation → Växtregister) — property-nyckeln börjar med emoji

**🧑🏻‍🌾 Utomhusprojekt** (`NOTION_GARDEN_PROJECTS_DB`)
- `Namn` (title), `Status` (select: Ny/Utreds/Planerad/Pågående/Väntar/Klart/Skrotad)
- `Prioritet` (select: Hög/Normal/Låg), `Område` (select: Uppfart/Finplanering/Grovplanering/Trädgård/Bygg/Altan)
- `Tidsram` (select: Oklart/2026/2027), `Budget` (number), `Faktisk kostnad` (number), `Kommentar` (rich_text)

#### Session 1 — Typer, API + översikt/växtregister ✅ Klar
- [x] `src/lib/garden/types.ts` — `Plant`, `SeasonTask`, `OutdoorProject` + input/response-typer + union-literals för select-värden (dokumentations-hint, runtime är bred `string` precis som `PlannedWorkout.typ`).
- [x] `src/lib/garden/notion.ts` — lazy singleton-klient, `resolveDataSourceId()`-cache, separat `mapXxx`/`xxxProps` per DB, partial-PATCH via "bara definierade fält". CRUD för alla tre DBs + `isGardenReady()`.
- [x] `src/app/api/garden/plants/route.ts` + `[id]/route.ts` — GET/POST + GET/PATCH/DELETE. Samma mönster för `tasks` och `projects`.
- [x] `src/app/api/garden/overview/route.ts` — aggregerar: antal växter per typ, antal uppgifter (+30 d) per status, aktiva projekt (status ∈ Planerad/Pågående/Utreds/Väntar) med budget- och utfallssumma.
- [x] Alla routes: `export const dynamic = "force-dynamic"`, try/catch, `isGardenReady()` → 501 + instruktiv text om env-variabler saknas.
- [x] `src/components/layout/TopBar.tsx` — utökad sub-nav för `/garden`: Översikt/Växter/Säsongsplan/Projekt/AI. MobileNav/Sidebar pekar fortfarande på `/garden` som top-route (enhetligt med befintlig nav, även om subroutes är svenska per spec).
- [x] `src/app/(dashboard)/garden/page.tsx` — översikt med tre kort (Växter/Säsongsplan/Projekt), `BreakdownList`-staplar per kategori, klickbara SectionTitles som länkar till subsidor.
- [x] `src/app/(dashboard)/garden/vaxter/page.tsx` — grid (2-col mobil) med typ/plats-filter-chips, `PlantCard` länkar till detaljsida.
- [x] `src/app/(dashboard)/garden/vaxter/[id]/page.tsx` — full Notion-fältvy (`FieldRow`-komponent), chips för multi-select, "Öppna i Notion"-länk via `https://www.notion.so/<id-utan-bindestreck>`, lista av kopplade säsongsåtgärder (client-side filter på `plantIds.includes(id)`).
- [x] Stubbar för `/garden/sasongsplan`, `/garden/projekt`, `/garden/ai` — "Kommer i sprint 2".
- [x] `.github/workflows/deploy.yml` — Garden-env-var **ska** läggas till innan prod-deploy (se secrets-tabellen ovan). Utan dem returnerar endpointen 501 och UI visar not-configured-kort.

**Observera:**
- **`Skötselråd` är `email`-typ i Notion av misstag** — fungerar i praktiken som textfält, men Notion API kräver `{ email: "..." }` vid skrivning och returnerar värdet under `.email`, inte `.rich_text`. Hanteras av `readEmail()`/`emailProp()` i `notion.ts`. Töm fältet via `{ email: null }`, inte tom sträng.
- **Property-nycklar med emoji funkar**, men kopiera dem exakt — `"🌿 Växt"` (en space efter emoji) är nyckeln i Säsongsplan, inte `"Växt"`. Notion-API:t matchar strikt på exakt sträng inkl. emoji + whitespace.
- **Route-prefix = `/garden`**, subroutes = svenska (`/garden/vaxter`, `/garden/sasongsplan`, `/garden/projekt`, `/garden/ai`). Mixen beror på att MobileNav/Sidebar/TopBar redan pekade på `/garden` innan session 1 — att byta till `/tradgard` hade krävt att hela nav-infrastrukturen flyttades samtidigt. Subroutes valdes svenska efter spec:en.
- **501-fallback i UI:** `fetcher` kastar Error vid icke-ok HTTP → `error.message` innehåller statuskoden (`"...: 501"`). Pages för `/garden` och `/garden/vaxter` checkar substring `": 501"` och visar ett instruktivt not-configured-kort med env-variabelnamn istället för ErrorBanner. Generellt mönster: när en hel feature är gate:ad på env-variabler, degradera till instruktionstext hellre än att visa fel.
- **`Åtgärder`-relationen på växt lagras som `atgardIds: string[]`** men UI:t listar kopplade åtgärder via en parallell `/api/garden/tasks`-fetch filtrerad på `plantIds.includes(id)` — inte genom att följa relationen från växten. Det undviker att behöva hämta varje relaterad task-page separat, och Notion har ingen efficient "get relations expanded"-API.
- **Ingen lokal cache** i `notion.ts` (till skillnad från `drive.ts` i fitness). Anledning: Notion är snabbt, låg cardinality (10-tals växter, 100-tals uppgifter), och feature:n lär inte pollas aggressivt. Om det blir ett problem: lägg till 60 s in-memory cache i `getPlants`/`getTasks`/`getProjects` med samma `skipCache`-flagga-mönster som fitness använder.
- **Pagineringshelper (`queryAll`)** används internt i alla tre get-funktioner men exponeras inte — data mängder är små nog att alltid hämta alla. Filtrering sker server-side via Notion-filter när möjligt (`typ`, `status`, `omrade`) och resten på klient.

#### Session 2 — Klar
- [x] **Fas 1 — Verifiering av sprint 1:** Alla 9 endpoints (overview, plants/list+filter+detalj, tasks/list+POST+PATCH+DELETE, projects/list) testade med curl utan kodändringar. Schema/mapping i `notion.ts` matchade riktig data direkt — inga schema-ändringar i Notion gjordes.
- [x] **Fas 2 — Säsongsplan + Projekt:**
  - `src/components/garden/forms.tsx` — delade primitiver: `Field`, `SelectBox`, `MultiSelectChips`, `inputStyle`, `ModalShell` (portal + framer-motion), `ModalHeader`/`ModalFooter`/`ModalErrorRow`. Återanvänds av båda CRUD-modalerna.
  - `src/app/(dashboard)/garden/sasongsplan/page.tsx` — Kalender/Lista/Per växt-vyer + TaskModal. Kalendern: månadsvy mån–sön, idag-indikator (primärfärg-ring), max 2 task-badges per dag (+ "+N" för fler), klick på dag = ny uppgift, klick på badge = redigera, klick på månadstitel = "Gå till idag". Listan: grupperad på Pågår/Planerad/Klar med "markera klar"-bock-knapp + datum i röd för försenade. Per växt: filtrerar uppgifter med `plantIds`, joinar mot `/api/garden/plants`. TaskModal har växt-multi-select som sökbar checkbox-lista (32+ växter blir klumpiga som chips).
  - `src/app/(dashboard)/garden/projekt/page.tsx` — Kanban-board (7 kolumner Ny→Skrotad), `@dnd-kit` med `PointerSensor` + `TouchSensor` (delay 150 ms), prioritet-färgad vänsterkant på kort, status-dropdown direkt på kortet (mobil-vänlig DnD-fallback), edit-pen → ProjectModal. Budget-summering (Aktiva/Budget/Utfall/Återstår) som auto-fit grid (`minmax(140px, 1fr)`) — 2×2 på mobil, 4×1 på desktop utan `md:`-prefix.
  - **Header-fix (efter UI-review):** Title-blocken sitter nu fristående (utan flex-wrap mot action-knappen) på båda sidor. Action-knappen flyttades ner till verktygsraden (sasongsplan: bredvid vy-toggle, projekt: mellan budget-summering och filter-pillerraden). Anledning: `font-headline` (ultra-bold display-font) + `flex-1 min-w-0` krympte title-kolumnen så bokstäverna nuddade knappen — `flex-wrap` triggade aldrig eftersom min-w-0 lät kolumnen krympa istället. Mönster: när h1 har display-font, lägg ALDRIG action-knapp i samma flexrad. Generellt mönster för dashboarden framöver: title-block alltid fristående, åtgärdsknappar i en separat verktygsrad nedanför.
- [x] **Fas 3 — AI-arkitektur (server-side):**
  - `src/lib/ai/types.ts` — modul-agnostiska typer: `ChatMessage`, `ToolDefinition`, `ToolRegistry`, `StreamEvent`. Ingen koppling till garden eller fitness — kan återanvändas av framtida AI-features (homelab-assistent, fitness-coach v2).
  - `src/lib/ai/claude.ts` — singleton-klient runt `@anthropic-ai/sdk`. `createMessage()` (sync) + `streamMessage()` (SDK:s `MessageStream`). Default-modell `claude-sonnet-4-6`. **Bugfix under verifiering:** spread-ordning — `{ model, ...args }` skriver över model med undefined om anroparen inte gav någon, måste vara `{ ...args, model: args.model ?? DEFAULT_MODEL }`.
  - `src/lib/ai/tools.ts` — `runWithTools()`-loop. Streamar text-deltas via SDK:s `.on("text")`, plockar tool_use ur `finalMessage()`, kör `ToolRegistry.handler` per call, lägger `tool_result` (eller `is_error: true` vid kraschat verktyg) i message-historiken, loopar tills `end_turn` eller `MAX_ITERATIONS=10`. Skickar `StreamEvent` via `onEvent`-callback så route-koden bara behöver SSE:a vidare. Också en `runWithToolsSync()` för briefing-liknande icke-streamande flöden.
  - `src/lib/garden/ai-context.ts` — `buildGardenContext()`: hämtar växter, uppgifter ±60 dagar, aktiva projekt direkt mot notion.ts (inte HTTP), + Open-Meteo 7-dygns prognos för Borås (lat 57.7210, lon 12.9401), 30 min in-memory cache. `formatContextAsSystemBlock()` plattar till sträng som bakas in i system-prompten.
  - `src/lib/garden/ai-tools.ts` — sju tools: `create_task`, `update_task`, `list_plants`, `get_plant`, `search_tasks`, `get_weather_forecast`, `create_project`. Varje med JSON-schema (Notion-enums hårdkodade så modellen inte hittar på "Slingrande perenn") + handler som kör mot `notion.ts`. `gardenToolRegistry()` är factory-funktion (inte konstant) för att stödja per-request-isolation.
  - `src/lib/garden/coach-persona.ts` — `getGardenPersona()`. Format-regler hårdkodade i `GARDEN_COACH_FORMAT_RULES` (svenska, du-tilltal, datum med veckodag) — appliceras alltid. Persona-detaljer från Notion-sidan `NOTION_GARDEN_COACH_PAGE` (valfri) eller `GARDEN_COACH_DEFAULT_PERSONA` som fallback. 5 min cache. Block-parser identisk med fitness-versionen.
  - `src/app/api/garden/chat/route.ts` — POST: SSE-stream tillbaka till klient. `data: <JSON-encoded StreamEvent>\n\n`-format. Headers: `Content-Type: text/event-stream`, `X-Accel-Buffering: no` (mot reverse-proxy-buffring). `maxDuration = 120 s`. GET: returnerar bara kontext-summary för UI-sidofältet utan att kosta Claude-anrop.
  - `src/app/api/garden/briefing/route.ts` — GET: 6 timmars in-memory cache, `?refresh=1` bypass. Anropar `createMessage()` med `BRIEFING_PROMPT` (max 150 ord, 2–3 stycken, ingen rubrik). Returnerar `{ briefing, generatedAt, cached, contextSummary, usage }`. Inga tools — briefing är ren texthämtning.
- [x] **Fas 4 — UI för AI:**
  - `src/app/(dashboard)/garden/ai/page.tsx` — fullskärm-chat. Streaming via `fetch` + `ReadableStream`-reader (EventSource klarar inte POST). Custom `parseSseStream` async-generator splittar `\n\n`-event och JSON-parsar `data:`-rader. Assistant-meddelandets parts byggs progressivt: text-deltas appendas till sista text-part, `tool_use_start` lägger en pending tool-part, `tool_use_result` patchar matchande pending part med ok/result/error. ToolChip visar svensk label ("Skapar uppgift", "Listar växter") + spinner/check/error-ikon + kompakt result-blurb. Snabbprompter (4 chips) visas bara när konversationen är tom. Bilduppladdning till base64 (max 5 MB, PNG/JPEG/GIF/WebP) — bilder följer med nästa user-meddelande som image-block. `useSearchParams("prompt=")` deep-link så plant-page kan förfylla textarean.
  - `src/app/(dashboard)/garden/page.tsx` — `BriefingHero`-komponent läggs överst i översiktens grid. Egen SWR-fetch mot `/api/garden/briefing` (separerad från overview-SWR — annars hade laddspinnern blockerat hela sidan i 5–15 s). Skeleton (3 grå rader) under generering, tidsstämpel "just nu / N min sedan", "Generera ny"-knapp som triggar `?refresh=1` + bumpar SWR-key, och "Öppna chat"-länk till `/garden/ai`.
  - `src/app/(dashboard)/garden/vaxter/[id]/page.tsx` — "Fråga AI om {namn}"-knapp deep-länkar till `/garden/ai?prompt=Berätta om {namn}: skötsel, beskärning och vanliga problem...`. Sitter sida-vid-sida med "Öppna i Notion".

**Observera (Sprint 2 fas 4):**
- **EventSource API klarar inte POST** — och chat-endpointen MÅSTE vara POST eftersom kontexten är meddelandelistan, inte querystring. Lösning: vanlig `fetch` + `res.body.getReader()` + manuell SSE-parsning. Async-generator-mönstret (`async function* parseSseStream(body)`) ger en ren `for await (const ev of ...)` i kallaren utan dubbelnested-callbacks. `TextDecoder({ stream: true })` så multi-byte-svenska tecken inte trasas mellan chunks.
- **Buffer-strategi för SSE-parsing:** Splitta inkommande chunks på `\n\n` och behåll det sista (potentiellt ofullständiga) eventet i bufferten till nästa chunk. `events.pop()` är idiomatiskt för det. Försök INTE `JSON.parse` ofullständiga payloads — wrap:a istället i try/catch och hoppa över så väntar nästa läsning på resten.
- **Markdown rendering i chat: medvetet utelämnat.** Claude svarar med Markdown-formatering (rubriker, tabeller, fetstil). Vi renderar som plain text med `whiteSpace: "pre-wrap"` — du SER `**fetstil**` och `## Rubrik`. Att lägga till `react-markdown` var skoperingsbart men inte nödvändigt för MVP. Dokumenteras som framtida förbättring. Användaren kan be coachen "svara utan Markdown" om det skär.
- **Briefing-hero skiljer sin SWR-fetch från overview-SWR:n.** Tidigare försök var att slå ihop dem i overview-route — men briefing tar 5–15 s att generera (Claude-anrop) medan overview är 1 s. Sammanslaget hade laddspinnern blockerat hela sidan. Separat SWR-key + skeleton i bara briefing-kortet löser det.
- **`?refresh=1` + SWR-key-bump för cache-bypass:** SWR cachar på URL-strängen. För att tvinga ny generering behöver URL:en ändras OCH backend-cachen måste bypassas. Lösning: state `refreshKey` som default 0, sätts till `Date.now()` vid klick → URL blir `/api/garden/briefing?refresh=1&t=<ts>`. Backend ser `refresh=1` och hoppar över sin 6 h-cache, SWR ser ny URL och refetchar. Ingen risk för stale cache i någondera sidan.
- **`useSearchParams()` i client component är OK** — kräver inte Suspense-boundary i App Router när komponenten redan har `"use client"`. För server components behövs det; vi slipper.
- **Auto-scroll på meddelandeuppdatering:** `useEffect(() => { ref.scrollTop = ref.scrollHeight }, [messages])`. Eftersom `messages` är samma referens (state) som muteras med ny array varje gång → effekten triggar varje stream-tick och håller scrollen klistrad i botten. Ingen separat resize-observer eller intersection-observer behövs.
- **`buildSdkMessages()` plattar tool-blocks ur historiken** — bara text skickas tillbaka som assistant-content i nästa request. Notion-CRUD-effekterna är redan persistenta (uppgiften är redan skapad), så tool_use/tool_result-blocken är "engångskonsumerade". Att skicka tillbaka dem hade krävt att man höll API:s `tool_use_id` korrekt över requests — onödig komplexitet för chat-bruk.
- **Bubbla-kontrast i mörkt tema:** `var(--color-surface-container-lowest)` mot dark-mode page-bg är väldigt nära varandra. Bubblorna har subtil border (`var(--color-card-border)`) som är vad som synliggör dem. Användarbubblan är primärfärgad så den syns alltid. Om kontrasten skär mer i framtida tema-iterationer: byt till `var(--color-surface-container)` för assistant.
- **Image-block-format för Anthropic SDK:** `{ type: "image", source: { type: "base64", media_type: "image/png", data: "<base64-utan-prefix>" } }`. Notera: `media_type` (med underscore), inte `mediaType`. base64-strängen ska INTE inkludera `data:image/png;base64,`-prefixet — bara `dataUrl.split(",")[1]`. Stöd: PNG, JPEG, GIF, WebP. Max 5 MB (vår gräns; Anthropic accepterar mer men kostar mer).
- [ ] Bilduppladdning per växt (Drive eller Notion files-property).
- [ ] `scripts/create-garden-notion-dbs.mjs` — idempotent init-script om man vill kunna skapa DB:erna från scratch.

**Observera (Sprint 2 fas 3):**
- **`@anthropic-ai/sdk` v0.90 model-spread-fälla:** Mönstret `c.messages.create({ model: args.model ?? DEFAULT_MODEL, ...args })` ser tryggt ut men spread:en överskrider `model` om `args.model === undefined`. Korrekt ordning: `{ ...args, model: args.model ?? DEFAULT_MODEL }`. SDK:s felmeddelande blir `400 invalid_request_error: model: Field required` — kryptiskt om man inte vet om problemet. Gäller även för andra SDK:er som tar required-fält.
- **SSE-headers att INTE missa:** `Content-Type: text/event-stream; charset=utf-8` + `Cache-Control: no-cache, no-transform` + `X-Accel-Buffering: no`. Sista är specifikt mot reverse-proxy (vår nginx-via-NPM) som annars buffrar hela streamen tills `runWithTools()` är klar — användaren ser ingen progressiv text utan en lång paus följt av allt på en gång. `Connection: keep-alive` är cosmetic i Node-runtime men praxis.
- **Anthropic SDK `.stream().on("text", ...)` + `.finalMessage()`:** två kompletterande API:er på samma stream. `.on("text")` ger text-deltas i realtid; `.finalMessage()` ger strukturerat svar (inkl. tool_use-block) efter att streamen stängts. Använd båda — kombinationen löser tool-use-loopen utan att man behöver parsa SDK:s rå-event själv.
- **Tool-handler som returnerar arbiträr data → string:** SDK:n vill ha string-content i `tool_result`-block. Om handler returnerar objekt: `JSON.stringify(result)` innan vi lägger på block:et. Modellen läser JSON utmärkt så detta är ingen begränsning.
- **`is_error: true` på tool_result:** lägg ALDRIG try/catch i route-koden över tool-handler-anrop — det skickar ett vanligt 500-svar och dödar streamen. Istället: `runTool()` i `tools.ts` fångar exceptions, returnerar ett `tool_result`-block med `is_error: true` + felmeddelande som content. Modellen ser felet och kan reagera (t.ex. fråga användaren igen, eller ge upp gracefully). Stream-flödet bryts inte.
- **`server-only`-import för AI-context och tools:** Dessa filer importerar `notion.ts` och berättar mot Notion direkt — de får ALDRIG bundlas in i klienten. `import "server-only"` i toppen av `ai-context.ts`, `ai-tools.ts`, `coach-persona.ts` ger build-fel om någon klient-fil av misstag importerar dem.
- **Open-Meteo behöver inga keys, men har fair-use:** ingen User-Agent krävs, ingen rate limit i praktiken under måttlig användning. 30 min cache räcker — vädret ändras inte snabbare än så och vi pratar trädgård, inte stormvarning. Lat/lon för Borås är hårdkodat (57.7210, 12.9401) eftersom användaren bor där och ingen annan stad är aktuell.
- **Persona-cache kontra format-regler:** Format-regler (svenska, du-tilltal, datum-med-veckodag) hårdkodas i `GARDEN_COACH_FORMAT_RULES`-konstant i koden, INTE i Notion-sidan. Anledning: vi vill inte att en oavsiktlig redigering på Notion bryter prompt-formatet. Persona-sidan styr karaktär/kunskapsdjup; format-reglerna styr svarsstrukturen. Persona renderas alltid som `${formatRules}\n\n${personaText}`.
- **Briefing-endpoint = sync, INTE streaming:** Briefing visas som hero-kort med skeleton tills hela texten är klar. Streaming där hade bara komplicerat utan att lägga värde — användaren förväntar sig en kort statisk text, inte en chat. Endpoint:en kallar `createMessage()` direkt och cachar 6 h. `?refresh=1` bypassar cache när användaren trycker "Generera ny".
- **Tool-prompt-injection-risk:** Tool-handlerna kör mot Notion utan extra validering av modellens output. För `create_task` är detta acceptabelt — fältens enums i schemat begränsar inte texten i `uppgift`/`kommentar`, men de bor i kundens egen Notion. För framtida tools som kan exfiltrera data eller skicka utåt: lägg in explicit allow-listing innan du litar på modellens input.

**Observera (Sprint 2 fas 1+2):**
- **Routes håller sig på `/garden/...`, inte `/tradgard/...`.** Sprint 2-briefen pratar om `/tradgard/sasongsplan` etc., men `/garden`-prefixet är redan inarbetat i TopBar/MobileNav/Sidebar och AGENTS.md (Sprint 1). Att flytta hela trädet hade krävt att alla nav-helpers updaterades samtidigt och inte var värt churn:en. Subroutes förblir svenska (`vaxter`, `sasongsplan`, `projekt`, `ai`).
- **`GET /api/garden/tasks/[id]` returnerar arkiverade rader.** Notion `pages.retrieve` ger även arkiverade pages, så endpointen svarar 200 även efter DELETE. Queries (lista, overview) filtrerar dock korrekt — inget syns i UI. Värt att veta innan man visar enskild task via id externt.
- **Kanban-kort har två separata gester:** själva kortet är drag-handle (`{...attributes} {...listeners}` på inre div), men status-dropdown och edit-knappen har `onPointerDown={(e) => e.stopPropagation()}` så de blockerar drag-aktiveringen. Utan stopPropagation skulle kort lyfta så fort man försökte ändra status i dropdown:en. Optimistic update vid status-byte: SWR-cachen muteras direkt (`{ revalidate: false }`) innan PATCH skickas, sedan `mutate()` när PATCH returnerar — kortet hoppar inte fram-och-tillbaka mellan kolumner.
- **`auto-fit, minmax(N px, 1fr)` är `md:`-fri väg till responsivt stat-grid.** I stället för att duplicera grid-cols mellan mobil/desktop med `md:`-prefix (som inte fungerar via tw.css enligt projektets regler), låter `auto-fit` raden själv bestämma hur många kolumner som får plats. Använt på budget-summering (140 px min) — 2×2 på mobil 375 px, 4×1 på desktop, ingen JS eller @media krävs. Bra default-mönster för alla framtida stat-grids där värde-bredden varierar.
- **Status-legend under kalendern: använd inline-style för flex.** `inline-flex items-center gap-1` på en `<div>` blev `display: block` med tomma färgrutor i Turbopack dev (samma `inline-flex`-bug som dokumenterats för fitness). Workaround: `style={{ display: "inline-flex", alignItems: "center", gap: 4 }}` + `display: "inline-block"` på själva färgblocket. Generell regel: alla små "färgklick + label"-pattern utanför primär-flex-rader bör defaulta till inline-style.
- **Modal växtväljare = sökbar checkbox-lista, inte chips.** Med 32+ växter blir chip-array klumpig och tappar struktur — sökruta + scrollbar checkbox-lista (max 180 px hög) är kompakt även på mobil. Antalet valda visas i `Field`-label (`🌿 Växt (3 valda)`) så användaren ser status även när listan är scrollad bortom valda rader.
- **`Namnlöst projekt`-platshållare i kanban:** Notion-DB:n har faktiskt 2 projekt med tom title — inget kodfel, riktig data. När namnen fylls i Notion försvinner platshållaren. UI visar dem aktivt så man inte tappar bort dem; alternativ hade varit att filtrera bort tomma rader, men det dolde data som existerar.
