import test from 'node:test';
import assert from 'node:assert/strict';
import { SessionJournal, STORAGE_FAILURE, migrateSession } from '../src/durableSession.ts';
import { initialState, initialFilter, decide, undo } from '../src/domain.ts';
import { validateSession } from '../src/session.ts';
import { acknowledgeFavorites, withoutFavorites } from '../src/favoritePending.ts';
const key='cocowash-library-session-v1';
const session=()=>({version:1,active:true,seed:43,filter:initialFilter,context:{handIds:['a','b'],selected:['a'],rotated:[]},updatedAt:1,record:initialState()});
const fallback=()=>({session:session(),favorites:{},inFlight:{}});
function backend(){return {data:undefined,fail:false,pause:undefined,async read(){return structuredClone(this.data);},async write(k,value,expected){if(this.pause)await this.pause;if(this.fail)throw Error('quota');assert.equal(this.data?.revision??0,expected);this.data=structuredClone(value);}};}
test('migration preserves envelope/history/queues and reopens without legacy reads',async()=>{
 const db=backend(),original=session();original.record=decide(original.record,['a'],'discard',100,original.context);
 let j=await SessionJournal.open(key,db,()=>({session:original,favorites:{b:true},inFlight:{b:true}}));
 j=await SessionJournal.open(key,db,()=>{throw Error('must not use stale legacy');});
 assert.deepEqual(j.session,validateSession(original));assert.deepEqual(j.snapshot.favorites,{b:true});assert.deepEqual(j.snapshot.inFlight,{b:true});
});
test('failed write preserves acknowledged record and queues; retry commits both',async()=>{
 const db=backend(),j=await SessionJournal.open(key,db,fallback),next=session();next.record=decide(next.record,['a'],'favorite',100,next.context);
 db.fail=true;await assert.rejects(j.save(next,{favorite:{ids:['a'],value:true}}),{message:STORAGE_FAILURE});
 assert.deepEqual(j.session.record,initialState());assert.deepEqual(j.snapshot.favorites,{});
 db.fail=false;await j.save(next,{favorite:{ids:['a'],value:true}});assert.deepEqual(j.session.record,next.record);assert.deepEqual(j.snapshot.favorites,{a:true});
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
 await assert.rejects(j.save({...session(),record:{...initialState(),removed:['a']}},{clearIntent:true}));db.fail=false;
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
