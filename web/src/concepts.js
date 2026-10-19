// Small, self-contained questions with a reference answer. Material only suggests topics.
const BANK = {
networks: `Hvad er et neuralt netværk? | En model af forbundne beregningsenheder, som lærer mønstre ved at justere parametre ud fra data.
Hvad er en vægt i et neuralt netværk? | En parameter, der bestemmer hvor stærkt et input påvirker en beregning.
Hvad er en bias i et neuralt netværk? | Et ekstra justerbart led, der lægges til den vægtede sum og forskyder neuronens output.
Hvad er inputlaget i et neuralt netværk? | Det lag, der modtager modellens inputdata.
Hvad er outputlaget i et neuralt netværk? | Det sidste lag, som leverer modellens forudsigelse.
Hvad er et skjult lag i et neuralt netværk? | Et beregningslag mellem inputlaget og outputlaget.
Hvad betyder det at træne et neuralt netværk? | At justere modellens parametre ud fra data for at mindske fejl i dens forudsigelser.
Hvad er forskellen på træning og brug af et færdigtrænet neuralt netværk? | Træning ændrer parametrene; ved almindelig brug beregnes forudsigelser med de lærte parametre.
En neuron beregner vægt gange input plus bias. Input er 3, vægten er 2 og bias er 1. Hvad bliver summen? | 2 gange 3 plus 1 er 7. Aktivering er ikke en del af spørgsmålet.
Hvorfor har et neuralt netværk brug for aktiveringsfunktioner? | Ikke-lineære aktiveringer gør det muligt at lære ikke-lineære sammenhænge. Flere rent lineære lag svarer stadig til en lineær afbildning.`,
gradient: `Hvad er formålet med gradient descent? | At finde lavere værdier af en funktion, typisk modellens tabsfunktion, ved gentagne parameteropdateringer.
Hvad fortæller gradienten om en funktion? | Retningen for størst lokal stigning og de partielle afledte med hensyn til parametrene.
Hvorfor går gradient descent modsat gradienten? | Fordi gradienten peger mod størst lokal stigning, mens vi søger at mindske funktionen.
Hvad er en læringsrate? | Den parameter, der bestemmer skridtlængden ved en opdatering.
Hvad kan der ske, hvis læringsraten er for stor? | Opdateringerne kan springe forbi et minimum, svinge eller få træningen til at divergere.
Hvad kan der ske, hvis læringsraten er meget lille? | Træningen kan blive langsom, fordi hvert skridt er lille.
En parameter er 5. Gradienten er 2 og læringsraten er 0,1. Hvad bliver parameteren efter ét skridt? | 5 minus 0,1 gange 2 er 4,8.
En parameter er 3. Gradienten er -2 og læringsraten er 0,5. Hvad bliver parameteren efter ét skridt? | 3 minus 0,5 gange -2 er 4.
Hvad betyder det, at gradienten er nul? | At punktet er stationært; det kan være et minimum, maksimum eller saddelpunkt og garanterer ikke et minimum.
Hvad er forskellen på batch og mini-batch gradient descent? | Batch bruger hele træningsdatasættet til en opdatering; mini-batch bruger en mindre gruppe eksempler.`,
backprop: `Hvad bruges backpropagation til? | Til effektivt at beregne gradienter af tabet med hensyn til netværkets parametre.
Hvilken matematisk regel bygger backpropagation på? | Kædereglen for differentiering af sammensatte funktioner.
Hvad er et forward pass? | Input sendes gennem netværket for at beregne output og derefter eventuelt tabet.
Hvad er et backward pass? | Afledte føres baglæns gennem beregningsgrafen for at beregne gradienter.
Opdaterer backpropagation i sig selv modellens vægte? | Nej. Backpropagation beregner gradienterne, mens en optimizer bruger dem til at opdatere vægtene.
Hvorfor begynder et backward pass ved tabet? | Vi vil vide, hvordan hver parameter påvirker tabet, og bruger kædereglen baglæns fra tabet.
Hvad er en beregningsgraf? | En repræsentation af beregninger og deres afhængigheder som knuder og forbindelser.
Hvad betyder vanishing gradients? | Gradienterne bliver meget små gennem lagene, så nogle parametre lærer meget langsomt.
Hvad betyder exploding gradients? | Gradienterne bliver meget store, hvilket kan gøre træningen ustabil.
Hvis y = 2x og tabet L = 3y, hvad er den afledte af L med hensyn til x? | Kædereglen giver 3 gange 2 lig 6.`,
cnn: `Hvad står CNN for? | Convolutional Neural Network, på dansk et konvolutionelt neuralt netværk.
Hvad er et filter i et CNN? | Et lille sæt lærbare vægte, som flyttes over inputtet for at finde lokale mønstre.
Hvad er et feature map? | Resultatet af at anvende et filter over inputtet.
Hvad betyder stride i en convolution? | Antallet af positioner filteret flyttes ad gangen.
Hvad betyder padding i en convolution? | Ekstra værdier omkring kanten af inputtet, ofte nuller.
Hvad gør max pooling? | Vælger den største værdi i hvert lokalt område og reducerer typisk den rumlige størrelse.
Hvad betyder vægtdeling i et CNN? | Det samme filters vægte bruges på forskellige positioner i inputtet.
Hvorfor er lokale filtre nyttige til billeder? | De kan genkende lokale mønstre som kanter uden separate vægte for hver position.
Et input er 5 gange 5. Filteret er 3 gange 3, stride er 1 og padding er 0. Hvor stort bliver outputtet? | 3 gange 3, da hver side er (5 minus 3) divideret med 1 plus 1.
Et poolingområde indeholder 1, 4, 2 og 3. Hvad giver max pooling? | 4.`,
activations: `Hvad er formålet med en aktiveringsfunktion? | Den indfører typisk ikke-linearitet, så netværket kan lære mere end lineære sammenhænge.
Hvad gør ReLU ved et negativt input? | Den giver 0.
Hvad giver ReLU, når inputtet er 4? | 4.
Hvad giver ReLU, når inputtet er -3? | 0.
Hvilket interval ligger sigmoid-funktionens output i? | Strengt mellem 0 og 1 for endelige input.
Hvad giver sigmoid ved input 0? | 0,5.
Hvilket interval ligger tanh-funktionens output i? | Mellem -1 og 1, med grænserne som asymptoter for endelige input.
Hvad bruges softmax ofte til i outputlaget? | At omdanne klassescores til positive værdier, der summerer til 1, ofte fortolket som klasse-sandsynligheder.
Hvordan adskiller leaky ReLU sig fra ReLU? | Leaky ReLU har en lille ikke-nul hældning for negative input, mens ReLU giver nul.
Hvad menes med en mættet aktiveringsfunktion? | At output ændres meget lidt, når input ændres, så den afledte kan være meget lille.`,
loss: `Hvad er en tabsfunktion? | En funktion, der måler forskellen mellem modellens forudsigelse og det ønskede resultat.
Hvad prøver træningen normalt at gøre ved tabet? | Mindske det ved at justere modellens parametre.
Hvad står MSE for? | Mean Squared Error, gennemsnittet af de kvadrerede fejl.
En model forudsiger 3, men den rigtige værdi er 5. Hvad er den kvadrerede fejl? | (3 minus 5) i anden er 4.
To kvadrerede fejl er 4 og 16. Hvad er MSE? | (4 plus 16) divideret med 2 er 10.
Hvilken slags opgave bruges MSE ofte til? | Regression, hvor der forudsiges numeriske værdier.
Hvilken slags opgave bruges cross-entropy ofte til? | Klassifikation, hvor modellen tildeler sandsynligheder til klasser.
Er accuracy og tab det samme? | Nej. Accuracy tæller andelen af korrekte klassifikationer, mens tab også kan afhænge af sandsynligheder og fejlens størrelse.
Kan lavt træningstab alene vise, at modellen klarer nye data godt? | Nej. Man må også vurdere modellen på data, den ikke blev trænet på.
Hvorfor kvadrerer MSE fejlene? | Positive og negative fejl ophæver ikke hinanden, og store fejl får større vægt.`,
regularization: `Hvad betyder overfitting? | Modellen tilpasser sig træningsdata så meget, at den generaliserer dårligt til nye data.
Hvad betyder underfitting? | Modellen har ikke lært tilstrækkeligt af de relevante mønstre og klarer også træningsdata dårligt.
Hvad er formålet med regularisering? | At begrænse overtilpasning og fremme generalisering, ofte ved at begrænse modellens kompleksitet.
Hvad gør dropout under træning? | Slår tilfældigt nogle aktiveringer fra med en given sandsynlighed.
Hvad er early stopping? | At stoppe træningen, når udviklingen på valideringsdata ikke længere forbedres efter et valgt kriterium.
Hvad bruges et valideringssæt til? | Til at vurdere og vælge modelindstillinger uden at træne direkte på sættet.
Hvad bruges et testsæt til? | Til den endelige evaluering på data, der ikke blev brugt til træning eller løbende modelvalg.
Hvad gør L2-regularisering ved store vægte? | Tilføjer en straf for vægtenes kvadrerede størrelse og opmuntrer dermed mindre vægte.
Hvad er data augmentation? | At lave meningsfulde variationer af træningseksempler, eksempelvis roterede billeder.
Træningsfejlen falder, men valideringsfejlen stiger. Hvad kan det være tegn på? | Overfitting.`,
photosynthesis: `Hvad bruger planter fotosyntese til? | At omdanne lysenergi til kemisk energi i organiske stoffer, typisk sukker.
Hvilken energikilde driver fotosyntesen? | Lys, normalt fra solen.
Hvilken gas optager planten til fotosyntesen? | Kuldioxid, CO2.
Hvilken gas frigives ved planters fotosyntese? | Ilt, O2.
Hvor i plantecellen foregår fotosyntesen? | I kloroplasterne.
Hvad er klorofyls rolle? | At absorbere lys til fotosyntesen.
Nævn to råstoffer til fotosyntesen. | Vand og kuldioxid.
Hvilket sukkerstof forbindes ofte med fotosyntesens samlede reaktion? | Glukose.
Hvor får planter normalt vandet til fotosyntesen fra? | Fra jorden gennem rødderne og plantens transportsystem.
Hvad er forskellen på fotosyntese og celleånding? | Fotosyntese lagrer energi ved at danne organiske stoffer ved hjælp af lys, mens celleånding frigør energi ved nedbrydning af organiske stoffer.`
};
const rows = value => value.split('\n').map(line => { const [question, answer] = line.split(' | '); return { question, answer }; });
export const CONCEPT_QUESTIONS = Object.fromEntries(Object.entries(BANK).map(([id, value]) => [`concept-${id}`, rows(value)]));
CONCEPT_QUESTIONS['concept-algebra'] = Array.from({length:10}, (_,i) => ({question:`Løs ligningen 2x + ${i+1} = ${3*i+7}.`,answer:`Træk ${i+1} fra begge sider og divider med 2. x = ${i+3}.`}));
CONCEPT_QUESTIONS['concept-derivatives'] = Array.from({length:10}, (_,i) => ({question:`Hvad er den afledte af f(x) = ${i+1}x²?`,answer:`f'(x) = ${2*(i+1)}x ifølge potensreglen.`}));
CONCEPT_QUESTIONS['concept-fractions'] = Array.from({length:10}, (_,i) => ({question:`Hvad er 10 procent af ${(i+1)*20}?`,answer:`${(i+1)*2}, fordi man dividerer med 10.`}));
CONCEPT_QUESTIONS['concept-probability'] = Array.from({length:10}, (_,i) => ({question:`En pose indeholder ${i+1} røde og ${11-i} blå kugler. Hvad er sandsynligheden for at trække en rød kugle?`,answer:`${i+1}/12. Der er ${i+1} gunstige udfald ud af 12 lige sandsynlige kugler.`}));
export function findConceptQuestion(skillId, question) { return CONCEPT_QUESTIONS[skillId]?.find(item => item.question === question) || null; }
export function nextConceptQuestion(skillId, attempts = [], current = '') {
  const questions = CONCEPT_QUESTIONS[skillId]; if (!questions) return null;
  const history = attempts.filter(item => !item.invalidatedReason && item.skillId === skillId);
  const start = questions.findIndex(item => item.question === current);
  const rotated = [...questions.slice(start + 1), ...questions.slice(0, start + 1)].filter(item => item.question !== current || questions.length === 1);
  return rotated.sort((a,b) => history.findLastIndex(item => item.question === a.question) - history.findLastIndex(item => item.question === b.question))[0];
}

