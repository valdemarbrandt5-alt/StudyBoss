import test from 'node:test';
import assert from 'node:assert/strict';
import { readModelPreferences, saveModelPreferences, canAutoStart } from '../src/model-preferences.js';
import { MODELS } from '../src/study.js';
test('first visit never auto-starts or probes a model without prior successful setup', async () => {
  const preferences = readModelPreferences({ getItem: () => null });
  assert.equal(preferences.approved, false);
  let probes = 0;
  assert.equal(await canAutoStart(preferences, () => { probes++; return true; }), false);
  assert.equal(probes, 0);
});
test('the last successful model and opt-out survive reload; cached model uses its exact runtime ID', async () => {
  let value;
  const storage = { setItem: (_key, text) => { value = text; }, getItem: () => value };
  assert.equal(saveModelPreferences(storage, { model: 'small', approved: true, autoStart: true }), true);
  let id;
  assert.equal(await canAutoStart(readModelPreferences(storage), async model => { id = model; return true; }), true);
  assert.equal(id, MODELS.small.id);
  assert.equal(await canAutoStart(readModelPreferences(storage), async () => false), false);
  saveModelPreferences(storage, { model: 'small', approved: true, autoStart: false });
  assert.equal(await canAutoStart(readModelPreferences(storage), () => { throw new Error('should not probe'); }), false);
});
test('corrupt settings, unknown model IDs and unavailable storage cannot trigger startup', async () => {
  for (const text of ['{', '{"version":1,"model":"unknown","approved":true,"autoStart":true}']) {
    assert.equal(await canAutoStart(readModelPreferences({ getItem: () => text }), () => true), false);
  }
  assert.equal(readModelPreferences(null).approved, false);
  assert.equal(saveModelPreferences(null, { model: 'small' }), false);
});
