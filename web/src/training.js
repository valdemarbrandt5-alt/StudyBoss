// These are transparent keyword suggestions, not an AI claim to have mapped a syllabus.
const CONCEPTS = [
  ['gradient', 'Gradient descent og optimering', /gradient\s*descent|gradientnedstigning|optimering|optimization|optimisation/iu],
  ['backprop', 'Backpropagation og kædereglen', /backpropagation|back-propagation|kædereg|chain rule/iu],
  ['cnn', 'Convolution og CNN', /convolution|convolutional|\bcnn\b|konvolution/iu],
  ['activations', 'Aktiveringsfunktioner', /activation function|aktiveringsfunktion|\brelu\b|\bsigmoid\b/iu],
  ['loss', 'Tabsfunktioner', /loss function|tabsfunktion|cross.entropy|mean squared error/iu],
  ['regularization', 'Regularisering og overfitting', /regulari[sz]ation|regularisering|overfitting|dropout/iu],
  ['networks', 'Neurale netværk', /neural network|neurale netværk|perceptron/iu],
  ['probability', 'Sandsynlighed og statistik', /probability|sandsynlighed|standard deviation|standardafvigelse/iu],
  ['algebra', 'Ligninger og algebra', /equation|ligning|algebra/iu],
  ['derivatives', 'Differentiation og afledte', /derivative|differentiation|differentialregning|afledte/iu],
  ['photosynthesis', 'Fotosyntese', /photosynthesis|fotosyntese/iu],
  ['fractions', 'Brøker og procent', /\bbrøker?\b|\bfractions?\b|procentregning/iu],
];
export function matchesSkillText(text, skill) {
  const pattern = CONCEPTS.find(([id]) => skill?.id === `concept-${id}`)?.[2];
  if (pattern) return pattern.test(text);
  const words = skill?.title?.toLocaleLowerCase('da').match(/[\p{L}]{4,}/gu) || [];
  return words.length > 0 && words.some(word => String(text).toLocaleLowerCase('da').includes(word));
}
export function skillsForCourse(course) {
  const documents = course.documents || [];
  const skills = CONCEPTS.flatMap(([id, title, pattern]) => {
    const sources = documents.filter(doc => pattern.test(doc.text)).map(doc => doc.name);
    return sources.length ? [{ id: `concept-${id}`, title, sources, origin: 'keywords' }] : [];
  });
  for (const custom of course.skills || []) skills.push({ ...custom, origin: 'manual', sources: documents.map(doc => doc.name) });
  if (!skills.length && documents.length) skills.push({ id: 'material-basics', title: 'Materialets hovedbegreber', sources: documents.map(doc => doc.name), origin: 'general' });
  for (const attempt of course.attempts || []) {
    if (attempt.skillId && !skills.some(skill => skill.id === attempt.skillId)) skills.push({ id: attempt.skillId, title: attempt.skillTitle || 'Tidligere opgavetype', sources: [], origin: 'history' });
  }
  return skills;
}
export function masteryForSkill(attempts, skillId) {
  // Re-grading the same exercise replaces its result; it cannot inflate mastery.
  const unique = new Map();
  for (const attempt of attempts || []) {
    if (!attempt.invalidatedReason && attempt.skillId === skillId && attempt.exerciseId && [-3, 0, 2, 4, 7, 10, 12].includes(attempt.score)) unique.set(attempt.exerciseId, attempt);
  }
  const recent = [...unique.values()].sort((a, b) => a.created.localeCompare(b.created)).slice(-3);
  const passed = recent.filter(attempt => attempt.score >= 7).length;
  const mastered = recent.length === 3 && passed === 3;
  const needsPractice = recent.length > 0 && recent.at(-1).score < 7;
  const status = !recent.length ? 'new' : mastered ? 'mastered' : needsPractice ? 'review' : 'learning';
  return { status, label: { new: 'Ikke startet', mastered: 'Foreløbigt mestret', review: 'Øv mere', learning: 'Undervejs' }[status], passed, recent, total: unique.size };
}
export function recommendSkill(skills, attempts) {
  const rank = { review: 0, new: 1, learning: 2, mastered: 3 };
  return [...skills].filter(skill => skill.sources.length).sort((a, b) => rank[masteryForSkill(attempts, a.id).status] - rank[masteryForSkill(attempts, b.id).status])[0] || null;
}

