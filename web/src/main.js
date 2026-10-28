import { QUESTION_SCHEMA, rememberQuestion, unusedSeed, questionReference, parseNewQuestion, saveMistake, migrateLearning, continuingVariant } from './learning.js';
import { webReadingFor } from './reading.js';
import { readingPlan } from './reading-plan.js';
import { LEVELS, difficultyOf, levelKey, levelAttempts, nextLevelQuestion, gradeChoice, finishAIQuestion } from './difficulty.js';
import { modelSketch, paintDrawing, attachDrawing, drawingQuestion } from './drawing.js';
import { readModelPreferences, saveModelPreferences, canAutoStart } from './model-preferences.js';
import { CONCEPT_QUESTIONS, conceptGradingTask, randomTrainingSkill } from './concepts.js';
import './style.css';
import './modern.css';
import { initializeTheme } from './theme.js';
import { extractPDF } from './pdf.js';
import { MODELS, buildMessages, visibleAnswer, completeStructuredReply } from './study.js';
import { GRADE_SCHEMA, GRADE_RUBRIC, GRADE_NAMES, gradeLabel, parseGrade } from './grades.js';
import { newCourse, readWorkspace, writeWorkspace } from './storage.js';
import { initializeProfile } from './profile.js';
import { enrichReferences } from './references.js';
import { renderMathText } from './math.js';
import { skillsForCourse, masteryForSkill, recommendSkill, MEDALS, runKey, newMedalRun, recordMedalAnswer, topicDocuments, validExercise, exerciseEvidence, invalidateCatalogueAttempts } from './training.js';

