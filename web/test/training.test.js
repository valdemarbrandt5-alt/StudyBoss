import test from 'node:test';
import assert from 'node:assert/strict';
import { skillsForCourse, masteryForSkill, recommendSkill, MEDALS, newMedalRun, recordMedalAnswer, topicDocuments, validExercise, fallbackExercise, substantivePassages, exerciseEvidence, invalidateCatalogueAttempts } from '../src/training.js';
import { normalizeWorkspace, newCourse } from '../src/storage.js';
const result = (exerciseId, score, day, skillId = 'a') => ({ exerciseId, score, skillId, created: `2026-10-${String(day).padStart(2, '0')}T12:00:00.000Z` });
test('material suggestions are tied to actual matching documents, not fabricated mastery', () => {
  const skills = skillsForCourse({ documents: [{ name: 'CNN.pdf', text: 'Convolution and gradient descent with ReLU activation functions.' }, { name: 'Notes.txt', text: 'Neural networks use backpropagation and the chain rule.' }] });
  assert.deepEqual(skills.find(skill => skill.id === 'concept-cnn').sources, ['CNN.pdf']);
  assert.ok(skills.some(skill => skill.id === 'concept-backprop'));
  assert.equal(masteryForSkill([], skills[0].id).status, 'new');
  assert.deepEqual(skillsForCourse({ documents: [] }), []);
});
test('mastery requires three different exercises and can regress after a weak result', () => {
  const attempts = [result('q1', 7, 1), result('q2', 10, 2)];
  assert.equal(masteryForSkill(attempts, 'a').status, 'learning');
  attempts.push(result('q3', 12, 3)); assert.equal(masteryForSkill(attempts, 'a').status, 'mastered');
  attempts.push(result('q4', 4, 4)); assert.equal(masteryForSkill(attempts, 'a').status, 'review');
  assert.equal(masteryForSkill(attempts, 'a').passed, 2);
});
test('regrading one exercise cannot inflate progress and unrelated/legacy grades do not count', () => {
  const attempts = [result('q1', 7, 1), result('q1', 10, 2), result('q1', 12, 3), result('q2', 12, 4, 'b'), { score: 12, topic: 'a' }];
  assert.equal(masteryForSkill(attempts, 'a').total, 1);
  assert.equal(masteryForSkill(attempts, 'a').passed, 1);
  assert.equal(masteryForSkill(attempts, 'a').status, 'learning');
  assert.equal(masteryForSkill([result('bad', 8, 1)], 'a').total, 0);
});
test('recommendations prioritize weak topics with available material', () => {
  const skills = [{ id: 'new', sources: ['x'] }, { id: 'weak', sources: ['x'] }, { id: 'missing', sources: [] }];
  assert.equal(recommendSkill(skills, [result('q1', 2, 1, 'weak')]).id, 'weak');
});
test('old workspaces keep their existing exercise and default to empty training data', () => {
  const restored = normalizeWorkspace({ version: 1, activeId: 'old', courses: [{ id: 'old', name: 'Matematik', exercise: 'Beregn $x$.', attempts: [{ score: 7, question: 'Tidligere' }] }] });
  assert.equal(restored.courses[0].exercise, 'Beregn $x$.'); assert.deepEqual(restored.courses[0].trainingSessions, {});
  const course = newCourse('Matematik', 'x'); course.skills.push({ id: 'custom', title: 'Vektorer' });
  assert.equal(skillsForCourse(course)[0].title, 'Vektorer');
});

test('medals require 3/5/10 consecutive correct distinct answers; incorrect resets and earned runs freeze', () => {
  for (const [tier, medal] of Object.entries(MEDALS)) {
    const run = newMedalRun(tier);
    recordMedalAnswer(run, 'first', true); recordMedalAnswer(run, 'first', true);
    assert.equal(run.streak, 1);
    recordMedalAnswer(run, 'wrong', false); assert.equal(run.streak, 0);
    for (let i = 0; i < medal.target - 1; i++) recordMedalAnswer(run, `q${i}`, true);
    assert.equal(run.completed, false);
    recordMedalAnswer(run, 'last', true); assert.equal(run.completed, true);
    recordMedalAnswer(run, 'later-wrong', false); assert.equal(run.streak, medal.target);
    assert.throws(() => recordMedalAnswer(newMedalRun(tier), 'bad', 'true'));
  }
});
test('challenge state and earned medals survive migration and do not mix between courses', () => {
  const a = newCourse('A', 'a'), b = newCourse('B', 'b');
  a.medalRuns['cnn::bronze'] = newMedalRun('bronze');
  recordMedalAnswer(a.medalRuns['cnn::bronze'], 'one', true);
  a.earnedMedals.cnn = ['gold'];
  const restored = normalizeWorkspace(JSON.parse(JSON.stringify({ version: 1, activeId: 'a', courses: [a,b] })));
  assert.equal(restored.courses[0].medalRuns['cnn::bronze'].streak, 1);
  assert.deepEqual(restored.courses[0].earnedMedals.cnn, ['gold']);
  assert.deepEqual(restored.courses[1].medalRuns, {});
});
test('exercise context excludes exam logistics and validation rejects off-topic or repeated tasks', () => {
  const skill = { id: 'concept-networks', title: 'Neurale netværk' };
  const docs = topicDocuments([{name: 'intro.pdf', text: 'Deep learning exam: 15 minutes oral presentation.\nLinux installation is recommended.\nNeural networks contain layers of neurons.\nA neuron computes a weighted sum and an activation.'}], skill);
  assert.equal(docs.length, 1); assert.match(docs[0].text, /weighted sum/);
  assert.doesNotMatch(docs[0].text, /exam|Linux/);
  assert.equal(validExercise('Hvordan optimerer man en dyblæringseksamen?', skill), false);
  assert.equal(validExercise('Forklar convolution og CNN.', skill), false);
  assert.equal(validExercise('Forklar neural networks og deres lag.', skill), true);
  assert.equal(validExercise('Forklar neural networks og deres lag.', skill, ['Forklar neural networks og deres lag.']), false);
  assert.deepEqual(topicDocuments([{name:'exam.pdf',text:'Exam in neural networks. Linux installation.'}],skill),[]);
});

