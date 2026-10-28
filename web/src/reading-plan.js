import { skillsForCourse, substantivePassages, matchesSkillText } from './training.js';
import { webReadingFor } from './reading.js';

const goals = {
  'concept-networks': 'Start med neuroner, vægte og bias. Læs derefter, hvordan lag og et forward pass giver en forudsigelse.',
  'concept-gradient': 'Læs om gradienten og opdateringsreglen. Undersøg derefter, hvordan learning rate påvirker de skridt, modellen tager.',
  'concept-backprop': 'Start med kædereglen. Følg derefter, hvordan gradienter beregnes baglæns gennem et netværk.',
  'concept-cnn': 'Start med filtre og feature maps. Læs derefter om stride, padding og størrelsen på et lags output.',
  'concept-activations': 'Læs, hvorfor et netværk har brug for ikke-linearitet. Sammenlign derefter ReLU og sigmoid.',
  'concept-loss': 'Læs, hvordan en tabsfunktion måler fejl. Sammenlign derefter MSE og cross-entropy og deres anvendelser.',
  'concept-regularization': 'Start med forskellen mellem træningsdata og nye data. Læs derefter om overfitting, validering og regularisering.',
  'concept-algebra': 'Læs om variable og regneregler. Øv derefter at isolere en ubekendt og kontrollere en lignings løsning.',
  'concept-derivatives': 'Start med hældning og ændringshastighed. Læs derefter om afledte og regler for differentiation.',
  'concept-probability': 'Start med sandsynligheder og fordelinger. Læs derefter om forventet værdi og spredning.',
  'concept-fractions': 'Læs om tæller, nævner og fællesnævner. Øv derefter at regne med brøker og omregne mellem brøk, decimaltal og procent.',
  'concept-photosynthesis': 'Start med lys, vand og kuldioxid. Læs derefter om kloroplaster og fotosyntesens delprocesser.'
};

function pages(text) {
  const markers = [...String(text).matchAll(/(?:^|\n)Side (\d+)\n/gu)];
  if (!markers.length) return [{ page: null, text: String(text) }];
  const result = [];
  if (markers[0].index > 0) result.push({ page: null, text: text.slice(0, markers[0].index) });
  for (let i = 0; i < markers.length; i++) {
    result.push({ page: Number(markers[i][1]), text: text.slice(markers[i].index + markers[i][0].length, markers[i + 1]?.index ?? text.length) });
  }
  return result;
}

export function readingPlan(course) {
  const documents = course.documents || [];
  const parsed = documents.map(doc => ({ doc, pages: pages(doc.text || '') }));
  return skillsForCourse(course).map(skill => {
    const materials = parsed.flatMap(({ doc, pages }) => {
      const matching = pages.filter(page => skill.origin === 'general' || matchesSkillText(page.text, skill));
      const references = matching.flatMap(page => {
        const passages = substantivePassages(page.text).filter(text => skill.origin === 'general' || matchesSkillText(text, skill));
        if (!passages.length) return [];
        // These are unchanged sentences from the actual document, not generated quotations.
        return [{ name: doc.name, page: page.page, text: passages.slice(0, 2).join('\n'), doc }];
      });
      return matching.length ? [{ name: doc.name, doc, references, mentionedPages: matching.map(page => page.page).filter(Boolean) }] : [];
    });
    return {
      ...skill, materials, resources: webReadingFor(skill.id),
      guidance: goals[skill.id] || 'Start med afsnittene i dit materiale. Notér centrale begreber, og prøv at forklare dem med dine egne ord.',
      referenceCount: materials.reduce((count, material) => count + material.references.length, 0)
    };
  });
}
