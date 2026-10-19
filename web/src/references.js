// Page numbers come from the extracted PDF markers, never from model output.
export function enrichReferences(references = [], documents = []) {
  return references.filter(ref => typeof ref.name === 'string' && typeof ref.text === 'string' && ref.text.trim()).map(ref => {
    const doc = documents.find(doc => doc.name === ref.name);
    const lines = ref.text.split('\n').map(line => line.trim()).filter(line => line.length > 20 && !/^Side \d+$/u.test(line));
    const anchor = lines.find(line => doc?.text.includes(line) && doc.text.indexOf(line) === doc.text.lastIndexOf(line));
    const offset = anchor ? doc.text.indexOf(anchor) : -1;
    const markers = offset >= 0 ? [...doc.text.slice(0, offset).matchAll(/(?:^|\n)Side (\d+)\n/gu)] : [];
    const page = markers.length ? Number(markers.at(-1)[1]) : null;
    return { name: ref.name, text: ref.text, ...(page ? { page } : {}) };
  });
}
