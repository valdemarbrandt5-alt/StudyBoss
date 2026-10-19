import { normalizeWorkspace } from './storage.js';

// Conflicts keep both complete courses, including mistakes, medals and drafts.
export function keepBothWorkspaces(remote, local, makeId = () => crypto.randomUUID()) {
  const result = normalizeWorkspace(structuredClone(remote));
  for (const course of normalizeWorkspace(local).courses) {
    const existing = result.courses.find(item => item.id === course.id);
    if (existing && JSON.stringify(existing) === JSON.stringify(course)) continue;
    const copy = structuredClone(course);
    if (existing) { copy.id = makeId(); copy.name += ' (kopi fra denne enhed)'; }
    result.courses.push(copy);
  }
  result.activeId ||= result.courses[0]?.id || null;
  return result;
}