export const MEDALS = { bronze: { label: 'Bronze', target: 3 }, silver: { label: 'Sølv', target: 5 }, gold: { label: 'Guld', target: 10 } };
export const runKey = (skillId, medal) => `${skillId}::${medal}`;
export function newMedalRun(medal) {
  if (!MEDALS[medal]) throw new Error('Ukendt medalje');
  return { target: MEDALS[medal].target, streak: 0, seen: [], completed: false };
}
export function recordMedalAnswer(run, exerciseId, correct) {
  if (typeof correct !== 'boolean') throw new Error('Svaret mangler en gyldig rigtigt/forkert-vurdering.');
  if (run.completed || run.seen.includes(exerciseId)) return false;
  run.seen.push(exerciseId); run.streak = correct ? run.streak + 1 : 0;
  run.completed = run.streak >= run.target;
  return true;
}
const ADMIN = /eksamen|exam\b|examination|assessment criteria|linux|windows|installation|course schedule|kursusplan|mundtlig|oral presentation/iu;
// A topic heading is not evidence. Only explanatory statements or worked formulas qualify.
export function substantivePassages(text) {
  const sentences = String(text).split(/\n+|(?<=[.!?])\s+/u);
  const verb = /\b(is|are|uses?|computes?|contains?|consists?|updates?|applies|measures?|reduces?|maps?|represents?|produces?|calculates?|multiplies?|learns?|transforms?|connects?|propagates?|minimizes?|adjusts?|gives?|requires?)\b|\b(er|består|bruger|beregner|indeholder|opdaterer|anvender|måler|reducerer|beskriver|giver|repræsenterer|multiplicerer|minimerer|ændrer|forbinder|lærer)\b/iu;
  const logistics = /workshop|mini.project|recap|course overview|course content|learning objectives|learning outcomes|pensumoversigt|indholdsfortegnelse|kursusgang|ugeplan|semesterplan|schedule|syllabus|\(AI\)|\(MAT\)/iu;
  return sentences.map(part => part.trim()).filter(part => {
    const words = part.match(/[\p{L}\p{N}]+/gu) || [];
    return !ADMIN.test(part) && !logistics.test(part) && words.length >= 6 && part.length >= 35 && (verb.test(part) || (/[=∇∂]/u.test(part) && words.length >= 9));
  });
}
export function topicDocuments(documents, skill) {
  const pattern = CONCEPTS.find(([id]) => skill?.id === `concept-${id}`)?.[2];
  const words = skill?.title.toLocaleLowerCase('da').match(/[\p{L}]{4,}/gu) || [];
  return documents.flatMap(doc => {
    const parts = substantivePassages(doc.text);
    const hits = parts.map((line, i) => (pattern ? pattern.test(line) : !words.length || words.some(word => line.toLocaleLowerCase('da').includes(word))) ? i : -1).filter(i => i >= 0);
    const selected = new Set(); for (const i of hits) for (let j = Math.max(0, i - 1); j <= Math.min(parts.length - 1, i + 1); j++) selected.add(j);
    const text = (!pattern && !hits.length ? parts : [...selected].sort((a,b) => a-b).map(i => parts[i])).join('\n');
    return text ? [{ name: doc.name, text }] : [];
  });
}
export function exerciseEvidence(question, documents, skill) {
  const quoted = question.match(/Tekstuddrag:\s*»([\s\S]*?)«/u)?.[1];
  if (quoted) {
    const normalize = text => text.replace(/\s+/gu, ' ').trim();
    if (!topicDocuments([{ name: 'excerpt', text: quoted }], skill).length || !documents.some(doc => normalize(doc.text).includes(normalize(quoted)))) return false;
  }
  return topicDocuments(documents, skill).length > 0;
}
export function validExercise(text, skill, previous = []) {
  if (!text || text.length > 700 || ADMIN.test(text) || !/^(forklar|beregn|beskriv|hvordan|hvad|hvorfor|sammenlign|vis|udled)\b/iu.test(text.trim()) || /kan ikke|ingen fagligt|som AI|kildeuddraget mangler/iu.test(text)) return false;
  const normalized = value => value.toLocaleLowerCase('da').replace(/[^\p{L}\p{N}]/gu, '');
  if (previous.some(value => normalized(value) === normalized(text))) return false;
  const pattern = CONCEPTS.find(([id]) => skill?.id === `concept-${id}`)?.[2];
  return !pattern || pattern.test(text);
}

export function fallbackExercise(documents, skill, previous = []) {
  for (const doc of topicDocuments(documents, skill)) {
    for (const statement of substantivePassages(doc.text)) {
      // No chopped excerpts or artificial rewording of the same task for medal points.
      if (statement.length > 450) continue;
      const text = `Forklar dette konkrete udsagn om ${skill.title} med dine egne ord. Hvad betyder de centrale fagudtryk?\n\nTekstuddrag: »${statement}«`;
      if (validExercise(text, skill, previous)) return { text, sources: [doc.name] };
    }
  }
  return null;
}

export function invalidateCatalogueAttempts(course) {
  for (const attempt of course.attempts || []) {
    const quoted = attempt.question?.match(/Tekstuddrag:\s*»([\s\S]*?)«/u)?.[1];
    if (quoted && !substantivePassages(quoted).length) attempt.invalidatedReason = 'Opgaven byggede ikke på en faglig forklaring. Bedømmelsen er ugyldig og tæller ikke med.';
  }
  for (const run of Object.values(course.medalRuns || {})) {
    if (!run.seen?.length) continue;
    const records = run.seen.map(id => (course.attempts || []).find(attempt => attempt.exerciseId === id));
    if (records.some(record => !record) || !records.some(record => record.invalidatedReason)) continue;
    let streak = 0;
    for (const record of records) if (!record.invalidatedReason) streak = record.correct ? streak + 1 : 0;
    run.streak = Math.min(streak, run.target); run.completed = run.streak >= run.target;
    run.seen = records.filter(record => !record.invalidatedReason).map(record => record.exerciseId);
  }
}
