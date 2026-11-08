"""Static privacy consistency check. Not a substitute for Xcode's archive report."""
import json, pathlib, plistlib, sys
from privacy_tracking import validate_tracking
root = pathlib.Path(__file__).resolve().parent.parent
data = json.loads((root/'docs/apple-readiness/evidence/rc-sdk-summary.json').read_text(encoding='utf8'))
app = plistlib.loads((root/'mano/ios/App/App/PrivacyInfo.xcprivacy').read_bytes())
own = {d['NSPrivacyCollectedDataType']: d for d in app['NSPrivacyCollectedDataTypes']}
for package in data['packages']:
    for vendor in package['manifest']['NSPrivacyCollectedDataTypes']:
        declared = own[vendor['NSPrivacyCollectedDataType']]
        for flag in ['NSPrivacyCollectedDataTypeLinked', 'NSPrivacyCollectedDataTypeTracking']:
            assert declared[flag] or not vendor[flag], (package['name'], vendor['NSPrivacyCollectedDataType'], flag)
        assert set(vendor['NSPrivacyCollectedDataTypePurposes']) <= set(declared['NSPrivacyCollectedDataTypePurposes'])
assert app['NSPrivacyTracking'] is True
for lang in ['es','en','fr','de','it','ar','ja']:
    text = (root/f'mano/ios/App/App/{lang}.lproj/InfoPlist.strings').read_text(encoding='utf8')
    assert '"CocoWashClose" = ' in text
for name in ['privacy.html','privacidad.html']:
    text = (root/'web/cocowash'/name).read_text(encoding='utf8')
    assert 'cocowash@joaquinmino.work' in text and 'Joaquin Miño' in text
    assert 'iCloud' in text and 'Google' in text and 'IDFA' in text
print('PASS (static scope only): SDK collection superset, plist parsing, native close localization and ES/EN policy identity.')
if app.get('NSPrivacyTracking') and not app.get('NSPrivacyTrackingDomains'):
    print('FAIL for submission: tracking enabled but no tracking domains declared (Apple TN3182). Provider confirmation/native traffic inspection required; do not invent domains.')
    if '--submission' in sys.argv:
        sys.exit(1)
approval=json.loads((root/'docs/apple-readiness/evidence/strategic/tracking-domain-approval-2026-11-08.json').read_text(encoding='utf8'))
validate_tracking(app,approval['domains'])
print('PASS (declaration only): exact owner-approved tracking domains. Not exhaustive runtime/privacy acceptance.')
print('BLOCKED: final archive signatures/report, runtime enforcement and public policy deployment. Vendor source signature evidence is separate.')
