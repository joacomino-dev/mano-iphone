import test from 'node:test';
import assert from 'node:assert/strict';
import { SessionJournal, migrateSession, openIndexedDB } from '../src/durableSession.ts';
import { initialState, initialFilter, decide, undo } from '../src/domain.ts';
import { validateSession } from '../src/session.ts';
import { acknowledgeFavorites, withoutFavorites } from '../src/favoritePending.ts';
const key='cocowash-library-session-v1';
const session=()=>({version:1,active:true,seed:43,filter:initialFilter,context:{handIds:['a','b'],selected:['a'],rotated:[]},updatedAt:1,record:initialState()});
const fallback=()=>({session:session(),favorites:{},inFlight:{}});
function backend(){return {data:undefined,fail:false,pause:undefined,async read(){return structuredClone(this.data);},async write(k,value,expected){if(this.pause)await this.pause;if(this.fail)throw Error('quota');if(expected!==null)assert.equal(this.data?.revision??0,expected);this.data=structuredClone(value);}};}
test('migration preserves envelope/history/queues and reopens without legacy reads',async()=>{
 const db=backend(),original=session();original.record=decide(original.record,['a'],'discard',100,original.context);
 let j=await SessionJournal.open(key,db,()=>({session:original,favorites:{b:true},inFlight:{b:true}}));
 j=await SessionJournal.open(key,db,()=>{throw Error('must not use stale legacy');});
 assert.deepEqual(j.session,validateSession(original));assert.deepEqual(j.snapshot.favorites,{b:true});assert.deepEqual(j.snapshot.inFlight,{b:true});
});
// Contract changed by the user (2026-11-08): storage errors never reach the person.
// A failed write keeps the newest state in memory (and the localStorage mirror) and
// the next successful write commits it by overwriting; nothing throws.
test('failed write is silent: newest record/queues stay in memory and the next write commits them',async()=>{
 const db=backend(),j=await SessionJournal.open(key,db,fallback),next=session();next.record=decide(next.record,['a'],'favorite',100,next.context);
 db.fail=true;await j.save(next,{favorite:{ids:['a'],value:true}});
 assert.deepEqual(j.session.record,next.record);assert.deepEqual(j.snapshot.favorites,{a:true});
 assert.deepEqual(JSON.parse(db.data.session).record,initialState(),'storage still holds the older state until a write succeeds');
 db.fail=false;const later={...next,record:decide(next.record,['b'],'keep',101,next.context)};await j.save(later);
 assert.deepEqual(JSON.parse(db.data.session).record,later.record);assert.deepEqual(db.data.favorites,{a:true});assert.equal(db.data.revision,j.snapshot.revision);
});
test('acknowledgement waits for backend completion and serializes subsequent writes',async()=>{
 const db=backend(),j=await SessionJournal.open(key,db,fallback);let release;db.pause=new Promise(r=>release=r);
 const first=session();first.record=decide(first.record,['a'],'discard',100,first.context);let acknowledged=false;
 const a=j.save(first).then(()=>acknowledged=true);const second={...first,record:decide(first.record,['b'],'keep',101,first.context)};const b=j.save(second);
 await new Promise(r=>setImmediate(r));assert.equal(acknowledged,false);assert.deepEqual(j.session.record,initialState());release();await Promise.all([a,b]);
 assert.deepEqual(j.session.record,second.record);assert.equal(j.snapshot.revision,3);
});
test('undo restores exact history/context and a newer opposite favorite survives old acknowledgement',async()=>{
 const db=backend(),j=await SessionJournal.open(key,db,fallback),next=session();next.record=decide(next.record,['a'],'favorite',100,next.context);
 await j.save(next,{favorite:{ids:['a'],value:true}});await j.queues((favorites)=>({favorites,inFlight:{a:true}}));
 await j.save({...next,record:undo(next.record)},{favorite:{ids:['a'],value:false}});
 await j.queues((pending,inFlight)=>({favorites:acknowledgeFavorites(pending,['a'],true),inFlight:withoutFavorites(inFlight,['a'])}));
 assert.deepEqual(j.snapshot.favorites,{a:false});assert.deepEqual(j.session.record,initialState());assert.deepEqual(j.session.context,next.context);
});
test('native intent survives interrupted completion; no success state is invented',async()=>{
 const db=backend(),j=await SessionJournal.open(key,db,fallback);await j.intent({kind:'delete',ids:['a'],started:100});db.fail=true;
 await j.save({...session(),record:{...initialState(),removed:['a']}},{clearIntent:true});db.fail=false;
 const reopened=await SessionJournal.open(key,db,fallback);assert.equal(reopened.snapshot.intent.kind,'delete');assert.deepEqual(reopened.session.record.removed,[]);
 await reopened.intent();assert.equal(reopened.snapshot.intent,undefined);
});
test('corrupt/future durable entry fails closed instead of migrating older state',async()=>{
 for(const data of [{version:2,revision:1},{version:1,revision:1,session:'{}',favorites:{},inFlight:{}},{version:1,revision:1,session:JSON.stringify(session()),favorites:{x:1},inFlight:{}}]){
  const db=backend();db.data=data;await assert.rejects(SessionJournal.open(key,db,()=>{throw Error('fallback forbidden');}));assert.deepEqual(db.data,data);
 }
});
test('queue-only native callback cannot overwrite a newer decision',async()=>{
 const db=backend(),j=await SessionJournal.open(key,db,fallback),next=session();next.record=decide(next.record,['b'],'discard',100,next.context);
 await Promise.all([j.save(next),j.queues((favorites,inFlight)=>({favorites:{...favorites,a:true},inFlight}))]);
 assert.deepEqual(j.session.record,next.record);assert.equal(j.snapshot.favorites.a,true);
});
test('legacy migration retains old envelope and rejects unreadable/corrupt data',()=>{
 const original=session(),values=new Map([[key,JSON.stringify({...original,record:undefined})],['legacy',JSON.stringify(original.record)]]);
 const store={getItem:k=>values.get(k)??null};assert.deepEqual(migrateSession(key,'legacy',store),validateSession(original));
 values.set('legacy','broken');assert.throws(()=>migrateSession(key,'legacy',store));
 values.set(key,'{}');assert.throws(()=>migrateSession(key,'legacy',store));
 assert.throws(()=>migrateSession(key,'legacy',{getItem(){throw Error('unavailable');}}));
});

