"""Disposable macOS runner only; restore unauthenticated proxy configuration.
The host capture includes baseline traffic and does NOT prove endpoint purpose or
exclusive CocoWash attribution. HTTP(S) clients bypassing system proxy are absent.
"""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import threading
import time

assert sys.platform=='darwin' and os.environ.get('GITHUB_ACTIONS')=='true' and os.environ.get('RUNNER_ENVIRONMENT')=='github-hosted'
folder=Path(sys.argv[1]).resolve();mode=sys.argv[2];command=sys.argv[3:]
assert mode in ['allowed','denied'] and command
folder.mkdir(parents=True,exist_ok=True)
spec=importlib.util.spec_from_file_location('hostproxy',Path(__file__).with_name('host_proxy.py'));module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
phase=folder/'phase.txt';phase.write_text('calibration')
proxy=module.HostProxy(('127.0.0.1',8732),folder/'hosts.jsonl',phase)
threading.Thread(target=proxy.serve_forever,daemon=True).start()
def run(*args): return subprocess.run(args,capture_output=True,text=True,timeout=30,check=True).stdout
settings=folder/'private-proxy-snapshot.plist'
settings_tool=folder/'proxy-settings'
report={'status':'NOT TESTED','boundary':'Hosts only, no TLS decryption. Runner-wide system proxy: baseline subtraction is indicative, not proof of tracking or exclusive app attribution. QUIC/custom transports may bypass it.'}
subprocess.run(['xcrun','swiftc',str(Path(__file__).with_name('proxy-settings.swift')),'-o',str(settings_tool)],check=True,timeout=120)
def configure(action):
    return run('sudo','-n','env','GITHUB_ACTIONS=true','RUNNER_ENVIRONMENT=github-hosted',str(settings_tool),action,str(settings))
try:
    configure('apply')
    calibration=folder/'calibrate.swift'
    calibration.write_text('import Foundation\nlet done=DispatchSemaphore(value:0)\nURLSession.shared.dataTask(with:URL(string:"https://www.apple.com/")!) { _,_,_ in done.signal() }.resume()\n_ = done.wait(timeout:.now()+30)\n')
    subprocess.run(['xcrun','swift',str(calibration)],timeout=90,check=True,stdout=subprocess.DEVNULL)
    phase.write_text('baseline');time.sleep(15)
    phase.write_text('app-att-'+mode)
    result=subprocess.run(command,timeout=2050)
    report['testExitCode']=result.returncode
    entries=[json.loads(line) for line in (folder/'hosts.jsonl').read_text().splitlines()] if (folder/'hosts.jsonl').exists() else []
    report['calibrationObserved']=any(r['phase']=='calibration' and r['host']=='www.apple.com' for r in entries)
    report['hostsByPhase']={p:sorted({r['host'] for r in entries if r['phase']==p}) for p in ['baseline','app-att-allowed','app-att-denied']}
    report['status']='PASS' if result.returncode==0 and report['calibrationObserved'] else 'BLOCKED'
finally:
    failures=[]
    if settings.exists():
        try: configure('restore')
        except Exception as error: failures.append(type(error).__name__)
    proxy.shutdown();proxy.server_close()
    report['restorationErrors']=failures
    if failures: report['status']='FAIL'
    (folder/'host-capture-report.json').write_text(json.dumps(report,indent=2)+'\n')
sys.exit(0 if report['status']=='PASS' else 1)
