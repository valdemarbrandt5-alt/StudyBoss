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