export function conceptGradingTask(medal = false) {
  return 'Bedøm et kort begynderspørgsmål med appens referencefacit. Returner JSON: score, feedback og solution.' +
    (medal ? ' Returner også correct: true ved fagligt korrekt svar på spørgsmålet, ellers false.' : '') +
    ' 12: korrekt kerneforståelse. 10: kun lille unøjagtighed. 7: en faglig mangel. 4: væsentlige mangler. 02: minimal forståelse. 00: forkert. -3: helt irrelevant.' +
    ' Score er tal fra [-3,0,2,4,7,10,12]. Et kort korrekt svar giver 12. Kræv ikke eksempler, formler eller ekstra detaljer, hvis de ikke efterspørges.' +
    ' Bedøm betydningen, ikke ordret gengivelse. Feedback højst 25 ord, solution højst 40 ord. Giv ikke 7, hvis feedback siger at alt er korrekt. Ingen krav om læsemateriale.';
}

export function randomTrainingSkill(skills, currentId = '', random = Math.random) {
  const eligible = skills.filter(skill => CONCEPT_QUESTIONS[skill.id] && skill.sources.length);
  const others = eligible.filter(skill => skill.id !== currentId);
  const pool = others.length ? others : eligible;
  return pool.length ? pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))] : null;
}
