import test from 'node:test';
import assert from 'node:assert/strict';
import { readingPlan } from '../src/reading-plan.js';
import { skillsForCourse } from '../src/training.js';
import { newCourse } from '../src/storage.js';

test('reading topics match the exercise topics and link only to matching actual PDF pages', () => {
  const course = newCourse('Deep Learning', 'dl');
  course.documents = [{
    name: 'Slides.pdf',
    text: 'Side 1\nCourse schedule: convolution (AI), backpropagation (MAT).\n\nSide 7\nConvolution uses a small filter that computes a feature map from the input image.\n\nSide 9\nBackpropagation computes gradients by applying the chain rule backwards through the network.'
  }];
  const topics = readingPlan(course);
  assert.deepEqual(topics.map(t => t.id), skillsForCourse(course).map(t => t.id));
  const cnn = topics.find(t => t.id === 'concept-cnn'), backprop = topics.find(t => t.id === 'concept-backprop');
  assert.deepEqual(cnn.materials[0].references.map(r => r.page), [7]);
  assert.deepEqual(backprop.materials[0].references.map(r => r.page), [9]);
  assert.ok(course.documents[0].text.includes(cnn.materials[0].references[0].text));
  assert.ok(cnn.resources.every(r => r.url.startsWith('https://')));
});
test('a catalogue mention gets no invented explanatory excerpt or page number', () => {
  const topics = readingPlan({ documents: [{ name: 'Plan.txt', text: 'Course schedule: Neural networks (AI).\nBackpropagation (MAT).' }] });
  assert.ok(topics.length);
  assert.ok(topics.every(t => t.referenceCount === 0));
  assert.ok(topics.every(t => t.materials[0].references.length === 0));
});
test('text files have excerpts without invented page numbers and custom topics do not inherit unrelated web links', () => {
  const course = newCourse('Biology', 'bio');
  course.skills.push({ id: 'custom-dna', title: 'DNA replication' });
  course.documents = [{ name: 'Notes.txt', text: 'DNA replication produces a copy of the genetic information before a cell divides.' }];
  const custom = readingPlan(course).find(t => t.id === 'custom-dna');
  assert.equal(custom.materials[0].references[0].page, null);
  assert.deepEqual(custom.resources, []);
  const empty = readingPlan(newCourse('Empty', 'empty'));
  assert.deepEqual(empty, []);
});
test('every file beyond the former six-file limit participates; removed material and other courses do not leak into the plan', () => {
  const course = newCourse('Math', 'math');
  course.documents = Array.from({ length: 20 }, (_, i) => ({ name: `Notes-${i}.txt`, text: 'Gradient descent updates the model parameters to reduce the loss at every training step.' }));
  assert.equal(readingPlan(course).find(t => t.id === 'concept-gradient').materials.length, 20);
  course.documents.splice(0, 19);
  assert.deepEqual(readingPlan(course).find(t => t.id === 'concept-gradient').materials.map(m => m.name), ['Notes-19.txt']);
  const other = newCourse('Other', 'other');
  assert.deepEqual(readingPlan(other), []);
});
test('an unknown subject still offers its own reading material without invented external recommendations', () => {
  const topics = readingPlan({ documents: [{ name: 'History.txt', text: 'Industrialisation transforms production through the use of powered machinery in factories.' }] });
  assert.equal(topics[0].id, 'material-basics');
  assert.equal(topics[0].materials[0].name, 'History.txt');
  assert.ok(topics[0].referenceCount);
  assert.deepEqual(topics[0].resources, []);
});
