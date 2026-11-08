import {test} from 'node:test';import assert from 'node:assert/strict';
import {ownedProcesses} from '../../mano/scripts/android-process-scope.mjs';
const block=(pid,name,pkg,service='')=>`  *APP* UID 99003 ProcessRecord{abc ${pid}:${name}/u0a209i3}\n    packageList={${pkg}}\n    Services:\n      - ServiceRecord{c u0 ${service}}\n`;
const app=block(4604,'work.joaquin.mano','work.joaquin.mano');
const renderer=block(4640,'com.google.android.webview:sandboxed_process0:org.chromium.content.app.SandboxedProcessService0:0','work.joaquin.mano','work.joaquin.mano/org.chromium.content.app.SandboxedProcessService0:0');
test('recorded emulator scopes CocoWash renderer and excludes Google search WebView',()=>{
 const other=block(3843,'com.google.android.webview:sandboxed_process0','com.google.android.googlequicksearchbox');
 const result=ownedProcesses(other+app+renderer,'work.joaquin.mano',4604);assert.deepEqual([...result.keys()],['4604','4640']);assert.equal(result.get('4640').role,'renderer');
});
test('renderer name without package ownership never qualifies',()=>assert.throws(()=>ownedProcesses(app+renderer.replace('packageList={work.joaquin.mano}','packageList={other}'),'work.joaquin.mano',4604)));
test('package text in unrelated service is insufficient',()=>assert.throws(()=>ownedProcesses(app+renderer.replace('work.joaquin.mano/org.chromium','other/org.chromium'),'work.joaquin.mano',4604)));
test('missing app process blocks metrics',()=>assert.throws(()=>ownedProcesses(renderer,'work.joaquin.mano',4604)));
