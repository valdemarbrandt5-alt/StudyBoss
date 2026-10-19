import { CONCEPT_QUESTIONS, findConceptQuestion } from './concepts.js';
export const questionKey = (skillId, question) => `${skillId}:${question.toLocaleLowerCase('da').replace(/[^\p{L}\p{N}]/gu,'')}`;
export const QUESTION_SCHEMA = {type:'object',properties:{question:{type:'string'},answer:{type:'string'}},required:['question','answer'],additionalProperties:false};
export function rememberQuestion(course, skillId, item, origin = 'seed') {
  const history = course.questionHistory[skillId] ||= [];
  if (!history.some(old => questionKey(skillId,old.question) === questionKey(skillId,item.question))) history.push({...item,origin});
}
export function unusedSeed(course, skillId) {
  const seen = new Set((course.questionHistory[skillId] || []).map(item => questionKey(skillId,item.question)));
  return CONCEPT_QUESTIONS[skillId]?.find(item => !seen.has(questionKey(skillId,item.question))) || null;
}
export function questionReference(course, skillId, question) {
  return findConceptQuestion(skillId,question) || (course.questionHistory[skillId] || []).find(item => item.question === question) || Object.values(course.mistakes).find(item => item.skillId === skillId && item.question === question && item.reference)?.reference || null;
}
export function parseNewQuestion(text, course, skillId) {
  let item; try { item=JSON.parse(text); } catch { throw new Error('AI’en gav ikke en færdig opgave. Prøv igen.'); }
  if (typeof item?.question !== 'string' || typeof item.answer !== 'string' || item.question.length < 12 || item.question.length > 260 || item.answer.length < 8 || item.answer.length > 800) throw new Error('AI-opgaven har ikke en brugbar form. Prøv igen.');
  item.question=item.question.trim(); item.answer=item.answer.trim();
  if (!/^(hvad|hvordan|hvorfor|forklar|beregn|beskriv|løs|find|sammenlign|en |et )/iu.test(item.question) || /tekstuddrag|kildeuddrag|materialet|teksten|eksamen|kursusplan|https?:|»|«/iu.test(item.question)) throw new Error('AI-opgaven var ikke et selvstændigt begrebsspørgsmål. Prøv igen.');
  if ((course.questionHistory[skillId] || []).some(old => questionKey(skillId,old.question) === questionKey(skillId,item.question))) throw new Error('AI’en gentog en tidligere opgave. Prøv igen for en ny.');
  return {question:item.question.trim(),answer:item.answer.trim()};
}
export function saveMistake(course, assessment, reference = null) {
  if (assessment.invalidatedReason || typeof assessment.question !== 'string') return;
  const key=questionKey(assessment.skillId || '',assessment.question);
  const wrong=assessment.correct === false || (assessment.correct === undefined && assessment.score < 7);
  if (wrong) {
    const old=course.mistakes[key];
    course.mistakes[key]={...old,key,skillId:assessment.skillId || '',skillTitle:assessment.skillTitle || assessment.topic || 'Tidligere opgave',question:assessment.question,exerciseId:old?.exerciseId || assessment.exerciseId,reference:old?.reference || reference,firstAttempt:old?.firstAttempt || structuredClone(assessment),lastAttempt:structuredClone(assessment),resolved:false};
  } else if (assessment.correct === true && course.mistakes[key]) {
    course.mistakes[key].resolved=true; course.mistakes[key].lastAttempt=structuredClone(assessment);
  }
}
export function migrateLearning(course) {
  course.questionHistory ||= {}; course.mistakes ||= {};
  for (const attempt of course.attempts) {
    if (attempt.invalidatedReason) continue;
    const seed=findConceptQuestion(attempt.skillId,attempt.question);
    if (seed) rememberQuestion(course,attempt.skillId,seed);
    saveMistake(course,attempt,seed || (attempt.solution ? {question:attempt.question,answer:attempt.solution,origin:'ai'} : null));
  }
}

