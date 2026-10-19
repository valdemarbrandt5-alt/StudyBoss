import test from 'node:test';
import assert from 'node:assert/strict';
import { skillsForCourse, masteryForSkill, recommendSkill, MEDALS, newMedalRun, recordMedalAnswer, topicDocuments, validExercise, fallbackExercise } from '../src/training.js';
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

test('model commentary is rejected and grounded templates can supply ten distinct challenge tasks', () => {
  const skill = { id: 'concept-gradient', title: 'Gradient descent og optimering' };
  assert.equal(validExercise('Der er ingen fagligt relevante spørgsmål om gradient descent.',skill),false);
  const documents = [{name:'notes.txt', text:'Gradient descent updates x using the learning rate and gradient.'}];
  const questions = [];
  for (let i=0;i<10;i++) { const task = fallbackExercise(documents,skill,questions); assert.ok(task); assert.deepEqual(task.sources,['notes.txt']); questions.push(task.text); }
  assert.equal(new Set(questions).size,10);
});
