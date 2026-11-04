import test from 'node:test';
import assert from 'node:assert/strict';
import { videoWindow } from '../src/video-plan.ts';
const video=(id,bytes,modified=0)=>({id,bytes,modified,kind:'video',duration:60});
test('visible video is admitted independently; background bytes stay within budget',()=>{
 const front=video('front',500), assets=[front,video('a',100),video('b',180),video('c',150)];
 assert.deepEqual(videoWindow(assets,front,new Map(),250).map(a=>a.id),['front','a','c']);
 assert.deepEqual(videoWindow(assets,undefined,new Map(),250).map(a=>a.id),['a','c']);
});
test('measured prepared bytes supersede estimates, scoped to edit version; IDs deduplicate',()=>{
 const a=video('a',20), b=video('b',20);const measured=new Map([['a:0',200]]);
 assert.deepEqual(videoWindow([a,a,b],undefined,measured,100).map(a=>a.id),['b']);
 assert.deepEqual(videoWindow([video('a',20,1),b],undefined,measured,100).map(a=>a.id),['a','b']);
});
test('unknown and long videos do not create an unbounded speculative window',()=>{
 const assets=Array.from({length:50},(_,i)=>video(String(i),undefined));
 assert.equal(videoWindow(assets).length,4);
 assert.equal(videoWindow([{...assets[0],duration:10000}]).length,0);
 assert.equal(videoWindow([{...assets[0],duration:10000}],assets[0]).length,1);
});
