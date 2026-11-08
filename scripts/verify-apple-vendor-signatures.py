"""Verify the official pinned SDK archives with macOS codesign. No app signing."""
import hashlib
import json
import os
from pathlib import Path,PurePosixPath
import plistlib
import subprocess
import sys
import urllib.request
import zipfile

assert sys.platform=='darwin','macOS codesign is required'
assert os.environ.get('GITHUB_ACTIONS')=='true' and os.environ.get('RUNNER_ENVIRONMENT')=='github-hosted','Disposable hosted runner required'
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'mano/build/vendor-signatures';OUT.mkdir(parents=True,exist_ok=True)
receipt=json.loads((ROOT/'docs/apple-readiness/evidence/rc-sdk-summary.json').read_text(encoding='utf-8'))
report={'sourceSha':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'status':'NOT TESTED','packages':[],
        'boundary':'Official pinned source XCFramework signatures and manifests. Not final app archive signature, Xcode aggregated privacy report or App Store approval.'}
try:
    for package in receipt['packages']:
        assert package['url'].startswith('https://dl.google.com/'),'Unexpected SDK vendor host'
        raw=urllib.request.urlopen(package['url'],timeout=120).read();assert hashlib.sha256(raw).hexdigest()==package['sha256'],'Pinned archive checksum differs'
        archive=OUT/(package['name']+'.zip');archive.write_bytes(raw)
        destination=OUT/package['name'];destination.mkdir(exist_ok=True)
        with zipfile.ZipFile(archive) as z:
            for item in z.infolist():
                p=PurePosixPath(item.filename);assert not p.is_absolute() and '..' not in p.parts,'Unsafe SDK path'
                assert ((item.external_attr>>16)&0o170000)!=0o120000,'Unexpected SDK symlink'
            z.extractall(destination)
        roots=list(destination.glob('*.xcframework'));assert len(roots)==1,'Expected exactly one XCFramework'
        root=roots[0]
        verify=subprocess.run(['codesign','--verify','--strict','--verbose=4',str(root)],capture_output=True,text=True)
        details=subprocess.run(['codesign','-dv','--verbose=4',str(root)],capture_output=True,text=True)
        (OUT/(package['name']+'-codesign.log')).write_text(verify.stdout+verify.stderr+details.stdout+details.stderr,encoding='utf-8')
        assert verify.returncode==0 and details.returncode==0,'Vendor signature verification failed'
        identity=[line for line in (details.stdout+details.stderr).splitlines() if line.startswith(('Authority=','TeamIdentifier=','Timestamp='))]
        assert any(x.startswith('Authority=') for x in identity),'Ad-hoc signature is not an identified vendor'
        manifests=[]
        for path in root.rglob('PrivacyInfo.xcprivacy'):
            manifest=plistlib.loads(path.read_bytes());assert isinstance(manifest,dict)
            manifests.append({'path':str(path.relative_to(root)),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'manifest':manifest})
        assert manifests,'Required vendor manifest missing'
        report['packages'].append({'name':package['name'],'version':package['version'],'archiveSha256':package['sha256'],'signature':'PASS','identity':identity,'manifests':manifests})
    report['status']='PASS'
except Exception as error:
    report['status']='FAIL';report['error']=str(error)
finally:
    (OUT/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,indent=2));sys.exit(0 if report['status']=='PASS' else 1)
