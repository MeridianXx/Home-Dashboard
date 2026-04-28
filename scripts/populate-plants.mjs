// scripts/populate-plants.mjs
// Populerar de 14 nya fälten för alla 31 växter i Notion via garden-API:et.
// Kör: node scripts/populate-plants.mjs

const BASE = "http://localhost:3000";

const PLANTS = [
  {
    id: "3129b5da-2245-8071-9b0c-fa2744e72309",
    vaxt: "Äppelträd",
    fas: "Etablerad",
    vattningsintervall: "Vid behov",
    ljusbehov: "Fullt sol",
    hojd: "300–500 cm",
    antalPlantor: 1,
    skotselguide:
      "Beskär tidigt vår (feb–mars) när risk för stark frost passerat. Ta bort vattenskott löpande under säsongen. Kontrollera för skorv och bladlöss från maj. Applicera kompost runt trädets rot på våren. Klipp inte för tidigt — vänta tills nya knoppar visar var trädet är vid liv.",
  },
  {
    id: "3129b5da-2245-8099-9ed4-eee402468821",
    vaxt: "Bergbambu 'Simba'",
    fas: "Etablerad",
    vattningsintervall: "Vid behov",
    ljusbehov: "Sol till halvskugga",
    hojd: "200–300 cm",
    sorttnamn: "Simba",
    antalPlantor: 3,
    skotselguide:
      "Ta bort döda eller skadade strån tidigt vår. Vattna rikligt vid torka. Skydda rötterna med mulch vid hård frost. Inte invasiv art — bildar tät klump och sprider sig inte med rotskott.",
  },
  {
    id: "3129b5da-2245-8031-8be3-f4aaa2e0da17",
    vaxt: "Bok",
    fas: "Etablerad",
    vattningsintervall: "Vid behov",
    ljusbehov: "Sol till halvskugga",
    hojd: "100–200 cm",
    antalPlantor: 15,
    skotselguide:
      "Klipp en gång per år i juli–aug. Klippt bok håller sina torkade blad (marcescens) hela vintern — eftertraktat resultat. Undvik klippning på hösten. Ge långsamverkande gödning på våren.",
  },
  {
    id: "3179b5da-2245-8067-9516-fe91cbad29a4",
    vaxt: "Chili",
    fas: "Plantskola",
    vattningsintervall: "Varannan dag",
    ljusbehov: "14 t/dag under lampor",
    hojd: "50–80 cm",
    sasongslangd: 120,
    sadddatum: "2026-03-15",
    antalPlantor: 4,
    skotselguide:
      "Håll inomhus tills nattemperaturen är stabilt >12 °C. Vattna när markytan torkat 2 cm ner — undvik stående vatten. Gödsla veckovis med tomatgödsel under tillväxtsäsongen. Stötta med pinnar. Plocka frukterna när de fått fin färg.",
  },
  {
    id: "3179b5da-2245-806e-bf35-d4351f397cea",
    vaxt: "Citron",
    fas: "Etablerad",
    vattningsintervall: "Veckovis",
    ljusbehov: "12 t/dag direkt sol",
    hojd: "80–120 cm",
    antalPlantor: 1,
    skotselguide:
      "Behöver 12+ timmar direkt ljus dagligen — komplettera med växtbelysning vintertid. Vattna måttligt och låt krukan lufta mellan vattningarna. Ge citrusgödsel mars–oktober. Flytta ut på altan när nätterna är stabilt >10 °C. Övervaka för spinnkvalster och mjöllöss.",
  },
  {
    id: "31a9b5da-2245-807e-bf2d-fefb9e38348b",
    vaxt: "Dahlia",
    fas: "Utplantering",
    vattningsintervall: "Varannan dag",
    ljusbehov: "Fullt sol",
    hojd: "80–120 cm",
    sasongslangd: 120,
    sadddatum: "2026-04-20",
    antalPlantor: 6,
    skotselguide:
      "Sätt knölar i kruka inomhus i april, plantera ut i maj när frosten är avblåst. Nypa av toppshooten för fler grenar och mer blomning. Vattna regelbundet, gödsla var 14:e dag med kalirik gödning. Ta upp knölar i oktober och förvara frostfritt i torv.",
  },
  {
    id: "3129b5da-2245-8091-ae07-d86086490497",
    vaxt: "Glansmiskantus 'Dronning Ingrid'",
    fas: "Etablerad",
    vattningsintervall: "Vid behov",
    ljusbehov: "Fullt sol",
    hojd: "150–200 cm",
    sorttnamn: "Dronning Ingrid",
    antalPlantor: 2,
    skotselguide:
      "Klipp ned till 10–15 cm tidigt vår innan nya skott bryter. Kan delas vart 3:e år i april. Torktålig när etablerad. Vacker under vintern med silverplymor — vänta med klippning tills mars.",
  },
  {
    id: "3129b5da-2245-803f-a229-f7199432a5fb",
    vaxt: "Gräsmatta",
    fas: "Etablerad",
    vattningsintervall: "Vid behov",
    ljusbehov: "Sol till halvskugga",
    hojd: "5–8 cm (klippt)",
    skotselguide:
      "Klipp regelbundet maj–sept och håll 5–7 cm. Gödsla i maj och september. Lufta och sanda täta partier på höst. Bevattna tidigt morgon vid torka — aldrig kvällstid. Vertikalskär i september för bäst resultat.",
  },
  {
    id: "3179b5da-2245-80a0-a150-c9980c7c9741",
    vaxt: "Gurka",
    fas: "Plantskola",
    vattningsintervall: "Dagligen",
    ljusbehov: "14 t/dag",
    hojd: "100–200 cm (klättrar)",
    sasongslangd: 90,
    sadddatum: "2026-04-01",
    antalPlantor: 3,
    skotselguide:
      "Odlas i växthuset. Vattna dagligen och håll luftfuktigheten hög. Gödsla veckovis med gurkgödsel. Led upp längs spaljé. Skörda regelbundet för fortsatt bärande — överlagrade gurkor stoppar produktionen.",
  },
  {
    id: "3129b5da-2245-8063-9a4b-dd182321b095",
    vaxt: "Hakonegräs",
    fas: "Etablerad",
    vattningsintervall: "Vid behov",
    ljusbehov: "Halvskugga",
    hojd: "40–60 cm",
    antalPlantor: 3,
    skotselguide:
      "Klipp ned tidigt vår. Trivs i halvskugga med fuktighetshållande jord — undvik stark sol och torka. Kan delas vart 4:e år. Vacker gul–orange höstfärg.",
  },
  {
    id: "3129b5da-2245-80db-bf2d-e88535255864",
    vaxt: "Idegran",
    fas: "Etablerad",
    vattningsintervall: "Inte nu",
    ljusbehov: "Sol till djup skugga",
    hojd: "100–200 cm",
    antalPlantor: 10,
    skotselguide:
      "Extremt anpassningsbar. Klipp 1–2 ggr/år, bäst i juni och aug. Obs: alla delar utom de röda bären är giftiga. Långsam tillväxt men tål kraftig klippning. Perfekt för formklippning.",
  },
  {
    id: "3129b5da-2245-803f-b625-ce4b937fcb81",
    vaxt: "Järnek",
    fas: "Etablerad",
    vattningsintervall: "Inte nu",
    ljusbehov: "Sol till halvskugga",
    hojd: "200–300 cm",
    antalPlantor: 2,
    skotselguide:
      "Vintergrön. Bär är mat för fåglar vintertid. Beskär lätt vår för att bibehålla form. Dioik art — behöver ha- och honplantor för bär. Torktålig när etablerad.",
  },
  {
    id: "3349b5da-2245-80ff-b935-ea1f5aaee870",
    vaxt: "Klematis 'Paul Farges'",
    fas: "Etablerad",
    vattningsintervall: "Vid behov",
    ljusbehov: "Sol (rötter i skugga)",
    hojd: "500–800 cm",
    sorttnamn: "Paul Farges",
    antalPlantor: 1,
    skotselguide:
      "Grupp 3 — klipp hårt i mars ned till ca 30 cm. Rötterna vill stå svalt och skuggigt, kronverket i sol. Led upp längs spaljé. Blommar på nytt skott — massblomning i juni–aug med vita blommor.",
  },
  {
    id: "3509b5da-2245-8072-9849-c6bfef03df00",
    vaxt: "Klotrobinia",
    fas: "Etablerad",
    vattningsintervall: "Inte nu",
    ljusbehov: "Fullt sol",
    hojd: "300–400 cm",
    antalPlantor: 1,
    skotselguide:
      "Ympad sort — beskär INTE hårt, riskerar skott från grundstammen (robinia). Ta bara bort döda grenar. Torktålig. Vacker klotform som kräver minimal skötsel. Kvävefikserande.",
  },
  {
    id: "3129b5da-2245-8073-ad75-f5fff79616d0",
    vaxt: "Kryptuja",
    fas: "Etablerad",
    vattningsintervall: "Inte nu",
    ljusbehov: "Sol till halvskugga",
    hojd: "150–250 cm",
    antalPlantor: 3,
    skotselguide:
      "Vintergrön. Beskär lätt vår vid behov. Kan bli stor — håll koll på bredd. Tål tung jord och frost bra. Kräver nästan ingen skötsel när etablerad.",
  },
  {
    id: "3129b5da-2245-8096-b470-cf01961923d8",
    vaxt: "Lagerhägg",
    fas: "Etablerad",
    vattningsintervall: "Vid behov",
    ljusbehov: "Sol till skugga",
    hojd: "150–300 cm",
    antalPlantor: 5,
    skotselguide:
      "Snabbväxande. Beskär hårt efter blomning om du vill begränsa storleken. Passar som klippt häck eller solitär buske. Tål kraftig beskärning bra. Vita blommor i maj drar pollinerare.",
  },
  {
    id: "3129b5da-2245-80a4-9de1-d7508d5116df",
    vaxt: "Murgröna 'Helix'",
    fas: "Etablerad",
    vattningsintervall: "Inte nu",
    ljusbehov: "Halvskugga till skugga",
    hojd: "10–20 cm (marktäckare)",
    sorttnamn: "Helix",
    skotselguide:
      "Vintergrön och lättskött. Putsa tillbaka om den kryper för långt. Känslig för torka i nyetablerat skick. Vill växa i skugga under träd och buskar. Ankaras med jordnålar i sluttning.",
  },
  {
    id: "3179b5da-2245-804e-8993-db5126b1d8bb",
    vaxt: "Paprika",
    fas: "Plantskola",
    vattningsintervall: "Varannan dag",
    ljusbehov: "14 t/dag under lampor",
    hojd: "60–100 cm",
    sasongslangd: 150,
    sadddatum: "2026-03-01",
    antalPlantor: 4,
    skotselguide:
      "Behöver lång växtperiod — sätt tidigt under februari–mars. Håll inomhus tills nätterna är >12 °C. Gödsla veckovis med tomatgödsel. Plocka regelbundet för mer bärande.",
  },
  {
    id: "3129b5da-2245-8003-abce-d4930e8b0dca",
    vaxt: "Pimpinellros 'Valdemarsvik'",
    fas: "Etablerad",
    vattningsintervall: "Vid behov",
    ljusbehov: "Fullt sol",
    hojd: "100–150 cm",
    sorttnamn: "Valdemarsvik",
    antalPlantor: 3,
    skotselguide:
      "Vårblommande gammeldags ros. Beskär efter blomning och ta bort äldre stammar vid marken. Rosip sitter kvar som vinterdekoration och fågelmat. Torktålig när etablerad. Minimal skötsel.",
  },
  {
    id: "3129b5da-2245-80a9-974c-e7220db609f3",
    vaxt: "Rönnsumak",
    fas: "Etablerad",
    vattningsintervall: "Inte nu",
    ljusbehov: "Fullt sol",
    hojd: "300–500 cm",
    antalPlantor: 1,
    skotselguide:
      "Ta bort rotskott löpande — kan bilda täta snår annars. Vacker höstfärg i rött och orange. Torktålig. Undvik stark beskärning — stimulerar ännu fler rotskott.",
  },
  {
    id: "3129b5da-2245-80e0-ae23-eda0a70c0234",
    vaxt: "Silverpäron",
    fas: "Etablerad",
    vattningsintervall: "Inte nu",
    ljusbehov: "Fullt sol",
    hojd: "400–600 cm",
    antalPlantor: 1,
    skotselguide:
      "Silvergrå löv med vacker textyr. Beskär knappt — behåller naturlig form bäst. Torktålig. Blommar i april–maj med vita blommor som drar bin.",
  },
  {
    id: "3129b5da-2245-8000-8937-f569e71e8c10",
    vaxt: "Stäppsalvia 'Caradonna'",
    fas: "Etablerad",
    vattningsintervall: "Vid behov",
    ljusbehov: "Fullt sol",
    hojd: "60–80 cm",
    sorttnamn: "Caradonna",
    antalPlantor: 5,
    skotselguide:
      "Klipp ner hårt efter första blomning för att trigga återblomning i aug–sept. Torktålig och vinterhärdig. Drar massor av bin och humlor. Låt stå till våren — vacker isbehängd under vintern.",
  },
  {
    id: "3129b5da-2245-8085-a24c-da63c33f9b73",
    vaxt: "Stäppsalvia 'Schneehugel'",
    fas: "Etablerad",
    vattningsintervall: "Vid behov",
    ljusbehov: "Fullt sol",
    hojd: "30–50 cm",
    sorttnamn: "Schneehugel",
    antalPlantor: 5,
    skotselguide:
      "Vit blomning, kompaktare än Caradonna. Klipp ner hårt efter blomning. Mycket torktålig. Drar pollinerare. Lämplig som kantväxt längs gångvägar.",
  },
  {
    id: "3139b5da-2245-802c-9c3d-db205ebfc388",
    vaxt: "Syrén",
    fas: "Etablerad",
    vattningsintervall: "Inte nu",
    ljusbehov: "Fullt sol",
    hojd: "200–400 cm",
    antalPlantor: 8,
    skotselguide:
      "Beskär direkt efter blomning — knoppar sätts redan på hösten. Gallra gamla grenar på vintern för ny ungdomlighet och mer blomning. Undvik kväverik gödning — ger mer blad än blom.",
  },
  {
    id: "3129b5da-2245-80d4-9914-ff06ebaec5c1",
    vaxt: "Thuja",
    fas: "Etablerad",
    vattningsintervall: "Inte nu",
    ljusbehov: "Sol till halvskugga",
    hojd: "150–300 cm",
    antalPlantor: 20,
    skotselguide:
      "Klipp en gång om året i aug–sept. Klipp aldrig in i gammalt brungrå ved — skjuter inte nytt. Brun missfärgning inuti är normalt. Vattna rikligt under etableringsåret.",
  },
  {
    id: "3179b5da-2245-8017-8f05-e281573e2efb",
    vaxt: "Tomat",
    fas: "Plantskola",
    vattningsintervall: "Dagligen",
    ljusbehov: "16 t/dag under lampor",
    hojd: "150–200 cm",
    sasongslangd: 100,
    sadddatum: "2026-03-15",
    antalPlantor: 6,
    skotselguide:
      "Gödsla veckovis med tomatgödsel. Plocka bort sidoskott löpande (knipstomatisering) för stabig växt. Stöd med käppar. Flytta ut när nätter är stabilt >12 °C. Vattna jämnt — ojämn vattning ger blomnings­sättningsskador och sprickiga frukter.",
  },
  {
    id: "3129b5da-2245-80ae-8ac0-f9477e45be97",
    vaxt: "Tretandsfingerört 'Nuuk'",
    fas: "Etablerad",
    vattningsintervall: "Inte nu",
    ljusbehov: "Sol till halvskugga",
    hojd: "10–20 cm",
    sorttnamn: "Nuuk",
    skotselguide:
      "Lättskött marktäckare med vit blomning. Trivs i fattiga jordar. Klipp tillbaka om den sprider sig för långt. Vinterhärdig. Drar pollinerare.",
  },
  {
    id: "3129b5da-2245-8006-bbbe-f7d2b2cccca7",
    vaxt: "Tuvrör 'Karl Foerster'",
    fas: "Etablerad",
    vattningsintervall: "Vid behov",
    ljusbehov: "Fullt sol",
    hojd: "150–180 cm",
    sorttnamn: "Karl Foerster",
    antalPlantor: 3,
    skotselguide:
      "Klipp ned till 10 cm tidigt vår. Räfsa ut döda strån. Elegant axbildning från juni. Tål torka och blåst. Kan delas vart 4:e år i april.",
  },
  {
    id: "3129b5da-2245-8084-ba2a-f9166aa1862b",
    vaxt: "Ullungrönn 'Dodong'",
    fas: "Etablerad",
    vattningsintervall: "Inte nu",
    ljusbehov: "Sol till halvskugga",
    hojd: "400–600 cm",
    sorttnamn: "Dodong",
    antalPlantor: 1,
    skotselguide:
      "Dekorativa orange–röda bär som sitter länge på hösten. Blommar i juni. Lätt beskärning vid behov vår. Torktålig när etablerad. Drar fåglar.",
  },
  {
    id: "3129b5da-2245-801a-bada-d24c07ae51b7",
    vaxt: "Vidjehortensia 'Incrediball'",
    fas: "Etablerad",
    vattningsintervall: "Vid behov",
    ljusbehov: "Sol till halvskugga",
    hojd: "100–150 cm",
    sorttnamn: "Incrediball",
    antalPlantor: 2,
    skotselguide:
      "Klipp ned kraftigt tidigt vår (till ca 30 cm). Blommar på nytt skott. Stor vit blomning juni–sept. Vattna regelbundet vid torka. Kräver nästan ingen annan skötsel.",
  },
  {
    id: "3129b5da-2245-8072-aa80-c75c553f4e42",
    vaxt: "Vit vintergröna 'White Power'",
    fas: "Etablerad",
    vattningsintervall: "Inte nu",
    ljusbehov: "Sol till halvskugga",
    hojd: "10–20 cm",
    sorttnamn: "White Power",
    skotselguide:
      "Vintergrön med vit blomning i sommar. Lättskött och tålig. Putsa tillbaka om den sprider sig för länge. Bra i kanter och sluttningar.",
  },
];

async function patchPlant(plant) {
  const { id, vaxt, ...fields } = plant;
  const body = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined && v !== null) body[k] = v;
  }

  const res = await fetch(`${BASE}/api/garden/plants/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (res.ok) {
    console.log(`✅ ${vaxt}`);
  } else {
    const txt = await res.text();
    console.error(`❌ ${vaxt} (${res.status}): ${txt.slice(0, 120)}`);
  }
}

console.log(`Populerar ${PLANTS.length} växter…\n`);
for (const plant of PLANTS) {
  await patchPlant(plant);
}
console.log("\nKlart!");
