import test from 'node:test';
import assert from 'node:assert/strict';
import {CONCEPT_QUESTIONS, randomTrainingSkill} from '../src/concepts.js';
import {webReadingFor} from '../src/reading.js';
import {newCourse,normalizeWorkspace} from '../src/storage.js';
const skills=[{id:'concept-networks',sources:['notes']},{id:'concept-cnn',sources:['notes']},{id:'concept-gradient',sources:['notes']}];
test('random mode chooses only supported topics in this course and avoids the current topic',()=>{
  for(let i=0;i<100;i++) {
    const next=randomTrainingSkill(skills,'concept-networks',()=>i/100);
    assert.notEqual(next.id,'concept-networks'); assert.ok(skills.includes(next));
  }
  assert.equal(randomTrainingSkill([{id:'custom',sources:['x']},{id:'concept-cnn',sources:[]}]),null);
  assert.equal(randomTrainingSkill([],''),null);
  assert.equal(randomTrainingSkill([skills[0]],skills[0].id).id,skills[0].id);
});
test('random session state persists separately from normal practice and medals',()=>{
  const course=newCourse('ML','ml'); course.randomTraining=true; course.trainingMode='free';
  course.trainingSessions['concept-cnn']={exercise:'Normal draft',answer:'Keep this'};
  course.trainingSessions.__random__={exercise:'Random question',skillId:'concept-gradient',answer:'Random answer'};
  const restored=normalizeWorkspace(JSON.parse(JSON.stringify({version:1,activeId:'ml',courses:[course]}))).courses[0];
  assert.equal(restored.randomTraining,true); assert.equal(restored.trainingMode,'free');
  assert.equal(restored.trainingSessions['concept-cnn'].answer,'Keep this');
  assert.equal(restored.trainingSessions.__random__.skillId,'concept-gradient');
  assert.deepEqual(restored.medalRuns,{});
});
test('all twelve fixed topics have curated HTTPS reading resources, without student data in the URL',()=>{
  for(const id of Object.keys(CONCEPT_QUESTIONS)) {
    assert.ok(webReadingFor(id).length,id);
    for(const item of webReadingFor(id)) {const url=new URL(item.url);assert.equal(url.protocol,'https:');assert.equal(url.search,'');assert.ok(item.publisher);assert.ok(item.language);}
  }
  assert.deepEqual(webReadingFor('custom-topic'),[]);
});
