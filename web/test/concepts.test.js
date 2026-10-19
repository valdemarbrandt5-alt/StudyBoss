import test from 'node:test';
import assert from 'node:assert/strict';
import { CONCEPT_QUESTIONS, nextConceptQuestion, findConceptQuestion, conceptGradingTask } from '../src/concepts.js';
test('every fixed topic has ten short standalone questions with reference answers and no material citations', () => {
  assert.equal(Object.keys(CONCEPT_QUESTIONS).length,12);
  for (const [id, questions] of Object.entries(CONCEPT_QUESTIONS)) {
    assert.equal(questions.length,10,id);
    assert.equal(new Set(questions.map(item => item.question)).size,10);
    for (const item of questions) {
      assert.ok(item.answer.trim()); assert.ok(item.question.length < 220);
      assert.doesNotMatch(item.question,/tekstuddrag|kildeuddrag|materialet|teksten|»|«/iu);
      assert.equal(findConceptQuestion(id,item.question),item);
    }
  }
});
test('next exercise progresses through ten different questions even when questions are skipped', () => {
  let current = ''; const seen = new Set();
  for (let i=0;i<10;i++) { current = nextConceptQuestion('concept-networks',[],current).question; seen.add(current); }
  assert.equal(seen.size,10);
  const again=nextConceptQuestion('concept-networks',[],current); assert.notEqual(again.question,current);
});
test('answered questions rotate fairly and references are scoped to the precise question and topic', () => {
  const first=nextConceptQuestion('concept-networks');
  const history=[{skillId:'concept-networks',question:first.question}];
  assert.notEqual(nextConceptQuestion('concept-networks',history).question,first.question);
  assert.equal(findConceptQuestion('concept-cnn',first.question),null);
  assert.equal(nextConceptQuestion('custom-topic'),null);
  assert.equal(findConceptQuestion('concept-networks','Tekstuddrag: »kursusplan«'),null);
});

test('beginner grading instructions fit the model prompt and do not demand unasked detail', () => {
  for (const medal of [false,true]) {
    const task = conceptGradingTask(medal);
    assert.ok(new TextEncoder().encode(task).length <= 900);
    assert.match(task,/Et kort korrekt svar giver 12/);
    if (medal) assert.match(task,/correct: true/);
  }
});
