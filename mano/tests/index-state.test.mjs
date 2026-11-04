import test from 'node:test';
import assert from 'node:assert/strict';
import { IndexState } from '../src/index-state.ts';
const asset = (id,modified=1) => ({id,modified,kind:'photo',width:10,height:20});
test('edited and deleted IDs invalidate both indices and reject late generations',()=>{
 const index=new IndexState();index.reconcile([asset('a'),asset('b')]);const old=index.generation;
 index.sizes.set('a',50);index.flags.set('a',{low:true});index.sizes.set('b',100);
 assert.equal(index.reconcile([asset('a',2)]),true);
 assert.equal(index.sizes.size,0);assert.equal(index.flags.size,0);
 assert.equal(index.accepts(old,'a'),false);assert.equal(index.accepts(index.generation,'b'),false);
 assert.equal(index.accepts(index.generation,'a'),true);
});
test('group arrivals and list reorder preserve measurements and generation',()=>{
 const index=new IndexState();index.reconcile([asset('a'),asset('b')]);const generation=index.generation;index.sizes.set('a',50);
 assert.equal(index.reconcile([{...asset('b'),group:'g'},asset('a')]),false);
 assert.equal(index.generation,generation);assert.equal(index.sizes.get('a'),50);
});
