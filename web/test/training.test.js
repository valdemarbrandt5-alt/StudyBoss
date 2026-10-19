import test from 'node:test';
import assert from 'node:assert/strict';
import { skillsForCourse, masteryForSkill, recommendSkill } from '../src/training.js';
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
