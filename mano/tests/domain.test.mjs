import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, initialFilter, decide, undo, restore, eligible, nextHand, nextSessionHand, reviewedCount, reconcileLibrary, libraryFingerprint } from '../src/domain.ts';
const photo=(id,date=0)=>({id,kind:'photo',date,width:100,height:150,duration:0});
test('discard is only a reversible queue, not removal',()=>{const s=decide(initialState(),['a','b','a'],'discard',0);assert.deepEqual(s.pending,['a','b']);assert.deepEqual(s.removed,[]);assert.deepEqual(undo(s),initialState());});
test('keep waits a week, then returns; second keep advances seal and undo restores it',()=>{const s=decide(initialState(),['a'],'keep',100);assert.equal(eligible([photo('a')],s,initialFilter,101).length,0);assert.equal(eligible([photo('a')],s,initialFilter,100+7*86400000).length,1);const twice=decide(s,['a'],'keep',200);assert.equal(twice.marks.a.level,2);assert.deepEqual(undo(twice),s);});
test('unmarked photos precede high seals under every order',()=>{const s=decide(initialState(),['old'],'keep',0);for(const order of ['random','newest','oldest'])assert.equal(eligible([photo('old',100),photo('new')],s,{...initialFilter,order,includeWaiting:true})[0].id,'new');});
test('explicit seal filter can inspect waiting assets; favorites always excluded',()=>{let s=decide(initialState(),['a','b'],'keep',0);s=decide(s,['b'],'favorite',1);assert.deepEqual(eligible([photo('a'),photo('b')],s,{...initialFilter,seal:1},2).map(x=>x.id),['a']);});
test('recovered photo cannot be discarded again by undoing another decision',()=>{let s=decide(initialState(),['a','b'],'discard',0);s=restore(s,'a');assert.deepEqual(s.pending,['b']);s=decide(s,['c'],'keep',1);s=undo(s);assert.deepEqual(s.pending,['b']);assert.deepEqual(undo(s).pending,[]);});
test('seal caps at gold and survives JSON without Infinity becoming null',()=>{let s=initialState();for(let i=0;i<12;i++)s=decide(s,['a'],'keep',i);assert.equal(s.marks.a.level,8);const saved=JSON.parse(JSON.stringify(s));assert.equal(saved.marks.a.due,Number.MAX_SAFE_INTEGER);assert.equal(eligible([photo('a')],saved,initialFilter).length,0);});
test('hands only contain the first visual group and support individual mode',()=>{const q=[{...photo('a'),group:'x'},{...photo('b'),group:'y'},{...photo('c'),group:'x'}];assert.deepEqual(nextHand(q,true).map(x=>x.id),['a','c']);assert.equal(nextHand(q,false).length,1);});
test('repeated seed gives stable random order; media filter applies',()=>{const a=Array.from({length:20},(_,i)=>photo(`asset-${i}`,i));assert.deepEqual(eligible(a,initialState(),{...initialFilter,order:'random'},0,98),eligible(a,initialState(),{...initialFilter,order:'random'},0,98));assert.equal(eligible(a,initialState(),{...initialFilter,media:'video'}).length,0);});
test('progress counts every decided asset once, including kept images, and undo restores it',()=>{const a=[photo('a'),photo('b')];let s=decide(initialState(),['a'],'keep',0);assert.equal(reviewedCount(a,s),1);s=decide(s,['a'],'keep',1);assert.equal(reviewedCount(a,s),1);s=decide(s,['b'],'discard',2);assert.equal(reviewedCount(a,s),2);s=undo(s);assert.equal(reviewedCount(a,s),1);});
test('authoritative native refresh makes a Photos-restored asset eligible again',()=>{const a=[photo('restored')];let s={...initialState(),removed:['restored','still-deleted'],favorites:['restored','still-favorite']};assert.equal(eligible(a,s,initialFilter).length,0);s=reconcileLibrary(s,a);assert.deepEqual(s.removed,['still-deleted']);assert.deepEqual(s.favorites,['still-favorite']);assert.equal(eligible(a,s,initialFilter).length,1);});
test('analysis fingerprint is order independent and changes for additions and edits',()=>{const a=[photo('a'),photo('b')];assert.equal(libraryFingerprint(a),libraryFingerprint([...a].reverse()));assert.notEqual(libraryFingerprint(a),libraryFingerprint([...a,photo('c')]));assert.notEqual(libraryFingerprint(a),libraryFingerprint([{...a[0],modified:123},a[1]]));});

test('session shows one ungrouped asset and handles an empty library',()=>{
  assert.deepEqual(nextSessionHand([],initialState()),[]);
  assert.deepEqual(nextSessionHand([photo('a')],initialState()).map(a=>a.id),['a']);
});

test('session bundles only eligible members of its first explicit visual group, capped at five',()=>{
  const grouped=Array.from({length:9},(_,i)=>({...photo(`g-${i}`,i),group:'visual-x'}));
  const state={...decide(initialState(),['g-2'],'keep',0),pending:['g-3'],favorites:['g-4'],removed:['g-5']};
  const assets=[...grouped,{...photo('other',20),group:'visual-y'}];
  const hand=nextSessionHand(assets,state,{...initialFilter,order:'oldest'},1,20);
  assert.deepEqual(hand.map(a=>a.id),['g-0','g-1','g-6','g-7','g-8']);
  assert.equal(nextSessionHand(grouped,initialState(),{...initialFilter,order:'oldest'},1).length,5);
  assert.deepEqual(nextSessionHand(grouped,state,{...initialFilter,order:'oldest',seal:1},1).map(a=>a.id),['g-2']);
});

test('same date never creates a visual bundle, including demo assets',()=>{
  const assets=[{...photo('a',100),demo:true},{...photo('b',100),demo:true},photo('c',101)];
  assert.deepEqual(nextSessionHand(assets,initialState(),{...initialFilter,order:'oldest'},100).map(a=>a.id),['a']);
});

test('session keeps unmarked priority and respects configurable chronological order',()=>{
  const state=decide(initialState(),['marked'],'keep',0);
  const assets=[photo('marked',100),photo('unmarked-old',1),photo('unmarked-new',50)];
  for(const order of ['random','oldest','newest']){
    assert.notEqual(nextSessionHand(assets,state,{...initialFilter,order,includeWaiting:true},1,8)[0].id,'marked');
  }
  assert.equal(nextSessionHand(assets,state,{...initialFilter,order:'oldest'},1)[0].id,'unmarked-old');
  assert.equal(nextSessionHand(assets,state,{...initialFilter,order:'newest'},1)[0].id,'unmarked-new');
});

test('session defaults to deterministic random choice for the same seed and filters media',()=>{
  const assets=Array.from({length:30},(_,i)=>photo(`asset-${i}`,i));
  assert.equal(initialFilter.order,'random');
  const selected=nextSessionHand(assets,initialState(),undefined,0,98);
  assert.deepEqual(selected,nextSessionHand(assets,initialState(),undefined,0,98));
  assert.equal(selected[0].id,eligible(assets,initialState(),{...initialFilter,order:'random'},0,98)[0].id);
  assert.ok(new Set([1,2,98,101].map(seed=>nextSessionHand(assets,initialState(),undefined,0,seed)[0].id)).size>1);
  assert.deepEqual(nextSessionHand(assets,initialState(),{...initialFilter,media:'video'},0,98),[]);
});
