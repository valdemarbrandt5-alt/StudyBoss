import test from 'node:test';
import assert from 'node:assert/strict';
import { retrieve, buildMessages, bytes, completeStructuredReply } from '../src/study.js';
import { enrichReferences } from '../src/references.js';
test('reading references contain only excerpts actually supplied to the model within the byte budget', () => {
  const docs = [{ name: 'notes.pdf', text: 'Gradient descent adjusts weights. '.repeat(100) }];
  const context = retrieve(docs, 'gradient weights', 120);
  assert.ok(context.references.length);
  assert.ok(bytes(context.text) <= 120);
  for (const ref of context.references) { assert.ok(context.text.includes(ref.text)); assert.ok(docs[0].text.includes(ref.text)); }
  assert.deepEqual(retrieve(docs,'nothing',0).references, []);
  const messages = buildMessages({query:'Explain gradient descent',documents:docs});
  assert.ok(messages.messages.at(-1).content.includes(messages.references[0].text));
});
test('PDF references infer real page markers and keep a snapshot after material removal', () => {
  const docs = [{name:'lesson.pdf',text:'Side 1\nIntroduction and background information.\n\nSide 2\nGradient descent updates weights using a gradient.'}];
  const ref = {name:'lesson.pdf',text:'Gradient descent updates weights using a gradient.'};
  assert.equal(enrichReferences([ref],docs)[0].page,2);
  assert.equal(enrichReferences([ref],[])[0].page,undefined);
  assert.equal(enrichReferences([ref],[])[0].text,ref.text);
  assert.equal(enrichReferences([ref],[{name:'lesson.pdf',text:ref.text}])[0].page,undefined);
  const ambiguous = [{name:'lesson.pdf',text:`Side 1\n${ref.text}\nSide 2\n${ref.text}`}];
  assert.equal(enrichReferences([ref],ambiguous)[0].page,undefined);
});

test('structured feedback ends only after a complete object with all required fields', () => {
  const schema = {required:['score','feedback','solution']};
  assert.equal(completeStructuredReply('{"score":7,"feedback":"ok","solution":"x"}',schema),true);
  assert.equal(completeStructuredReply('{"score":7,"feedback":"ok"}',schema),false);
  assert.equal(completeStructuredReply('{"score":7,"feedback":"ok","solution":"x',schema),false);
  assert.equal(completeStructuredReply('a regular answer}',undefined),false);
});