export function continuingVariant(course, skillId) {
  if (!CONCEPT_QUESTIONS[skillId]) return null;
  let n=(course.questionHistory[skillId] || []).filter(item=>item.origin==='template').length+1;
  const builders={
    'concept-networks': n=>({question:`En neuron har input ${n+3}, vægt 3 og bias 2. Hvad er den vægtede sum før aktivering?`,answer:`3 gange ${n+3} plus 2 er ${3*(n+3)+2}.`}),
    'concept-gradient': n=>({question:`En parameter er ${n+10}. Gradienten er 2 og læringsraten er 0,5. Hvad bliver parameteren efter ét gradient descent-skridt?`,answer:`${n+10} minus 0,5 gange 2 er ${n+9}.`}),
    'concept-backprop': n=>({question:`Hvis y = 2x og L = ${n+3}y, hvad er dL/dx ifølge kædereglen?`,answer:`dL/dx = ${n+3} gange 2 = ${2*(n+3)}.`}),
    'concept-cnn': n=>({question:`Et billede er ${n+6} gange ${n+6}. Et convolution-filter er 3 gange 3, stride er 1 og padding er 0. Hvor stort bliver outputtet?`,answer:`${n+4} gange ${n+4}, fordi hver side er (${n+6} minus 3) divideret med 1 plus 1.`}),
    'concept-activations': n=>({question:`Hvad giver ReLU, når inputtet er ${n%2 ? n+10 : -(n+10)}?`,answer:`ReLU er max(0,x), så outputtet er ${n%2 ? n+10 : 0}.`}),
    'concept-loss': n=>({question:`En model forudsiger ${n+2}, men den rigtige værdi er ${2*n+5}. Hvad er den kvadrerede fejl?`,answer:`(${n+2} minus ${2*n+5}) i anden er ${(n+3)**2}.`}),
    'concept-regularization': n=>n%2 ? ({question:`En model klarer alle ${n+20} træningseksempler perfekt, men fejler ofte på nye data. Hvilket problem kan det være tegn på?`,answer:'Overfitting: modellen har lært træningsdata for specifikt og generaliserer dårligt.'}) : ({question:`En model laver store fejl på både sine ${n+20} træningseksempler og nye data. Hvilket problem kan det være tegn på?`,answer:'Underfitting: modellen har ikke lært de relevante mønstre tilstrækkeligt.'}),
    'concept-algebra': n=>({question:`Løs ligningen 2x + 3 = ${2*(n+12)+3}.`,answer:`Træk 3 fra og divider med 2. x = ${n+12}.`}),
    'concept-derivatives': n=>({question:`Hvad er den afledte af f(x) = ${n+11}x²?`,answer:`f'(x) = ${2*(n+11)}x ifølge potensreglen.`}),
    'concept-fractions': n=>({question:`Beregn 10 procent af ${(n+10)*100}.`,answer:`${(n+10)*10}, da 10 procent er en tiendedel.`}),
    'concept-probability': n=>({question:`En pose har ${n+12} røde og 3 blå kugler. Hvad er sandsynligheden for at trække en rød kugle, når alle kugler er lige sandsynlige?`,answer:`${n+12}/${n+15}: antal røde divideret med det samlede antal kugler. Brøken må gerne forkortes.`}),
    'concept-photosynthesis': n=>({question:`Fotosyntesens samlede reaktion bruger 6 CO2-molekyler pr. glukosemolekyle. Hvor mange CO2-molekyler kræves der til ${n+2} glukosemolekyler?`,answer:`6 gange ${n+2} er ${6*(n+2)} CO2-molekyler.`}),
  };
  let item=builders[skillId](n);
  while ((course.questionHistory[skillId] || []).some(old=>questionKey(skillId,old.question)===questionKey(skillId,item.question))) item=builders[skillId](++n);
  return item;
}
