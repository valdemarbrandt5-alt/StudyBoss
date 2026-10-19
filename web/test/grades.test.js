import test from 'node:test';
import assert from 'node:assert/strict';
import { GRADES, GRADE_SCHEMA, gradeLabel, parseGrade } from '../src/grades.js';
import { newCourse, normalizeWorkspace } from '../src/storage.js';
test('7-trinsskala accepts only its seven actual grades and preserves leading zeroes', () => {
  assert.deepEqual(GRADES, [-3, 0, 2, 4, 7, 10, 12]);
  assert.deepEqual(GRADE_SCHEMA.properties.score.enum, GRADES);
  for (const score of GRADES) assert.equal(parseGrade(JSON.stringify({ score, feedback: 'Begrundelse', solution: 'Løsning' })).score, score);
  assert.equal(gradeLabel(0), '00'); assert.equal(gradeLabel(2), '02'); assert.equal(gradeLabel(-3), '-3');
  for (const score of [true, '12', -2, 1, 3, 5, 6, 8, 9, 11, 13, 4.5, null]) assert.throws(() => parseGrade(JSON.stringify({ score, feedback: 'x', solution: 'x' })));
});
test('incomplete or malformed feedback cannot become a saved grade', () => {
  for (const text of ['karakter 12', '{"score":12}', '{"score":12,"feedback":"","solution":"x"}', 'null', '{"score":2,"feedback":"x","solution":"   "}']) assert.throws(() => parseGrade(text));
});
test('courses have separate material, conversation, notes and grade history', () => {
  const first = newCourse('Matematik', 'math'), second = newCourse('Dansk', 'danish');
  first.documents.push({ name: 'Algebra.txt', text: '2x = 6' }); first.notes = 'x = 3'; first.history.push({ role: 'user', content: 'Løs ligningen' }); first.attempts.push({ score: 12 });
  const restored = normalizeWorkspace(JSON.parse(JSON.stringify({ version: 1, courses: [first, second], activeId: 'danish' })));
  assert.equal(restored.activeId, 'danish'); assert.equal(restored.courses[0].documents[0].name, 'Algebra.txt');
  assert.deepEqual(restored.courses[1].documents, []); assert.deepEqual(restored.courses[1].history, []); assert.deepEqual(restored.courses[1].attempts, []); assert.equal(restored.courses[1].notes, '');
});
test('unknown or duplicate course data is not silently overwritten on restore', () => {
  assert.throws(() => normalizeWorkspace({ version: 99, courses: [] }));
  assert.throws(() => normalizeWorkspace({ version: 1, courses: [newCourse('A', 'same'), newCourse('B', 'same')] }));
  assert.equal(normalizeWorkspace({ version: 1, activeId: 'unknown', courses: [newCourse('A', 'a')] }).activeId, 'a');
});