const $ = id => document.getElementById(id);
initializeTheme();
let modelPreferences;
try { modelPreferences = readModelPreferences(localStorage); } catch { modelPreferences = readModelPreferences(null); }
$('model').value = modelPreferences.model;
$('auto-start-ai').checked = modelPreferences.autoStart;
$('download-consent').checked = modelPreferences.approved;
const state = { engine: null, worker: null, loading: false, busy: false, importing: false, supported: false, history: [], documents: [], exercise: '', stop: false, cancelLoad: null, failGeneration: null };
state.initializing = true;
state.workspace = { version: 1, courses: [], activeId: null };
state.assessment = null; state.exerciseSources = [];
state.exerciseFailed = false;
state.trainingMode = 'free'; state.randomTraining = false; state.reviewKey = null;
state.difficulty = 'easy'; state.drawing = [];
state.activeSkillId = ''; state.exerciseSkillId = ''; state.exerciseId = '';
let saveChain = Promise.resolve(), pendingSaves = 0, saveFailed = false, storageAvailable = true;
let workspaceOwner = 'current', profile = null;
const sessionKey = () => state.reviewKey ? '__review__' : state.randomTraining ? levelKey('__random__', state.difficulty) : state.trainingMode !== 'free' ? runKey(levelKey(state.activeSkillId, state.difficulty), state.trainingMode) : levelKey(state.exerciseSkillId || '__free__', state.difficulty);
const activeRun = () => state.trainingMode !== 'free' ? activeCourse()?.medalRuns[runKey(levelKey(state.activeSkillId, state.difficulty), state.trainingMode)] : null;
const activeCourse = () => state.workspace.courses.find(course => course.id === state.workspace.activeId);
const notice = text => { $('action-status').textContent = text; };
const controls = () => {
  const reference = questionReference(activeCourse() || { questionHistory: {}, mistakes: {} }, state.exerciseSkillId, state.exercise);
  const choice = Array.isArray(reference?.choices), drawing = reference?.difficulty === 'drawing';
  $('answer-form').hidden = !state.exercise;
  $('send').disabled = state.importing || (!state.engine && !state.busy);
  $('send').textContent = state.busy ? 'Stop svar ■' : 'Send spørgsmål ↑';
  for (const id of ['new-exercise', 'grade']) $(id).disabled = !state.engine || state.busy || state.importing;
  $('grade').disabled ||= !state.exercise;
  if (choice) $('grade').disabled = state.busy || state.loading || state.importing || state.initializing || !state.exercise || !$('answer').value || !!state.assessment;
  if (drawing) $('grade').disabled = state.busy || state.loading || state.importing || state.initializing || !state.drawing.length || !!state.assessment;
  $('grade').textContent = drawing ? 'Se modelskitse og tjekliste' : choice ? 'Se svar ↗' : 'Få karakter og feedback ↗';
  for (const option of document.querySelectorAll('#choice-options input')) option.disabled = state.busy || state.loading || state.importing || state.initializing || !!state.assessment;
  $('drawing-undo').disabled = $('drawing-clear').disabled = state.busy || state.loading || state.importing || state.initializing || !!state.assessment;
  $('workout-difficulty').disabled = state.busy || state.loading || state.importing || state.initializing || !!state.reviewKey;
  $('grade').disabled ||= !!activeRun() && (activeRun().completed || activeRun().seen.includes(state.exerciseId));
  $('use-own-exercise').hidden = state.trainingMode !== 'free' || state.randomTraining || !!state.reviewKey || ['medium','drawing'].includes(state.difficulty);
  $('own-exercise-form').closest('details').hidden = $('use-own-exercise').hidden;
  $('review-mistakes').disabled = state.busy || state.loading || state.importing || state.initializing || !Object.values(activeCourse()?.mistakes || {}).some(item => !item.resolved);
  for (const button of document.querySelectorAll('.review-question')) button.disabled = state.busy || state.loading || state.importing || state.initializing;
  $('random-training').disabled = state.busy || state.loading || state.importing || state.initializing || !randomTrainingSkill(skillsForCourse(activeCourse() || {}));
  $('new-exercise').disabled ||= !!activeRun()?.completed;
  $('new-exercise').disabled = state.busy || state.loading || state.importing || state.initializing || (!state.engine && !CONCEPT_QUESTIONS[state.activeSkillId] && !state.reviewKey && state.difficulty!=='drawing') || !!activeRun()?.completed;
  $('new-exercise').hidden = !state.exercise && !state.exerciseFailed;
  $('new-exercise').textContent = state.reviewKey ? 'Næste gemte fejl ↗' : state.exercise ? 'Næste opgave ↗' : 'Prøv igen ↗';
  $('use-own-exercise').disabled = state.busy || state.loading || state.importing || state.initializing;
  for (const id of ['skill-filter', 'skill-name', 'add-skill']) $(id).disabled = state.busy || state.loading || state.importing || state.initializing;
  for (const id of ['model', 'subject', 'topic', 'files', 'clear-chat', 'add-course', 'course-name', 'open-course-dialog']) $(id).disabled = state.busy || state.loading || state.importing || state.initializing;
  $('model').disabled ||= !!state.engine;
  for (const button of document.querySelectorAll('#file-list button, [data-prompt], .course-open, .course-tab, .train-skill, .reading-train, .reading-ask, .level-button')) button.disabled = state.busy || state.loading || state.importing || state.initializing || button.dataset.noMaterial === 'true';
  $('load-model').disabled = !state.supported || !$('download-consent').checked || state.loading || state.busy || state.importing || !!state.engine;
  $('download-consent').disabled = state.loading || !!state.engine;
  $('unload').hidden = !state.engine;
  $('unload').disabled = state.busy;
  $('cancel-load').hidden = !state.loading;
  $('stop-generation').hidden = !state.busy;
  $('composer-hint').textContent = state.engine ? 'Svar behandles på denne computer.' : 'Start lokal AI øverst for at få svar.';
  $('engine-status').textContent = state.loading ? 'Starter lokal AI …' : state.engine ? 'Lokal AI er klar' : 'Start lokal AI';
  $('status-dot').classList.toggle('ready', !!state.engine);
};
function message(role, text = '', sources = []) {
  const wrapper = document.createElement('article'); wrapper.className = `message ${role}`;
  const label = document.createElement('strong'); label.className = 'label'; label.textContent = role === 'user' ? 'DIG' : 'STUDYBOSS · LOKAL AI';
  const body = document.createElement('div'); body.className = 'message-body'; renderMathText(body, text);
  wrapper.append(label, body);
  if (sources.length) { const source = document.createElement('small'); source.className = 'source-label'; source.textContent = `Uddrag sendt til modellen: ${sources.join(', ')}. Udvælgelsen kan overse relevante afsnit.`; wrapper.append(source); }
  $('messages').querySelector('.welcome')?.remove(); $('messages').append(wrapper);
  return { wrapper, body };
}
function scrollMessages() { $('messages').scrollTop = $('messages').scrollHeight; }
function resetContext(options = {}) {
  if (activeCourse()) {
    if (options.invalidateTraining) activeCourse().trainingSessions = {};
    else delete activeCourse().trainingSessions[sessionKey()];
  }
  state.history = []; state.exercise = ''; state.exerciseSources = []; state.assessment = null; state.exerciseFailed = false; $('exercise').hidden = true; $('feedback').hidden = true; $('answer').value = '';
  state.exerciseId = ''; state.exerciseSkillId = '';
  $('messages').replaceChildren(); message('assistant', 'Vi starter på en frisk. Hvad vil du gerne arbejde med?');
  notice('Samtale og øvelsesopgave er nulstillet til dit nye fag, fokus eller materiale.');
  persist();
  maybeStartExercise();
}
function sourceText(sources) { return sources?.length ? `Filuddrag givet til AI: ${sources.join(', ')}. Ikke hele dokumenterne.` : 'Ingen matchende filuddrag blev brugt. Svaret bygger på modellens generelle viden.'; }
function fileCount(count) { return `${count} ${count === 1 ? 'fil' : 'filer'}`; }
function captureCourse() {
  const course = activeCourse(); if (!course) return;
  Object.assign(course, { name: $('subject').value.trim() || course.name, topic: $('topic').value, documents: state.documents, history: state.history, notes: $('notes').value, exercise: state.exercise, exerciseSources: state.exerciseSources, answer: $('answer').value, assessment: state.assessment, activeSkillId: state.activeSkillId, exerciseSkillId: state.exerciseSkillId, exerciseId: state.exerciseId, trainingMode: state.trainingMode, randomTraining: state.randomTraining, reviewKey: state.reviewKey, difficulty: state.difficulty, drawing: state.drawing });
  if (state.exercise) course.trainingSessions[sessionKey()] = { exercise: state.exercise, sources: state.exerciseSources, answer: $('answer').value, assessment: state.assessment, exerciseId: state.exerciseId, skillId: state.exerciseSkillId, difficulty: state.difficulty, drawing: state.drawing };
}
function persist() {
  if (state.initializing) return;
  captureCourse(); renderCourses();
  if (!storageAvailable) { saveFailed = true; return; }
  const snapshot = structuredClone(state.workspace), savedOwner = workspaceOwner; pendingSaves++;
  $('storage-status').textContent = 'Gemmer fag og materiale på denne enhed …';
  saveChain = saveChain.then(() => writeWorkspace(snapshot, savedOwner)).then(() => {
    saveFailed = false;
    profile?.saved(savedOwner);
  }).catch(() => {
    saveFailed = true;
    notice('Fagoversigten kunne ikke gemmes lokalt. Browserens lager kan være fuldt eller blokeret. Eksportér vigtige noter og samtaler før du lukker.');
  }).finally(() => {
    pendingSaves--;
    $('storage-status').textContent = saveFailed ? 'Kun i denne fane: seneste ændringer er ikke gemt. Hold fanen åben.' : pendingSaves ? 'Gemmer …' : workspaceOwner === 'current' ? 'Gemt i denne browser · Log ind for at gemme din profil online.' : 'Gemt på denne enhed · Se status for online gemning under Min profil.';
  });
}
function renderAssessment(assessment) {
  renderQuestionType();
  $('feedback').replaceChildren(); $('feedback').hidden = !assessment;
  if (!assessment) return;
  const title = document.createElement('strong'); title.className = 'grade-result'; title.textContent = assessment.multipleChoice || assessment.drawingReview ? '' : `${gradeLabel(assessment.score)} · ${GRADE_NAMES[assessment.score]}`;
  const warning = document.createElement('small'); warning.className = 'source-label'; warning.textContent = assessment.multipleChoice ? 'Bedømt direkte efter opgavens facit. Ingen AI-karakter.' : assessment.drawingReview ? 'Egenkontrol af din skitse. Ingen AI-karakter eller medaljepoint.' : 'Vejledende AI-estimat på 7-trinsskalaen. Ikke en officiel karakter.';
  const feedback = document.createElement('p'); renderMathText(feedback, assessment.feedback);
  const solution = document.createElement('p'); renderMathText(solution, `Løsningsforslag:\n${assessment.solution}`);
  const sources = document.createElement('small'); sources.className = 'source-label'; sources.textContent = assessment.conceptBased ? (assessment.aiGenerated ? 'AI-genereret øvelsesfacit · vejledende. ' : 'Bedømt med et fagligt referencefacit til begrebet. ') + (assessment.sources?.length ? sourceText(assessment.sources) : '') : sourceText(assessment.sources);
  if (typeof assessment.correct === 'boolean') { const result = document.createElement('strong'); result.textContent = assessment.correct ? (assessment.multipleChoice ? '✓ Rigtigt' : '✓ Rigtigt · AI-vurdering') : assessment.medal ? '↻ Ikke helt rigtigt · rækken starter forfra' : '↻ Ikke helt rigtigt · gemt til Øv fejl'; $('feedback').append(result); }
  if (assessment.drawingReview) sources.textContent='Vejledende modelskitse til egenkontrol.';
  if (assessment.multipleChoice || assessment.drawingReview) title.hidden = true;
  $('feedback').append(title, warning, feedback, solution, sources);
  if (assessment.drawingReview) appendDrawingReview($('feedback'), assessment);
  renderReadingLinks($('feedback'), assessment);
}
function renderQuestionType() {
  const ref = questionReference(activeCourse() || {questionHistory:{},mistakes:{}}, state.exerciseSkillId, state.exercise);
  const choice = Array.isArray(ref?.choices), drawing = ref?.difficulty === 'drawing';
  $('choice-options').hidden = !choice; $('drawing-task').hidden = !drawing;
  $('answer').hidden = choice || drawing; $('answer-label').hidden = choice || drawing;
  $('choice-options').replaceChildren();
  if (choice) {
    const legend=document.createElement('legend'); legend.textContent='Vælg ét svar'; $('choice-options').append(legend);
    ref.choices.forEach((text,i)=>{
      const label=document.createElement('label'); label.className='choice-option';
      const input=document.createElement('input'); input.type='radio'; input.name='choice'; input.value=String(i); input.checked=$('answer').value===text;
      input.disabled=!!state.assessment;
      const content=document.createElement('span'); renderMathText(content,text);
      input.onchange=()=>{ $('answer').value=text; persist(); controls(); };
      label.append(input,content); $('choice-options').append(label);
    });
  }
  if(drawing) paintDrawing($('drawing-canvas'),state.drawing);
}
function appendDrawingReview(container, assessment) {
  const panel=document.createElement('div'); panel.className='drawing-comparison';
  const student=document.createElement('section'); const title=document.createElement('h3'); title.textContent='Din skitse';
  const canvas=document.createElement('canvas'); canvas.width=1000; canvas.height=420; canvas.setAttribute('aria-label','Din gemte skitse'); paintDrawing(canvas,assessment.drawing);
  student.append(title,canvas);
  const model=document.createElement('section'); const heading=document.createElement('h3'); heading.textContent='Modelskitse · ikke målfast';
  const figure=document.createElement('div'); figure.className='model-sketch'; figure.innerHTML=modelSketch(assessment.reference);
  model.append(heading,figure);
  const checklist=document.createElement('ul'); for(const text of assessment.reference.checklist || []) { const li=document.createElement('li'); li.textContent=text; checklist.append(li); }
  model.append(checklist); panel.append(student,model); container.append(panel);
}
attachDrawing($('drawing-canvas'),()=>state.drawing,()=>{ persist(); controls(); },()=>state.busy || state.loading || state.importing || state.initializing || !!state.assessment);
$('drawing-undo').onclick=()=>{ if(state.assessment) return; state.drawing.pop(); paintDrawing($('drawing-canvas'),state.drawing); persist(); controls(); };
$('drawing-clear').onclick=()=>{ if(state.assessment) return; state.drawing=[]; paintDrawing($('drawing-canvas'),state.drawing); persist(); controls(); };
function renderReadingLinks(container, assessment) {
  const section = document.createElement('section'); section.className = 'reading-links';
  const heading = document.createElement('h3'); heading.textContent = 'Læs op her'; section.append(heading);
  renderWebReading(section, assessment.skillId);
  const refs = assessment.references?.length ? assessment.references : (assessment.sources || []).map(name => ({ name }));
  if (!refs.length && !webReadingFor(assessment.skillId).length) { const note = document.createElement('p'); note.className = 'hint'; note.textContent = 'Der blev ikke fundet et læseuddrag til denne bedømmelse.'; section.append(note); }
  else if (refs.length) {
    const note = document.createElement('p'); note.className = 'hint'; note.textContent = assessment.references?.length ? 'Genlæs disse uddrag, som blev brugt ved bedømmelsen. De kan hjælpe med at forstå feedbacken.' : 'Denne tidligere bedømmelse gemte kun filnavne. Åbn materialet for at læse op.'; section.append(note);
    const list = document.createElement('ul');
    for (const ref of refs) {
      const li = document.createElement('li'); const link = document.createElement('button'); link.className = 'text-button';
      link.textContent = `${ref.name}${ref.page ? ` · side ${ref.page}` : ''} · ${ref.text ? 'Læs uddrag' : 'Åbn materiale'} ↗`;
      const doc = state.documents.find(doc => doc.name === ref.name);
      link.disabled = !doc && !ref.text;
      link.addEventListener('click', () => viewMaterial(doc || { name: ref.name, text: 'Filen er ikke længere tilføjet til faget. Det gemte uddrag vises ovenfor.' }, ref.text ? ref : null));
      li.append(link); if (ref.text) { const preview = document.createElement('p'); preview.className = 'hint'; preview.textContent = ref.text.slice(0, 180) + (ref.text.length > 180 ? ' …' : ''); li.append(preview); } list.append(li);
    }
    section.append(list);
  }
  container.append(section);
}
function renderWebReading(container, skillId) {
  const resources = webReadingFor(skillId); if (!resources.length) return;
  const list = document.createElement('ul'); list.className = 'web-reading';
  for (const item of resources) {
    const li = document.createElement('li'); const link = document.createElement('a');
    link.href = item.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.referrerPolicy = 'no-referrer';
    link.textContent = `${item.title} ↗`; const caption = document.createElement('small'); caption.textContent = `${item.publisher} · ${item.language}`;
    li.append(link, caption); list.append(li);
  }
  container.append(list);
}
function viewMaterial(doc, reference = null) {
  $('material-title').textContent = doc.name; $('material-text').textContent = doc.text;
  $('material-reference').hidden = !reference;
  $('material-reference-title').textContent = reference?.page ? `Relevant uddrag · side ${reference.page}` : 'Relevant uddrag';
  renderMathText($('material-reference-text'), reference?.text || '');
  $('material-full').open = !reference; $('material-viewer').showModal();
}
let readingSnapshot = null;
function renderReadingOverview() {
  const course = activeCourse(); if (!course || $('page-chat').hidden) return;
  const skillsKey = JSON.stringify([course.skills, course.attempts.map(a => [a.skillId, a.skillTitle])]);
  if (readingSnapshot?.course === course && readingSnapshot.skillsKey === skillsKey && readingSnapshot.documents.length === course.documents.length && readingSnapshot.documents.every((doc, i) => doc.name === course.documents[i].name && doc.text === course.documents[i].text)) return;
  readingSnapshot = { course, skillsKey, documents: course.documents.map(doc => ({ name: doc.name, text: doc.text })) };
  const topics = readingPlan(course), list = $('reading-topics'); list.replaceChildren();
  $('reading-summary').textContent = course.documents.length
    ? `${topics.length} underemner i ${course.name} · ${fileCount(course.documents.length)} gennemgået for emner og læseafsnit.`
    : 'Tilføj undervisningsmateriale i sidepanelet, så får du underemner og forslag til, hvor du kan læse op.';
  if (!topics.length) return;
  for (const [index, topic] of topics.entries()) {
    const card = document.createElement('details'); card.className = 'reading-topic'; card.open = index === 0;
    const summary = document.createElement('summary');
    const number = document.createElement('span'); number.className = 'reading-number'; number.textContent = String(index + 1).padStart(2, '0');
    const heading = document.createElement('span'); heading.className = 'reading-topic-title'; heading.textContent = topic.title;
    const count = document.createElement('small'); count.textContent = `${topic.materials.length} materialefil${topic.materials.length === 1 ? '' : 'er'} · ${topic.resources.length} læselink${topic.resources.length === 1 ? '' : 's'}`;
    heading.append(count); summary.append(number, heading); card.append(summary);
    const body = document.createElement('div'); body.className = 'reading-topic-body';
    const guidance = document.createElement('p'); guidance.className = 'reading-guidance'; guidance.textContent = topic.guidance; body.append(guidance);
    const columns = document.createElement('div'); columns.className = 'reading-columns';
    const local = document.createElement('section'); const localHeading = document.createElement('h3'); localHeading.textContent = 'I dit materiale'; local.append(localHeading);
    if (!topic.materials.length) { const note = document.createElement('p'); note.className = 'hint'; note.textContent = 'Der er ikke fundet et matchende afsnit i de nuværende filer.'; local.append(note); }
    for (const material of topic.materials) {
      const group = document.createElement('div'); group.className = 'reading-material';
      const title = document.createElement('strong'); title.textContent = material.name; group.append(title);
      if (!material.references.length) {
        const hint = document.createElement('p'); hint.className = 'hint'; hint.textContent = 'Emnet nævnes, men der blev ikke fundet et forklarende afsnit. Brug læselinket eller åbn materialet.'; group.append(hint);
        const open = document.createElement('button'); open.className = 'text-button'; open.textContent = 'Åbn materialet ↗'; open.onclick = () => viewMaterial(material.doc); group.append(open);
      }
      // All matched pages remain available without filling the overview with excerpts.
      const refs = document.createElement('div'); refs.className = 'reading-page-links';
      for (const [i, ref] of material.references.entries()) {
        const open = document.createElement('button'); open.className = 'secondary';
        open.textContent = ref.page ? `Læs side ${ref.page} ↗` : `Læs afsnit ${i + 1} ↗`;
        open.onclick = () => viewMaterial(material.doc, ref); refs.append(open);
      }
      group.append(refs); local.append(group);
    }
    const external = document.createElement('section'); const webHeading = document.createElement('h3'); webHeading.textContent = 'Læs videre på nettet'; external.append(webHeading);
    renderWebReading(external, topic.id);
    if (!topic.resources.length) { const note = document.createElement('p'); note.className = 'hint'; note.textContent = 'Der er endnu ikke et udvalgt eksternt læselink til dette underemne. Start med dit materiale.'; external.append(note); }
    columns.append(local, external); body.append(columns);
    const actions = document.createElement('div'); actions.className = 'reading-actions';
    const ask = document.createElement('button'); ask.className = 'secondary reading-ask'; ask.textContent = 'Spørg om emnet';
    ask.onclick = () => { $('question').value = `Forklar ${topic.title} enkelt med et konkret eksempel.`; $('question').focus(); $('chat-form').scrollIntoView({ behavior: 'smooth', block: 'center' }); };
    const train = document.createElement('button'); train.className = 'primary reading-train'; train.textContent = 'Træn emnet ↗'; train.onclick = () => selectSkill(topic.id);
    actions.append(ask, train); body.append(actions); card.append(body); list.append(card);
  }
}
$('close-material').addEventListener('click', () => $('material-viewer').close());
function renderTraining() {
  const course = activeCourse(); if (!course) return;
  renderMistakes();
  const skills = skillsForCourse(course);
  $('random-training').textContent = course.trainingSessions[levelKey('__random__',state.difficulty)]?.exercise ? '⤨ Fortsæt tilfældig træning' : '⤨ Tilfældig træning';
  const mastered = Object.values(course.earnedMedals).reduce((sum, medals) => sum + medals.length, 0);
  $('training-summary').replaceChildren();
  const graded = new Set(course.attempts.filter(item => !item.invalidatedReason && !item.drawingReview && item.exerciseId && item.skillId).map(item => item.exerciseId)).size;
  for (const [value, label] of [[skills.length, 'Opgavetyper'], [mastered, 'Optjente medaljer'], [graded, 'Bedømte opgaver i typerne']]) {
    const card = document.createElement('div'); const number = document.createElement('strong'); number.textContent = String(value); const caption = document.createElement('span'); caption.textContent = label; card.append(number, caption); $('training-summary').append(card);
  }
  $('training-recommendation').replaceChildren();
  const selectedAttempts=course.attempts.filter(a=>difficultyOf(a.difficulty)===difficultyOf(course.levels?.[a.skillId]));
  const suggested = recommendSkill(skills, selectedAttempts);
  if (suggested) {
    const text = document.createElement('div'); const label = document.createElement('small'); label.textContent = 'DIT NÆSTE SKRIDT'; const title = document.createElement('strong'); title.textContent = suggested.title;
    const reason = document.createElement('span'); reason.textContent = masteryForSkill(selectedAttempts, suggested.id).status === 'review' ? 'Din seneste bedømmelse peger på, at mere øvelse kan hjælpe.' : 'En opgavetype fra dit materiale, du kan træne videre med.';
    text.append(label, title, reason); const train = document.createElement('button'); train.className = 'primary train-skill'; train.textContent = 'Træn denne type ↗'; train.addEventListener('click', () => selectSkill(suggested.id)); $('training-recommendation').append(text, train);
  } else $('training-recommendation').textContent = 'Tilføj materiale til faget, så finder vi forslag til opgavetyper.';
  const filter = $('skill-filter').value;
  $('skill-grid').replaceChildren(); let shown = 0;
  for (const skill of skills) {
    const difficulty = difficultyOf(course.levels?.[skill.id]);
    const mastery = masteryForSkill(levelAttempts(course.attempts, difficulty), skill.id);
    if (filter !== 'all' && filter !== mastery.status) continue;
    shown++;
    const card = document.createElement('article'); card.className = `card skill-card${skill.id === state.activeSkillId ? ' selected' : ''}`;
    const status = document.createElement('span'); status.className = `mastery-badge ${mastery.status}`; status.textContent = mastery.status === 'mastered' ? 'Trænet' : mastery.label;
    const title = document.createElement('h3'); title.textContent = skill.title;
    const source = document.createElement('p'); source.className = 'hint'; source.textContent = `${skill.origin === 'manual' ? 'Din egen opgavetype' : skill.origin === 'keywords' ? 'Fundet med søgeord' : skill.origin === 'history' ? 'Fra din historik' : 'Generel materialetræning'} · ${skill.sources.length} ${skill.sources.length === 1 ? 'materialefil' : 'materialefiler'}`;
    const info = document.createElement('div'); info.className = 'skill-info'; info.append(title, source, status);
    const levels=document.createElement('div'); levels.className='level-options'; levels.setAttribute('role','group'); levels.setAttribute('aria-label','Niveau i '+skill.title);
    for (const [level, config] of Object.entries(LEVELS)) {
      const button=document.createElement('button'); button.className='secondary level-button'; button.textContent=config.label; button.title=config.description; button.setAttribute('aria-pressed',String(level===difficulty));
      button.onclick=()=>{ course.levels ||= {}; course.levels[skill.id]=level; persist(); controls(); };
      levels.append(button);
    }
    info.append(levels);
    const actions = document.createElement('div'); actions.className = 'skill-actions';
    const train = document.createElement('button'); train.className = 'secondary train-skill'; train.textContent = 'Fri træning ↗'; train.dataset.noMaterial = String(!skill.sources.length); train.addEventListener('click', () => selectSkill(skill.id)); actions.append(train);
    const medals = document.createElement('div'); medals.className = 'medal-buttons';
    for (const [tier, medal] of Object.entries(MEDALS)) {
      const earned = course.earnedMedals[levelKey(skill.id, difficulty)]?.includes(tier);
      const run = course.medalRuns[runKey(levelKey(skill.id, difficulty), tier)];
      const button = document.createElement('button'); button.className = `medal train-skill ${tier}${earned ? ' earned' : ''}`;
      button.dataset.noMaterial = String(!skill.sources.length);
      button.setAttribute('aria-label', `${medal.label}: ${medal.target} rigtige i træk · ${skill.title}${earned ? ' · optjent' : ''}`);
      const icon = document.createElement('span'); icon.className = 'medal-icon'; icon.textContent = earned ? '★' : '☆';
      const caption = document.createElement('span'); caption.textContent = `${medal.label} · ${medal.target}`;
      const progress = document.createElement('small'); progress.textContent = earned ? 'Optjent ✓' : run ? `${run.streak}/${medal.target} i træk` : 'Ikke optjent';
      button.append(icon, caption, progress); button.addEventListener('click', () => selectSkill(skill.id, tier)); medals.append(button);
    }
    actions.append(medals);
    medals.hidden = difficulty === 'drawing';
    card.append(info, actions); $('skill-grid').append(card);
  }
  if (!shown) $('skill-grid').textContent = skills.length ? 'Ingen opgavetyper i dette filter.' : 'Ingen opgavetyper endnu. Tilføj materiale eller opret din egen type.';
  if (course.trainingSessions.__free__?.exercise && state.exerciseSkillId) {
    const resume = document.createElement('button'); resume.className = 'secondary train-skill'; resume.textContent = 'Fortsæt din tidligere frie opgave ↗'; resume.addEventListener('click', () => selectSkill('__free__')); $('skill-grid').append(resume);
  }
  const uncategorized = course.attempts.filter(item => !item.skillId || !item.exerciseId).length;
  $('unclassified-attempts').textContent = uncategorized ? `${uncategorized} tidligere bedømmelser mangler en fast opgavetype eller opgave-id. De er bevaret i historikken, men tæller ikke automatisk som mestring.` : '';
  renderChallenge();
  $('workout-difficulty').value=state.difficulty;
  $('workout-hint').textContent=state.difficulty==='drawing'?'Tegn, sammenlign og tjek din forståelse':state.difficulty==='medium'?'Vælg ét svar · Bedømmes direkte mod facit':'Ét begreb ad gangen · AI-feedback er vejledende';
  $('workout-title').textContent = activeCourse().mistakes[state.reviewKey]?.skillTitle || skills.find(skill => skill.id === state.activeSkillId)?.title || 'Fri træning';
  $('topic-reading-links').replaceChildren(); renderWebReading($('topic-reading-links'), state.activeSkillId); $('topic-reading').hidden = !webReadingFor(state.activeSkillId).length;
  $('workout-mode').textContent = state.reviewKey ? 'ØV GEMTE FEJL' : state.randomTraining ? 'TILFÆLDIG TRÆNING · EMNER I DETTE FAG' : state.trainingMode === 'free' ? 'FRI TRÆNING' : `${MEDALS[state.trainingMode].label.toLocaleUpperCase('da')}-UDFORDRING`;
  const exerciseSkill = skills.find(skill => skill.id === state.exerciseSkillId);
  $('exercise-type-label').textContent = !state.exercise ? 'OPGAVEGRUNDLAG' : exerciseSkill ? `DIN OPGAVE · ${exerciseSkill.title.toLocaleUpperCase('da')}` : 'DIN OPGAVE · FRI TRÆNING';
}
function renderChallenge() {
  const run = activeRun(); const panel = $('challenge-status'); panel.hidden = !run;
  if (!run) return;
  const medal = MEDALS[state.trainingMode];
  panel.textContent = run.completed ? `★ ${medal.label} optjent! ${run.target} rigtige i træk. Vælg en ny medalje eller fri træning.` : `${medal.label}-udfordring · ${run.streak}/${run.target} rigtige i træk. Forkert svar nulstiller rækken. ${state.difficulty==='medium'?'Svaret kontrolleres mod facit.':'AI vurderer rigtigt/forkert.'}`;
}
function storeAssessment(assessment, reference, run) {
  assessment.difficulty=state.difficulty;
  if (run) {
    recordMedalAnswer(run,state.exerciseId,assessment.correct);
    if (run.completed) {
      const key=levelKey(state.activeSkillId,state.difficulty), earned=activeCourse().earnedMedals[key] ||= [];
      if(!earned.includes(state.trainingMode)) earned.push(state.trainingMode);
    }
  }
  if(!assessment.drawingReview) saveMistake(activeCourse(),assessment,reference);
  state.assessment=assessment;
  activeCourse().attempts.push(assessment); activeCourse().attempts=activeCourse().attempts.slice(-100);
  renderAssessment(assessment); persist(); controls();
}
function selectSkill(id, medal = null, randomMode = false, requestedDifficulty = null) {
  if (state.busy || state.loading || state.importing || state.initializing) return;
  const course = activeCourse(); if (!course) return;
  if (id !== '__free__' && !skillsForCourse(course).some(skill => skill.id === id)) return;
  persist();
  state.difficulty=difficultyOf(requestedDifficulty || course.levels?.[id] || (randomMode ? state.difficulty : 'easy'));
  if(state.difficulty==='drawing') medal=null;
  course.levels ||= {}; course.levels[id]=state.difficulty;
  state.trainingMode = medal || 'free'; state.randomTraining = randomMode; state.reviewKey = null; state.requestedNext=false;
  const key = medal ? runKey(levelKey(id,state.difficulty), medal) : levelKey(id,state.difficulty);
  if (medal && (!course.medalRuns[key] || course.medalRuns[key].completed)) {
    course.medalRuns[key] = newMedalRun(medal); delete course.trainingSessions[key];
  }
  const randomSession = course.trainingSessions[levelKey('__random__',state.difficulty)];
  const canResumeRandom = randomSession && skillsForCourse(course).some(skill => skill.id === randomSession.skillId && CONCEPT_QUESTIONS[skill.id] && skill.sources.length);
  const session = randomMode ? (canResumeRandom ? randomSession : null) : course.trainingSessions[key];
  state.drawing=session?.drawing || [];
  state.activeSkillId = randomMode && session ? session.skillId : id === '__free__' ? '' : id;
  state.exercise = session?.exercise || ''; state.exerciseSources = session?.sources || []; state.exerciseId = session?.exerciseId || ''; state.exerciseSkillId = state.exercise ? state.activeSkillId : ''; state.assessment = session?.assessment || null; state.exerciseFailed = false;
  $('answer').value = session?.answer || ''; discardIrrelevantExercise(); $('exercise').hidden = !state.exercise; renderMathText($('exercise-question'), state.exercise); $('exercise-sources').textContent = sourceText(state.exerciseSources); renderAssessment(state.assessment);
  persist(); showPage('workout'); maybeStartExercise();
}
$('workout-difficulty').onchange=()=>selectSkill(state.activeSkillId,state.trainingMode==='free'?null:state.trainingMode,state.randomTraining,$('workout-difficulty').value);
$('skill-filter').addEventListener('change', () => { renderTraining(); controls(); });
$('skill-form').addEventListener('submit', event => {
  event.preventDefault(); if (state.busy || state.loading || state.importing || state.initializing) return;
  const course = activeCourse(), title = $('skill-name').value.trim(); if (!course || !title) return;
  const existing = skillsForCourse(course).find(skill => skill.title.toLocaleLowerCase('da') === title.toLocaleLowerCase('da'));
  const id = existing?.id || crypto.randomUUID(); if (!existing) course.skills.push({ id, title }); $('skill-name').value = ''; selectSkill(id);
});
function renderCourses() {
  $('course-tabs').replaceChildren(); $('course-grid').replaceChildren();
  for (const course of state.workspace.courses) {
    const selected = course.id === state.workspace.activeId;
    const tab = document.createElement('button'); tab.type = 'button'; tab.className = 'course-tab'; tab.id = `course-tab-${course.id}`;
    tab.textContent = course.name; tab.title = course.name; tab.setAttribute('role', 'tab'); tab.setAttribute('aria-selected', String(selected)); tab.setAttribute('aria-controls', 'course-panel'); tab.tabIndex = selected ? 0 : -1;
    tab.addEventListener('click', () => switchCourse(course.id));
    tab.addEventListener('keydown', event => {
      const courses = state.workspace.courses, current = courses.findIndex(item => item.id === course.id);
      const next = event.key === 'ArrowRight' ? (current + 1) % courses.length : event.key === 'ArrowLeft' ? (current - 1 + courses.length) % courses.length : event.key === 'Home' ? 0 : event.key === 'End' ? courses.length - 1 : null;
      if (next === null) return;
      event.preventDefault(); switchCourse(courses[next].id); document.getElementById(`course-tab-${courses[next].id}`)?.focus();
    });
    $('course-tabs').append(tab);
    const card = document.createElement('article'); card.className = `card course-card${course.id === state.workspace.activeId ? ' selected' : ''}`;
    const title = document.createElement('h2'); title.textContent = course.name;
    const count = document.createElement('p'); count.textContent = `${course.documents.length} materialefil${course.documents.length === 1 ? '' : 'er'} · ${course.attempts.length} bedømmelse${course.attempts.length === 1 ? '' : 'r'}`;
    const topic = document.createElement('p'); topic.className = 'hint'; topic.textContent = course.topic || 'Tilføj et fokus, og kom i gang.';
    const open = document.createElement('button'); open.type = 'button'; open.className = 'secondary course-open'; open.textContent = course.id === state.workspace.activeId ? 'Valgt fag ✓' : 'Vælg fag ↗'; open.addEventListener('click', () => switchCourse(course.id));
    card.append(title, count, topic, open); $('course-grid').append(card);
  }
  if (state.workspace.activeId) $('course-panel').setAttribute('aria-labelledby', `course-tab-${state.workspace.activeId}`);
  $('course-materials').replaceChildren();
  const course = activeCourse(); if (!course) return;
  $('course-material-heading').textContent = `${course.name} · ${fileCount(course.documents.length)}`;
  if (!course.documents.length) { const empty = document.createElement('li'); empty.textContent = 'Intet materiale endnu. Tilføj filer i sidepanelet.'; $('course-materials').append(empty); }
  for (const doc of course.documents) {
    const li = document.createElement('li'); const label = document.createElement('span'); label.textContent = `${doc.name} · ${doc.text.length.toLocaleString('da-DK')} tegn læst`;
    const view = document.createElement('button'); view.className = 'text-button'; view.textContent = 'Se læst tekst ↗'; view.addEventListener('click', () => viewMaterial(doc)); li.append(label, view); $('course-materials').append(li);
  }
  $('course-attempts').replaceChildren();
  if (!course.attempts.length) $('course-attempts').textContent = 'Ingen bedømmelser i dette fag endnu.';
  for (const attempt of [...course.attempts].reverse()) {
    const detail = document.createElement('details'); const summary = document.createElement('summary'); summary.textContent = `${attempt.invalidatedReason ? 'Ugyldig opgave' : attempt.drawingReview ? 'Tegneopgave · Egenkontrol' : attempt.multipleChoice ? (attempt.correct ? 'Rigtigt' : 'Forkert') : gradeLabel(attempt.score)} · ${LEVELS[difficultyOf(attempt.difficulty)].label} · ${attempt.topic || course.name} · ${new Date(attempt.created).toLocaleDateString('da-DK')}`;
    const body = document.createElement('div'); body.className = 'prose'; renderMathText(body, `${attempt.question}\n\nDit svar:\n${attempt.answer}\n\n${attempt.feedback}\n\nLøsningsforslag:\n${attempt.solution}\n\n${sourceText(attempt.sources)}`); if (attempt.invalidatedReason) renderMathText(body, `${attempt.invalidatedReason}\n\nOprindelig opgave:\n${attempt.question}\n\nDin bevarede besvarelse:\n${attempt.answer}`);
    else { renderReadingLinks(body, attempt); if(attempt.drawingReview) appendDrawingReview(body,attempt); } detail.append(summary, body); $('course-attempts').append(detail);
  }
  renderTraining();
  renderReadingOverview();
  controls();
}
function discardIrrelevantExercise() {
  const skill = skillsForCourse(activeCourse()).find(item => item.id === state.exerciseSkillId);
  if (questionReference(activeCourse(), state.exerciseSkillId, state.exercise)) return;
  if (state.exercise && state.exerciseSources.length && (/Tekstuddrag:/iu.test(state.exercise) || !validExercise(state.exercise, skill) || !exerciseEvidence(state.exercise, state.documents, skill))) {
    delete activeCourse().trainingSessions[sessionKey()]; state.exercise = ''; state.exerciseSources = []; state.assessment = null; $('answer').value = '';
    notice('En tidligere irrelevant opgave er fjernet. Vælg en træningstype for en ny faglig opgave.');
  }
}
function restoreCourse() {
  const course = activeCourse(); if (!course) return;
  invalidateCatalogueAttempts(course); migrateLearning(course);
  $('subject').value = course.name; $('topic').value = course.topic; $('notes').value = course.notes; $('answer').value = course.answer;
  state.documents = course.documents; state.history = course.history; state.exercise = course.exercise; state.exerciseSources = course.exerciseSources; state.assessment = course.assessment;
  state.difficulty = difficultyOf(course.difficulty); state.drawing = course.drawing || []; state.reviewKey = course.reviewKey || null; state.randomTraining = course.randomTraining || false; state.trainingMode = course.trainingMode || 'free'; state.activeSkillId = course.activeSkillId; state.exerciseSkillId = course.exerciseSkillId; state.exerciseId = course.exerciseId || (course.exercise ? crypto.randomUUID() : '');
  state.exerciseFailed = false; discardIrrelevantExercise();
  $('messages').replaceChildren();
  if (!state.history.length) message('assistant', `Du arbejder nu med ${course.name}. Hvad vil du gerne forstå?`);
  for (const item of state.history) { const output = message(item.role, item.content, item.role === 'assistant' ? item.sources : []); output.wrapper.classList.toggle('partial', !!item.partial); }
  $('exercise').hidden = !state.exercise; renderMathText($('exercise-question'), state.exercise); $('exercise-sources').textContent = sourceText(state.exerciseSources);
  renderAssessment(state.assessment); renderFiles(); renderCourses();
}
function switchCourse(id) {
  if (state.busy || state.loading || state.importing || !state.workspace.courses.some(course => course.id === id)) return;
  const focusTab = document.activeElement?.getAttribute('role') === 'tab';
  persist(); state.workspace.activeId = id; restoreCourse(); persist(); notice(`Valgt fag: ${activeCourse().name}`);
  if (focusTab) document.getElementById(`course-tab-${id}`)?.focus();
  maybeStartExercise();
}
$('open-course-dialog').addEventListener('click', () => { $('course-dialog').showModal(); $('course-name').focus(); });
$('close-course-dialog').addEventListener('click', () => $('course-dialog').close());
$('course-form').addEventListener('submit', event => {
  event.preventDefault(); if (state.busy || state.loading || state.importing || state.initializing) return;
  const name = $('course-name').value.trim(); if (!name) return;
  const existing = state.workspace.courses.find(course => course.name.toLocaleLowerCase('da') === name.toLocaleLowerCase('da'));
  if (existing) { switchCourse(existing.id); $('course-dialog').close(); notice('Faget findes allerede og er nu valgt.'); return; }
  persist(); const course = newCourse(name); state.workspace.courses.push(course); state.workspace.activeId = course.id; $('course-name').value = ''; restoreCourse(); persist(); notice(`Faget ${name} er oprettet.`);
  $('course-dialog').close(); document.getElementById(`course-tab-${course.id}`)?.focus();
});
async function initializeCourses() {
  try { state.workspace = await readWorkspace() || { version: 1, courses: [newCourse('Mit første fag')], activeId: null }; }
  catch { storageAvailable = false; saveFailed = true; state.workspace.courses = [newCourse('Mit første fag')]; $('storage-status').textContent = 'Browserens gemte fag kunne ikke læses. Eksisterende data overskrives ikke; nye ændringer bliver kun i denne fane.'; }
  state.workspace.activeId ||= state.workspace.courses[0]?.id;
  if (!state.workspace.courses.length) { const course = newCourse('Mit første fag'); state.workspace.courses.push(course); state.workspace.activeId = course.id; }
  state.initializing = false; restoreCourse(); persist();
  maybeStartExercise();
}
function resetEngine() {
  state.worker?.terminate(); state.worker = null; state.engine = null; controls();
}
async function checkGPU() {
  try {
    if (!window.isSecureContext) throw new Error('Åbn siden via HTTPS eller localhost. AI kan ikke startes ved at dobbeltklikke på HTML-filen.');
    if (!navigator.gpu) throw new Error('Denne browser har ikke WebGPU. Prøv en opdateret Chrome eller Edge på en computer med hardwareacceleration.');
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) throw new Error('Browseren kunne ikke få adgang til et egnet grafikkort. Prøv en anden computer eller browser.');
    if (adapter.limits.maxStorageBufferBindingSize < 128 * 1024 * 1024) throw new Error('Denne GPU har for små hukommelsesbuffere til de valgte modeller. Prøv en anden computer.');
    state.supported = true;
    $('gpu-info').textContent = '✓ WebGPU er tilgængeligt. Modelindlæsningen afgør, om der er nok hukommelse. Mobil og skolecomputere kan være begrænsede.';
  } catch (error) { state.supported = false; $('gpu-info').textContent = error.message; }
  controls();
}
function modelInfo() { const model = MODELS[$('model').value]; $('model-info').textContent = `${model.memory} ved modellens standardopsætning, plus browserens øvrige forbrug. ${model.description}`; }
$('open-settings').addEventListener('click', () => { $('settings').showModal(); });
$('close-settings').addEventListener('click', () => $('settings').close());
$('model').addEventListener('change', modelInfo);
$('download-consent').addEventListener('change', () => {
  if (!$('download-consent').checked) { modelPreferences.approved = false; rememberModelPreferences(); }
  controls();
});
function rememberModelPreferences() {
  modelPreferences = { ...modelPreferences, autoStart: $('auto-start-ai').checked };
  try { saveModelPreferences(localStorage, modelPreferences); } catch {}
}
$('auto-start-ai').addEventListener('change', rememberModelPreferences);
function stopAutoStart() { $('auto-start-ai').checked = false; rememberModelPreferences(); }
$('unload').addEventListener('click', () => { stopAutoStart(); resetEngine(); $('load-status').textContent = 'AI’en er stoppet. Automatisk opstart er slået fra. Downloadede modelfiler kan stadig ligge i browserens cache.'; });
$('cancel-load').addEventListener('click', () => { stopAutoStart(); state.cancelLoad?.(new Error('Indlæsningen blev annulleret. Allerede hentede filer kan være gemt i browserens cache.')); });
async function loadModel(automatic = false) {
  if (state.loading || state.busy || state.engine || !state.supported || !$('download-consent').checked) return;
  state.loading = true; controls(); $('download-progress').hidden = false; $('download-progress').value = 0;
  $('load-status').textContent = 'Starter AI fra browserens lager. Manglende filer hentes første gang …';
  let timer;
  try {
    const abort = new Promise((_, reject) => { state.cancelLoad = reject; timer = setTimeout(() => reject(new Error('Indlæsningen tog mere end 15 minutter. Kontrollér netforbindelsen, og prøv den lille model.')), 900000); });
    const load = async () => {
      const { CreateWebWorkerMLCEngine } = await import('@mlc-ai/web-llm');
      if (!state.loading || !state.cancelLoad) throw new Error('Indlæsning afbrudt.');
      state.worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
      state.worker.addEventListener('error', () => {
        const error = new Error('AI-processen blev afbrudt. Prøv igen eller vælg den lille model.');
        if (state.cancelLoad) state.cancelLoad(error);
        else if (state.failGeneration) state.failGeneration(error);
        else { resetEngine(); notice(error.message); }
      });
      return CreateWebWorkerMLCEngine(state.worker, MODELS[$('model').value].id, {
        initProgressCallback: report => { $('download-progress').value = Math.max(0, Math.min(1, report.progress || 0)); $('load-status').textContent = `${Math.round((report.progress || 0) * 100)} % · ${report.text}`; },
      }, { context_window_size: 4096 });
    };
    state.engine = await Promise.race([load(), abort]);
    modelPreferences = { model: $('model').value, autoStart: $('auto-start-ai').checked, approved: true };
    rememberModelPreferences();
    $('download-progress').value = 1; $('load-status').textContent = 'Klar. Du kan nu stille dit første spørgsmål.';
    notice('Lokal AI er klar. Der bruges ingen betalt AI-tjeneste.'); $('settings').close();
  } catch (error) {
    resetEngine(); $('load-status').textContent = `${error.message}\nHvis modellen ikke passer i hukommelsen, vælg Lille og luk andre tunge faner. Browseren kan have slettet sin cache eller være begrænset af skolens indstillinger.`;
    if (automatic) notice('Automatisk start af AI mislykkedes. Tryk Start lokal AI for at prøve igen eller vælge en mindre model.');
  } finally { clearTimeout(timer); state.cancelLoad = null; state.loading = false; $('download-progress').hidden = true; controls(); if (state.requestedNext && state.engine) { state.requestedNext=false; createExercise(); } else maybeStartExercise(); }
}
$('load-model').addEventListener('click', () => loadModel());
async function autoStartModel() {
  if (!modelPreferences.autoStart || !modelPreferences.approved || !state.supported) return;
  try {
    const selected = modelPreferences.model;
    const { hasModelInCache } = await import('@mlc-ai/web-llm');
    if (!await canAutoStart(modelPreferences, hasModelInCache)) {
      notice('AI-modellen mangler i browserens lager. Tryk Start lokal AI for at hente den igen.'); return;
    }
    if (!$('auto-start-ai').checked || $('model').value !== selected || state.loading || state.engine || state.busy || state.importing) return;
    await loadModel(true);
  } catch { notice('AI kunne ikke startes automatisk. Tryk Start lokal AI for at prøve igen.'); }
}

