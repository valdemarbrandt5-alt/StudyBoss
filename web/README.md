# StudyBoss i browseren

En statisk webversion med WebLLM 0.2.86 og lokal WebGPU-inferens. Ingen API-nøgle, AI-server, konto, database eller betalt AI-kvote. Den eksisterende Python/Ollama-app er separat og bevares.

## Start lokalt

Installér en aktuel Node.js LTS-version (Vite 8 kræver Node 20.19+ eller 22.12+). Kør fra denne `web`-mappe:

```text
npm ci
npm run dev
```

Åbn den localhost-adresse, der bliver vist. HTML-filen kan ikke bruges direkte via `file://`.

## Udgiv på Vercel

1. Commit og push ændringerne til GitHub fra GitHub Desktop.
2. I Vercel: Add New → Project → importér `valdemarbrandt5-alt/StudyBoss`.
3. Behold Root Directory som projektets rod (ikke `web`). Vælg framework `Other`, hvis Vercel spørger.
4. `vercel.json` angiver installation, build og output (`web/dist`). Der skal ikke tilføjes miljøvariabler eller betalingsoplysninger til en AI-tjeneste.
5. Deploy. Del HTTPS-adressen. Senere pushes til den tilknyttede produktionsgren udløser nye builds.

Vercels Hobby-plan har grænser og er beregnet til personlige, ikke-kommercielle projekter. Gratis tjenester og deres vilkår kan ændres. Ingen hostingkonto er oprettet og intet er udgivet alene ved at tilføje disse filer.

## Første brug

Åbn **Start lokal AI**, vælg model, og acceptér download til enheden. Modellen hentes først ved brugerens klik. Qwen 3.5 0,8B, 2B og 4B er tilgængelige i det fastlåste WebLLM-modelregister. Forvent ca. 0,6 / 1,5 / 3 GB download; de præcise mængder afhænger af modelartefakterne. WebLLM angiver ca. 1,9 / 2,6 / 4,7 GB grafikhukommelse ved standardopsætningen, hvortil kommer browserforbrug.

Browseren vælger GPU. Et positivt WebGPU-tjek er ikke en garanti for nok hukommelse. Ingen automatisk CPU- eller cloud-fallback. Prøv opdateret Chrome/Edge og den lille model. Mobile enheder, styrede skolecomputere, drivere og hukommelse kan forhindre opstart. Modellerne er langt mindre end den oprindelige lokale 14B-model; kvaliteten af dansk, matematik og feedback skal vurderes i en reel pilot.

## Funktioner og grænser

- Chat med streaming, stop, kort samtalekontekst og eksport til tekst.
- Mine fag: opret/vælg/omdøb fag. Materiale, samtaler, noter, seneste øvelse og op til 100 bedømmelser pr. fag gemmes i IndexedDB på denne browser. Gemte ændringer overlever genindlæsning; de synkroniseres ikke til andre enheder eller profiler. Browserrydning/privat browsing kan fjerne dem.
- Materialeoversigt pr. fag med visning af den læste tekst. Chat, øvelser og bedømmelser viser de faktiske filnavne, som udvælgelsen gav til modellen, eller at ingen filuddrag blev brugt.
- Øvelsesopgave og vejledende feedback efter elevens svar. 7-trinsskalaen bruger præcis -3, 00, 02, 4, 7, 10, 12. Bedømmelse genereres som JSON med enum-begrænset karakter og valideres før visning/gemning. Afbrudte eller ugyldige svar gemmes ikke som karakterer. Alle karakterer er AI-estimater, ikke officielle karakterer.
- PDF/TXT/Markdown læses lokalt, højst seks filer på 50 MB hver. Højst de første 60 PDF-sider og 150.000 tegn pr. fil. Ingen OCR eller læsning af diagrammer.
- Søgeord udvælger korte kildeuddrag; udvælgelsen kan overse relevante afsnit. Et vist kildenavn angiver et uddrag givet til modellen, ikke en verificeret kildehenvisning for hvert udsagn.
- Konteksten er konservativt begrænset til under 3.000 UTF-8-bytes plus svar op til 640 tokens og chatformat, inden for modellens 4.096-token vindue. Lange spørgsmål afvises. Ændringer af fag, fokus eller materiale nulstiller chat og opgave. Notesiden er uafhængig.
- Materiale, samtaler og noter gemmes lokalt pr. fag. Ved lagerfejl vises besked om, at ændringer kun ligger i fanens hukommelse. Luk ikke fanen, før vigtige noter og samtaler er eksporteret. Fag gemmes på den aktuelle webadresse; localhost og den udgivne Vercel-adresse har separate lokale lagre. Brug din egen browserprofil på delte computere. Der er ingen synkronisering, læreroversigt eller deling af brugerdata.
- Modelfiler kan gemmes i browserens cache og blive fjernet ved pladsmangel. At frigive GPU-hukommelse sletter ikke downloadcachen. Slet webstedets data i browseren for at fjerne cachen.
- Modeldownload bruger Hugging Face / WebLLM-modelbibliotek på GitHub. Disse tjenester modtager almindelige downloadforespørgsler, men appen sender ikke brugerens spørgsmål eller materiale til dem. Ingen analyse- eller reklametjenester er tilføjet. Besøg på værten medfører almindelige webforespørgsler.
- Internet er nødvendigt ved første download. Dette er ikke en fuld offline-PWA, og offline-opstart garanteres ikke.

## Verifikation

```text
npm test
npm run build
```

Testene dækker modelregistre, UTF-8-grænser, udvælgelse af materiale og kontekstbudget. En rigtig modeldownload og et AI-svar på målenheden kræves desuden for at verificere GPU-forløbet. Der leveres ingen simulerede AI-svar.

Under udviklingen er WebGPU, modeldownload og rigtig inferens afprøvet i browseren på denne computer. Qwen 3.5 2B gav korrekt slutsvar på en simpel ligning, men også en modstridende sætning i forklaringen; en biologisk øvelsesopgave krævede flere oplysninger end kildeuddraget gav. Tekstupload blev afprøvet. Kvaliteten er derfor eksperimentel og ikke godkendt til selvstændig undervisning eller bedømmelse. PDF-læsning, mobil-GPU og den største model kræver fortsat afprøvning på målenhederne.

Fagopdateringen er testet med oprettelse af to fag, isolering af materiale/noter og genindlæsning fra IndexedDB. En rigtig modelbedømmelse blev valideret som karakter 7, vist med kildenavn og genfundet i fagets historik efter genindlæsning. Modellen kritiserede dog fejlagtigt en korrekt besvarelse og gav dermed et upålideligt karakterestimat. Testen bekræfter format og lagring, ikke vurderingens faglige korrekthed.

Dokumentation: https://webllm.mlc.ai/docs/ og https://vercel.com/docs/deployments/git/vercel-for-github

Når Øv dig åbnes uden en igangværende opgave, genereres første opgave automatisk fra fagets materiale, så snart lokal AI er klar. Manglende materiale eller AI-start forklares i en statusbesked. Eksisterende opgaver bevares; Næste opgave laver en ny. Automatisk generering kræver faktisk materialetekst og falder ikke tilbage til almen viden ved manglende søgeordsmatch. PDF.js 6 dokumenter frigives gennem loadingTask.destroy(), ikke PDFDocumentProxy.destroy().
