import test from 'node:test';
import assert from 'node:assert/strict';
import { CONCEPT_QUESTIONS } from '../src/concepts.js';
import { lessonFor, lessonProgress, answerLesson } from '../src/lessons.js';

test('every supported topic teaches exactly five valid questions', () => {
  for (const id of Object.keys(CONCEPT_QUESTIONS)) {
    const lesson = lessonFor(id);
    assert.equal(lesson.questions.length, 5, id);
    assert.ok(lesson.theory.length && lesson.example.answer);
    assert.equal(lesson.theory.length, 6, id);
    assert.ok(lesson.theory.map(section => section.text).join(' ').split(/\s+/).length >= 240, `${id}: substantial theory`);
    for (const question of lesson.questions) {
      assert.equal(question.choices.length, 4);
      assert.equal(new Set(question.choices).size, 4);
      assert.equal(question.choices[question.correctIndex], question.explanation);
    }
  }
  assert.equal(lessonFor('custom-topic'), null);
});

test('quiz records each answer only once and ends after five; course progress survives JSON storage', () => {
  let course = {}, id = 'concept-gradient';
  assert.equal(answerLesson(course, id, 0), false);
  lessonProgress(course, id).started = true;
  for (let index = 0; index < 5; index++) {
    const correct = lessonFor(id).questions[index].correctIndex;
    assert.equal(answerLesson(course, id, -1), false);
    assert.equal(answerLesson(course, id, index === 0 ? (correct + 1) % 4 : correct), true);
    assert.equal(answerLesson(course, id, correct), false);
    course.lessons[id].index++;
    course = JSON.parse(JSON.stringify(course));
  }
  assert.equal(answerLesson(course, id, 0), false);
  assert.equal(course.lessons[id].answers.length, 5);
  assert.equal(course.lessons[id].answers.filter(answer => answer.correct).length, 4);
  assert.equal(lessonProgress({}, id).answers.length, 0);
  assert.equal(lessonProgress(course, 'concept-cnn').answers.length, 0);
});