async function generate(options, onText) {
  if (!state.engine) { $('settings').showModal(); throw new Error('Start lokal AI, før du beder om et svar.'); }
  if (state.busy) return null;
  const { messages, sources, references } = buildMessages({ ...options, subject: $('subject').value, topic: options.topic ?? $('topic').value, documents: options.documents ?? state.documents });
  state.busy = true; state.stop = false; controls(); notice('AI’en arbejder på denne computer …');
  let text = '';
  let rawText = '';
  let timer;
  try {
    const failed = new Promise((_, reject) => { state.failGeneration = reject; timer = setTimeout(() => reject(new Error('Svaret tog mere end tre minutter. Prøv en mindre model og et kortere spørgsmål.')), 180000); });
    const run = async () => {
      const stream = await state.engine.chat.completions.create({ messages, stream: true, max_tokens: options.schema ? 1024 : 640, temperature: options.schema ? 0.1 : 0.4, extra_body: { enable_thinking: false }, ...(options.schema ? { response_format: { type: 'json_object', schema: JSON.stringify(options.schema) } } : {}) });
      let lengthLimited = false;
      for await (const chunk of stream) {
        if (state.stop) { state.engine?.interruptGenerate(); break; }
        rawText += chunk.choices[0]?.delta?.content || '';
        text = visibleAnswer(rawText);
        lengthLimited ||= chunk.choices[0]?.finish_reason === 'length';
        onText(text, sources);
        if (completeStructuredReply(text, options.schema)) { state.engine.interruptGenerate(); lengthLimited = false; break; }
      }
      return lengthLimited;
    };
    const lengthLimited = await Promise.race([run(), failed]);
    if (!text.trim() && !state.stop) throw new Error('Modellen gav intet svar. Prøv et kortere spørgsmål.');
    notice(state.stop ? 'Svaret blev stoppet og kan være ufuldstændigt.' : lengthLimited ? 'Svaret nåede længdegrænsen. Bed om en kortere forklaring eller et enkelt deltrin.' : '');
    return { text, sources, references, partial: state.stop || lengthLimited };
  } catch (error) {
    resetEngine(); notice(`AI’en blev afbrudt: ${error.message}\nStart lokal AI igen, eventuelt med en mindre model.`);
    return { text, sources, references, partial: true };
  } finally { clearTimeout(timer); state.failGeneration = null; state.busy = false; controls(); }
}
function stopGeneration() {
  state.stop = true; state.engine?.interruptGenerate(); notice('Stopper svaret …');
  const fail = state.failGeneration;
  setTimeout(() => { if (fail && state.failGeneration === fail) fail(new Error('Svaret blev stoppet. Start AI igen, hvis den ikke reagerer.')); }, 5000);
}
$('stop-generation').addEventListener('click', stopGeneration);
$('chat-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (state.busy) { stopGeneration(); return; }
  const query = $('question').value.trim(); if (!query) { $('question').focus(); return; }
  if (!state.engine) { $('settings').showModal(); return; }
  let output;
  try {
    // Validate before displaying or clearing the user's question.
    buildMessages({ query });
    message('user', query); $('question').value = ''; scrollMessages();
    output = message('assistant', 'Tænker …');
    const result = await generate({ query, history: state.history }, text => { output.body.textContent = text || 'Tænker …'; scrollMessages(); });
    if (!result) return;
    output.body.textContent = result.text || 'Intet svar. Du kan prøve igen.';
    renderMathText(output.body, result.text || 'Intet svar. Du kan prøve igen.');
    output.wrapper.classList.toggle('partial', result.partial);
    const source = document.createElement('small'); source.className = 'source-label'; source.textContent = sourceText(result.sources); output.wrapper.append(source);
    state.history.push({ role: 'user', content: query }, { role: 'assistant', content: result.text, partial: result.partial, sources: result.sources });
    state.history = state.history.slice(-20);
    persist();
  } catch (error) { notice(error.message); if (output) output.body.textContent = 'Spørgsmålet kunne ikke behandles.'; }
});
$('question').addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); $('chat-form').requestSubmit(); } });
document.querySelectorAll('[data-prompt]').forEach(button => button.addEventListener('click', () => { $('question').value = button.dataset.prompt; $('question').focus(); if (!state.engine) $('settings').showModal(); }));
function showPage(name) {
  document.querySelectorAll('.page').forEach(page => { page.hidden = page.id !== `page-${name}`; });
  document.querySelectorAll('.nav').forEach(nav => nav.classList.toggle('active', nav.dataset.page === (name === 'workout' ? 'practice' : name)));
  window.scrollTo({ top: 0, behavior: 'instant' });
  if (name === 'workout') $('workout-title').focus({ preventScroll: true });
  if (name === 'chat') { renderReadingOverview(); controls(); }
}
document.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => showPage(button.dataset.page)));
$('back-to-training').addEventListener('click', () => { persist(); showPage('practice'); });
$('clear-chat').addEventListener('click', resetContext);
$('topic').addEventListener('change', resetContext);
$('subject').addEventListener('change', () => { if (!$('subject').value.trim()) $('subject').value = activeCourse()?.name || 'Mit fag'; persist(); });
for (const id of ['notes', 'answer', 'topic', 'subject']) $(id).addEventListener('input', persist);

