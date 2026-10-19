import test from 'node:test';
import assert from 'node:assert/strict';
import {newCourse,normalizeWorkspace} from '../src/storage.js';
import {rememberQuestion,unusedSeed,parseNewQuestion,saveMistake,migrateLearning,questionReference,continuingVariant} from '../src/learning.js';
test('ten seeds are offered once; generation history can continue beyond the old bank size',()=>{
  const course=newCourse('ML','ml'),id='concept-networks';
  for(let i=0;i<10;i++){const seed=unusedSeed(course,id);assert.ok(seed);rememberQuestion(course,id,seed);}
  assert.equal(unusedSeed(course,id),null);
  for(let i=1;i<=150;i++){
    const item=parseNewQuestion(JSON.stringify({question:`Beregn summen for input ${i}, vægt 2 og bias 1 i en neuron.`,answer:`2 gange ${i} plus 1 er ${2*i+1}.`}),course,id);
    rememberQuestion(course,id,item,'ai');
  }
  assert.equal(course.questionHistory[id].length,160);
  assert.equal(unusedSeed(course,id),null);
  const item=course.questionHistory[id].at(-1);
  assert.equal(questionReference(course,id,item.question).answer,item.answer);
  assert.throws(()=>parseNewQuestion(JSON.stringify(item),course,id));
  assert.throws(()=>parseNewQuestion('{"question":"unfinished',course,id));
  assert.throws(()=>parseNewQuestion(JSON.stringify({question:'Forklar dette tekstuddrag fra materialet.',answer:'Et fiktivt svar.'}),course,id));
});
test('wrong questions preserve the first answer, survive history trimming, and remain saved when resolved',()=>{
  const course=newCourse('ML','ml');
  const first={exerciseId:'q1',skillId:'concept-networks',skillTitle:'Neurale netværk',question:'Hvad er en vægt i et neuralt netværk?',answer:'En banan',feedback:'Forkert forklaring',solution:'En parameter',correct:false,score:0};
  saveMistake(course,first,{question:first.question,answer:first.solution});
  first.answer='mutated'; const key=Object.keys(course.mistakes)[0];
  assert.equal(course.mistakes[key].firstAttempt.answer,'En banan');
  saveMistake(course,{...first,answer:'Et æble',feedback:'Prøv igen'});
  assert.equal(Object.keys(course.mistakes).length,1);
  assert.equal(course.mistakes[key].lastAttempt.answer,'Et æble');
  course.attempts=[];
  const restored=normalizeWorkspace(JSON.parse(JSON.stringify({version:1,activeId:'ml',courses:[course]}))).courses[0];
  migrateLearning(restored); assert.equal(Object.keys(restored.mistakes).length,1);
  saveMistake(restored,{...first,answer:'En parameter, som vægter et input',correct:true,score:12});
  assert.equal(restored.mistakes[key].resolved,true);
  assert.equal(restored.mistakes[key].firstAttempt.answer,'En banan');
  assert.equal(questionReference(restored,'concept-networks',first.question).answer.includes('parameter'),true);
});
test('legacy wrong answers migrate without reintroducing invalid exercises or losing resolved state',()=>{
  const course=newCourse('ML','ml');
  course.attempts=[{exerciseId:'old',skillId:'custom',question:'Hvad er et signal?',answer:'Forkert',feedback:'F',solution:'En repræsentation af information',score:0},{exerciseId:'bad',question:'Ugyldig opgave',score:0,invalidatedReason:'No evidence'}];
  migrateLearning(course); migrateLearning(course);
  assert.equal(Object.keys(course.mistakes).length,1);
  assert.equal(questionReference(course,'custom','Hvad er et signal?').answer,'En repræsentation af information');
});

test('all fixed topics continue with new reference-backed variants beyond the seeds, without a fixed count',()=>{
  for(const id of ['concept-networks','concept-gradient','concept-backprop','concept-cnn','concept-activations','concept-loss','concept-regularization','concept-algebra','concept-derivatives','concept-fractions','concept-probability','concept-photosynthesis']) {
    const course=newCourse('ML','ml'); const seen=new Set();
    for(let i=0;i<120;i++) {const item=continuingVariant(course,id); assert.ok(item.answer);assert.ok(!seen.has(item.question),id);seen.add(item.question);rememberQuestion(course,id,item,'template');}
    assert.equal(course.questionHistory[id].length,120);
  }
  const c=newCourse('ML','ml');
  assert.match(continuingVariant(c,'concept-networks').answer,/14/);
  assert.match(continuingVariant(c,'concept-cnn').answer,/5 gange 5/);
  assert.equal(continuingVariant(c,'custom'),null);
});
