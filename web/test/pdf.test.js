import test from 'node:test';
import assert from 'node:assert/strict';
import { extractPDF } from '../src/pdf.js';
import { buildMessages } from '../src/study.js';
test('PDF.js 6 releases the loading task and imports a proxy without destroy()', async () => {
  let destroyed = false;
  const task = { promise: Promise.resolve({ numPages: 1, getPage: async () => ({ getTextContent: async () => ({ items: [{ str: 'Fotosyntese bruger sollys.' }] }) }) }), destroy: async () => { destroyed = true; } };
  const result = await extractPDF(task);
  assert.match(result.text, /Fotosyntese/); assert.equal(destroyed, true); assert.equal(result.truncated, false);
});
test('failed PDFs are released and retain the original reading error', async () => {
  let destroyed = false;
  await assert.rejects(extractPDF({ promise: Promise.reject(new Error('Ugyldig PDF')), destroy: async () => { destroyed = true; } }), /Ugyldig PDF/);
  assert.equal(destroyed, true);
});
test('scans with no text fail clearly; page limits are disclosed', async () => {
  const make = (text, pages) => ({ promise: Promise.resolve({ numPages: pages, getPage: async () => ({ getTextContent: async () => ({ items: [{ str: text }] }) }) }), destroy: async () => {} });
  await assert.rejects(extractPDF(make('', 1)), /ingen læsbar tekst/);
  assert.equal((await extractPDF(make('Tekst', 100), 2)).truncated, true);
});
test('material-based exercises always receive actual text despite no keyword overlap', () => {
  const result = buildMessages({ query: 'Lav et spørgsmål', subject: 'Biologi', documents: [{ name: 'lecture.pdf', text: 'Photosynthesis converts sunlight into chemical energy.' }], requireMaterial: true });
  assert.deepEqual(result.sources, ['lecture.pdf']); assert.match(result.messages.at(-1).content, /Photosynthesis/);
  assert.throws(() => buildMessages({ query: 'Lav et spørgsmål', documents: [], requireMaterial: true }), /undervisningsmateriale/);
});
test('default PDF import reads beyond 60 pages and 150000 characters, reports progress and cleans each page', async () => {
  const read = [], cleaned = [], progress = [];
  let destroyed = false;
  const task = {
    promise: Promise.resolve({ numPages: 103, async getPage(number) {
      read.push(number);
      return { getTextContent: async () => ({ items: [{ str: 'Faglig tekst '.repeat(200) + ' Slut-' + number }] }), cleanup() { cleaned.push(number); } };
    } }),
    async destroy() { destroyed = true; }
  };
  const result = await extractPDF(task, undefined, undefined, (page, total) => progress.push([page, total]));
  assert.equal(read.length, 103);
  assert.deepEqual(cleaned, read);
  assert.ok(result.text.length > 150000);
  assert.match(result.text, /Side 103/);
  assert.match(result.text, /Slut-103$/);
  assert.equal(result.truncated, false);
  assert.deepEqual(progress.at(-1), [103, 103]);
  assert.equal(destroyed, true);
});
