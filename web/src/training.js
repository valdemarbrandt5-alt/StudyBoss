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
    if (attempt.skillId === skillId && attempt.exerciseId && [-3, 0, 2, 4, 7, 10, 12].includes(attempt.score)) unique.set(attempt.exerciseId, attempt);
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
export function topicDocuments(documents, skill) {
  const pattern = CONCEPTS.find(([id]) => skill?.id === `concept-${id}`)?.[2];
  const words = skill?.title.toLocaleLowerCase('da').match(/[\p{L}]{4,}/gu) || [];
  return documents.flatMap(doc => {
    const parts = doc.text.split(/\n+|(?<=[.!?])\s+/u).filter(line => line.trim() && !ADMIN.test(line));
    const hits = parts.map((line, i) => (pattern ? pattern.test(line) : words.some(word => line.toLocaleLowerCase('da').includes(word))) ? i : -1).filter(i => i >= 0);
    const selected = new Set();
    for (const i of hits) for (let j = Math.max(0, i - 1); j <= Math.min(parts.length - 1, i + 2); j++) selected.add(j);
    const text = (!pattern && !selected.size ? parts : [...selected].sort((a,b) => a-b).map(i => parts[i])).join('\n');
    return text.trim() ? [{ name: doc.name, text }] : [];
  });
}
export function validExercise(text, skill, previous = []) {
  if (!text || text.length > 700 || ADMIN.test(text) || !/^(forklar|beregn|beskriv|hvordan|hvad|hvorfor|sammenlign|vis|udled)\b/iu.test(text.trim()) || /kan ikke|ingen fagligt|som AI|kildeuddraget mangler/iu.test(text)) return false;
  const normalized = value => value.toLocaleLowerCase('da').replace(/[^\p{L}\p{N}]/gu, '');
  if (previous.some(value => normalized(value) === normalized(text))) return false;
  const pattern = CONCEPTS.find(([id]) => skill?.id === `concept-${id}`)?.[2];
  return !pattern || pattern.test(text);
}

export function fallbackExercise(documents, skill, previous = []) {
  const frames = [
    `Forklar med dine egne ord, hvad ${skill.title} betyder i tekstuddraget.`,
    `Beskriv et enkelt fagligt eksempel på ${skill.title}, og forbind det med tekstuddraget.`,
    `Forklar det centrale udsagn i tekstuddraget om ${skill.title}, trin for trin.`,
    `Beskriv to vigtige pointer om ${skill.title} fra tekstuddraget, og forklar deres sammenhæng.`,
    `Hvordan ville du forklare ${skill.title} i tekstuddraget til en klassekammerat? Brug et konkret eksempel.`,
    `Hvad fortæller tekstuddraget om ${skill.title}? Forklar de vigtigste fagudtryk.`,
    `Forklar hvorfor udsagnet om ${skill.title} i tekstuddraget giver faglig mening.`,
    `Beskriv ${skill.title} med både en kort forklaring og et eksempel, der passer til tekstuddraget.`,
    `Hvordan hænger begreberne i tekstuddraget sammen med ${skill.title}? Begrund dit svar.`,
    `Forklar ${skill.title} ud fra tekstuddraget, og vis hvordan forklaringen kan anvendes.`,
    `Hvad skal man forstå for at kunne forklare ${skill.title} i tekstuddraget? Gennemgå din forklaring.`,
    `Beskriv hovedideen i tekstuddraget om ${skill.title}, og begrund den med et fagligt eksempel.`,
  ];
  for (const doc of documents) {
    for (let offset = 0; offset < doc.text.length; offset += 200) {
    const excerpt = doc.text.trim().slice(offset, offset + 230);
    if (excerpt.length < 35) continue;
    for (const frame of frames) {
      const text = `${frame}\n\nTekstuddrag: »${excerpt}«`;
      if (validExercise(text, skill, previous)) return { text, sources: [doc.name] };
    }
    }
  }
  return null;
}