test('fallback uses a complete factual statement and does not manufacture ten rewordings for medals', () => {
  const skill = { id: 'concept-gradient', title: 'Gradient descent og optimering' };
  assert.equal(validExercise('Der er ingen fagligt relevante spørgsmål om gradient descent.',skill),false);
  const documents = [{name:'notes.txt', text:'Gradient descent updates x using the learning rate and gradient.'}];
  const task = fallbackExercise(documents,skill); assert.ok(task);
  assert.ok(task.text.includes(documents[0].text));
  assert.equal(fallbackExercise(documents,skill,[task.text]),null);
});
test('the reported course catalogue cannot become an exercise or receive a grade', () => {
  const text = 'Workshop on Deep Learning Infrastructure (AI) 3.\nConvolutional Neural Networks (AI) 4.\nVector Calculus (MAT) 5.\nContinuous Optimization (MAT) 6.\nTraining Neural Networks (AI) 7.\nRecap and Mini-Project Intro (AI) 8.\nTraining';
  const skill = {id:'concept-networks',title:'Neurale netværk'};
  const docs = [{name:'MM3-CNNs.pdf',text}];
  const question = `Forklar med dine egne ord, hvad Neurale netværk betyder i tekstuddraget.\n\nTekstuddrag: »${text}«`;
  assert.deepEqual(substantivePassages(text),[]);
  assert.deepEqual(topicDocuments(docs,skill),[]);
  assert.equal(fallbackExercise(docs,skill),null);
  assert.equal(exerciseEvidence(question,docs,skill),false);
  const mixed = [{name:'MM3-CNNs.pdf',text:text+'\nNeural networks are computational models containing layers of connected neurons. Each neuron computes a weighted sum of its inputs and applies an activation function.'}];
  const context = topicDocuments(mixed,skill);
  assert.equal(context.length,1); assert.doesNotMatch(context[0].text,/Workshop|Mini-Project|\(AI\)/);
  assert.match(context[0].text,/weighted sum/);
  assert.equal(exerciseEvidence(question,mixed,skill),false);
  const good = fallbackExercise(mixed,skill); assert.ok(good); assert.equal(exerciseEvidence(good.text,mixed,skill),true);
});
test('headings, learning outcomes and logistics are not definitions; actual Danish explanations are', () => {
  assert.deepEqual(substantivePassages('Training Neural Networks\nConvolutional Neural Networks\nLearning outcomes: understand how neural networks are used in projects.'),[]);
  assert.equal(substantivePassages('Et neuralt netværk består af forbundne neuroner, som beregner et output ud fra vægtede input.').length,1);
});

test('invalid catalogue grades stay in history but cannot reduce a medal streak or count as mastery', () => {
  const course = newCourse('Test','test');
  course.attempts = [
    {...result('a',10,1),correct:true},
    {...result('bad',4,2),correct:false,question:'Forklar neurale netværk. Tekstuddrag: »Training Neural Networks (AI) 7. Recap and Mini-Project Intro (AI) 8.«'},
    {...result('b',10,3),correct:true},
  ];
  course.medalRuns.test = {target:3,streak:1,completed:false,seen:['a','bad','b']};
  invalidateCatalogueAttempts(course);
  assert.equal(course.attempts.length,3); assert.ok(course.attempts[1].invalidatedReason);
  assert.equal(masteryForSkill(course.attempts,'a').total,2);
  assert.equal(course.medalRuns.test.streak,2);
  invalidateCatalogueAttempts(course); assert.equal(course.medalRuns.test.streak,2);
});