function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('export-chat').addEventListener('click', () => {
  if (!state.history.length) { notice('Der er endnu ingen samtale at gemme.'); return; }
  download('studyboss-samtale.txt', state.history.map(m => `${m.role === 'user' ? 'DIG' : 'STUDYBOSS'}${m.partial ? ' (ufuldstændigt svar)' : ''}\n${m.content}`).join('\n\n'));
});
$('export-notes').addEventListener('click', () => { if (!$('notes').value.trim()) { notice('Skriv først en note.'); return; } download('studyboss-noter.txt', $('notes').value); });

function renderFiles() {
  $('file-count').textContent = fileCount(state.documents.length); $('file-list').replaceChildren();
  state.documents.forEach((doc, index) => {
    const li = document.createElement('li'); const span = document.createElement('span'); span.textContent = doc.name;
    const view = document.createElement('button'); view.textContent = '↗'; view.setAttribute('aria-label', `Se ${doc.name}`); view.addEventListener('click', () => viewMaterial(doc));
    const remove = document.createElement('button'); remove.textContent = '×'; remove.setAttribute('aria-label', `Fjern ${doc.name}`);
    remove.addEventListener('click', () => { if (state.busy || state.loading) return; state.documents.splice(index, 1); renderFiles(); resetContext(); });
    li.append(span, view, remove); $('file-list').append(li);
  }); controls();
}
$('files').addEventListener('change', async () => {
  if (state.importing || state.busy || state.loading) return;
  state.importing = true; controls();
  const files = [...$('files').files]; const results = []; let added = 0;
  for (const file of files) {
    try {
      if (file.size > 50 * 1024 * 1024) throw new Error('Filen er større end 50 MB.');
      if (!/\.(pdf|txt|md)$/i.test(file.name)) throw new Error('Vælg PDF, TXT eller Markdown.');
      $('file-status').textContent = `Læser ${file.name} lokalt …`;
      let text;
      if (/\.pdf$/i.test(file.name)) {
        const pdfjs = await import('pdfjs-dist');
        const { default: workerURL } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
        pdfjs.GlobalWorkerOptions.workerSrc = workerURL;
        const task = pdfjs.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false });
        const extracted = await extractPDF(task, Infinity, Infinity, (page, total) => {
          $('file-status').textContent = `Læser ${file.name} · side ${page} af ${total} …`;
        });
        text = extracted.text;
      } else { text = await file.text(); }
      if (!text.trim()) throw new Error('Filen er tom.');
      state.documents.push({ name: file.name, text }); added++;
    } catch (error) { results.push(`${file.name}: ${error.message}`); }
  }
  state.importing = false; $('files').value = ''; renderFiles();
  if (added) resetContext({ invalidateTraining: true });
  $('file-status').textContent = results.join('\n') || `${added} fil(er) læst lokalt. Kun korte, søgeordsbaserede uddrag bruges i hvert svar; relevante afsnit kan blive overset.`;
  maybeStartExercise();
});
function maybeStartExercise() {
  if ($('page-workout').hidden || state.exercise || state.busy || state.loading || state.importing || state.initializing) return;
  if (!state.documents.length) { notice('Tilføj undervisningsmateriale til faget. Så laver StudyBoss automatisk en opgave, når din lokale AI er klar.'); return; }
  const skill = skillsForCourse(activeCourse()).find(item => item.id === state.activeSkillId);
  if (state.difficulty==='drawing' || CONCEPT_QUESTIONS[skill?.id]) { createExercise(); return; }
  if (!topicDocuments(state.documents, skill).length) { createExercise(); return; }
  if (!state.engine) { notice('Start lokal AI øverst. Derefter laves din første opgave automatisk fra materialet.'); return; }
  createExercise();
}
function presentQuestion(skill, item, origin) {
  const course=activeCourse(); rememberQuestion(course,skill.id,item,origin);
  state.activeSkillId=skill.id; state.exerciseSkillId=skill.id; state.exerciseId=crypto.randomUUID();
  state.exercise=item.question; state.exerciseSources=[]; state.assessment=null; state.exerciseFailed=false;
  state.drawing=[];
  $('exercise').hidden=false; renderMathText($('exercise-question'),state.exercise); $('exercise-sources').textContent=''; $('answer').value=''; renderAssessment(null); persist();
}
async function createExercise() {
  if (state.busy || state.loading || state.importing || state.initializing) return;
  const course=activeCourse(); const skills=skillsForCourse(course);
  const skill=skills.find(item => item.id === state.activeSkillId) || recommendSkill(skills,course.attempts);
  if (!skill) { notice('Vælg eller tilføj en opgavetype først.'); return; }
  if (activeRun()?.completed) { notice('Medaljen er optjent. Vælg en ny udfordring eller fri træning.'); return; }
  const current=questionReference(course,state.exerciseSkillId,state.exercise);
  if (current) rememberQuestion(course,state.exerciseSkillId,current,current.origin || 'seed');
  if(state.difficulty!=='easy') {
    const item=state.difficulty==='drawing' ? drawingQuestion(skill.id,(course.questionHistory[skill.id] || []).filter(q=>q.difficulty==='drawing').length+1,skill.title) : nextLevelQuestion(course,skill.id,state.difficulty);
    if(item) { presentQuestion(skill,item,'level-template'); notice(LEVELS[state.difficulty].description); controls(); return; }
  }
  const seed=state.difficulty==='easy' ? unusedSeed(course,skill.id) : null;
  if (seed) { presentQuestion(skill,seed,'seed'); controls(); notice('Svar kort på begrebet. En enkel forklaring er nok.'); return; }
  const variant=state.difficulty==='easy' ? continuingVariant(course,skill.id) : null;
  if (variant) { presentQuestion(skill,variant,'template'); controls(); notice('Ny opgavevariant. Svar kort og vis eventuelle regnetrin.'); return; }
  if (!state.engine) { state.requestedNext=true; $('settings').showModal(); notice('Start lokal AI for at få nye spørgsmål ud over startspørgsmålene.'); return; }
  const previous=(course.questionHistory[skill.id] || []).slice(-12).map(item=>item.question.slice(0,75)).join(' / ');
  const anchors=(CONCEPT_QUESTIONS[skill.id] || []).slice(0,3).map(item=>item.answer).join(' ');
  const angles=['et enkelt konkret eksempel','en lille begrebsforskel','en almindelig misforståelse','virkningen af en lille ændring','en enkel årsag og virkning','en helt kort anvendelse'];
  const angle=angles[(course.questionHistory[skill.id] || []).length % angles.length];
  $('exercise').hidden=false; $('exercise-question').textContent='Laver et nyt begrebsspørgsmål …'; $('answer-form').hidden=true; $('feedback').hidden=true;
  try {
    const choiceSchema={...QUESTION_SCHEMA,properties:{...QUESTION_SCHEMA.properties,choices:{type:'array',items:{type:'string'},minItems:4,maxItems:4},correctIndex:{type:'integer',minimum:0,maximum:3}},required:[...QUESTION_SCHEMA.required,'choices','correctIndex']};
    const instruction=state.difficulty==='medium' ? 'Lav et dansk multiple choice-spørgsmål med præcis fire forskellige muligheder, kun ét fagligt korrekt svar og tre plausible, forkerte svar. Returner JSON question, answer (facit og forklaring), choices (fire tekster), correctIndex (0 til 3). Ingen bogstaver foran valgene.' : state.difficulty==='hard' ? 'Lav en svær dansk anvendelsesopgave med to deltrin, begrundelse eller beregning. Returner JSON question (højst 35 ord) og answer (facit med mellemtrin, højst 90 ord).' : 'Lav et let dansk begynderspørgsmål. Returner JSON question og answer. Ét fagligt begreb eller enkelt regneeksempel.';
    const result=await generate({topic:skill.title,documents:topicDocuments(state.documents,skill),schema:state.difficulty==='medium'?choiceSchema:QUESTION_SCHEMA,query:'Emne: '+skill.title+'. Niveau: '+LEVELS[state.difficulty].label+'. Tidligere spørgsmål: '+previous+'. Faglige ankre: '+anchors.slice(0,450)+'. Vinkel: '+angle+'. Variation: '+crypto.randomUUID().slice(0,8),task:instruction+' Selvstændigt spørgsmål uden citater, materialehenvisninger eller kursuspraktik. Undgå tidligere spørgsmål.'},()=>{});
    if (!result || result.partial) throw new Error('AI’en afsluttede ikke den nye opgave. Prøv igen; intet er talt.');
    const parsed=parseNewQuestion(result.text,course,skill.id); const item=finishAIQuestion(parsed,JSON.parse(result.text),state.difficulty,course.questionHistory[skill.id] || []); presentQuestion(skill,item,'ai'); notice('Nyt AI-spørgsmål. Facit og bedømmelse er vejledende.');
  } catch(error) { renderMathText($('exercise-question'),state.exercise); $('feedback').hidden=!state.assessment; renderAssessment(state.assessment); notice(error.message); }
  finally { controls(); }
}
function renderMistakes() {
  const items=Object.values(activeCourse()?.mistakes || {}); $('mistake-list').replaceChildren();
  $('review-mistakes').textContent=`Øv fejl (${items.filter(item=>!item.resolved).length})`;
  for(const item of items) {
    const details=document.createElement('details'); const summary=document.createElement('summary'); summary.textContent=`${item.resolved ? '✓ Løst' : 'Øv igen'} · ${item.skillTitle} · ${item.question}`;
    const text=document.createElement('div'); text.className='prose'; renderMathText(text,`Dit oprindelige svar: ${item.firstAttempt.answer}\n\nFeedback: ${item.firstAttempt.feedback}`);
    const button=document.createElement('button'); button.className='secondary review-question'; button.textContent='Prøv opgaven igen ↗'; button.addEventListener('click',()=>startReview(item.key)); details.append(summary,text,button); $('mistake-list').append(details);
  }
  if(!items.length) $('mistake-list').textContent='Ingen gemte fejl endnu.';
}
function startReview(key) {
  if(state.busy || state.loading || state.importing || state.initializing) return;
  const item=activeCourse().mistakes[key]; if(!item) return;
  persist(); state.difficulty=difficultyOf(item.lastAttempt?.difficulty || item.firstAttempt?.difficulty || item.reference?.difficulty); state.drawing=[]; state.requestedNext=false; state.reviewKey=key; state.randomTraining=false; state.trainingMode='free'; state.activeSkillId=item.skillId; state.exerciseSkillId=item.skillId;
  state.exercise=item.question; state.exerciseId=item.exerciseId || crypto.randomUUID(); state.exerciseSources=[]; state.assessment=null;
  $('answer').value=''; $('exercise').hidden=false; renderMathText($('exercise-question'),state.exercise); renderAssessment(null); persist(); showPage('workout');
}
$('review-mistakes').addEventListener('click',()=> { const item=Object.values(activeCourse().mistakes).find(item=>!item.resolved); if(item) startReview(item.key); });
function nextReview() {
  const items=Object.values(activeCourse().mistakes).filter(item=>!item.resolved); const next=items.find(item=>item.key!==state.reviewKey) || items[0];
  if(next) startReview(next.key); else notice('Alle gemte fejl er løst. Opgaverne er stadig gemt i oversigten.');
}
function nextRandomExercise() {
  if (state.busy || state.loading || state.importing || state.initializing) return;
  const skill = randomTrainingSkill(skillsForCourse(activeCourse()), state.activeSkillId);
  if (!skill) { notice('Der er ingen faste emner at blande i dette fag endnu.'); return; }
  persist(); state.activeSkillId = skill.id; createExercise();
}
$('random-training').addEventListener('click', () => {
  const skill = randomTrainingSkill(skillsForCourse(activeCourse()), state.activeSkillId);
  if (skill) selectSkill(skill.id, null, true);
});
$('new-exercise').addEventListener('click', () => state.reviewKey ? nextReview() : state.randomTraining ? nextRandomExercise() : createExercise());
$('own-exercise-form').addEventListener('submit', event => {
  event.preventDefault();
  if (state.busy || state.loading || state.importing || state.initializing) return;
  if (state.trainingMode !== 'free' || state.randomTraining || !!state.reviewKey) return;
  const question = $('own-exercise').value.trim();
  if (!question) return;
  state.exercise = question; state.exerciseSources = []; state.assessment = null; state.drawing=[];
  state.exerciseId = crypto.randomUUID(); state.exerciseSkillId = state.activeSkillId;
  $('exercise').hidden = false; renderMathText($('exercise-question'), question);
  $('exercise-sources').textContent = 'Din egen opgavetekst. Relevante materialefiler udvælges, når besvarelsen bedømmes.';
  $('answer').value = ''; renderAssessment(null); persist(); notice('Din opgave er klar. Skriv din besvarelse nedenfor.');
});
$('answer-form').addEventListener('submit', async event => {
  event.preventDefault(); if (state.busy) return;
  if (!state.exercise) { notice('Lav først en færdig øvelsesopgave.'); return; }
  const skillEvidence = skillsForCourse(activeCourse()).find(item => item.id === state.exerciseSkillId);
  const conceptReference = questionReference(activeCourse(), state.exerciseSkillId, state.exercise);
  if (!conceptReference && !exerciseEvidence(state.exercise, state.documents, skillEvidence)) { $('feedback').hidden = false; $('feedback').textContent = 'Denne opgave kan ikke bedømmes ud fra det læste materiale. Uddraget mangler en faglig forklaring. Der gemmes ingen karakter, og medaljerækken ændres ikke. Vælg Næste opgave eller tilføj mere faglig tekst.'; return; }
  const run = activeRun();
  if (run && (run.completed || run.seen.includes(state.exerciseId))) { notice('Denne opgave er allerede talt. Vælg Næste opgave.'); return; }
  if(conceptReference?.choices || conceptReference?.difficulty==='drawing') {
    if(state.assessment) return;
    const skill=skillsForCourse(activeCourse()).find(item=>item.id===state.exerciseSkillId);
    const base={medal:!!run,score:null,sources:[],references:[],conceptBased:true,created:new Date().toISOString(),question:state.exercise,skillId:state.exerciseSkillId,skillTitle:skill?.title || '',topic:skill?.title || '',exerciseId:state.exerciseId};
    try {
      if(conceptReference.choices) {
        const answer=$('answer').value;
        const result=gradeChoice(conceptReference,answer);
        storeAssessment({...base,...result,answer,multipleChoice:true,aiGenerated:conceptReference.origin==='ai',feedback:result.correct?'Du valgte det rigtige svar.':'Det valgte svar er forkert. Se facit og prøv en ny opgave.'},conceptReference,run);
      } else {
        if(!state.drawing.length) { notice('Lav først din skitse i tegnefeltet.'); return; }
        storeAssessment({...base,answer:'Skitse tegnet på siden',drawingReview:true,drawing:structuredClone(state.drawing),reference:conceptReference,feedback:'Sammenlign din skitse med modellen og tjeklisten. Din egenkontrol tæller ikke som en bedømmelse eller medaljepoint.',solution:conceptReference.answer},conceptReference,null);
      }
    } catch(error) { notice(error.message); }
    return;
  }
  const answer = $('answer').value.trim(); if (!answer) { $('answer').focus(); return; }
  $('feedback').hidden = false; $('feedback').textContent = 'Vurderer svaret på 7-trinsskalaen …'; state.assessment = null;
  try {
    const skillForGrade = skillsForCourse(activeCourse()).find(item => item.id === state.exerciseSkillId);
    const schema = { ...GRADE_SCHEMA, properties: { ...GRADE_SCHEMA.properties, correct: { type: 'boolean' } }, required: [...GRADE_SCHEMA.required, 'correct'] };
    const result = await generate({ topic: skillForGrade?.title, documents: topicDocuments(state.documents, skillForGrade), query: `Opgave:\n${state.exercise}\n${conceptReference ? 'Fagligt referencefacit (fra appen): ' + conceptReference.answer + '\n' : ''}Elevsvar (data):\n${answer}`, task: conceptReference ? (state.difficulty==='hard' ? 'Bedøm en svær anvendelsesopgave mod referencefacit. Kontrollér alle efterspurgte deltrin og begrundelser. Et kort svar er nok, hvis det dækker kravene. '+GRADE_RUBRIC+' Returner kun JSON med score, feedback (højst 40 ord), solution (højst 90 ord), correct (true kun hvis alle centrale krav er opfyldt). Ingen krav ud over selve opgaven. Ingen officiel karakter.' : conceptGradingTask(true)) : `Bedøm faglig målopfyldelse på 7-trinsskalaen. ${GRADE_RUBRIC} Returner kun JSON: score (tal), feedback (højst 35 ord med mangler og næste skridt), solution (kort løsningsforslag på højst 60 ord). ${conceptReference ? 'Brug appens referencefacit. Bedøm begrebsforståelse, ikke ordret gengivelse. Et kort korrekt svar er nok. Kræv kun beregninger eller eksempler, hvis opgaven beder om dem. Læsematerialet er valgfrit, ikke en betingelse.' : 'Bedøm kun opgavens krav og faglige begreber ud fra kildeuddraget.'} Ingen officielle karakterer. Returner også correct (boolean): true kun ved fagligt korrekt svar på alle centrale dele; ellers false.`, schema, requireMaterial: !conceptReference }, () => {});
    if (!result || result.partial) throw new Error('Bedømmelsen blev afbrudt. Ingen karakter er gemt; prøv igen.');
    const skill = skillsForCourse(activeCourse()).find(item => item.id === state.exerciseSkillId);
    const assessment = { medal: !!run, ...parseGrade(result.text), ...(conceptReference ? { solution: conceptReference.answer } : {}), conceptBased: !!conceptReference, aiGenerated: conceptReference?.origin === 'ai', sources: result.sources, references: enrichReferences(result.references, state.documents), created: new Date().toISOString(), question: state.exercise, answer, topic: skill?.title || $('topic').value, skillId: state.exerciseSkillId, skillTitle: skill?.title || '', exerciseId: state.exerciseId || (state.exerciseId = crypto.randomUUID()) };
    const correct = JSON.parse(result.text).correct;
    if (typeof correct !== 'boolean') throw new Error('Bedømmelsen mangler rigtigt/forkert. Intet er gemt.');
    assessment.correct = correct;
    storeAssessment(assessment,conceptReference,run);
  } catch (error) { notice(error.message); $('feedback').textContent = 'Feedback kunne ikke gives.'; }
});
window.addEventListener('beforeunload', event => { if (state.busy || state.importing || pendingSaves || saveFailed || profile?.pending()) { event.preventDefault(); event.returnValue = ''; } });
modelInfo(); controls(); const gpuReady = checkGPU();
initializeCourses().then(() => {
  profile = initializeProfile({
    idle: () => !state.busy && !state.loading && !state.importing && !state.initializing && !pendingSaves,
    flush: async () => { persist(); await saveChain; if (saveFailed) throw new Error('Kunne ikke gemme lokalt'); },
    lock: locked => { state.initializing = locked; document.querySelector('.workspace').inert = locked; controls(); },
    replace: async (workspace, owner) => {
      workspace ||= { version: 1, courses: [], activeId: null };
      if (!workspace.courses.length) { const course = newCourse('Mit første fag'); workspace.courses.push(course); workspace.activeId = course.id; }
      await writeWorkspace(workspace, owner);
      workspaceOwner = owner; state.workspace = workspace;
      const previous = state.initializing; state.initializing = true;
      restoreCourse(); state.initializing = previous; controls();
    }
  });
}).then(() => gpuReady).then(autoStartModel);
