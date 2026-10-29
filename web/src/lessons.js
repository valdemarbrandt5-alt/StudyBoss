import { CONCEPT_QUESTIONS } from './concepts.js';

import { LESSON_THEORY } from './lesson-theory.js';

// Lessons deliberately share the established beginner references, so every quiz
// answer is taught here. They do not depend on an AI download or PDF fragments.
export function lessonFor(id) {
  const bank = CONCEPT_QUESTIONS[id]; if (!bank) return null;
  const selected = bank.slice(0, 5);
  const theory = LESSON_THEORY[id];
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

