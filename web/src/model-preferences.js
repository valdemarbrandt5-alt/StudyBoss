import { MODELS } from './study.js';
export function readModelPreferences(storage) {
  try {
    const saved = JSON.parse(storage.getItem('studyboss-local-ai') || 'null');
    if (saved?.version === 1 && Object.hasOwn(MODELS, saved.model)) {
      return { model: saved.model, autoStart: saved.autoStart === true, approved: saved.approved === true };
    }
  } catch {}
  return { model: 'balanced', autoStart: true, approved: false };
}
export function saveModelPreferences(storage, preferences) {
  try { storage.setItem('studyboss-local-ai', JSON.stringify({ version: 1, ...preferences })); return true; } catch { return false; }
}
export async function canAutoStart(preferences, hasModelInCache) {
  return preferences.autoStart && preferences.approved && Object.hasOwn(MODELS, preferences.model) && await hasModelInCache(MODELS[preferences.model].id);
}
