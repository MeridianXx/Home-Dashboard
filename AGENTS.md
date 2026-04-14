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
**Färdiga sektioner:** Hem/Översikt (med grafer), Belysning (med våningsplan), Homelab (Servrar/Containers/Media/Nätverk), Fitness (stub), Trädgård (stub)

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
- **Page transitions:** Framer Motion `motion.div` med `key={pathname}` i dashboard layout — ren horisontell slide (15%, 450ms ease-out `[0.25, 0.8, 0.25, 1] as const`). Riktning beräknas **under render** (inte useEffect!) genom att jämföra `pathname` med `prevPathnameRef` — useEffect körs efter render och missar första mount av nya motion.div. `onAnimationComplete` nollställer direction så app-switch inte triggar om. Undvik `AnimatePresence mode="wait"` (dubbel-laddning), spring (studsar), och Card-level entrance-animationer (diagonal rörelse).
- **iOS app-switch:** `onTouchCancel` + `visibilitychange`-lyssnare krävs för att nollställa inline swipe-transform. Utan det fastnar `translateX` när iOS avbryter touch (app-switch, samtal, notis).
- **Expand/collapse:** `AnimatePresence initial={false}` + `motion.div` med `height: 0/auto` + `opacity: 0/1`, duration 0.2s ease-out, `overflow: hidden`. Används på belysningsrum, temperaturpaneler, HVAC-selects.
- **Pull-to-refresh:** Custom touch-gest i layout.tsx. Kräver `scrollY === 0`, 80px threshold, undviker horisontell swipe-konflikt. Bekräftelse: bock + "Uppdaterat" i 800ms. **Viktigt:** använd `"0px"` (sträng) istället för `0` (number) i inline styles för height — annars hydration-mismatch.
- **Loading-state på toggle-knappar:** Använd `runAction(key, fn)` + `loadingKey` för att spåra in-flight state. Visa `spin-anim` SVG-spinner under laddning, dölj border/active-state. Skicka `loadingKey`/`runAction` som props till subkomponenter som behöver det.
- **Recharts grafer:** Använd `useChartSize()` (ResizeObserver) istället för `ResponsiveContainer` — den ger -1 width/height inuti AnimatePresence. Sätt explicit `width={width} height={height}` på chart-komponenten. `useDeferredMount()` fördröjer mount 2 rAF-frames. Kurvtyp: `type="basis"` (B-spline, mjukast). Tooltip: `cursor={{ stroke: "var(--color-outline)", strokeWidth: 1 }}` för vertikal linje + touch-stöd.
- **Temperaturgrafer:** `mergeByTime()` bucketiserar data i 15-minutersintervall med medelvärde + forward-fill för komplett tooltip. `tightDomain()` beräknar Y-axel med ±1° marginal runt faktisk data.
- **EnergyCard StatRow:** Konsekvent radkomponent med 36px cirkelikon, label/värde/badge, chevron som separat `<button>` (inte inuti Pressable) med `self-stretch` för full radhöjd — matchar belysningskortens expand-mönster.
- **Belysningsundersida våningsplan:** Rum delas in via `NEDERVANING`/`OVERVANING`/`UTOMHUS`-arrayer i `lighting/page.tsx`. "Släck"-pill per sektion, "Släck allt" globalt — båda med spinner-feedback.
- **Scen-persistens:** `lastScene` (aktiv scen i Favoriter) sparas i `localStorage` under key `lastScene`. Hydrateras i `useEffect` efter mount för att undvika SSR-mismatch.

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

### Session D — Nya sektioner & scener
- [ ] Scen-aktiv-detektion baserad på faktisk lampstatus (likt Apple Home). Jämför varje lampas state/brightness mot scenens målvärden (hämtas via `scene.get_state` eller `scene.{name}.attributes.entity_id`/`.state`). Ersätt `lastScene` localStorage-lösning med realtidsdetektion baserad på SWR-refresh av `/api/homeassistant/lights`.
- [ ] Sortera alla lampor i bokstavsordning inom varje rum (både på hemsida och belysningsundersida). Sker troligen i `/api/homeassistant/lights` eller i LightingCard/RoomRow innan `.map()`.
- [ ] Scener på belysningssidan (`/home/lighting`)
- [ ] Mediavy som egen undersida `/home/media` (Sonos per rum, volym, Apple TV-status)

### Session E — Branding
- [ ] Logo/wordmark istället för "inicio"-text i topmenyn
- [ ] App-ikon för hemskärm + `manifest.json` uppdatering
