import './style.css';
import './modern.css';
import { initializeTheme } from './theme.js';
import { extractPDF } from './pdf.js';
import { MODELS, buildMessages, visibleAnswer } from './study.js';
import { GRADE_SCHEMA, GRADE_RUBRIC, GRADE_NAMES, gradeLabel, parseGrade } from './grades.js';
import { newCourse, readWorkspace, writeWorkspace } from './storage.js';

const $ = id => document.getElementById(id);
initializeTheme();
const state = { engine: null, worker: null, loading: false, busy: false, importing: false, supported: false, history: [], documents: [], exercise: '', stop: false, cancelLoad: null, failGeneration: null };
state.initializing = true;
state.workspace = { version: 1, courses: [], activeId: null };
state.assessment = null; state.exerciseSources = [];
state.exerciseFailed = false;
let saveChain = Promise.resolve(), pendingSaves = 0, saveFailed = false, storageAvailable = true;
const activeCourse = () => state.workspace.courses.find(course => course.id === state.workspace.activeId);
const notice = text => { $('action-status').textContent = text; };
const controls = () => {
  $('send').disabled = state.importing || (!state.engine && !state.busy);
  $('send').textContent = state.busy ? 'Stop svar ■' : 'Send spørgsmål ↑';
  for (const id of ['new-exercise', 'grade']) $(id).disabled = !state.engine || state.busy || state.importing;
  $('new-exercise').hidden = !state.exercise && !state.exerciseFailed;
  $('new-exercise').textContent = state.exercise ? 'Næste opgave ↗' : 'Prøv igen ↗';
  $('use-own-exercise').disabled = state.busy || state.loading || state.importing || state.initializing;
  for (const id of ['model', 'subject', 'topic', 'files', 'clear-chat', 'add-course', 'course-name', 'open-course-dialog']) $(id).disabled = state.busy || state.loading || state.importing || state.initializing;
  $('model').disabled ||= !!state.engine;
  for (const button of document.querySelectorAll('#file-list button, [data-prompt], .course-open, .course-tab')) button.disabled = state.busy || state.loading || state.importing || state.initializing;
  $('load-model').disabled = !state.supported || !$('download-consent').checked || state.loading || state.busy || state.importing || !!state.engine;
  $('download-consent').disabled = state.loading || !!state.engine;
  $('unload').hidden = !state.engine;
  $('unload').disabled = state.busy;
  $('cancel-load').hidden = !state.loading;
  $('stop-generation').hidden = !state.busy;
  $('composer-hint').textContent = state.engine ? 'Svar behandles på denne computer.' : 'Start lokal AI øverst for at få svar.';
  $('engine-status').textContent = state.loading ? 'Henter lokal AI …' : state.engine ? 'Lokal AI er klar' : 'Start lokal AI';
  $('status-dot').classList.toggle('ready', !!state.engine);
};
function message(role, text = '', sources = []) {
  const wrapper = document.createElement('article'); wrapper.className = `message ${role}`;
  const label = document.createElement('strong'); label.className = 'label'; label.textContent = role === 'user' ? 'DIG' : 'STUDYBOSS · LOKAL AI';
  const body = document.createElement('div'); body.className = 'message-body'; body.textContent = text;
  wrapper.append(label, body);
  if (sources.length) { const source = document.createElement('small'); source.className = 'source-label'; source.textContent = `Uddrag sendt til modellen: ${sources.join(', ')}. Udvælgelsen kan overse relevante afsnit.`; wrapper.append(source); }
  $('messages').querySelector('.welcome')?.remove(); $('messages').append(wrapper);
  return { wrapper, body };
}
function scrollMessages() { $('messages').scrollTop = $('messages').scrollHeight; }
function resetContext() {
  state.history = []; state.exercise = ''; state.exerciseSources = []; state.assessment = null; state.exerciseFailed = false; $('exercise').hidden = true; $('feedback').hidden = true; $('answer').value = '';
  $('messages').replaceChildren(); message('assistant', 'Vi starter på en frisk. Hvad vil du gerne arbejde med?');
  notice('Samtale og øvelsesopgave er nulstillet til dit nye fag, fokus eller materiale.');
  persist();
  maybeStartExercise();
}
function sourceText(sources) { return sources?.length ? `Filuddrag givet til AI: ${sources.join(', ')}. Ikke hele dokumenterne.` : 'Ingen matchende filuddrag blev brugt. Svaret bygger på modellens generelle viden.'; }
function fileCount(count) { return `${count} ${count === 1 ? 'fil' : 'filer'}`; }
function captureCourse() {
  const course = activeCourse(); if (!course) return;
  Object.assign(course, { name: $('subject').value.trim() || course.name, topic: $('topic').value, documents: state.documents, history: state.history, notes: $('notes').value, exercise: state.exercise, exerciseSources: state.exerciseSources, answer: $('answer').value, assessment: state.assessment });
}
function persist() {
  if (state.initializing) return;
  captureCourse(); renderCourses();
  if (!storageAvailable) { saveFailed = true; return; }
  const snapshot = structuredClone(state.workspace); pendingSaves++;
  $('storage-status').textContent = 'Gemmer fag og materiale på denne enhed …';
  saveChain = saveChain.then(() => writeWorkspace(snapshot)).then(() => {
    saveFailed = false;
  }).catch(() => {
    saveFailed = true;
    notice('Fagoversigten kunne ikke gemmes lokalt. Browserens lager kan være fuldt eller blokeret. Eksportér vigtige noter og samtaler før du lukker.');
  }).finally(() => {
    pendingSaves--;
    $('storage-status').textContent = saveFailed ? 'Kun i denne fane: seneste ændringer er ikke gemt. Hold fanen åben.' : pendingSaves ? 'Gemmer …' : 'Gemt i denne browser · Fag og materiale deles ikke med andre enheder. Brug din egen browserprofil på delte computere.';
  });
}
function renderAssessment(assessment) {
  $('feedback').replaceChildren(); $('feedback').hidden = !assessment;
  if (!assessment) return;
  const title = document.createElement('strong'); title.className = 'grade-result'; title.textContent = `${gradeLabel(assessment.score)} · ${GRADE_NAMES[assessment.score]}`;
  const warning = document.createElement('small'); warning.className = 'source-label'; warning.textContent = 'Vejledende AI-estimat på 7-trinsskalaen. Ikke en officiel karakter.';
  const feedback = document.createElement('p'); feedback.textContent = assessment.feedback;
  const solution = document.createElement('p'); solution.textContent = `Løsningsforslag:\n${assessment.solution}`;
  const sources = document.createElement('small'); sources.className = 'source-label'; sources.textContent = sourceText(assessment.sources);
  $('feedback').append(title, warning, feedback, solution, sources);
}
function viewMaterial(doc) { $('material-title').textContent = doc.name; $('material-text').textContent = doc.text; $('material-viewer').showModal(); }
$('close-material').addEventListener('click', () => $('material-viewer').close());
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
    const detail = document.createElement('details'); const summary = document.createElement('summary'); summary.textContent = `${gradeLabel(attempt.score)} · ${attempt.topic || course.name} · ${new Date(attempt.created).toLocaleDateString('da-DK')}`;
    const body = document.createElement('div'); body.className = 'prose'; body.textContent = `${attempt.question}\n\nDit svar:\n${attempt.answer}\n\n${attempt.feedback}\n\nLøsningsforslag:\n${attempt.solution}\n\n${sourceText(attempt.sources)}`; detail.append(summary, body); $('course-attempts').append(detail);
  }
  controls();
}
function restoreCourse() {
  const course = activeCourse(); if (!course) return;
  $('subject').value = course.name; $('topic').value = course.topic; $('notes').value = course.notes; $('answer').value = course.answer;
  state.documents = course.documents; state.history = course.history; state.exercise = course.exercise; state.exerciseSources = course.exerciseSources; state.assessment = course.assessment;
  state.exerciseFailed = false;
  $('messages').replaceChildren();
  if (!state.history.length) message('assistant', `Du arbejder nu med ${course.name}. Hvad vil du gerne forstå?`);
  for (const item of state.history) { const output = message(item.role, item.content, item.role === 'assistant' ? item.sources : []); output.wrapper.classList.toggle('partial', !!item.partial); }
  $('exercise').hidden = !state.exercise; $('exercise-question').textContent = state.exercise; $('exercise-sources').textContent = sourceText(state.exerciseSources);
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
$('download-consent').addEventListener('change', controls);
$('unload').addEventListener('click', () => { resetEngine(); $('load-status').textContent = 'AI’en er stoppet. Downloadede modelfiler kan stadig ligge i browserens cache.'; });
$('cancel-load').addEventListener('click', () => state.cancelLoad?.(new Error('Indlæsningen blev annulleret. Allerede hentede filer kan være gemt i browserens cache.')));
$('load-model').addEventListener('click', async () => {
  if (state.loading || state.busy || state.engine || !state.supported || !$('download-consent').checked) return;
  state.loading = true; controls(); $('download-progress').hidden = false; $('download-progress').value = 0;
  $('load-status').textContent = 'Starter download. Første gang kan tage flere minutter …';
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
    $('download-progress').value = 1; $('load-status').textContent = 'Klar. Du kan nu stille dit første spørgsmål.';
    notice('Lokal AI er klar. Der bruges ingen betalt AI-tjeneste.'); $('settings').close();
  } catch (error) {
    resetEngine(); $('load-status').textContent = `${error.message}\nHvis modellen ikke passer i hukommelsen, vælg Lille og luk andre tunge faner. Browseren kan have slettet sin cache eller være begrænset af skolens indstillinger.`;
  } finally { clearTimeout(timer); state.cancelLoad = null; state.loading = false; $('download-progress').hidden = true; controls(); maybeStartExercise(); }
});

