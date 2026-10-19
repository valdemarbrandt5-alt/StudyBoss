# StudyBoss

## Ny: delbar browserudgave med brugerens egen GPU

`web/` indeholder en separat webversion, hvor AI kører direkte i brugerens browser via WebGPU. Ingen betalt AI-tjeneste eller Ollama-installation er nødvendig for webversionen. Første modeldownload kræver internet og en egnet computer. Samtaler og materiale bliver i den åbne fane. Kvaliteten af de små modeller skal afprøves på det konkrete fag.

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
* Øv dig: opgaver, skjult foreløbigt facit, vurdering fra 0 til 4 og opfølgninger til feedback.
* Regnebord: lommeregner, CNN outputstørrelse, softmax, netværksparametre og kladdenoter. Værktøjerne virker uden aktiv AI.
* Din fremgang: lokal historik og foreslåede gentagelsesdatoer.

Illustrationer tegnes lokalt fra strukturerede data: grafer, netværk og trinfigurer. Modellen skal inkludere en relevant illustration når den hjælper. Ingen genererede fotos. Aktiveringskurver har domæne -6 til 6 og leaky ReLU hældning 0.01. Modellen instrueres i kun at vælge dem til passende eksempler.

Upload tekstbaseret PDF, TXT eller Markdown. Scanninger, billeder og diagrammer i PDF læses ikke. Løsninger uploades separat og bruges ved bedømmelse. Uploads, kladdenoter og samtaler lever i sessionen og skal genskabes efter genstart. Ændring af kursus, fokus eller materiale nulstiller samtale og aktuel opgave. Kladdenoter sendes ikke til AI. Søgeordsbaseret udvælgelse finder op til seks kildeafsnit og kan overse vigtige dele.

AI facit, karakterer og figurer kan være forkerte. Kontroller mod officielle løsninger. Modellen og GPU hastigheden skal testes på målcomputeren. Brug ollama ps under et svar til at se GPU brug. Windows installation er ikke kørt i udviklingsmiljøet.

Ingen automatisk dagskø, fuldt mastery system eller fjernadgang endnu. Den tidligere hostede hjemmeside er ikke forbundet til denne app.

## Udvikling

Kør `python -m unittest -v`. UI tests bruger Streamlit AppTest og kræver ingen aktiv model. Dokumentation: https://ollama.com/library/qwen3:14b og https://docs.streamlit.io.
