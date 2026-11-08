"""Require real captured files for each locale; verify dimensions/RGB/hash."""
import hashlib
import json
from pathlib import Path
import struct
import sys

def verify(folder,platform):
    folder=Path(folder);screens=[]
    allowed={(1179,2556),(1206,2622),(1260,2736),(1290,2796),(1320,2868)} if platform=='ios' else {(1080,1920)}
    for lang in ['es','en','fr','de','it','ar','ja']:
        for screen in ['01-cards','02-review','03-filters','04-settings']:
            name=f'{lang}-{screen}.png';data=(folder/name).read_bytes()
            assert data[:8]==b'\x89PNG\r\n\x1a\n','Actual PNG required'
            width,height=struct.unpack('>II',data[16:24])
            assert (width,height) in allowed,'Unexpected actual screenshot dimensions'
            assert data[24:26]==bytes([8,2]),'RGB24 without alpha required'
            screens.append({'file':name,'width':width,'height':height,'sha256':hashlib.sha256(data).hexdigest()})
    return {'status':'PASS','platform':platform,'screens':screens,'boundary':'File validation only; source execution and visual review are separate evidence.'}

if __name__=='__main__':
    report=verify(sys.argv[1],sys.argv[2]);Path(sys.argv[1],'files.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
