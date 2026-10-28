import test from 'node:test';
import assert from 'node:assert/strict';
import { CONCEPT_QUESTIONS } from '../src/concepts.js';
import { nextLevelQuestion, gradeChoice, levelKey, levelAttempts, finishAIQuestion, workedStepsFor } from '../src/difficulty.js';
import { modelSketch, drawingQuestion } from '../src/drawing.js';
import { newCourse, normalizeWorkspace } from '../src/storage.js';
import { rememberQuestion, questionReference, saveMistake, migrateLearning } from '../src/learning.js';
import { masteryForSkill, newMedalRun, recordMedalAnswer, runKey } from '../src/training.js';

test('every fixed category has continuing medium choices, harder applications and drawing tasks without duplicate questions', () => {
  for(const skillId of Object.keys(CONCEPT_QUESTIONS)) {
    const course=newCourse('Course','id');
    for(const level of ['medium','hard','drawing']) {
      const seen=new Set();
      for(let i=0;i<30;i++) {
        const item=nextLevelQuestion(course,skillId,level,()=>.3);
        assert.equal(item.difficulty,level);
        assert.ok(item.answer.length>0);
        assert.ok(!seen.has(item.question)); seen.add(item.question);
        if(level==='medium') {
          assert.equal(new Set(item.choices).size,4);
          assert.equal(gradeChoice(item,item.choices[item.correctIndex]).correct,true);
          assert.equal(gradeChoice(item,item.choices[(item.correctIndex+1)%4]).correct,false);
        } else if(level==='drawing') {
          assert.ok(item.checklist.length>=3);
          assert.match(modelSketch(item),/^<svg/);
        }
        rememberQuestion(course,skillId,item,'level-template');
        assert.deepEqual(questionReference(course,skillId,item.question),{...item,origin:'level-template'});
      }
    }
  }
});
test('numeric medium and hard reference answers follow their actual calculation rules', () => {
  const course=newCourse('Math','math');
  const first=nextLevelQuestion(course,'concept-gradient','medium',()=>0);
  rememberQuestion(course,'concept-gradient',first,'level-template');
  const next=nextLevelQuestion(course,'concept-gradient','medium',()=>0);
  assert.equal(next.choices[next.correctIndex],'7');
  assert.match(next.question,/parameter er 9/);
  const hard=nextLevelQuestion(course,'concept-gradient','hard');
  assert.match(hard.answer,/w1=3/);
  assert.match(hard.answer,/w2=2/);
  assert.match(hard.answer,/16 til 1/);
});
test('level drafts and medal runs remain isolated while preserving old easy keys', () => {
  const course=newCourse('Course','id'), key='concept-cnn';
  assert.equal(levelKey(key,'easy'),key);
  for(const level of ['easy','medium','hard']) {
    course.trainingSessions[levelKey(key,level)]={exercise:level,answer:level+' answer',difficulty:level};
    course.medalRuns[runKey(levelKey(key,level),'bronze')]=newMedalRun('bronze');
  }
  recordMedalAnswer(course.medalRuns[runKey(levelKey(key,'medium'),'bronze')],'question',true);
  const restored=normalizeWorkspace({version:1,courses:[course],activeId:'id'}).courses[0];
  assert.equal(restored.medalRuns[runKey(key,'bronze')].streak,0);
  assert.equal(restored.medalRuns[runKey(levelKey(key,'medium'),'bronze')].streak,1);
  assert.equal(restored.trainingSessions[levelKey(key,'hard')].answer,'hard answer');
  const attempts=[{skillId:key,exerciseId:'old',score:12,created:'1'},{skillId:key,exerciseId:'mcq',difficulty:'medium',score:null,correct:false,created:'2'}];
  assert.equal(masteryForSkill(levelAttempts(attempts,'easy'),key).label,'Undervejs');
  assert.equal(masteryForSkill(levelAttempts(attempts,'medium'),key).label,'Øv mere');
});
test('MCQ mistakes keep options, correct index and original choice through reload and resolution; drawings are never marked wrong', () => {
  const course=newCourse('Course','id'), skillId='concept-cnn', item=nextLevelQuestion(course,skillId,'medium',()=>.5);
  rememberQuestion(course,skillId,item,'level-template');
  const attempt={question:item.question,skillId,exerciseId:'a',difficulty:'medium',multipleChoice:true,score:null,correct:false,answer:item.choices[(item.correctIndex+1)%4]};
  saveMistake(course,attempt,item);
  course.attempts.push(attempt,{question:'Tegn en skitse',skillId,exerciseId:'drawing',score:null,drawingReview:true,difficulty:'drawing'});
  migrateLearning(course);
  assert.equal(Object.keys(course.mistakes).length,1);
  const saved=Object.values(course.mistakes)[0];
  assert.deepEqual(saved.reference.choices,item.choices);
  assert.equal(saved.firstAttempt.answer,attempt.answer);
  saveMistake(course,{...attempt,correct:true,answer:item.choices[item.correctIndex]},item);
  assert.equal(saved.resolved,true);
  const drawing=drawingQuestion(skillId,2);
  course.drawing=[[[10,20],[20,30]]];
  assert.deepEqual(normalizeWorkspace({version:1,courses:[course],activeId:'id'}).courses[0].drawing,course.drawing);
  assert.match(modelSketch(drawing),/Feature map/);
});
test('malformed AI multiple choice never becomes a graded task and generic drawing stays neutral', () => {
  const item={question:'Hvad er det centrale begreb?',answer:'Et eksempel på et svar.'};
  assert.throws(()=>finishAIQuestion(item,{choices:['a','a','b','c'],correctIndex:0},'medium'),/fire forskellige/);
  assert.throws(()=>finishAIQuestion(item,{choices:['a','b','c','d'],correctIndex:8},'medium'),/fire forskellige/);
  const complete=finishAIQuestion(item,{choices:['a','b','c','d'],correctIndex:2},'medium');
  assert.equal(gradeChoice(complete,'c').correct,true);
  assert.throws(()=>gradeChoice(complete,'not a choice'),/Vælg/);
  assert.throws(()=>finishAIQuestion(item,{choices:['a','b','c','d'],correctIndex:2},'medium',[complete]),/gentog/);
  const custom=drawingQuestion('custom-topic',1,'Et eget emne');
  assert.match(custom.question,/Et eget emne/);
  assert.match(modelSketch(custom),/Hovedbegreb/);
});
test('the reported old gradient question gains the correct working even when the student chose 13', () => {
  const old={question:'Vælg ét svar. En parameter er 9, gradienten er 4 og læringsraten 0,5. Hvad er den nye parameter?',answer:'13',solution:'7',skillId:'concept-gradient',multipleChoice:true};
  const steps=workedStepsFor(old,old.skillId);
  assert.equal(steps.length,4);
  assert.match(steps.join('\n'),/ny parameter = gammel parameter − læringsrate × gradient/);
  assert.match(steps.join('\n'),/9 − 0,5 × 4/);
  assert.match(steps.join('\n'),/0,5 × 4 = 2/);
  assert.match(steps.join('\n'),/9 − 2 = 7/);
  assert.deepEqual(workedStepsFor({...old,solution:'13'},old.skillId),[],'Do not invent a derivation when the saved reference disagrees');
});
test('every continuing medium topic stores steps, can reconstruct old steps and keeps its shuffled choice correct', () => {
  for(const skillId of Object.keys(CONCEPT_QUESTIONS)) {
    const course=newCourse('Course','id');
    rememberQuestion(course,skillId,nextLevelQuestion(course,skillId,'medium'),'level-template');
    for(let i=0;i<20;i++) {
      const item=nextLevelQuestion(course,skillId,'medium',()=>.8);
      assert.ok(item.steps.length>=3);
      const {steps:removed,...legacy}=item;
      assert.deepEqual(workedStepsFor(legacy,skillId),removed);
      const result=gradeChoice(legacy,legacy.choices[legacy.correctIndex],skillId);
      assert.equal(result.correct,true);
      assert.deepEqual(result.steps,removed);
      assert.equal(result.solution,legacy.answer);
      rememberQuestion(course,skillId,item,'level-template');
    }
  }
});
test('AI solution steps are retained and invalid step payloads are rejected', () => {
  const item={question:'Beregn et produkt af to tal.',answer:'Produktet er 6.'};
  const raw={choices:['2','3','6','8'],correctIndex:2,steps:['Gang de to tal.','2 × 3 = 6.']};
  assert.deepEqual(finishAIQuestion(item,raw,'medium').steps,raw.steps);
  assert.throws(()=>finishAIQuestion(item,{...raw,steps:['']},'medium'),/løsningstrin/);
  assert.throws(()=>finishAIQuestion(item,{...raw,steps:'ikke en liste'},'medium'),/løsningstrin/);
});
