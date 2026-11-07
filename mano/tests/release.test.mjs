import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {checkRelease,inputs} from '../scripts/check-release.mjs';
test('release source, approved icon and ES/EN metadata pass static checks',()=>assert.equal(checkRelease(inputs()).status,'PASS'));
for (const kind of ['developer','testID','reset','longSubtitle']) test(`release gate rejects ${kind}`,()=>{
 const value=inputs();if(kind==='developer')value.channel=value.channel.replace('= false;','= true;');
 if(kind==='testID')value.project=value.project.replace('ca-app-pub-5676353604168025/8219266678','');
 if(kind==='reset')value.info=value.info.replace('</dict>','<key>CocoWashDevelopmentReset</key><true/></dict>');
 if(kind==='longSubtitle')value.metadata.localizations.en.subtitle='X'.repeat(31);
 assert.throws(()=>checkRelease(value));
});
test('Capacitor configuration preserves the selected marketing version and unique build',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cocowash-version-'));
 assert.equal(path.dirname(path.resolve(dir)),path.resolve(os.tmpdir()));
 assert.match(path.basename(dir),/^cocowash-version-/); // Check the owned target before recursive fixture cleanup.
 try{
  for(const file of ['App.xcodeproj/project.pbxproj','App/Base.lproj/Main.storyboard','App/SceneDelegate.swift','App/Info.plist']){
   const target=path.join(dir,'ios/App',file);fs.mkdirSync(path.dirname(target),{recursive:true});
   let text=fs.readFileSync(path.join('ios/App',file),'utf8');
   if(file.endsWith('pbxproj'))text=text.replaceAll('MARKETING_VERSION = 0.9.9;','MARKETING_VERSION = 1.0;').replaceAll('CURRENT_PROJECT_VERSION = 43;','CURRENT_PROJECT_VERSION = 72;');
   fs.writeFileSync(target,text);
  }
  execFileSync(process.execPath,[path.resolve('scripts/configure-ios.mjs')],{cwd:dir});
  const after=fs.readFileSync(path.join(dir,'ios/App/App.xcodeproj/project.pbxproj'),'utf8');
  assert.ok(after.includes('MARKETING_VERSION = 1.0;'));assert.ok(after.includes('CURRENT_PROJECT_VERSION = 72;'));
  assert.ok(!after.includes('CURRENT_PROJECT_VERSION = 43;'));
 }finally{fs.rmSync(dir,{recursive:true,force:true});} // Only the just-created temporary fixture.
});