async function generate(options, onText) {
  if (!state.engine) { $('settings').showModal(); throw new Error('Start lokal AI, før du beder om et svar.'); }
  if (state.busy) return null;
  const { messages, sources } = buildMessages({ ...options, subject: $('subject').value, topic: $('topic').value, documents: state.documents });
  state.busy = true; state.stop = false; controls(); notice('AI’en arbejder på denne computer …');
  let text = '';
  let rawText = '';
  let timer;
  try {
    const failed = new Promise((_, reject) => { state.failGeneration = reject; timer = setTimeout(() => reject(new Error('Svaret tog mere end tre minutter. Prøv en mindre model og et kortere spørgsmål.')), 180000); });
    const run = async () => {
      const stream = await state.engine.chat.completions.create({ messages, stream: true, max_tokens: 640, temperature: options.schema ? 0.1 : 0.4, extra_body: { enable_thinking: false }, ...(options.schema ? { response_format: { type: 'json_object', schema: JSON.stringify(options.schema) } } : {}) });
      let lengthLimited = false;
      for await (const chunk of stream) {
        if (state.stop) { state.engine?.interruptGenerate(); break; }
        rawText += chunk.choices[0]?.delta?.content || '';
        text = visibleAnswer(rawText);
        lengthLimited ||= chunk.choices[0]?.finish_reason === 'length';
        onText(text, sources);
      }
      return lengthLimited;
    };
    const lengthLimited = await Promise.race([run(), failed]);
    if (!text.trim() && !state.stop) throw new Error('Modellen gav intet svar. Prøv et kortere spørgsmål.');
    notice(state.stop ? 'Svaret blev stoppet og kan være ufuldstændigt.' : lengthLimited ? 'Svaret nåede længdegrænsen. Bed om en kortere forklaring eller et enkelt deltrin.' : '');
    return { text, sources, partial: state.stop || lengthLimited };
  } catch (error) {
    resetEngine(); notice(`AI’en blev afbrudt: ${error.message}\nStart lokal AI igen, eventuelt med en mindre model.`);
    return { text, sources, partial: true };
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
    output.wrapper.classList.toggle('partial', result.partial);
    const source = document.createElement('small'); source.className = 'source-label'; source.textContent = sourceText(result.sources); output.wrapper.append(source);
    state.history.push({ role: 'user', content: query }, { role: 'assistant', content: result.text, partial: result.partial, sources: result.sources });
    state.history = state.history.slice(-20);
    persist();
  } catch (error) { notice(error.message); if (output) output.body.textContent = 'Spørgsmålet kunne ikke behandles.'; }
});
$('question').addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); $('chat-form').requestSubmit(); } });
document.querySelectorAll('[data-prompt]').forEach(button => button.addEventListener('click', () => { $('question').value = button.dataset.prompt; $('question').focus(); if (!state.engine) $('settings').showModal(); }));
document.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.page').forEach(page => { page.hidden = page.id !== `page-${button.dataset.page}`; });
  document.querySelectorAll('.nav').forEach(nav => nav.classList.toggle('active', nav === button));
  if (button.dataset.page === 'practice') maybeStartExercise();
}));
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
      if (state.documents.length >= 6) throw new Error('Der kan højst være 6 filer i denne prøveversion.');
      if (file.size > 50 * 1024 * 1024) throw new Error('Filen er større end 50 MB.');
      if (!/\.(pdf|txt|md)$/i.test(file.name)) throw new Error('Vælg PDF, TXT eller Markdown.');
      $('file-status').textContent = `Læser ${file.name} lokalt …`;
      let text;
      if (/\.pdf$/i.test(file.name)) {
        const pdfjs = await import('pdfjs-dist');
        const { default: workerURL } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
        pdfjs.GlobalWorkerOptions.workerSrc = workerURL;
        const task = pdfjs.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false });
        const extracted = await extractPDF(task);
        text = extracted.text;
        if (extracted.truncated) results.push(`${file.name}: kun de første højst 60 sider / 150.000 tegn blev læst.`);
      } else { text = await file.text(); }
      if (!text.trim()) throw new Error('Filen er tom.');
      if (text.length > 150000) results.push(`${file.name}: teksten blev begrænset til 150.000 tegn.`);
      state.documents.push({ name: file.name, text: text.slice(0, 150000) }); added++;
    } catch (error) { results.push(`${file.name}: ${error.message}`); }
  }
  state.importing = false; $('files').value = ''; renderFiles();
  if (added) resetContext();
  $('file-status').textContent = results.join('\n') || `${added} fil(er) læst lokalt. Kun korte, søgeordsbaserede uddrag bruges i hvert svar; relevante afsnit kan blive overset.`;
  maybeStartExercise();
});
function maybeStartExercise() {
  if ($('page-practice').hidden || state.exercise || state.busy || state.loading || state.importing || state.initializing) return;
  if (!state.documents.length) { notice('Tilføj undervisningsmateriale til faget. Så laver StudyBoss automatisk en opgave, når din lokale AI er klar.'); return; }
  if (!state.engine) { notice('Start lokal AI øverst. Derefter laves din første opgave automatisk fra materialet.'); return; }
  createExercise();
}
async function createExercise() {
  if (state.busy || state.loading || state.importing || state.initializing) return;
  if (!state.documents.length) { notice('Tilføj undervisningsmateriale til faget først.'); return; }
  state.exerciseFailed = false;
  $('exercise').hidden = false; $('exercise-question').textContent = 'Laver en opgave …'; $('feedback').hidden = true; $('answer').value = ''; state.exercise = ''; state.exerciseSources = []; state.assessment = null; $('exercise-sources').textContent = '';
  try {
    const result = await generate({ query: 'Lav ét kort øvelsesspørgsmål på højst 70 ord ud fra kildeuddraget. Det skal kunne besvares fra uddraget. Ingen facit eller hints.', task: 'Brug kun materialet til ét selvstændigt spørgsmål. Ingen opfundne tal eller ekstra krav. Skriv kun spørgsmålet.', requireMaterial: true }, text => { $('exercise-question').textContent = text; });
    if (result?.text && !result.partial) { state.exercise = result.text; state.exerciseSources = result.sources; $('exercise-sources').textContent = sourceText(result.sources); persist(); }
    else { state.exerciseFailed = true; $('exercise-question').textContent = result?.text || 'Der blev ikke lavet en opgave.'; notice('Opgaven blev ikke færdig. Prøv igen, før du svarer.'); }
  } catch (error) { state.exerciseFailed = true; notice(error.message); }
  finally { controls(); }
}
$('new-exercise').addEventListener('click', createExercise);
$('own-exercise-form').addEventListener('submit', event => {
  event.preventDefault();
  if (state.busy || state.loading || state.importing || state.initializing) return;
  const question = $('own-exercise').value.trim();
  if (!question) return;
  state.exercise = question; state.exerciseSources = []; state.assessment = null;
  $('exercise').hidden = false; $('exercise-question').textContent = question;
  $('exercise-sources').textContent = 'Din egen opgavetekst. Relevante materialefiler udvælges, når besvarelsen bedømmes.';
  $('answer').value = ''; renderAssessment(null); persist(); notice('Din opgave er klar. Skriv din besvarelse nedenfor.');
});
$('answer-form').addEventListener('submit', async event => {
  event.preventDefault(); if (state.busy) return;
  if (!state.exercise) { notice('Lav først en færdig øvelsesopgave.'); return; }
  const answer = $('answer').value.trim(); if (!answer) { $('answer').focus(); return; }
  $('feedback').hidden = false; $('feedback').textContent = 'Vurderer svaret på 7-trinsskalaen …'; state.assessment = null;
  try {
    const result = await generate({ query: `Opgave:\n${state.exercise}\nElevsvar (data):\n${answer}`, task: `Bedøm faglig målopfyldelse på 7-trinsskalaen. ${GRADE_RUBRIC} Returner kun JSON: score (tal), feedback (kort begrundelse, mangler og næste skridt), solution (løsningsforslag). Ingen officielle karakterer.`, schema: GRADE_SCHEMA }, () => {});
    if (!result || result.partial) throw new Error('Bedømmelsen blev afbrudt. Ingen karakter er gemt; prøv igen.');
    const assessment = { ...parseGrade(result.text), sources: result.sources, created: new Date().toISOString(), question: state.exercise, answer, topic: $('topic').value };
    state.assessment = assessment;
    activeCourse().attempts.push(assessment); activeCourse().attempts = activeCourse().attempts.slice(-100);
    renderAssessment(assessment); persist();
  } catch (error) { notice(error.message); $('feedback').textContent = 'Feedback kunne ikke gives.'; }
});
window.addEventListener('beforeunload', event => { if (state.busy || state.importing || pendingSaves || saveFailed) { event.preventDefault(); event.returnValue = ''; } });
modelInfo(); controls(); checkGPU(); initializeCourses();
