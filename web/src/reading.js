// Curated publisher links, not URLs invented by the local language model.
const google = 'https://developers.google.com/machine-learning/crash-course/';
const resource = (title, publisher, url) => ({ title, publisher, url, language: 'Engelsk' });
const neural = resource('Introduktion til neurale netværk', 'Google', google + 'neural-networks');
export const WEB_READING = {
  'concept-networks': [neural],
  'concept-gradient': [resource('Gradient descent forklaret', 'Google', google + 'linear-regression/gradient-descent')],
  'concept-backprop': [resource('Forward pass, backpropagation og beregningsgrafer', 'Dive into Deep Learning', 'https://d2l.ai/chapter_multilayer-perceptrons/backprop.html'), neural],
  'concept-cnn': [resource('Convolution på billeder', 'Dive into Deep Learning', 'https://d2l.ai/chapter_convolutional-neural-networks/conv-layer.html'), resource('Padding, stride og outputstørrelse', 'Dive into Deep Learning', 'https://d2l.ai/chapter_convolutional-neural-networks/padding-and-strides.html')],
  'concept-activations': [resource('ReLU, sigmoid og aktiveringsfunktioner', 'Google', google + 'neural-networks/activation-functions')],
  'concept-loss': [resource('Tabsfunktioner og MSE', 'Google', google + 'linear-regression/loss')],
  'concept-regularization': [resource('Overfitting og generalisering', 'Google', google + 'overfitting/overfitting')],
  'concept-algebra': [resource('Algebra og ligninger', 'Khan Academy', 'https://www.khanacademy.org/math/algebra')],
  'concept-probability': [resource('Sandsynlighed og statistik', 'Khan Academy', 'https://www.khanacademy.org/math/statistics-probability')],
  'concept-fractions': [resource('Brøkregning', 'Khan Academy', 'https://www.khanacademy.org/math/arithmetic/fraction-arithmetic')],
  'concept-derivatives': [resource('Differentialregning', 'Khan Academy', 'https://www.khanacademy.org/calculus')],
  'concept-photosynthesis': [resource('Fotosyntese – et overblik', 'OpenStax', 'https://openstax.org/books/biology-2e/pages/8-1-overview-of-photosynthesis')],
};
export const webReadingFor = skillId => WEB_READING[skillId] || [];
