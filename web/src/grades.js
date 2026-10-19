export const GRADES = [-3, 0, 2, 4, 7, 10, 12];
export const GRADE_NAMES = { '-3': 'Helt uacceptabel', 0: 'Utilstrækkelig', 2: 'Tilstrækkelig', 4: 'Jævn', 7: 'God', 10: 'Fortrinlig', 12: 'Fremragende' };
export const GRADE_RUBRIC = '-3: helt uacceptabel. 00: utilstrækkelig. 02: minimalt acceptabel. 4: adskillige væsentlige mangler. 7: en del mangler. 10: nogle mindre væsentlige mangler. 12: ingen eller få uvæsentlige mangler.';
export const GRADE_SCHEMA = { type: 'object', properties: { score: { type: 'integer', enum: GRADES }, feedback: { type: 'string' }, solution: { type: 'string' } }, required: ['score', 'feedback', 'solution'], additionalProperties: false };
export function gradeLabel(score) {
  if (!Number.isInteger(score) || !GRADES.includes(score)) throw new Error('Ugyldig karakter på 7-trinsskalaen.');
  return score === 0 ? '00' : score === 2 ? '02' : String(score);
}
export function parseGrade(text) {
  let grade;
  try { grade = JSON.parse(text); } catch { throw new Error('AI’en gav ikke en gyldig bedømmelse. Prøv igen; der er ikke gemt en karakter.'); }
  if (!grade || typeof grade !== 'object') throw new Error('Bedømmelsen er ufuldstændig.');
  gradeLabel(grade.score);
  for (const field of ['feedback', 'solution']) if (typeof grade[field] !== 'string' || !grade[field].trim()) throw new Error('Bedømmelsen mangler feedback eller løsningsforslag.');
  return { score: grade.score, feedback: grade.feedback, solution: grade.solution };
}
