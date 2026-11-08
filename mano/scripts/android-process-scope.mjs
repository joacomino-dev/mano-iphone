/** ActivityManager's packageList + sandbox service bind the renderer to its
 * actual client. A WebView process name or parent zygote alone is insufficient.
 */
export function ownedProcesses(dump,pkg,appPid){
 const owned=new Map();
 const blocks=dump.split(/(?=^\s*\*APP\* UID )/m);
 for(const block of blocks){
  const head=/^\s*\*APP\* UID \d+ ProcessRecord\{\S+ (\d+):([^\n]+)\}/m.exec(block);
  if(!head)continue;
  const [,pid,name]=head,packages=/^\s*packageList=\{([^}]+)\}/m.exec(block)?.[1].split(',').map(s=>s.trim())??[];
  if(!packages.includes(pkg))continue;
  if(pid===String(appPid)&&name.startsWith(pkg+'/'))owned.set(pid,{role:'app',ownership:'activity-manager-app-package'});
  else if(/sandboxed_process|SandboxedProcessService/.test(name)&&block.includes(pkg+'/org.chromium.content.app.SandboxedProcessService'))owned.set(pid,{role:'renderer',ownership:'activity-manager-package-and-service'});
 }
 if(!owned.has(String(appPid))||![...owned.values()].some(p=>p.role==='renderer'))throw Error('Native process ownership incomplete');
 return owned;
}
