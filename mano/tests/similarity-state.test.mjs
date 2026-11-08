import test from 'node:test';import assert from 'node:assert/strict';
import {SimilarityCoverage,photoVersions,unchangedPhotos} from '../src/similarity-state.ts';
const photo=(id,modified=1)=>({id,modified,date:10,kind:'photo',width:10,height:20});
test('complete similarity pass survives ten removal-only refreshes, never assuming a partial pass is complete',()=>{
 const cache=new SimilarityCoverage();let assets=Array.from({length:100},(_,i)=>photo('p'+i));
 assert.equal(cache.reuse(assets),false);cache.complete(assets);
 for(let i=0;i<10;i++){assets=assets.slice(1);assert.equal(cache.reuse(assets),true);}
 assert.equal(cache.reuse([photo('p0'),...assets]),false,'disappeared versions are released');
 cache.clear();assert.equal(cache.reuse(assets),false,'revoked/invalidated pass cannot be reused');
});
test('edits/additions invalidate; reorder, favorite/group updates and videos do not',()=>{
 const cache=new SimilarityCoverage();const assets=[photo('a'),photo('b')];cache.complete(assets);
 assert.equal(cache.reuse([{...assets[1],favorite:true,group:'g'},assets[0],{...photo('v'),kind:'video'}]),true);
 for(const changed of [[...assets,photo('c')],[photo('a',2),assets[1]],[{...assets[0],width:99},assets[1]],[{...assets[0],date:99},assets[1]]])assert.equal(cache.reuse(changed),false);
});
test('late analysis cannot overwrite a newer added or edited photo set',()=>{
 const snapshot=photoVersions([photo('a'),photo('b')]);
 assert.equal(unchangedPhotos(snapshot,[photo('a')]),true);
 assert.equal(unchangedPhotos(snapshot,[photo('a'),photo('c')]),false);
 assert.equal(unchangedPhotos(snapshot,[photo('a',2)]),false);
});
test('partial attempts are not complete and are not repeated for a deletion-only set; explicit retry is available',()=>{
 const cache=new SimilarityCoverage(),assets=[photo('a'),photo('b')];assert.equal(cache.needsPass(assets),true);
 cache.begin(assets);assert.equal(cache.reuse(assets.slice(1)),false);assert.equal(cache.needsPass(assets.slice(1)),false);
 assert.equal(cache.needsPass([photo('b',2)]),true);cache.retry();assert.equal(cache.needsPass(assets.slice(1)),true);
});
