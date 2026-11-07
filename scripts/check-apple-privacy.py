"""Static privacy consistency check. Not a substitute for Xcode's archive report."""
import json, pathlib, plistlib
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
print('PASS: SDK collection superset, plist parsing, native close localization and ES/EN policy identity. BLOCKED: domains, signatures, traffic, public policy deployment and aggregate archive report.')
