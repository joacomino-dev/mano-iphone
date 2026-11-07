// Static cross-language integration checks. Passing these is not a Swift build.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
function bridgeMethods(file,typeName,pluginName){
 const source=read(file),marker=typeName?`type ${typeName} =`:'const Store = registerPlugin<';
 const at=source.indexOf(marker);assert.ok(at>=0,`Missing declaration for ${pluginName}`);
 const start=source.indexOf('{',at);let depth=1,end=start+1;
 for(;end<source.length&&depth;end++){if(source[end]==='{')depth++;else if(source[end]==='}')depth--;}
 assert.equal(depth,0,'Unbalanced TypeScript bridge declaration');
 return [...source.slice(start+1,end-1).matchAll(/^  (\w+)\(/gm)].map(m=>m[1]);
}
for(const [name,file,type,native]of [['PhotoLibrary','../src/library.ts','LibraryPlugin','../ios/App/App/PhotoLibrary.swift'],['CocoMonetization','../src/Monetization.tsx',null,'../ios/App/App/CocoMonetization.swift']]){
 test(`static bridge: ${name} TypeScript methods have native registration and handlers`,()=>{
  const source=read(native),methods=bridgeMethods(file,type,name);
  assert.ok(methods.length>=8,'No interface parsed');
  assert.ok(source.includes(`jsName = "${name}"`));
  const registered=[...source.matchAll(/CAPPluginMethod\(name:\s*"([^"]+)"/g)].map(m=>m[1]);
  const mapped=source.match(/let pluginMethods: \[CAPPluginMethod\] = \[([^\]]+)\]\s*\.compactMap \{ CAPPluginMethod\(name: \$0, returnType: CAPPluginReturnPromise\) \}/);
  if(mapped)registered.push(...[...mapped[1].matchAll(/"([^"]+)"/g)].map(m=>m[1]));
  for(const method of methods.filter(m=>!['addListener','removeListener'].includes(m))){
   assert.ok(registered.includes(method),`${name}.${method} missing native registration`);
   assert.match(source,new RegExp(`@objc\\s+func\\s+${method}\\s*\\(`),`${name}.${method} missing Swift selector`);
  }
 });
}
test('static entry: native scene instantiates the bridge that registers both plugins',()=>{
 const scene=read('../ios/App/App/SceneDelegate.swift'),photo=read('../ios/App/App/PhotoLibrary.swift');
 assert.match(scene,/rootViewController = ManoBridgeController\(\)/);
 for(const plugin of ['PhotoLibraryPlugin','CocoMonetizationPlugin'])assert.ok(photo.includes(`registerPluginInstance(${plugin}())`));
 assert.match(read('../src/native.tsx'),/<ManoApp\s*\/>/);assert.doesNotMatch(read('../src/native.tsx'),/MobileRuntime/);
});
test('static configuration: deployment, bundle, privacy and localization resources agree',()=>{
 const project=read('../ios/App/App.xcodeproj/project.pbxproj'),info=read('../ios/App/App/Info.plist');
 const minimums=[...project.matchAll(/IPHONEOS_DEPLOYMENT_TARGET = ([^;]+);/g)].map(m=>m[1]);assert.ok(minimums.length>=4);assert.deepEqual([...new Set(minimums)],['17.0']);
 assert.match(read('../ios/App/CapApp-SPM/Package.swift'),/platforms: \[\.iOS\(\.v17\)\]/);
 assert.match(project,/PRODUCT_BUNDLE_IDENTIFIER = work\.joaquin\.mano;/);
 assert.match(info,/<key>UIRequiredDeviceCapabilities<\/key>\s*<array>\s*<string>arm64<\/string>/);
 assert.match(project,/PrivacyInfo\.xcprivacy in Resources/);assert.match(project,/InfoPlist\.strings in Resources/);
 for(const language of ['es','en','fr','de','it','ar','ja']){
  assert.ok(project.includes(`${language}.lproj/InfoPlist.strings`));
  const text=read(`../ios/App/App/${language}.lproj/InfoPlist.strings`);
  for(const key of ['NSPhotoLibraryUsageDescription','NSPhotoLibraryAddUsageDescription','NSUserTrackingUsageDescription'])assert.match(text,new RegExp(`"${key}"\\s*=\\s*"[^"\\n]+"`));
 }
});
