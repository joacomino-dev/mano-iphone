// Exercise the real harness helper without connecting to any Android device.
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';

const source=await readFile(new URL('../scripts/android-native-cycles.mjs',import.meta.url),'utf8');
const body=source.slice(source.indexOf('async function systemAllow('),source.indexOf('async function processSnapshot('));
const button=(label='Allow',extras='clickable="true" enabled="true"',pkg='com.google.android.providers.media.module')=>`<node package="${pkg}" text="${label}" ${extras} bounds="[10,20][110,60]"/>`;
function harness({appearAt=2000,closeAfter=700,label='Allow',stuck=false,dumpFailures=0,foreign=false}={}){
 let now=0,tappedAt=null,dumps=0;const taps=[];
 const xml=()=>tappedAt!==null?(stuck||now-tappedAt<closeAfter?button(label,'clickable="false" enabled="false"'):'<hierarchy/>'):now>=appearAt?button(label):foreign?button(label,undefined,'work.joaquin.mano'):'<hierarchy/>';
 const run=async(file,args,options)=>{
  assert.equal(file,'adb');assert.ok(options.timeout>0&&options.timeout<=15000);now+=30;
  if(args.includes('dump')){dumps++;if(dumps<=dumpFailures)throw Error('uiautomator temporarily unavailable');}
  if(args.includes('tap')){taps.push(Array.from(args.slice(-2)));tappedAt=now;}
  return {stdout:args.includes('cat')?xml():''};
 };
 const allow=vm.runInNewContext(`(${body})`,{run,performance:{now:()=>now},sleep:async ms=>{now+=ms;}});
 return {allow,taps,elapsed:()=>now};
}
test('waits for the real dialog, taps its center and verifies closure',async()=>{
 const h=harness({foreign:true});assert.equal(await h.allow(),'system-dialog');assert.deepEqual(h.taps,[['60','40']]);assert.ok(h.elapsed()>=2700);
});
test('cancel is observed and confirmed through the same bounded flow',async()=>{
 const h=harness({label:'Cancel'});assert.equal(await h.allow(false),'system-dialog');assert.equal(h.taps.length,1);
});
test('missing dialog fails at deadline and never taps an app control',async()=>{
 const h=harness({appearAt:Infinity,foreign:true});await assert.rejects(h.allow(),/did not appear within 15000 ms/);assert.equal(h.taps.length,0);assert.ok(h.elapsed()<15200);
});
test('a tapped but still visible disabled dialog fails instead of reporting success',async()=>{
 const h=harness({stuck:true});await assert.rejects(h.allow(),/remained visible after tapping/);assert.equal(h.taps.length,1);
});
test('transient dump failures are retried within the original deadline',async()=>{
 const h=harness({dumpFailures:2});assert.equal(await h.allow(),'system-dialog');assert.equal(h.taps.length,1);
});
test('independently completed favorite does not require another system dialog',async()=>{
 const h=harness({appearAt:Infinity});assert.equal(await h.allow(true,async()=>true),'system-completed-before-observation');assert.equal(h.taps.length,0);
});
