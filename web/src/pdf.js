// PDF.js 6 releases a document through its loading task, not PDFDocumentProxy.
export async function extractPDF(loadingTask, maxPages = Infinity, maxChars = Infinity, onProgress = () => {}) {
  try {
    const pdf = await loadingTask.promise;
    const pages = []; let length = 0;
    for (let i = 1; i <= Math.min(pdf.numPages, maxPages); i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map(item => item.str || '').join(' ');
      pages.push(text.trim() ? `Side ${i}\n${text}` : ''); length += text.length;
      page.cleanup?.();
      onProgress(i, pdf.numPages);
      if (length >= maxChars) break;
    }
    const text = pages.join('\n\n').trim();
    if (!text) throw new Error('PDF’en har ingen læsbar tekst. Scanninger og billeder kræver tekstgenkendelse.');
    return { text: text.slice(0, maxChars), truncated: pdf.numPages > maxPages || text.length > maxChars };
  } finally {
    await loadingTask.destroy();
  }
}
