import test from 'node:test';
import assert from 'node:assert/strict';
import { MODELS, bytes, clip, retrieve, buildMessages, visibleAnswer } from '../src/study.js';
import { prebuiltAppConfig } from '@mlc-ai/web-llm';
test('every offered model exists in the pinned runtime registry', () => {
  for (const model of Object.values(MODELS)) assert.ok(prebuiltAppConfig.model_list.some(item => item.model_id === model.id));
});
test('streaming thinking markers are hidden, ordinary text remains literal', () => {
  assert.equal(visibleAnswer('<thi'), '');
  assert.equal(visibleAnswer('<think>intern tekst'), '');
  assert.equal(visibleAnswer('<think>intern tekst</think>\n\nSvar: 3'), 'Svar: 3');
  assert.equal(visibleAnswer('2 < 3 og <script>'), '2 < 3 og <script>');
});
test('UTF-8 clipping respects byte budgets without corrupting Danish or emoji', () => {
  assert.equal(clip('æøå🙂abc', 8), 'æøå');
  assert.ok(bytes(clip('🙂'.repeat(500), 999)) <= 999);
});
test('retrieval selects relevant material and exposes only actual excerpt sources', () => {
  const result = retrieve([{ name: 'irrelevant.txt', text: 'Bananer og æbler' }, { name: '<script>.txt', text: 'Fotosyntese bruger sollys i planters blade.' }], 'Forklar fotosyntese', 200);
  assert.deepEqual(result.sources, ['<script>.txt']); assert.match(result.text, /Fotosyntese/); assert.ok(bytes(result.text) <= 200);
  assert.deepEqual(retrieve([{ name: 'x', text: 'æbler' }], 'ligninger').sources, []);
});
test('long documents and history stay within conservative local context budget', () => {
  const result = buildMessages({ query: 'Forklar fotosyntese ' + '🙂'.repeat(300), subject: 'Biologi'.repeat(100), topic: 'Planter'.repeat(100), task: 'Giv feedback'.repeat(100), documents: [{ name: 'Materiale', text: 'Fotosyntese '.repeat(10000) }], history: Array.from({ length: 10 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'lang historik '.repeat(200) })) });
  assert.ok(result.messages.reduce((sum, m) => sum + bytes(m.content), 0) < 3000);
  assert.equal(result.messages[0].role, 'system'); assert.equal(result.messages.at(-1).role, 'user');
});
test('oversized questions are rejected before inference; partial answers are excluded', () => {
  assert.throws(() => buildMessages({ query: 'æ'.repeat(1000) }), /for langt/);
  const result = buildMessages({ query: 'Hej', history: [{ role: 'assistant', content: 'afbrudt', partial: true }] });
  assert.equal(result.messages.length, 2);
});
