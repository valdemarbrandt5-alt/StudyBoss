import { CONCEPT_QUESTIONS } from './concepts.js';

const rules = {
  'concept-algebra': 'En ligning skal være i balance: gør det samme på begge sider. I en ligning som 2x + b = c trækker du først b fra på begge sider og dividerer derefter begge sider med 2.',
  'concept-derivatives': 'Den afledte beskriver en funktions lokale ændring. Potensreglen siger, at den afledte af a gange x² er 2 gange a gange x. Gang altså koefficienten med 2, og reducer eksponenten fra 2 til 1.',
  'concept-fractions': 'Procent betyder hundrededele. 10 procent er 10/100 = 1/10. Du finder derfor 10 procent af et tal ved at dividere tallet med 10.',
  'concept-probability': 'Når alle udfald er lige sandsynlige, er sandsynligheden antallet af gunstige udfald divideret med antallet af mulige udfald. Læg alle kuglerne sammen for at finde nævneren. Antallet af røde kugler bliver tælleren, når du vil trække en rød kugle.'
};

// Lessons deliberately share the established beginner references, so every quiz
// answer is taught here. They do not depend on an AI download or PDF fragments.
export function lessonFor(id) {
  const bank = CONCEPT_QUESTIONS[id]; if (!bank) return null;
  const selected = bank.slice(0, 5);
  const theory = rules[id] ? [{ title: 'Sådan hænger det sammen', text: rules[id] }]
    : selected.map(item => ({ title: item.question, text: item.answer }));
  const exampleIndex = { 'concept-networks': 8, 'concept-gradient': 6, 'concept-backprop': 9, 'concept-cnn': 8, 'concept-activations': 2, 'concept-loss': 4, 'concept-regularization': 9, 'concept-photosynthesis': 6 };
  const example = bank[exampleIndex[id] ?? 5];
  const questions = selected.map((item, index) => {
    const distractors = [...new Set(bank.map(other => other.answer))].filter(answer => answer !== item.answer).slice(0, 3);
    const choices = [...distractors]; choices.splice(index % 4, 0, item.answer);
    return { question: item.question, choices, correctIndex: index % 4, explanation: item.answer };
  });
  return { version: 1, theory, example, questions };
}

export function lessonProgress(course, id) {
  const lesson = lessonFor(id); if (!lesson) return null;
  course.lessons ??= {};
  const saved = course.lessons[id];
  if (!saved || saved.version !== lesson.version || !Array.isArray(saved.answers)) {
    course.lessons[id] = { version: lesson.version, started: false, answers: [], index: 0 };
  }
  return course.lessons[id];
}

export function answerLesson(course, id, choice) {
  const lesson = lessonFor(id), progress = lessonProgress(course, id);
  if (!progress?.started || progress.index >= 5 || progress.answers[progress.index]) return false;
  const question = lesson.questions[progress.index];
  if (!Number.isInteger(choice) || choice < 0 || choice >= question.choices.length) return false;
  progress.answers.push({ choice, correct: choice === question.correctIndex });
  return true;
}
