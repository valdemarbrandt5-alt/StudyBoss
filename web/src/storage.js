export function newCourse(name, id = crypto.randomUUID()) {
  return { id, difficulty: 'easy', levels: {}, drawing: [], name: String(name).trim().slice(0, 100), topic: '', documents: [], history: [], notes: '', exercise: '', exerciseSources: [], answer: '', assessment: null, attempts: [], skills: [], activeSkillId: '', exerciseSkillId: '', exerciseId: '', trainingSessions: {}, trainingMode: 'free', randomTraining: false, reviewKey: null, questionHistory: {}, mistakes: {}, medalRuns: {}, earnedMedals: {} };
}
export function normalizeWorkspace(input) {
  if (!input || input.version !== 1 || !Array.isArray(input.courses)) throw new Error('Fagoversigten har et ukendt format.');
  const ids = new Set();
  const courses = input.courses.map(course => {
    if (!course || typeof course.id !== 'string' || ids.has(course.id) || typeof course.name !== 'string' || !course.name.trim()) throw new Error('Fagoversigten kunne ikke læses.');
    ids.add(course.id);
    return { ...newCourse(course.name, course.id), ...course };
  });
  return { version: 1, courses, activeId: ids.has(input.activeId) ? input.activeId : courses[0]?.id ?? null };
}
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('studyboss-workspace', 1);
    request.onupgradeneeded = () => { request.result.createObjectStore('workspace'); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Luk andre gamle StudyBoss-faner, og prøv igen.'));
  });
}
export async function readWorkspace(owner = 'current') {
  const db = await openDB();
  try {
    const result = await new Promise((resolve, reject) => {
      const transaction = db.transaction('workspace', 'readonly');
      const request = transaction.objectStore('workspace').get(owner);
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => reject(transaction.error);
    });
    return result ? normalizeWorkspace(result) : null;
  } finally { db.close(); }
}
export async function writeWorkspace(workspace, owner = 'current') {
  const db = await openDB();
  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('workspace', 'readwrite');
      transaction.objectStore('workspace').put(workspace, owner);
      transaction.oncomplete = resolve;
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => reject(transaction.error);
    });
  } finally { db.close(); }
}
