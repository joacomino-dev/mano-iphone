"""Inspect pinned official SDK ZIPs without running or installing their binaries.
Python 3 standard library only. Run from repository root. No credentials needed.
"""
import argparse, datetime, hashlib, io, json, pathlib, plistlib, urllib.request, zipfile

PACKAGES = [
    ('ads', '13.12.0', 'swift-package-manager-google-mobile-ads',
     'https://dl.google.com/googleadmobadssdk/6b8bfa69d6b4b848/googlemobileadsios-spm-13.12.0.zip',
     '6b8bfa69d6b4b8484328803fc5f71d5735caf7ce01acff8abb76e8b73c83e005'),
    ('ump', '3.1.0', 'swift-package-manager-google-user-messaging-platform',
     'https://dl.google.com/googleadmobadssdk/90fe6bf3b0f4ce0d/googleusermessagingplatformios-spm-3.1.0.zip',
     '90fe6bf3b0f4ce0d0199628c0871de58b6f673375148b98d52348aecc86db231'),
]

def fetch(url):
    with urllib.request.urlopen(url, timeout=60) as response:
        return response.read()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', default='work/apple-readiness/rc-sdk')
    args = parser.parse_args()
    out = pathlib.Path(args.output)
    out.mkdir(parents=True, exist_ok=True)
    result = {'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'boundary': 'Official pinned ZIP checksum and manifest inspection. NOT Apple signature verification, runtime traffic or archive aggregation.', 'packages': []}
    for name, version, repo, url, checksum in PACKAGES:
        source = f'https://raw.githubusercontent.com/googleads/{repo}/{version}/Package.swift'
        declaration = fetch(source)
        assert url.encode() in declaration and checksum.encode() in declaration, 'Pinned package declaration changed'
        cached = out / f'{name}.zip'
        data = cached.read_bytes() if cached.exists() else fetch(url)
        assert hashlib.sha256(data).hexdigest() == checksum, 'SDK checksum mismatch'
        cached.write_bytes(data)
        (out / f'{name}-Package.swift').write_bytes(declaration)
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            paths = [p for p in archive.namelist() if '/ios-arm64/' in p and p.endswith('/PrivacyInfo.xcprivacy')]
            assert len(paths) == 1, 'Expected one arm64 manifest'
            manifest = archive.read(paths[0])
            (out / f'{name}-PrivacyInfo.xcprivacy').write_bytes(manifest)
            result['packages'].append(dict(name=name, version=version, source=source, url=url,
                sha256=checksum, bytes=len(data), manifestPath=paths[0],
                manifest=plistlib.loads(manifest),
                signaturePaths=[p for p in archive.namelist() if '/_CodeSignature/' in p]))
    (out / 'summary.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf8')
    print('PASS: official package checksums and manifests inspected; signatures and runtime remain BLOCKED.')

if __name__ == '__main__':
    main()
