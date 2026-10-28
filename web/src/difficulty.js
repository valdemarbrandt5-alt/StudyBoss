import { CONCEPT_QUESTIONS } from './concepts.js';
import { drawingQuestion } from './drawing.js';
export const LEVELS = { easy: { label: 'Let', description: 'Korte begrebsspørgsmål' }, medium: { label: 'Mellem', description: 'Multiple choice · vælg ét svar' }, hard: { label: 'Svær', description: 'Forklar, anvend og beregn' }, drawing: { label: 'Tegn', description: 'Tegneopgave · Egenkontrol' } };
export const difficultyOf = value => Object.hasOwn(LEVELS, value) ? value : 'easy';
export const levelKey = (key, level) => difficultyOf(level) === 'easy' ? key : key + '::' + level;
export const levelAttempts = (attempts, level) => attempts.filter(a => difficultyOf(a.difficulty) === difficultyOf(level));
const starter = {
  networks: ['Hvilken beskrivelse passer på en bias?', 'Et justerbart led, som lægges til den vægtede sum.', 'Et uforanderligt input fra datasættet.', 'Antallet af træningseksempler i en batch.', 'Andelen af korrekte svar.'],
  gradient: ['Hvad kan en for stor læringsrate medføre?', 'Træningen kan svinge eller divergere.', 'Gradienten er altid præcis nul.', 'Alle opdateringer bliver automatisk mindre.', 'Modellen er garanteret det globale minimum.'],
  backprop: ['Hvad beregner backpropagation?', 'Gradienter af tabet med hensyn til parametrene.', 'Kun antallet af træningseksempler.', 'Et nyt valideringssæt ved hvert lag.', 'En optimal læringsrate uden en optimizer.'],
  cnn: ['Hvad betyder vægtdeling i et CNN?', 'Et filters vægte bruges på flere positioner i inputtet.', 'Hver position har sit eget uafhængige filter.', 'Alle lag skal have samme antal neuroner.', 'Et filters vægte kan ikke ændres under træning.'],
  activations: ['Hvorfor bruges ikke-lineære aktiveringer?', 'For at kunne beskrive ikke-lineære sammenhænge.', 'For at gøre alle gradienter ens.', 'For at fjerne behovet for træningsdata.', 'For at garantere, at modellen ikke overfitter.'],
  loss: ['Hvilken opgavetype bruges MSE typisk til?', 'Regression med numeriske målværdier.', 'Kun at vælge en tilfældig klasse.', 'Kun at opdele data i træning og test.', 'At bestemme antallet af lag uden træning.'],
  regularization: ['Hvad er et typisk tegn på overfitting?', 'Træningsfejlen falder, mens valideringsfejlen stiger.', 'Fejlen er altid høj på både træning og validering.', 'Modellen har endnu ikke fået træningsdata.', 'Modellen kan kun være lineær.'],
  algebra: ['Hvilken operation bevarer en lignings løsninger?', 'At lægge det samme tal til på begge sider.', 'At lægge et tal til kun på venstre side.', 'At gange med nul og beholde alle nye løsninger.', 'At fjerne et led uden en tilsvarende operation.'],
  derivatives: ['Hvad beskriver den afledte i et punkt?', 'Funktionens lokale ændringshastighed.', 'Altid funktionens største værdi.', 'Antallet af datapunkter i funktionen.', 'Altid arealet under hele grafen.'],
  probability: ['Hvad er sandsynligheden for en sikker hændelse?', '1', '0', '-1', '2'],
  fractions: ['Hvad svarer 25 procent til?', 'En fjerdedel.', 'En halv.', 'En femtedel.', 'En tiendedel.'],
  photosynthesis: ['Hvilken gas er et udgangsstof i fotosyntesen?', 'Kuldioxid (CO2).', 'Ilt (O2).', 'Kvælstof (N2).', 'Helium (He).']
};
function choices(question, correct, wrong, random) {
  const options = [correct, ...wrong].map((text, i) => ({ text: String(text), correct: i === 0 }));
  if (new Set(options.map(o => o.text)).size !== 4) throw new Error('Svarmulighederne er ikke entydige.');
  for (let i = 3; i > 0; i--) { const j = Math.min(i, Math.floor(random() * (i + 1))); [options[i], options[j]] = [options[j], options[i]]; }
  return { question: 'Vælg ét svar. ' + question, choices: options.map(o => o.text), correctIndex: options.findIndex(o => o.correct), answer: String(correct), difficulty: 'medium' };
}
const medium = {
  networks: n => ['En neuron har input ' + (n+2) + ', vægt 2 og bias 3. Hvad er summen før aktivering?', 2*n+7, [2*n+4, 2*n+10, 2*n+6]],
  gradient: n => ['En parameter er ' + (n+8) + ', gradienten er 4 og læringsraten 0,5. Hvad er den nye parameter?', n+6, [n+10, n+4, n+12]],
  backprop: n => ['Hvis y = 2x og L = ' + (n+2) + 'y, hvad er dL/dx?', 2*n+4, [n+2, 2*n+6, -(2*n+4)]],
  cnn: n => ['Et input har bredde ' + (n+6) + '. Filteret har bredde 3, stride 1 og ingen padding. Hvad er outputbredden?', n+4, [n+6, n+3, n+5]],
  activations: n => ['Hvad giver ReLU ved input ' + (-(n+2)) + '?', 0, [-(n+2), n+2, 1]],
  loss: n => ['En model forudsiger ' + (n+1) + ', men målet er ' + (2*n+4) + '. Hvad er den kvadrerede fejl?', (n+3)**2, [n+3, -(n+3), (n+3)**2+1]],
  regularization: n => ['En model har ' + (n+91) + ' korrekte træningssvar ud af ' + (n+100) + ', men fejler ofte på nye data. Hvad bør man undersøge?', 'Overfitting og modellens generalisering.', ['Om testsættet bør bruges direkte til træning.', 'Om valideringsdata bør fjernes.', 'Om træningsfejl alene er nok til at vurdere modellen.']],
  algebra: n => ['Løs ligningen 3x + 2 = ' + (3*(n+2)+2) + '.', n+2, [n+1, n+3, 3*(n+2)]],
  derivatives: n => ['Hvad er den afledte af f(x) = ' + (n+2) + 'x²?', (2*(n+2))+'x', [(n+2)+'x', (n+2)+'x²', String(2*(n+2))]],
  probability: n => ['En pose har ' + (n+3) + ' røde og 2 blå kugler. Hvad er sandsynligheden for rød ved ét tilfældigt træk?', (n+3)+'/'+(n+5), ['2/'+(n+5), (n+3)+'/'+(n+4), (n+5)+'/'+(n+3)]],
  fractions: n => ['Hvad er 10 procent af ' + ((n+3)*100) + '?', (n+3)*10, [(n+3)*100, n+3, (n+3)*20]],
  photosynthesis: n => ['Fotosyntesens samlede reaktion bruger 6 CO2 pr. glukosemolekyle. Hvor mange CO2 kræves til ' + (n+2) + ' glukosemolekyler?', 6*(n+2), [n+2, 6*(n+2)+6, 6*(n+2)-6]]
};
const hard = {
  networks: n => ['En neuron har x1 = '+(n+2)+', x2 = '+n+', vægtene 2 og -3 og bias 2. Beregn den vægtede sum og ReLU-outputtet. Forklar aktiveringens virkning.', 'Summen er 2·'+(n+2)+'-3·'+n+'+2 = '+(6-n)+'. ReLU giver '+Math.max(0,6-n)+'. Negative summer bliver nul; positive summer bevares.'],
  gradient: n => ['L(w) = (w - '+n+')². Start ved w = '+(n+4)+' med læringsrate 0,25. Beregn gradienten og udfør to gradient descent-skridt. Sammenlign tabet før og efter.', 'Gradienten er 2(w-'+n+'). Først er den 8, så w1='+ (n+2)+'. Derefter er den 4, så w2='+(n+1)+'. Tabet falder fra 16 til 1.'],
  backprop: n => ['y = 3x + 2 og L = (y - '+n+')². Ved x = '+(n+1)+': beregn y og dL/dx med kædereglen. Vis de lokale afledte.', 'y='+(3*n+5)+'. dL/dy=2(y-'+n+')='+(4*n+10)+'. dy/dx=3, så dL/dx='+(12*n+30)+'.'],
  cnn: n => ['Et input er '+(2*n+8)+'×'+(2*n+8)+'. Først bruges et 3×3-filter med stride 1 uden padding, derefter 2×2 max pooling med stride 2 uden padding. Beregn størrelsen efter hvert lag og forklar beregningen.', 'Efter convolution: '+(2*n+6)+'×'+(2*n+6)+', fordi N-3+1. Efter pooling: '+(n+3)+'×'+(n+3)+', fordi floor((N-2)/2)+1 anvendt på convolution-outputtet.'],
  activations: n => ['Leaky ReLU har hældning 0,1 for negative input. Beregn output for x = '+(-10*(n+2))+' og x = '+(3*n+4)+'. Sammenlign med ReLU og forklar forskellen for gradienten ved det negative input.', 'Leaky ReLU giver '+(-(n+2))+' og '+(3*n+4)+'; ReLU giver 0 og '+(3*n+4)+'. På den negative side er hældningen 0,1 for leaky ReLU og 0 for ReLU.'],
  loss: n => ['En model forudsiger ['+n+','+(n+4)+'], mens målene er ['+(n+2)+','+(n+1)+']. Beregn MSE. Den anden forudsigelse ændres til '+(n+2)+': beregn det nye MSE og forklar ændringen.', 'Før: fejlene er -2 og 3, så MSE=(4+9)/2=6,5. Efter: fejlene er -2 og 1, så MSE=(4+1)/2=2,5. Den store kvadrerede fejl er blevet mindre.'],
  regularization: n => ['Et netværk får '+(n+90)+'/'+(n+100)+' rigtige på træning, men kun '+(n+40)+'/'+(n+100)+' på validering. Forklar det mulige problem, foreslå to relevante tiltag, og forklar hvordan du vil vurdere, om de hjælper.', 'Forskellen kan tyde på overfitting. Fx dropout, L2, en mindre model, mere data eller early stopping kan undersøges. Sammenlign på valideringsdata, og brug et urørt testsæt til den afsluttende evaluering. Undersøg også forskelle i datafordeling.'],
  algebra: n => ['En klub tager 20 kr. i grundpris og 3 kr. pr. aktivitet. Du betaler '+(20+3*(n+5))+' kr. Opstil en ligning, find antallet af aktiviteter, og beregn prisen for to aktiviteter mere.', '20+3x='+(20+3*(n+5))+', så x='+(n+5)+'. To aktiviteter mere koster yderligere 6 kr., så totalen er '+(26+3*(n+5))+' kr.'],
  derivatives: n => ['f(x) = (x + '+n+')². Find den afledte med kædereglen og hældningen ved x = 2. Hvad bliver x efter ét gradient descent-skridt fra x = 2 med læringsrate 0,1?', 'Afledt: 2(x+'+n+'). Ved x=2 er hældningen '+(2*(n+2))+'. Nyt x=2-0,1·'+(2*(n+2))+'='+Number((2-.2*(n+2)).toFixed(2))+'.'],
  probability: n => ['En pose har '+(n+3)+' røde og 2 blå kugler. Du trækker to kugler uden tilbagelægning. Beregn sandsynligheden for to røde, og forklar hvorfor sandsynligheden ændres ved andet træk.', 'P(to røde)=('+(n+3)+'/'+(n+5)+')·('+(n+2)+'/'+(n+4)+'). Efter første røde er der én rød og én kugle færre. Trækkene er afhængige.'],
  fractions: n => ['En vare koster '+((n+3)*100)+' kr. Prisen sættes først 20 procent ned og derefter 10 procent op. Beregn slutprisen og den samlede procentvise ændring. Forklar, hvorfor procenterne ikke blot lægges sammen.', 'Slutprisen er '+((n+3)*100)+'·0,8·1,1='+((n+3)*88)+' kr. Faktoren er 0,88, altså 12 procent ned. Sidste procent beregnes af den nedsatte pris.'],
  photosynthesis: n => ['Fotosyntesens samlede reaktion bruger 6 CO2 og 6 H2O pr. glukosemolekyle. Beregn behovet for at danne '+(n+2)+' glukosemolekyler. Forklar derefter, hvorfor nok vand og CO2 ikke er tilstrækkeligt i mørke.', 'Der kræves '+(6*(n+2))+' CO2 og '+(6*(n+2))+' H2O i den samlede reaktion. Lys leverer energien til lysreaktionerne, som danner ATP og NADPH til kulstoffikseringen. Vand og CO2 alene leverer ikke denne energi.']
};
const mediumSteps = {
  networks: n => ['En neurons vægtede sum er z = vægt × input + bias.', 'Indsæt værdierne: z = 2 × '+(n+2)+' + 3.', 'Gang først: 2 × '+(n+2)+' = '+(2*n+4)+'.', 'Læg bias til: '+(2*n+4)+' + 3 = '+(2*n+7)+'. Aktiveringen er ikke med i denne beregning.'],
  gradient: n => ['Gradient descent bruger reglen: ny parameter = gammel parameter − læringsrate × gradient.', 'Indsæt værdierne: '+(n+8)+' − 0,5 × 4.', 'Beregn skridtet først: 0,5 × 4 = 2.', 'Træk skridtet fra parameteren: '+(n+8)+' − 2 = '+(n+6)+'. Vi trækker fra, fordi gradient descent går modsat gradienten.'],
  backprop: n => ['Brug kædereglen: dL/dx = (dL/dy) × (dy/dx).', 'Fra L = '+(n+2)+'y fås dL/dy = '+(n+2)+'.', 'Fra y = 2x fås dy/dx = 2.', 'Gang de lokale afledte: '+(n+2)+' × 2 = '+(2*n+4)+'.'],
  cnn: n => ['Outputbredde = floor((inputbredde + 2 × padding − filterbredde) / stride) + 1.', 'Indsæt: floor(('+ (n+6)+' + 2 × 0 − 3) / 1) + 1.', 'Træk filterbredden fra: '+(n+6)+' − 3 = '+(n+3)+'.', 'Divider med stride og læg 1 til: '+(n+3)+' / 1 + 1 = '+(n+4)+'.'],
  activations: n => ['ReLU er defineret som ReLU(x) = max(0, x).', 'Indsæt x = '+(-(n+2))+': max(0, '+(-(n+2))+').', '0 er større end '+(-(n+2))+', så outputtet er 0.'],
  loss: n => ['Den kvadrerede fejl er (forudsigelse − mål)².', 'Indsæt: ('+(n+1)+' − '+(2*n+4)+')².', 'Beregn forskellen: '+(n+1)+' − '+(2*n+4)+' = '+(-(n+3))+'.', 'Kvadrér forskellen: ('+(-(n+3))+') × ('+(-(n+3))+') = '+((n+3)**2)+'. Et negativt tal ganget med sig selv bliver positivt.'],
  regularization: n => ['Modellen har '+(n+91)+' rigtige ud af '+(n+100)+' på træningsdata.', 'Den klarer nye data dårligere. Derfor skal træning og generalisering vurderes hver for sig.', 'Undersøg overfitting på valideringsdata. En god træningsscore alene garanterer ikke gode svar på nye data.'],
  algebra: n => ['Start med ligningen: 3x + 2 = '+(3*(n+2)+2)+'.', 'Træk 2 fra på begge sider: 3x = '+(3*(n+2))+'.', 'Divider begge sider med 3: x = '+(3*(n+2))+' / 3 = '+(n+2)+'.', 'Kontrollér: 3 × '+(n+2)+' + 2 = '+(3*(n+2)+2)+'. Det passer med højresiden.'],
  derivatives: n => ['Brug potensreglen: den afledte af a × x² er a × 2x.', 'Her er a = '+(n+2)+', så f′(x) = '+(n+2)+' × 2x.', 'Gang konstanterne: f′(x) = '+(2*(n+2))+'x.'],
  probability: n => ['Sandsynlighed = antal gunstige udfald / antal mulige udfald.', 'Antal røde kugler = '+(n+3)+'.', 'Antal kugler i alt = '+(n+3)+' + 2 = '+(n+5)+'.', 'Sandsynligheden for rød er derfor '+(n+3)+' / '+(n+5)+'. Brøken må gerne forkortes.'],
  fractions: n => ['10 procent svarer til 10 / 100 = 0,1, altså en tiendedel.', 'Beregn '+((n+3)*100)+' × 0,1, eller divider tallet med 10.', ((n+3)*100)+' / 10 = '+((n+3)*10)+'.'],
  photosynthesis: n => ['Den samlede reaktion bruger 6 CO2-molekyler pr. glukosemolekyle.', 'Antal CO2 = 6 × antal glukosemolekyler.', 'Indsæt og gang: 6 × '+(n+2)+' = '+(6*(n+2))+' CO2-molekyler.']
};
const parameterPatterns = {
  networks: [/^En neuron har input (\d+), vægt 2 og bias 3\./u, 2],
  gradient: [/^En parameter er (\d+), gradienten er 4/u, 8],
  backprop: [/^Hvis y = 2x og L = (\d+)y/u, 2],
  cnn: [/^Et input har bredde (\d+)\./u, 6],
  activations: [/^Hvad giver ReLU ved input -(\d+)\?/u, 2],
  loss: [/^En model forudsiger (\d+), men målet er/u, 1],
  regularization: [/^En model har (\d+) korrekte træningssvar/u, 91],
  algebra: [/^Løs ligningen 3x \+ 2 = (\d+)\./u, null],
  derivatives: [/^Hvad er den afledte af f\(x\) = (\d+)x²/u, 2],
  probability: [/^En pose har (\d+) røde og 2 blå/u, 3],
  fractions: [/^Hvad er 10 procent af (\d+)\?/u, null],
  photosynthesis: [/Hvor mange CO2 kræves til (\d+) glukosemolekyler/u, 2]
};
export function workedStepsFor(item, skillId) {
  if (Array.isArray(item?.steps) && item.steps.length && item.steps.every(s=>typeof s==='string' && s.trim())) return item.steps;
  if (!item?.question?.startsWith('Vælg ét svar. ')) return [];
  const topic=skillId?.replace('concept-',''), entry=parameterPatterns[topic];
  if (!entry) return [];
  const question=item.question.slice('Vælg ét svar. '.length), match=question.match(entry[0]);
  if (!match) return [];
  const value=Number(match[1]);
  const n=topic==='algebra'?(value-2)/3-2:topic==='fractions'?value/100-3:value-entry[1];
  if (!Number.isInteger(n) || n<1) return [];
  const [expectedQuestion, answer]=medium[topic](n);
  const referenceAnswer=item.solution ?? item.answer;
  if(question!==expectedQuestion || String(answer)!==String(referenceAnswer)) return [];
  return mediumSteps[topic](n);
}
export function nextLevelQuestion(course, skillId, level, random = Math.random) {
  if (!CONCEPT_QUESTIONS[skillId] || difficultyOf(level) === 'easy') return null;
  const topic = skillId.replace('concept-', '');
  const history = course.questionHistory?.[skillId] || [];
  let n = history.filter(item => item.difficulty === level).length;
  for (;;) {
    let item;
    if (level === 'medium') {
      const [question, correct, ...wrong] = n === 0 ? starter[topic] : (() => { const [q,a,w] = medium[topic](n); return [q,a,...w]; })();
      item = choices(question, correct, wrong, random);
      if(n>0) item.steps=mediumSteps[topic](n);
    } else if (level === 'drawing') item = drawingQuestion(skillId,n+1);
    else { const [question,answer] = hard[topic](n+1); item = { question, answer, difficulty: 'hard' }; }
    if (!history.some(old => old.question === item.question)) return item;
    n++;
  }
}
export function gradeChoice(item, answer, skillId = '') {
  if (!Array.isArray(item?.choices) || item.choices.length !== 4 || !Number.isInteger(item.correctIndex) || item.correctIndex < 0 || item.correctIndex > 3 || new Set(item.choices).size !== 4) throw new Error('Opgaven mangler et entydigt facit.');
  if (!item.choices.includes(answer)) throw new Error('Vælg én svarmulighed.');
  return { correct: answer === item.choices[item.correctIndex], solution: item.answer, steps: workedStepsFor(item,skillId) };
}
export function finishAIQuestion(item, raw, level, previous = []) {
  const result={...item,difficulty:difficultyOf(level)};
  if(level==='medium') {
    if(!Array.isArray(raw.choices) || raw.choices.length!==4 || raw.choices.some(text=>typeof text!=='string' || !text.trim() || text.length>300) || new Set(raw.choices.map(s=>s.trim())).size!==4 || !Number.isInteger(raw.correctIndex) || raw.correctIndex<0 || raw.correctIndex>3) throw new Error('AI-opgaven mangler fire forskellige muligheder og ét facit. Prøv igen.');
    result.choices=raw.choices.map(s=>s.trim()); result.correctIndex=raw.correctIndex;
    result.question='Vælg ét svar. '+item.question;
    if(raw.steps !== undefined) {
      if(!Array.isArray(raw.steps) || !raw.steps.length || raw.steps.length>8 || raw.steps.some(s=>typeof s!=='string' || !s.trim() || s.length>500)) throw new Error('AI-opgaven mangler brugbare løsningstrin. Prøv igen.');
      result.steps=raw.steps.map(s=>s.trim());
    }
  }
  if(previous.some(old=>old.question===result.question)) throw new Error('AI’en gentog en tidligere opgave. Prøv igen.');
  return result;
}
