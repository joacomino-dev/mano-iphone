"""Non-signing source/config preflight. No accounts, credentials or upload APIs."""
import json
import os
from pathlib import Path
import plistlib
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'mano/build/distribution-dry-run'

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    checks = []
    for name, command in [
        ('protected-runtime', ['node', 'scripts/check-mobile-runtime.mjs']),
        ('release-source', ['node', 'scripts/check-release.mjs']),
        ('strict-privacy', ['python3' if sys.platform == 'darwin' else sys.executable, '../scripts/check-apple-privacy.py', '--submission']),
    ]:
        result = subprocess.run(command, cwd=ROOT/'mano', capture_output=True, text=True)
        (OUT/(name+'.log')).write_text(result.stdout+result.stderr, encoding='utf-8')
        checks.append({'name':name, 'status':'PASS' if result.returncode == 0 else 'FAIL', 'exitCode':result.returncode})
    info = plistlib.loads((ROOT/'mano/ios/App/App/Info.plist').read_bytes())
    project = (ROOT/'mano/ios/App/App.xcodeproj/project.pbxproj').read_text(encoding='utf-8')
    checks.append({'name':'bundle-and-minimum-source', 'status':'PASS' if 'PRODUCT_BUNDLE_IDENTIFIER = work.joaquin.mano;' in project and 'IPHONEOS_DEPLOYMENT_TARGET = 17.0;' in project else 'FAIL'})
    blockers = [
        'Executed native safety, Live Photo and crash recovery gates for the exact source',
        'Approved tracking domains and successful strict privacy report',
        'Owner chooses unused marketing version/build after consulting App Store Connect',
        'Existing Apple Distribution identity and App Store provisioning profile in a private Keychain',
        'Owner-provided team ID and locally reviewed export options',
        'Explicit owner authorization before importing or using signing material',
    ]
    sha = subprocess.check_output(['git','rev-parse','HEAD'], cwd=ROOT, text=True).strip()
    report = {
        'sourceSha':sha, 'dryRunProcedure':'PASS',
        'distributionReadiness':'FAIL' if any(c['status']=='FAIL' for c in checks) else 'BLOCKED',
        'checks':checks, 'humanPrerequisites':[{'status':'BLOCKED', 'requirement':x} for x in blockers],
        'performed':['read source config', 'run non-signing source checks', 'write non-secret report'],
        'notPerformed':['inspect or import certificates', 'read private keys', 'alter Keychain', 'contact Apple accounts', 'sign', 'archive', 'export IPA', 'upload', 'publish'],
        'bundleIdentifierTemplate':info.get('CFBundleIdentifier'),
        'credentialRule':'Use GitHub Secrets or local Keychain only; never paste credentials into chat or commit them.',
    }
    (OUT/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report,indent=2))
    return 78  # A documented dry-run is never distribution acceptance.

if __name__ == '__main__':
    raise SystemExit(main())
