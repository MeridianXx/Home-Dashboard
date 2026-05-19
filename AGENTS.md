# Warm Home v3 är dashboarden.

> Cutover från v2 skedde 2026-04-29 (W6). v2-trädet revs 2026-05-19 efter tre
> veckor utan rollback-behov. All utveckling sker mot `(warm)/v3/`-trädet.
> Historiskt designdokument + sessionslogg: [docs/archive/WARM_HOME.md](docs/archive/WARM_HOME.md)
> (inte auto-laddat — öppna manuellt om du behöver kontext från bygget).

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
- **Sub-tabs på mobil = ikon-only.** Max 5 tabs (Trädgård) scrollar ur 375 px om både ikon + text-label renderas. Lösning: `subnav-label`-klass i `globals.css` som är `display: none` default och får `display: inline` i `@media (min-width: 768px)`-wrapper. tw.css-genererade `md:inline`/`hidden md:inline` funkar inte på mobil (AGENTS.md-note om `md:` utan @media), så riktig CSS med @media krävs för att gömma text selektivt. `aria-label` på varje `<Link>` så screen readers fortfarande får etiketten. Tabs stackade flex-col, ikon 18px.
- **TopBar: mobil = bara tabs + theme-toggle.** Tidigare hade mobilen även huslogon längst till vänster. Den togs bort eftersom (1) MobileNav botten-pill visar redan aktiv sektion, (2) page-header har sektionens titel som h1, (3) tabs behövde horisontellt utrymme. Desktop har Sidebar med logon kvar oförändrat. Avdelare (`borderRight: 1px solid rgba(187,185,178,0.2)`) sitter till höger om tab-gruppen så den separeras från theme-toggle (32×32, 18px ikon för att inte dominera).
- **Pull-to-refresh:** Custom touch-gest i layout.tsx. Kräver `scrollY === 0`, 80px threshold, undviker horisontell swipe-konflikt. Bekräftelse: bock + "Uppdaterat" i 800ms. **Viktigt:** använd `"0px"` (sträng) istället för `0` (number) i inline styles för height — annars hydration-mismatch.
- **Loading-state på toggle-knappar:** Använd `runAction(key, fn)` + `loadingKey` för att spåra in-flight state. Visa `spin-anim` SVG-spinner under laddning, dölj border/active-state. Skicka `loadingKey`/`runAction` som props till subkomponenter som behöver det.
- **Recharts grafer:** Använd `useChartSize()` (ResizeObserver) istället för `ResponsiveContainer` — den ger -1 width/height inuti AnimatePresence. Sätt explicit `width={width} height={height}` på chart-komponenten. `useDeferredMount()` fördröjer mount 2 rAF-frames. Kurvtyp: `type="basis"` (B-spline, mjukast). Tooltip: `cursor={{ stroke: "var(--color-outline)", strokeWidth: 1 }}` för vertikal linje + touch-stöd.
- **Temperaturgrafer:** `mergeByTime()` bucketiserar data i 15-minutersintervall med medelvärde + forward-fill för komplett tooltip. `tightDomain()` beräknar Y-axel med ±1° marginal runt faktisk data.
- **EnergyCard StatRow:** Konsekvent radkomponent med 36px cirkelikon, label/värde/badge, chevron som separat `<button>` (inte inuti Pressable) med `self-stretch` för full radhöjd — matchar belysningskortens expand-mönster.
- **Belysningsundersida våningsplan:** Rum delas in via `NEDERVANING`/`OVERVANING`/`UTOMHUS`-arrayer i `(warm)/v3/home/belysning/page.tsx`. "Släck"-pill per sektion, "Släck allt" globalt — båda med spinner-feedback.
- **Scen-aktiv-detektion:** `detectActiveScene()` i `src/lib/scenes.ts` matchar ett snapshot av lampor mot varje scens target-states (state + brightness ±5%). Target-states hämtas via `/api/homeassistant/scenes` som läser HA:s config-endpoint `/api/config/scene/config/{internal_id}` (internal_id från scenens `attributes.id`). Vid flera matches vinner den med flest targets. Ingen localStorage; uppdateras automatiskt via SWR-refresh av lights.
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
- **Leaflet + Next.js (App Router):** Kartan måste laddas via `next/dynamic` med `ssr: false` — Leaflet rör `window`/`document` vid import. Exempel: `const TrackMap = dynamic(() => import("@/components/warm/fit/TrackMap"), { ssr: false, loading: () => <Placeholder /> })`. Importera `leaflet/dist/leaflet.css` från komponentens toppnivå (inte global), så den lazy-loadas.
- **Horisontella swipes på interaktiva komponenter:** För kartor, chart-svg och lap-listor — `onTouchStart={(e) => e.stopPropagation()}` på wrappen stoppar dashboardens globala pull-to-refresh + tab-swipe. Gör detta till ett mönster för allt som användaren drar i horisontellt. `useChartSize()` returnerar `stopSwipe`-objektet som spreadable prop.
- **Turbopack + utilityklass-kombinationer:** Vissa `inline-flex items-center justify-center` +-kombinationer plockas inte upp i Turbopack dev (computed `display: block`). Ingen tydlig trigger har identifierats. Debug: `preview_inspect` på elementet visar `display` och verifierar `className`. Workaround: flytta `display/align/justify` till `style={{}}` inline så det inte kan tappas bort i build-steget.
- **Recharts kurvtyper:** `type="monotone"` = mjuk (bra för HR, spot-priser), `type="basis"` = B-spline, extra mjuk (bra för sensorer som brusar mycket), `type="linear"` = raka segment (bra för elevation där små spikar är meningsfulla — `monotone` utjämnar topparna så de försvinner). Välj kurvtyp efter datasetets karaktär, inte efter estetik.
- **Geocoding — policy-medveten proxy:** Server-side `User-Agent` + språk-header krävs för Nominatim (annars rate-limited). Cache in-memory per rundad lat/lon (3 decimaler ≈ 100 m) med 24 h TTL — samma runda hamnar alltid i samma bucket. Vid `fetch` utan `AbortSignal.timeout` riskerar en långsam extern tjänst att blockera hela route-handlern; använd `AbortSignal.timeout(5000)` som i övriga API-klienter (`ha.ts`-mönstret).
- **Apple Watch RPE (Borg CR10):** Kolumnen `RPE` i HealthFit-exporten är 1–10. Svenska etiketter (samma som Apple Fitness app): 1 Lätt · 2 Ganska lätt · 3 Måttlig · 4 Lite jobbig · 5 Jobbig · 6 Ganska svår · 7 Svår · 8 Mycket svår · 9 Extremt svår · 10 Maximal. Använd färgskala i buckets (1–3 grön / 4–6 blå / 7–8 lila / 9–10 röd) — rätt antal distinkta nivåer för att göra samma färg lätt tolkbar utan chart-legend.
- **Imperativt DOM-bibliotek (Leaflet, etc.) + React HMR:** Bibliotek som själva äger sin DOM-container (Leaflet `MapContainer`, Chart.js, mapbox, vissa wysiwyg-editorer) kraschar vid HMR eller route-byte med "container is being reused"-fel. **Alltid ge komponenten en stabil, värde-baserad `key`** så React ser det som nytt element och remounter rent istället för att försöka återanvända. Exempel: `key={\`${minLat.toFixed(4)},${minLon.toFixed(4)}\`}`. Index-baserade keys räcker inte — de förblir samma vid route-byte mellan olika instanser.
- **Stale HMR-errors vs faktiska fel:** När man ser ReferenceErrors för variabler som inte längre finns i koden (t.ex. `recovery is not defined`, `ZoneDistribution is not defined`) är det nästan alltid HMR-cache som kör gammal koden. Full reload (`window.location.reload()`) eller radera `.next/` löser det. Verklig kodfel syns i `preview_logs --level=error` (server-side kompileringsfel) — inte bara i `preview_console_logs`.

---
