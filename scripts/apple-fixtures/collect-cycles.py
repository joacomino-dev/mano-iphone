"""Host native RSS and cumulative CPU, scoped to one run-owned simulator.

Never records a process environment: ps eww is examined in RAM only for UDID.
XCTest also records XCTMemoryMetric/XCTCPUMetric for the app in the xcresult.
"""
import json
import os
from pathlib import Path
import re
import statistics
import subprocess
import sys
import time
from native_cpu_samples import measure

assert sys.platform == 'darwin'
assert os.environ.get('GITHUB_ACTIONS') == 'true' and os.environ.get('RUNNER_ENVIRONMENT') == 'github-hosted'
simulator,out,runner_bundle = sys.argv[1:]
out=Path(out)
rows=[]
report={'status':'NOT TESTED','boundary':'Native simulator host RSS/CPU; RSS is not device physical footprint or Android PSS. All WebContent scoped to the owned simulator.', 'rows':rows}

def run(*args):
    return subprocess.run(args,text=True,capture_output=True,timeout=20,check=True).stdout.strip()

inventory=json.loads(run('xcrun','simctl','list','-j'))
device=next(d for values in inventory['devices'].values() for d in values if d['udid']==simulator)
assert device['name'].startswith('MemSwipe-smoke-'+os.environ['GITHUB_RUN_ID']+'-')


def cpu_seconds(value):
    parts=value.split(':')
    return sum(float(p)*60**i for i,p in enumerate(reversed(parts)))

def snapshot():
    app_path=run('xcrun','simctl','get_app_container',simulator,'work.joaquin.mano','app')
    samples=[]
    for line in run('ps','-axo','pid=,rss=,time=,comm=').splitlines():
        parts=line.strip().split(None,3)
        if len(parts)!=4: continue
        pid,rss,cpu,command=parts
        role='app' if command==app_path+'/App' else 'webcontent' if 'com.apple.WebKit.WebContent' in command else None
        if not role: continue
        proof='app-container-executable'
        if role=='webcontent':
            try:
                # No credentials/environment content is logged or written.
                environment=run('ps','eww','-p',pid,'-o','command=')
                if re.search(r'SIMULATOR_UDID='+re.escape(simulator)+r'(?:\s|$)',environment):
                    proof='simulator-udid-environment'
                else:
                    opened=run('lsof','-p',pid,'-Fn')
                    if '/Devices/'+simulator+'/' not in opened: continue
                    proof='simulator-open-file'
            except subprocess.SubprocessError: continue
        samples.append({'pid':int(pid),'role':role,'rssKiB':int(rss),'cpuSeconds':cpu_seconds(cpu),'monotonic':time.monotonic(),'ownership':proof})
    return samples

def save():
    (out/'native-cycles.json').write_text(json.dumps(report,indent=2)+'\n')

try:
    runner=None
    end=time.monotonic()+2100
    while time.monotonic()<end and len(rows)<11:
        if runner is None:
            try: runner=Path(run('xcrun','simctl','get_app_container',simulator,runner_bundle,'data'))/'Documents'
            except subprocess.SubprocessError: time.sleep(1);continue
        cycle=len(rows)
        if not (runner/f'native-cycle-{cycle}.request').exists(): time.sleep(.25);continue
        time.sleep(3)
        measurement=measure(snapshot,time.sleep,max_attempts=3)
        complete=measurement['complete']
        rows.append({'cycle':cycle,**measurement,'combinedRssKiB':sum(p['rssKiB'] for p in measurement['processes'])})
        # Run 42682535759: from round 7 the app process idled at ~70 % CPU. Numbers do not
        # say what was running; when it happens again keep the call stacks (fixture
        # simulator only, symbol names, no arguments or environment).
        try:
            hot=[c for c in measurement.get('cpu',[]) if isinstance(c.get('percent'),(int,float)) and c['percent']>=25]
            roles={p['pid']:p['role'] for p in measurement['processes']}
            for entry in hot[:2]:
                target=out/f"cpu-sample-cycle-{cycle}-{roles.get(entry['pid'],'process')}-{entry['pid']}.txt"
                subprocess.run(['sample',str(entry['pid']),'3','-mayDie','-file',str(target)],capture_output=True,timeout=40,check=False)
        except Exception: pass
        save()
        (runner/f'native-cycle-{cycle}.response').write_text('native collection '+('complete' if complete else 'incomplete')+'\n')
    report['status']='PASS' if len(rows)==11 and all(r['complete'] for r in rows) else 'BLOCKED'
    # First collect real attributed measurements; budgets are evaluated by a
    # separate regression gate, never inferred from the presence of this file.
    report['performanceAcceptance']='NOT TESTED: budget evaluation is separate from metric collection'
except Exception as error:
    report.update(status='FAIL',error=type(error).__name__+': '+str(error))
finally: save()