// R-67 (Claude, 2026-11-09): storage that never answers must not freeze the app.
test('a write that never settles is bounded: the decision is kept and later writes still commit',async()=>{
 const db=backend(),j=await SessionJournal.open(key,db,fallback,40),next=session();next.record=decide(next.record,['a'],'discard',100,next.context);
 db.pause=new Promise(()=>{});const started=Date.now();await j.save(next);assert.ok(Date.now()-started<1000,'bounded');
 assert.deepEqual(j.session.record,next.record);db.pause=undefined;
 const later={...next,record:decide(next.record,['b'],'keep',101,next.context)};await j.save(later);
 assert.deepEqual(JSON.parse(db.data.session).record,later.record);
});
test('reopening adopts a newer mirrored copy and never an older one',async()=>{
 const store=new Map();globalThis.localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
 try{
  const db=backend(),j=await SessionJournal.open(key,db,fallback);const saved=session();saved.updatedAt=10;saved.record=decide(saved.record,['a'],'discard',100,saved.context);await j.save(saved);
  const newer={...saved,updatedAt:20,record:decide(saved.record,['b'],'keep',101,saved.context)};store.set(key,JSON.stringify(newer));
  const reopened=await SessionJournal.open(key,db,fallback);assert.deepEqual(reopened.session.record,newer.record);assert.deepEqual(JSON.parse(db.data.session).record,newer.record);
  store.set(key,JSON.stringify({...saved,updatedAt:5,record:initialState()}));
  const again=await SessionJournal.open(key,db,fallback);assert.deepEqual(again.session.record,newer.record,'an older mirror is ignored');
  store.set(key,'{corrupt');assert.deepEqual((await SessionJournal.open(key,db,fallback)).session.record,newer.record,'a corrupt mirror is ignored');
 }finally{delete globalThis.localStorage;}
});
test('abandoned read never resumes migration or writes late',async()=>{
 let release,writes=0,canceled=0;
 const db={read:()=>new Promise(r=>release=r),write:async()=>{writes++;},cancelPending:()=>{canceled++;}};
 await assert.rejects(SessionJournal.open(key,db,()=>{throw Error('late migration');},20));
 release(undefined);await new Promise(r=>setImmediate(r));assert.equal(writes,0);assert.equal(canceled,1);
});
test('abandoned reconnect cannot resume with an obsolete overwrite',async()=>{
 const db=backend(),j=await SessionJournal.open(key,db,fallback,20);let release;
 db.fail=true;db.reconnect=()=>new Promise(r=>release=r);
 const first={...session(),record:decide(initialState(),['a'],'discard',100,session().context)};
 await j.save(first);db.fail=false;db.reconnect=undefined;
 const latest={...first,record:decide(first.record,['b'],'keep',101,first.context)};await j.save(latest);
 release();await new Promise(r=>setImmediate(r));assert.deepEqual(JSON.parse(db.data.session).record,latest.record);assert.equal(db.data.revision,j.snapshot.revision);
});
test('mirror adoption retains unresolved native intent',async()=>{
 const store=new Map();globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
 try{
  const db=backend(),j=await SessionJournal.open(key,db,fallback);const intent={kind:'delete',ids:['a'],started:100};await j.intent(intent);
  const newer={...j.session,updatedAt:j.session.updatedAt+10};store.set(key,JSON.stringify(newer));
  const reopened=await SessionJournal.open(key,db,fallback);assert.deepEqual(reopened.snapshot.intent,intent);assert.deepEqual(db.data.intent,intent);
 }finally{delete globalThis.localStorage;}
});
test('a timed-out IndexedDB connection is closed if it succeeds late',async()=>{
 const request={},db={closed:0,close(){this.closed++;}};
 await assert.rejects(openIndexedDB({open:()=>request},20));request.result=db;request.onsuccess();assert.equal(db.closed,1);
});
test('canceling a pending IndexedDB write aborts its transaction',async()=>{
 let tx,puts=0;
 const database={close(){},transaction(){tx={addEventListener(){},objectStore:()=>({get:()=>({}),put(){puts++;}}),abort(){this.onabort();}};return tx;}};
 const factory={open(){const request={result:database};queueMicrotask(()=>request.onsuccess());return request;}};
 const db=await openIndexedDB(factory,20);const pending=db.write(key,{revision:2},1);db.cancelPending();await assert.rejects(pending);assert.equal(puts,0);
});
