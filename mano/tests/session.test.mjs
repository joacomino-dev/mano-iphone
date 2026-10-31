import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, initialFilter, decide } from '../src/domain.ts';
import { DEMO_SESSION_KEY, LIBRARY_SESSION_KEY, validateSession, readSession, saveSession } from '../src/session.ts';
const sample=()=>({version:1,active:true,seed:987,filter:{...initialFilter,dateRange:'7d',geek:true},context:{handIds:['b','a'],rotated:['a'],selected:['b'],group:'g'},updatedAt:123,record:decide(initialState(),['b'],'discard',10)});
function memory(){const map=new Map();return {map,getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)};}

test('atomic session roundtrip retains active seed/filter/order/selection and matching decisions',()=>{
  const storage=memory();storage.setItem('mano-library-v1','legacy untouched');
  assert.equal(saveSession(LIBRARY_SESSION_KEY,sample(),storage),true);
  const session=readSession(LIBRARY_SESSION_KEY,storage);
  assert.equal(session.active,true);assert.equal(session.seed,987);assert.equal(session.filter.dateRange,'7d');assert.equal(session.filter.geek,true);
  assert.deepEqual(session.context.handIds,['b','a']);assert.deepEqual(session.context.selected,['b']);assert.deepEqual(session.record.pending,['b']);
  assert.equal(storage.getItem('mano-library-v1'),'legacy untouched');assert.notEqual(DEMO_SESSION_KEY,LIBRARY_SESSION_KEY);
  assert.equal(readSession(DEMO_SESSION_KEY,storage),null);
});

test('inactive session still preserves record while unknown version and invalid seed are rejected',()=>{
  assert.equal(validateSession({...sample(),active:false}).active,false);
  assert.equal(validateSession({...sample(),version:2}),null);
  for(const seed of [Infinity,NaN,1.1,'12'])assert.equal(validateSession({...sample(),seed}),null);
  assert.equal(validateSession([]),null);assert.equal(validateSession(null),null);
});

test('unversioned session migrates defaults and context defensively without touching input',()=>{
  const draft={active:true,seed:1,filter:{media:'video',order:'bogus'},context:{handIds:['a','a',3],selected:'bad'}};
  const session=validateSession(draft);assert.equal(session.version,1);assert.equal(session.filter.media,'video');assert.equal(session.filter.order,'oldest');
  assert.deepEqual(session.context.handIds,['a']);assert.deepEqual(session.context.rotated,[]);assert.deepEqual(session.context.selected,[]);assert.equal(session.updatedAt,0);
  assert.equal(draft.version,undefined);assert.equal(draft.context.handIds.length,3);
});

test('corrupt envelope record is omitted for legacy fallback, never converted into an empty override',()=>{
  const session=validateSession({...sample(),record:{marks:null,pending:[]}});
  assert.equal(session.record,undefined);assert.equal(session.seed,987);
});

test('malformed JSON and unavailable/quota-limited storage fail gracefully',()=>{
  const storage=memory();storage.setItem(LIBRARY_SESSION_KEY,'{broken');assert.equal(readSession(LIBRARY_SESSION_KEY,storage),null);
  const unavailable={getItem(){throw new Error('blocked');},setItem(){throw new Error('quota');}};
  assert.equal(readSession(LIBRARY_SESSION_KEY,unavailable),null);assert.equal(saveSession(LIBRARY_SESSION_KEY,sample(),unavailable),false);
  assert.equal(saveSession(LIBRARY_SESSION_KEY,{...sample(),seed:NaN},storage),false);
});
