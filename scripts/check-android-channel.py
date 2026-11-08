"""Bind each Android artifact's actual web assets to its build-channel snapshot.
No dependency, signing secret, or minified-code guess. Run from repository root.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import zipfile


def snapshot(root, channel):
    root = Path(root)
    text = (root/'mano/src/channel.ts').read_text()
    declarations = re.findall(r'^export const DEVELOPER = (true|false);$', text, re.M)
    assert len(declarations) == 1, 'Missing/ambiguous build-channel declaration'
    developer = declarations[0] == 'true'
    assert developer == (channel == 'development'), 'Source channel mismatch'
    web = root/'mano/dist/native'
    files = [web/'index.html', *sorted((web/'assets').glob('*.js'))]
    assert len(files) >= 2, 'Build the actual native web first'
    return {'channel':channel,'developer':developer,'files':{str(p.relative_to(web)).replace('\\','/'):hashlib.sha256(p.read_bytes()).hexdigest() for p in files},'boundary':'Hashes of the built native web tied to the source channel; not native behavior or store acceptance'}


def verify(artifact, proof, expected):
    assert proof['channel'] == expected and proof['developer'] == (expected == 'development'), 'Unexpected artifact channel'
    prefix = 'base/assets/public/' if str(artifact).endswith('.aab') else 'assets/public/'
    with zipfile.ZipFile(artifact) as archive:
        for name,digest in proof['files'].items():
            assert hashlib.sha256(archive.read(prefix+name)).hexdigest() == digest, 'Artifact source mismatch: '+name


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--snapshot', choices=['store','development'])
    parser.add_argument('--out')
    parser.add_argument('--verify')
    parser.add_argument('--proof')
    parser.add_argument('--expected',choices=['store','development'])
    args = parser.parse_args()
    if args.snapshot:
        result = snapshot(Path.cwd(), args.snapshot)
        result['sourceSHA'] = subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
        target = Path(args.out);target.parent.mkdir(parents=True,exist_ok=True)
        target.write_text(json.dumps(result,indent=2)+'\n')
        print('CHANNEL_SNAPSHOT_PASS:',args.snapshot)
    else:
        verify(args.verify,json.loads(Path(args.proof).read_text()),args.expected)
        print('ARTIFACT_CHANNEL_PASS:',args.expected)
