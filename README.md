# StudyBoss

## Ny: delbar browserudgave med brugerens egen GPU

`web/` indeholder en separat webversion, hvor AI kører direkte i brugerens browser via WebGPU. Ingen betalt AI-tjeneste eller Ollama-installation er nødvendig for webversionen. Første modeldownload kræver internet og en egnet computer. Mine fag samler materiale, samtaler, noter og vejledende bedømmelser pr. fag i browserens lokale lager. Data synkroniseres ikke mellem enheder. Kvaliteten af de små modeller skal afprøves på det konkrete fag.

Se [web/README.md](web/README.md) for lokal start, begrænsninger og Vercel-opsætning. Projektets `vercel.json` er klar til at bygge denne webudgave. Python-appen nedenfor er fortsat en separat lokal mulighed.

Lokal studiepartner med Qwen3 14B på Ollama. Ingen OpenAI nøgle kræves. Tiltænkt Windows, RTX 5080 med 16 GB VRAM og 32 GB RAM.

## Første installation

Installer [Git til Windows](https://git-scm.com/download/win), [Python 3.12 med Python Launcher](https://www.python.org/downloads/windows/) og [Ollama](https://ollama.com/download/windows). Start Ollama.

Åbn terminalen i den mappe, hvor du vil have programmet:

```powershell
git clone https://github.com/valdemarbrandt5-alt/StudyBoss.git
cd StudyBoss
.\Install.bat
.\Start.bat
```

Første installation downloader cirka 9,3 GB modelvægte. Allerede downloadede vægte genbruges. Browseren åbner http://127.0.0.1:8501.

## Opdateringer

Luk StudyBoss, dobbeltklik Opdater.bat, og åbn Start.bat igen. Opdateringen henter kode fra GitHub, installerer afhængigheder og opdaterer modelkonfigurationen. Lokale kodeændringer overskrives ikke. Historikken sikkerhedskopieres før opdatering. Hvis pip eller Ollama fejler efter git pull, ret fejlen og kør opdateringen igen.

Svarhistorik ligger i data/studyboss.db, backup i backups/. Mapperne uploades ikke til GitHub. Fra ZIP versionen kan data mappen kopieres til den nye mappe før første start, mens begge apps er lukket. Sikkerhedskopier eksisterende data før kopiering.

## Funktioner

* Forstå stoffet: samtale med opfølgninger og visuelle eksempler. De sidste tre beskedpar sendes med som kontekst.
* Øv dig: opgaver, skjult foreløbigt facit, vejledende karakter på 7-trinsskalaen (-3, 00, 02, 4, 7, 10, 12) og opfølgninger til feedback.
* Mine fag: vælg og opret fag, se gemt undervisningsmateriale og den tekst, som er læst fra filerne. Svar og bedømmelser viser de filnavne, hvis uddrag blev givet til AI.
* Regnebord: lommeregner, CNN outputstørrelse, softmax, netværksparametre og kladdenoter. Værktøjerne virker uden aktiv AI.
* Din fremgang: lokal historik og foreslåede gentagelsesdatoer.

Illustrationer tegnes lokalt fra strukturerede data: grafer, netværk og trinfigurer. Modellen skal inkludere en relevant illustration når den hjælper. Ingen genererede fotos. Aktiveringskurver har domæne -6 til 6 og leaky ReLU hældning 0.01. Modellen instrueres i kun at vælge dem til passende eksempler.

Upload tekstbaseret PDF, TXT eller Markdown. Scanninger, billeder og diagrammer i PDF læses ikke. Løsninger uploades separat og bruges ved bedømmelse. Fag og udtrukket materialetekst gemmes i den lokale database. I Python-appen lever kladdenoter og samtaler fortsat i sessionen og skal genskabes efter genstart. Ændring af fag, fokus eller materiale nulstiller samtale og aktuel opgave. Kladdenoter sendes ikke til AI. Søgeordsbaseret udvælgelse finder op til seks kildeafsnit og kan overse vigtige dele.

Karakterer er vejledende AI-estimater, aldrig officielle bedømmelser. Eksisterende 0–4-bedømmelser markeres som gammel skala og omregnes ikke; kun nye 7-trinsbedømmelser indgår i det nye karaktergennemsnit. Databasens historik bevares ved den additive skemaopdatering.

AI facit, karakterer og figurer kan være forkerte. Kontroller mod officielle løsninger. Modellen og GPU hastigheden skal testes på målcomputeren. Brug ollama ps under et svar til at se GPU brug. Windows installation er ikke kørt i udviklingsmiljøet.

Ingen automatisk dagskø, fuldt mastery system eller fjernadgang endnu. Den tidligere hostede hjemmeside er ikke forbundet til denne app.

## Udvikling

Kør `python -m unittest -v`. UI tests bruger Streamlit AppTest og kræver ingen aktiv model. Dokumentation: https://ollama.com/library/qwen3:14b og https://docs.streamlit.io.

### Træningsoversigt i webversionen

Øv dig viser opgavetyper foreslået ud fra søgeord i fagets materiale. Forslagene er ikke en fuldstændig pensumliste; egne typer kan tilføjes. Hver type gemmer sin igangværende opgave og besvarelse. Matematik med LaTeX-afgrænsere vises med KaTeX.

Træningsoversigten vises som en liste med fri træning og klikbare bronze-, sølv- og guldmedaljer. Udfordringerne kræver henholdsvis 3, 5 og 10 rigtige svar i træk. Forkert svar nulstiller rækken. Rigtigt/forkert er et særskilt AI-estimat, ikke blot en bestået karakter. Fri træning og gentagne bedømmelser af samme opgave giver ikke ekstra point. Udfordringer, igangværende opgaver og optjente medaljer gemmes lokalt pr. fag og type. Optjente medaljer beholdes.

Opgavekontekst filtrerer eksamens- og installationspraktik fra og vælger afsnit om den aktuelle type. Genererede spørgsmål om kursuspraktik, forkert emne eller identiske tidligere spørgsmål afvises uden at påvirke medaljer. Kontrollen er en begrænset søgeordsbaseret kvalitetskontrol; lokal AI kan stadig lave faglige fejl.

Fri træning og medaljer åbner en separat opgavevisning med næste opgave og tilbage til oversigten. Under feedback vises Læs op her med klikbare, gemte uddrag fra den kontekst, som faktisk blev sendt til modellen. PDF-sidetal udledes kun fra entydige tekstankre og læste Side-markører. Ældre bedømmelser kan åbne hele materialet via deres gemte filnavne; de får ikke opfundne uddrag eller sidetal.

Opgavegrundlag kræver nu forklarende udsagn eller formler, ikke blot emneord i en kursusplan. Skabelonopgaver bruger hele konkrete udsagn og fremstiller ikke flere medaljeopgaver ved blot at omformulere samme tekst. Mangler brugbar tekst, afvises opgave og bedømmelse uden karakter eller tab af medaljerække. Tidligere kursusoversigt-opgaver markeres ugyldige i historikken med besvarelsen bevaret. Kontrollen er konservativ og søgeordsbaseret og kan afvise kortfattede, ellers brugbare slides; den garanterer ikke AI-bedømmelsens faglige korrekthed.
