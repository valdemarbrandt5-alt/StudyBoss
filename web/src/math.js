import renderMathInElement from 'katex/contrib/auto-render';
import 'katex/dist/katex.min.css';

export function renderMathText(element, text) {
  element.textContent = text;
  renderMathInElement(element, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '\\[', right: '\\]', display: true },
      { left: '\\(', right: '\\)', display: false },
      { left: '$', right: '$', display: false },
    ],
    throwOnError: false, trust: false, strict: 'ignore', maxExpand: 1000, maxSize: 20,
  });
}
