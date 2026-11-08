// Disposable hosted emulator harness; no application runtime imports or mocks.
import {execFile} from 'node:child_process';import {promisify} from 'node:util';
export const run=promisify(execFile), sleep=ms=>new Promise(r=>setTimeout(r,ms));
export const adb=(...args)=>run('adb',args,{timeout:30000,maxBuffer:16<<20}).then(r=>r.stdout.trim());
export const PKG='work.joaquin.mano';
export async function guardEmulator(){
 if(process.env.GITHUB_ACTIONS!=='true'||process.env.RUNNER_ENVIRONMENT!=='github-hosted')throw Error('Refused: disposable hosted runner only');
 if(!/^emulator-\d+$/.test(await adb('get-serialno'))||await adb('shell','getprop','ro.kernel.qemu')!=='1')throw Error('Refused: not a disposable emulator');
}
export async function connect(){
 const pid=(await adb('shell','pidof',PKG)).split(/\s+/)[0];if(!pid)throw Error('App not running');
 await adb('forward','tcp:9222',`localabstract:webview_devtools_remote_${pid}`);
 let endpoint;for(let i=0;i<20&&!endpoint;i++){try{const pages=await(await fetch('http://127.0.0.1:9222/json')).json();endpoint=pages.find(p=>p.url?.startsWith('https://localhost'))?.webSocketDebuggerUrl;}catch{}if(!endpoint)await sleep(500);}
 if(!endpoint)throw Error('Native WebView unavailable');
 const socket=new WebSocket(endpoint),pending=new Map();let id=0;
 await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 socket.onmessage=event=>{const message=JSON.parse(event.data);pending.get(message.id)?.(message);};
 async function cdp(method,params={}){const key=++id;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(key);reject(Error('CDP timeout: '+method));},30000);pending.set(key,message=>{clearTimeout(timer);pending.delete(key);if(message.error)reject(Error(message.error.message));else resolve(message.result);});socket.send(JSON.stringify({id:key,method,params}));});}
 async function page(expression){const r=await cdp('Runtime.evaluate',{expression:`(async()=>{${expression}})()`,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result?.value;}
 const call=(method,args={})=>page(`return await Capacitor.Plugins.PhotoLibrary.${method}(${JSON.stringify(args)});`);
 return {cdp,page,call,close:()=>socket.close(),pid};
}
