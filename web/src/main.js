import './style.css';
import { MODELS, buildMessages, visibleAnswer } from './study.js';

const $ = id => document.getElementById(id);
const state = { engine: null, worker: null, loading: false, busy: false, importing: false, supported: false, history: [], documents: [], exercise: '', stop: false, cancelLoad: null, failGeneration: null };
const notice = text => { $('action-status').textContent = text; };
const controls = () => {
  $('send').disabled = state.importing || (!state.engine && !state.busy);
  $('send').textContent = state.busy ? 'Stop svar ■' : 'Send spørgsmål ↑';
  for (const id of ['new-exercise', 'grade']) $(id).disabled = !state.engine || state.busy || state.importing;
  for (const id of ['model', 'subject', 'topic', 'files', 'clear-chat']) $(id).disabled = state.busy || state.loading || state.importing;
  $('model').disabled ||= !!state.engine;
  for (const button of document.querySelectorAll('#file-list button, [data-prompt]')) button.disabled = state.busy || state.loading;
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
  state.history = []; state.exercise = ''; $('exercise').hidden = true; $('feedback').hidden = true;
  $('messages').replaceChildren(); message('assistant', 'Vi starter på en frisk. Hvad vil du gerne arbejde med?');
  notice('Samtale og øvelsesopgave er nulstillet til dit nye fag, fokus eller materiale.');
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
  } finally { clearTimeout(timer); state.cancelLoad = null; state.loading = false; $('download-progress').hidden = true; controls(); }
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
      const stream = await state.engine.chat.completions.create({ messages, stream: true, max_tokens: 640, temperature: 0.4, extra_body: { enable_thinking: false } });
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
    if (result.sources.length) { const source = document.createElement('small'); source.className = 'source-label'; source.textContent = `Udvalgte kildeuddrag: ${result.sources.join(', ')}. Ikke hele dokumentet.`; output.wrapper.append(source); }
    state.history.push({ role: 'user', content: query }, { role: 'assistant', content: result.text, partial: result.partial });
    state.history = state.history.slice(-20);
  } catch (error) { notice(error.message); if (output) output.body.textContent = 'Spørgsmålet kunne ikke behandles.'; }
});
$('question').addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); $('chat-form').requestSubmit(); } });
document.querySelectorAll('[data-prompt]').forEach(button => button.addEventListener('click', () => { $('question').value = button.dataset.prompt; $('question').focus(); if (!state.engine) $('settings').showModal(); }));
document.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.page').forEach(page => { page.hidden = page.id !== `page-${button.dataset.page}`; });
  document.querySelectorAll('.nav').forEach(nav => nav.classList.toggle('active', nav === button));
}));
$('clear-chat').addEventListener('click', resetContext);
for (const id of ['subject', 'topic']) $(id).addEventListener('change', resetContext);

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
  $('file-count').textContent = `${state.documents.length} filer`; $('file-list').replaceChildren();
  state.documents.forEach((doc, index) => {
    const li = document.createElement('li'); const span = document.createElement('span'); span.textContent = doc.name;
    const remove = document.createElement('button'); remove.textContent = '×'; remove.setAttribute('aria-label', `Fjern ${doc.name}`);
    remove.addEventListener('click', () => { if (state.busy || state.loading) return; state.documents.splice(index, 1); renderFiles(); resetContext(); });
    li.append(span, remove); $('file-list').append(li);
  }); controls();
}
$('files').addEventListener('change', async () => {
  if (state.importing || state.busy || state.loading) return;
  state.importing = true; controls();
  const files = [...$('files').files]; const results = []; let added = 0;
  for (const file of files) {
    try {
      if (state.documents.length >= 6) throw new Error('Der kan højst være 6 filer i denne prøveversion.');
      if (file.size > 10 * 1024 * 1024) throw new Error('Filen er større end 10 MB.');
      if (!/\.(pdf|txt|md)$/i.test(file.name)) throw new Error('Vælg PDF, TXT eller Markdown.');
      $('file-status').textContent = `Læser ${file.name} lokalt …`;
      let text;
      if (/\.pdf$/i.test(file.name)) {
        const pdfjs = await import('pdfjs-dist');
        const { default: workerURL } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
        pdfjs.GlobalWorkerOptions.workerSrc = workerURL;
        const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false }).promise;
        try {
          const pages = []; let length = 0;
          for (let i = 1; i <= Math.min(pdf.numPages, 60); i++) {
            const page = await pdf.getPage(i); const content = await page.getTextContent();
            const pageText = `Side ${i}\n${content.items.map(item => item.str || '').join(' ')}`;
            pages.push(pageText); length += pageText.length; if (length >= 150000) break;
          }
          text = pages.join('\n\n');
          if (!text.replace(/Side \d+/g, '').trim()) throw new Error('PDF’en har ingen læsbar tekst. Scanninger og billeder kræver tekstgenkendelse.');
          if (pdf.numPages > 60 || length >= 150000) results.push(`${file.name}: kun de første højst 60 sider / 150.000 tegn blev læst.`);
        } finally { await pdf.destroy(); }
      } else { text = await file.text(); }
      if (!text.trim()) throw new Error('Filen er tom.');
      if (text.length > 150000) results.push(`${file.name}: teksten blev begrænset til 150.000 tegn.`);
      state.documents.push({ name: file.name, text: text.slice(0, 150000) }); added++;
    } catch (error) { results.push(`${file.name}: ${error.message}`); }
  }
  state.importing = false; $('files').value = ''; renderFiles();
  if (added) resetContext();
  $('file-status').textContent = results.join('\n') || `${added} fil(er) læst lokalt. Kun korte, søgeordsbaserede uddrag bruges i hvert svar; relevante afsnit kan blive overset.`;
});
$('new-exercise').addEventListener('click', async () => {
  if (state.busy) return;
  if (!$('subject').value.trim() && !$('topic').value.trim() && !state.documents.length) { notice('Skriv et fag eller fokus i sidepanelet først.'); $('subject').focus(); return; }
  $('exercise').hidden = false; $('exercise-question').textContent = 'Laver en opgave …'; $('feedback').hidden = true; $('answer').value = ''; state.exercise = '';
  try {
    const result = await generate({ query: 'Lav én kort øvelsesopgave på højst 70 ord om mit fokus. Opgaven skal kunne løses med oplysningerne i kildeuddragene, hvis de findes. Ingen billeder. Medtag alle nødvendige oplysninger ved regneopgaver. Skriv kun opgaven, ikke kriterier, facit eller hints.', task: 'Du laver en øvelsesopgave. Afslør ikke svaret. Opfind ikke ekstra krav eller beregninger, der mangler data i materialet.' }, text => { $('exercise-question').textContent = text; });
    if (result?.text && !result.partial) state.exercise = result.text;
    else { $('exercise-question').textContent = result?.text || 'Der blev ikke lavet en opgave.'; notice('Opgaven blev ikke færdig. Lav en ny opgave, før du svarer.'); }
  } catch (error) { notice(error.message); }
});
$('answer-form').addEventListener('submit', async event => {
  event.preventDefault(); if (state.busy) return;
  if (!state.exercise) { notice('Lav først en færdig øvelsesopgave.'); return; }
  const answer = $('answer').value.trim(); if (!answer) { $('answer').focus(); return; }
  $('feedback').hidden = false; $('feedback').textContent = 'Ser på din tankegang …';
  try {
    const result = await generate({ query: `Opgave:\n${state.exercise}\nMit svar:\n${answer}`, task: 'Giv vejledende feedback på elevsvaret: hvad er godt, hvad skal rettes og ét næste skridt. Vis korrekt fremgangsmåde. Ingen tal-karakter eller påstand om officiel bedømmelse.' }, text => { $('feedback').textContent = text; });
    if (result && !result.text) $('feedback').textContent = 'Der kom ingen feedback. Prøv igen.';
  } catch (error) { notice(error.message); $('feedback').textContent = 'Feedback kunne ikke gives.'; }
});
window.addEventListener('beforeunload', event => { if (state.busy || state.history.length || state.documents.length || $('notes').value.trim()) { event.preventDefault(); event.returnValue = ''; } });
modelInfo(); controls(); checkGPU();
