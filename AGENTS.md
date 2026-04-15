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

**Aktiv branch:** `v2` (origin/v2 — detta är den enda aktiva branchen, main är övergiven)  
**Preview-server:** konfigurerad i `.claude/launch.json`, starta med `preview_start("home-dashboard")`  
**Färdiga sektioner:** Hem/Översikt (med grafer), Hem/Belysning (med våningsplan + scener), Hem/Media (Sonos + Apple TV), Homelab (Servrar/Containers/Media/Nätverk), **Fitness/Dashboard (Session A — nästa pass, passhistorik, profilkort med live-metriker från HealthFit)**, Trädgård (stub)

---

## Deploy & GitHub-secrets

**Deploy-flöde:** push till `v2` → GitHub Actions (`.github/workflows/deploy.yml`) → bygger Docker-image till `ghcr.io/meridianxx/home-dashboard:latest` → self-hosted runner gör `docker pull` + `docker run` med secrets injicerade som `-e VAR="…"`. `.env.local` läses **bara** av `next dev` lokalt — inte i produktion.

**Alla secrets måste finnas under Repo → Settings → Secrets and variables → Actions innan deploy:**

| Secret | Kommentar |
|---|---|
| `PROXMOX_TOKEN_ID`, `PROXMOX_TOKEN_SECRET` | Hemlab-servrar |
| `UNRAID_URL`, `UNRAID_API_KEY` | GraphQL-endpoint + API-nyckel |
| `PORTAINER_URL`, `PORTAINER_API_TOKEN`, `PORTAINER_ENDPOINT_ID` | Container-hantering |
| `HA_URL`, `HA_TOKEN` | Home Assistant long-lived access token |
| `GOOGLE_CLIENT_EMAIL` | Service-account e-post |
| `GOOGLE_PRIVATE_KEY` | **PEM på en rad, `\n`-escaped, inkl. omslutande `"`** — kopiera exakt från `.env.local`. Multiradig text bryter `docker run`-kommandot. `drive.ts` kör `.replace(/\\n/g, '\n')` för att återskapa radbrytningarna. |
| `GOOGLE_DRIVE_HEALTHFIT_FOLDER_ID` | ID till HealthFit-mappen i Drive |
| `NOTION_TOKEN` | Integration-token (`ntn_…`) för *Träningscoach*-integrationen |
| `NOTION_FITNESS_PLANS_DB` | DB-id för "Planerade pass" |
| `NOTION_FITNESS_LOG_DB` | **Kan vara tom sträng** tills `scripts/create-fitness-log-db.mjs` körts — UI hanterar det gracefully |
| `ANTHROPIC_API_KEY` | `sk-ant-api03-…` för coach/analys (Session C+) |

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
NOTION_FITNESS_LOG_DB=...           # skapas i Session A
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

#### Session B — FIT-parsing, detaljvy & Notion-profil
- Server-side FIT-parsning från Google Drive (`fit-file-parser`)
- Per-pass detaljvy: GPS-karta (Leaflet/MapLibre), elevationsprofil, HR-tidsserie, zondistribution (Recharts)
- Matchning genomfört pass → planerat pass via datum
- Synk Workouts_vN.xlsx → Notion Träningslogg
- **Tvåvägssynk av manuellt redigerade profilvärden till Notion** (ersätter `localStorage`-lagringen i Session A — byta primärkälla, behålla Zustand som optimistic cache)
  - Ny DB `Profil` under coachsidan med properties: `Nyckel` (title), `Värde` (rich_text), `Kategori` (select: `profil`/`zon`/`mål`), `Uppdaterad` (last_edited_time). Rader: `name`, `birthYear`, `maxHR`, `zone.Z1`…`zone.Z5`, `goal.<slug>` + deadline.
  - `GET /api/fitness/profile` → läser Notion-DB, mergear med `/api/fitness/metrics` (vikt + vilopuls + VO₂ max), 5 min cache.
  - `PATCH /api/fitness/profile` → skriver tillbaka ändrade nycklar via `notion.pages.update`. Optimistic UI: Zustand-store uppdateras direkt, Notion-anropet sker i bakgrunden.
  - SWR `revalidateOnFocus: true` på profilkortet → ändringar gjorda direkt i Notion dyker upp nästa gång man öppnar fliken.
  - Conflict resolution: senaste `Uppdaterad`-timestamp vinner. Visa "synkad för X min sedan"-badge under profilkortet.
  - Utöka `scripts/create-fitness-log-db.mjs` → `scripts/create-fitness-notion-dbs.mjs` som skapar både `Träningslogg` och `Profil` i samma körning.

- [ ] `src/lib/fitness/fit-parser.ts`
- [ ] `src/app/api/fitness/fit/route.ts`
- [ ] `src/app/(dashboard)/fitness/history/page.tsx` — detaljvy
- [ ] `src/app/api/fitness/profile/route.ts` — GET + PATCH med Notion-backing
- [ ] `src/lib/fitness/notion.ts` — utöka med `getProfile()` / `updateProfile()`
- [ ] `src/lib/fitness/profile.ts` — Zustand byter från `persist` till SWR-hydrering; `setProfile()` kallar PATCH
- [ ] `scripts/create-fitness-notion-dbs.mjs` — skapa både DB:er

#### Session C — AI-analys per pass
- Anthropic API (`claude-sonnet-4-20250514`) för passanalys
- Prompt inkluderar: profil, pulszoner, passdata, Sleep HRV senaste 3 dagarna, senaste 10 passens TRIMP
- Analys visas i UI + sparas i Notion Träningslogg

- [ ] `src/lib/fitness/claude.ts`
- [ ] `src/lib/fitness/context.ts`
- [ ] `src/app/api/fitness/analyse/route.ts`

#### Session D — Planering & AI-coach
- Vecko-/månadsvy för planerade pass
- AI genererar träningsplan (mål + historik + aktuell form)
- Skapa/redigera Planerade pass i Notion direkt från UI
- Modal med textarea → AI-svar → spara till Notion

- [ ] `src/app/api/fitness/coach/route.ts`
- [ ] `src/app/(dashboard)/fitness/coach/page.tsx`

#### Session E — Dashboard & aktuell form
- Träningsbelastning: ATL (7d), CTL (42d), TSB = CTL − ATL baserat på TRIMP
- HRV-trend (Sleep-fliken, Avg HRV 7/28 dagar)
- Vilopuls-trend + VO₂ max-trend
- Målprogress-widgets
- Readiness-poäng 1–100 (HRV vs 7d-medel + sömn > 7h)

#### Session F — Polish & notiser
- Veckosammanfattning auto-genereras i Notion (måndag)
- Badge/påminnelse för nästa planerade pass
- Responsiv mobilanpassning genomgång
