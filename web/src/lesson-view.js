import { lessonFor, lessonProgress, answerLesson } from './lessons.js';

export function createLessonView({ activeCourse, persist, showPage, renderText }) {
  const page = document.createElement('section'); page.id = 'page-lesson'; page.className = 'page'; page.hidden = true;
  const panel = document.getElementById('course-panel'); panel.insertBefore(page, panel.querySelector('footer'));
  let selectedId, selectedTitle;
  const element = (tag, text, parent, className = '') => {
    const node = document.createElement(tag); node.className = className;
    if (text) renderText(node, text); parent.append(node); return node;
  };
  const button = (text, parent, action, className = 'secondary') => {
    const node = element('button', text, parent, className); node.type = 'button'; node.onclick = action; return node;
  };
  function render() {
    const course = activeCourse(), lesson = lessonFor(selectedId); if (!course || !lesson) return;
    const progress = lessonProgress(course, selectedId); page.replaceChildren();
    window.scrollTo({ top: 0, behavior: 'instant' });
    button('← Tilbage til læseplanen', page, () => showPage('chat'));
    element('p', 'LÆS · FORSTÅ · PRØV SELV', page, 'eyebrow');
    const heading = element('h1', selectedTitle, page); heading.tabIndex = -1;
    element('p', 'En kort introduktion og fem spørgsmål. Du behøver ikke starte AI. Forløbet gemmes i dette fag.', page, 'hint');
    const theory = document.createElement(progress.started ? 'details' : 'section'); theory.className = 'card'; page.append(theory);
    element(progress.started ? 'summary' : 'h2', 'Teori og eksempel', theory);
    for (const paragraph of lesson.theory) { element('h3', paragraph.title, theory); element('p', paragraph.text, theory); }
    element('h3', 'Et eksempel', theory); element('p', lesson.example.question, theory); element('p', lesson.example.answer, theory);
    element('p', 'Dette er en kort begrebsintroduktion. Dit materiale og læselinkene i læseplanen giver mere dybde.', theory, 'hint');
    if (!progress.started) {
      button('Jeg har læst teorien · Start de 5 spørgsmål →', page, () => { progress.started = true; persist(); render(); }, 'primary'); return;
    }
    const quiz = element('section', '', page, 'card lesson-quiz');
    if (progress.index >= 5) {
      const correct = progress.answers.filter(answer => answer.correct).length;
      element('h2', `Forløbet er færdigt · ${correct} af 5 rigtige`, quiz);
      element('p', correct === 5 ? 'Godt klaret! Du kan nu gå videre til fri træning.' : 'Læs forklaringerne til de spørgsmål, der drillede, og prøv gerne igen.', quiz);
      for (const [index, question] of lesson.questions.entries()) {
        element('h3', `${progress.answers[index]?.correct ? '✓' : '↻'} ${question.question}`, quiz);
        element('p', question.explanation, quiz);
      }
      button('Læs og prøv igen', quiz, () => { course.lessons[selectedId] = { version: lesson.version, started: false, answers: [], index: 0, previous: progress.answers }; persist(); render(); });
      return;
    }
    const index = progress.index, question = lesson.questions[index], answer = progress.answers[index];
    element('p', `Spørgsmål ${index + 1} af 5`, quiz, 'eyebrow');
    element('h2', question.question, quiz);
    const form = element('form', '', quiz), group = element('fieldset', '', form);
    element('legend', 'Vælg ét svar', group);
    question.choices.forEach((choice, number) => {
      const label = element('label', '', group, 'choice-option');
      const radio = document.createElement('input'); radio.type = 'radio'; radio.name = 'lesson-choice'; radio.value = String(number); radio.required = true;
      radio.disabled = !!answer; radio.checked = answer?.choice === number; label.append(radio); element('span', choice, label);
    });
    if (!answer) {
      const submit = element('button', 'Se svar →', form, 'primary'); submit.type = 'submit';
      form.onsubmit = event => { event.preventDefault(); const choice = Number(new FormData(form).get('lesson-choice')); if (answerLesson(course, selectedId, choice)) { persist(); render(); } };
    } else {
      const feedback = element('div', '', quiz, 'worked-solution'); feedback.setAttribute('role', 'status');
      element('h3', answer.correct ? '✓ Rigtigt' : 'Ikke helt · her er forklaringen', feedback); element('p', question.explanation, feedback);
      button(index === 4 ? 'Se dit resultat →' : 'Næste spørgsmål →', quiz, () => { progress.index++; persist(); render(); }, 'primary');
    }
    heading.focus({ preventScroll: true });
  }
  return (id, title) => { selectedId = id; selectedTitle = title; showPage('lesson'); render(); };
}
