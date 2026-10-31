import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, initialFilter, decide, undo, restore, eligible, nextHand, nextSessionHand, reviewedCount, reconcileLibrary, libraryFingerprint, matchesDate, validateRecordState } from '../src/domain.ts';
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

test('session defaults to chronological order; random stays deterministic per seed and media filters',()=>{
  const assets=Array.from({length:30},(_,i)=>photo(`asset-${i}`,i));
  assert.equal(initialFilter.order,'oldest');
  assert.equal(nextSessionHand(assets,initialState(),undefined,0,98)[0].id,'asset-0');
  const random={...initialFilter,order:'random'};
  const selected=nextSessionHand(assets,initialState(),random,0,98);
  assert.deepEqual(selected,nextSessionHand(assets,initialState(),random,0,98));
  assert.equal(selected[0].id,eligible(assets,initialState(),random,0,98)[0].id);
  assert.ok(new Set([1,2,98,101].map(seed=>nextSessionHand(assets,initialState(),random,0,seed)[0].id)).size>1);
  assert.deepEqual(nextSessionHand(assets,initialState(),{...initialFilter,media:'video'},0,98),[]);
});

test('date presets use creation milliseconds and include rolling boundaries without future dates',()=>{
  const now=Date.UTC(2026,9,29,12); const day=86400000;
  for(const [dateRange,days] of [['24h',1],['7d',7],['30d',30]]){
    const filter={...initialFilter,dateRange};
    assert.equal(matchesDate(now-days*day,filter,now),true);
    assert.equal(matchesDate(now-days*day-1,filter,now),false);
    assert.equal(matchesDate(now,filter,now),true); assert.equal(matchesDate(now+1,filter,now),false);
    assert.deepEqual(eligible([{...photo('old',now-days*day-1),modified:now},photo('new',now)],initialState(),filter,now).map(a=>a.id),['new']);
  }
  assert.equal(matchesDate(0,initialFilter,now),true);
});

test('custom dates include the complete local final day and reject invalid or reversed ranges',()=>{
  const f={...initialFilter,dateRange:'custom',from:'2026-10-01',to:'2026-10-02'};
  assert.equal(matchesDate(new Date(2026,9,1).getTime()-1,f),false);
  assert.equal(matchesDate(new Date(2026,9,1).getTime(),f),true);
  assert.equal(matchesDate(new Date(2026,9,3).getTime()-1,f),true);
  assert.equal(matchesDate(new Date(2026,9,3).getTime(),f),false);
  assert.equal(matchesDate(new Date(2026,9,2).getTime(),{...f,from:'2026-10-03'}),false);
  assert.equal(matchesDate(0,{...f,from:'2026-02-30'}),false);
  assert.equal(matchesDate(0,{...f,to:'2026-1-2'}),false);
});

test('custom end uses next local midnight across spring and fall DST changes',()=>{
  const previous=process.env.TZ; process.env.TZ='America/New_York';
  try{
    for(const [day,next,expectedHours] of [['2026-03-08','2026-03-09',23],['2026-11-01','2026-11-02',25]]){
      const start=new Date(`${day}T00:00:00`).getTime(); const end=new Date(`${next}T00:00:00`).getTime();
      assert.equal((end-start)/3600000,expectedHours);
      const filter={...initialFilter,dateRange:'custom',from:day,to:day};
      assert.equal(matchesDate(start,filter),true);assert.equal(matchesDate(end-1,filter),true);assert.equal(matchesDate(end,filter),false);
    }
    process.env.TZ='America/Santiago';
    const nextMidnight=new Date('2026-09-07T00:00:00').getTime();
    const midnightShift={...initialFilter,dateRange:'custom',from:'2026-09-06',to:'2026-09-06'};
    assert.equal(matchesDate(nextMidnight-1,midnightShift),true);
    assert.equal(matchesDate(nextMidnight,midnightShift),false);
  }finally{if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}
});

test('history retains ten whole decisions with cloned hand context for exact undo restoration',()=>{
  let state=initialState(); const context={handIds:['b','a'],rotated:['a'],selected:['b'],group:'x',filter:{...initialFilter,media:'video'}};
  for(let i=0;i<12;i++)state=decide(state,[`a${i}`],'keep',i,context);
  assert.equal(state.history.length,10); assert.equal(state.history[0].at,2);
  context.handIds.reverse();context.rotated.push('b');context.filter.media='photo';
  const last=state.history.at(-1);assert.deepEqual(last.context.handIds,['b','a']);assert.deepEqual(last.context.rotated,['a']);assert.equal(last.context.filter.media,'video');
  state=undo(state);assert.equal(state.marks.a11,undefined);assert.equal(state.history.length,9);
  for(let i=0;i<9;i++)state=undo(state);
  assert.ok(state.marks.a0);assert.ok(state.marks.a1);assert.equal(state.history.length,0);
});

test('legacy record validation trims history without mutating original or losing decisions',()=>{
  let state=initialState();for(let i=0;i<12;i++)state=decide(state,[`a${i}`],'keep',i);
  const legacy={...state,history:[...state.history,...state.history]};
  const result=validateRecordState(legacy);assert.equal(result.history.length,10);assert.equal(Object.keys(result.marks).length,12);assert.equal(legacy.history.length,20);
  assert.equal(validateRecordState({...state,marks:null}),null);
  assert.equal(validateRecordState({...state,favorites:{}}),null);
  assert.equal(validateRecordState({...state,marks:{bad:{level:99,due:1,keptAt:0}}}),null);
});
