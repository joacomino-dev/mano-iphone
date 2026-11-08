"""Disposable hosted-Mac only. Imports synthetic resources in a separate seeder.
Never grants CocoWash access and never operates on an existing device/library.
"""
import json
import os
from pathlib import Path
import plistlib
import shutil
import subprocess
import time

assert os.uname().sysname == 'Darwin', 'macOS required'
assert os.environ.get('GITHUB_ACTIONS') == 'true' and os.environ.get('RUNNER_ENVIRONMENT') == 'github-hosted', 'ephemeral hosted runner required'
out = Path('work/fixtures').resolve()
out.mkdir(parents=True, exist_ok=True)

def run(*args, timeout=120):
    result = subprocess.run(args, text=True, capture_output=True, timeout=timeout)
    with (out/'probe.log').open('a') as log:
        log.write('RUN '+repr(args)+'\n'+result.stdout+result.stderr+'\n')
    if result.returncode:
        raise RuntimeError(f'{args[0]} exited {result.returncode}: {result.stderr[-900:]}')
    return result.stdout.strip()

app = out/'FixtureSeeder.app'
app.mkdir(exist_ok=False)
bundle = 'work.joaquin.coco.fixtureseeder'
(app/'Info.plist').write_bytes(plistlib.dumps({'CFBundleIdentifier':bundle,'CFBundleExecutable':'FixtureSeeder','CFBundleName':'FixtureSeeder','CFBundlePackageType':'APPL','CFBundleShortVersionString':'1.0','CFBundleVersion':'1','MinimumOSVersion':'17.0','UIDeviceFamily':[1],'LSRequiresIPhoneOS':True,'NSPhotoLibraryUsageDescription':'Create and verify synthetic CocoWash CI fixtures only.','NSPhotoLibraryAddUsageDescription':'Create synthetic fixture photos only.','UISupportedInterfaceOrientations':['UIInterfaceOrientationPortrait']}))
for name in ['key-photo.jpg','paired-motion.mov']:
    shutil.copy2(out/'generated'/name,app/name)
sdk = run('xcrun','--sdk','iphonesimulator','--show-sdk-path')
arch = run('uname','-m')
run('xcrun','--sdk','iphonesimulator','swiftc','-swift-version','5','-sdk',sdk,'-target',arch+'-apple-ios17.0-simulator','-parse-as-library','scripts/apple-fixtures/Seeder.swift','-o',str(app/'FixtureSeeder'))
run('codesign','--force','--sign','-',str(app))
(out/'linked-libraries.txt').write_text(run('xcrun','otool','-L',str(app/'FixtureSeeder')))
inventory = json.loads(run('xcrun','simctl','list','-j',timeout=180))
choices = []
for runtime in inventory['runtimes']:
    if not runtime.get('isAvailable') or 'iOS' not in runtime['name']:
        continue
    for device in inventory['devices'].get(runtime['identifier'],[]):
        if device.get('isAvailable') and device['name'].startswith('iPhone') and 'Duo' not in device['name']:
            choices.append((runtime,device))
assert choices, 'no available single-display iPhone runtime; not inventing a model'
runtime,device = max(choices,key=lambda x:tuple(int(p) for p in x[0]['version'].split('.')))
identifier = run('xcrun','simctl','create','CocoLiveProbe-'+os.environ['GITHUB_RUN_ID'],device['deviceTypeIdentifier'],runtime['identifier'])
console = None
try:
    run('xcrun','simctl','boot',identifier)
    run('xcrun','simctl','bootstatus',identifier,'-b',timeout=480)
    run('xcrun','simctl','install',identifier,str(app),timeout=300)
    container = Path(run('xcrun','simctl','get_app_container',identifier,bundle,'data'))
    # Seeder only; CocoWash's real Photos authorization stays in the UI smoke.
    run('xcrun','simctl','privacy',identifier,'grant','photos',bundle)
    console = subprocess.Popen(['xcrun','simctl','launch','--console',identifier,bundle],stdout=(out/'seeder-console.log').open('w'),stderr=subprocess.STDOUT,start_new_session=True)
    report = container/'Documents/fixture-report.json'
    deadline = time.monotonic()+240
    while not report.exists() and time.monotonic() < deadline:
        assert console.poll() is None, 'seeder process exited; inspect seeder-console.log'
        time.sleep(1)
    assert report.exists(), 'seeder report missing; authorization/import NOT passed'
    result = json.loads(report.read_text())
    result.update({'runtime':runtime['version'],'simulatorModel':device['name']})
    (out/'photokit-report.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result))
    assert result['status'] == 'PASS', 'PhotoKit recognition failed'
except Exception:
    try:
        logs=run('xcrun','simctl','spawn',identifier,'log','show','--last','5m','--style','compact','--predicate','process == "FixtureSeeder" OR composedMessage CONTAINS "work.joaquin.coco.fixtureseeder"')
        (out/'seeder-unified.log').write_text(logs)
        run('python3','mano/scripts/capture-simulator-screens.py',identifier,str(out),timeout=140)
    except Exception as error:
        print('DIAGNOSTIC:',type(error).__name__)
    reports = Path.home()/'Library/Logs/DiagnosticReports'
    for crash in reports.glob('FixtureSeeder*.ips'):
        shutil.copy2(crash,out/crash.name)
    raise
finally:
    for action in ['shutdown','delete']:
        try: run('xcrun','simctl',action,identifier,timeout=30)
        except Exception as error: print('CLEANUP:',type(error).__name__)
    if console and console.poll() is None:
        console.terminate()
