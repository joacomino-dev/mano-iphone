"""Exercise the actual shell wrapper with a bounded-command recorder, no Apple UI.
Runs /bin/bash on Mac CI, including Apple's Bash3.2 empty-array behavior.
"""
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import unittest

SOURCE=Path(__file__).parents[2]/'mano/scripts/test-ios-simulator.sh'
FUNCTION=re.search(r'^run_ui_test\(\) \{.*?^\}',SOURCE.read_text(encoding='utf-8'),re.M|re.S).group()
BASH='C:/Program Files/Git/bin/bash.exe' if sys.platform=='win32' else '/bin/bash'

class NativeInvocationTests(unittest.TestCase):
    def invoke(self,mode,exit_code=0):
        with tempfile.TemporaryDirectory() as d:
            folder=Path(d).as_posix()
            script='set -eu\nsmoke_dir='+repr(folder)+'\nsimulator_id=owned-test-fixture\n'
            script+='bounded(){ printf "%s\\n" "$@" > "$smoke_dir/invoked.txt"; return '+str(exit_code)+'; }\n'+FUNCTION+'\nrun_ui_test\n'
            env=dict(os.environ,COCO_NATIVE_LAB='1',COCO_AD_TRAFFIC=mode)
            result=subprocess.run([BASH,'-c',script],capture_output=True,text=True,env=env)
            args=Path(d,'invoked.txt').read_text().splitlines()
            return result,args,Path(d,'ui-test-exit-code.txt').read_text().strip()
    def test_plain_invokes_xcodebuild(self):
        r,args,exit_code=self.invoke('none');self.assertEqual(r.returncode,0,r.stderr);self.assertEqual(args[:2],['2200','xcodebuild']);self.assertEqual(exit_code,'0')
    def test_proxy_invokes_same_xcodebuild(self):
        r,args,exit_code=self.invoke('denied');self.assertEqual(r.returncode,0,r.stderr);self.assertIn('xcodebuild',args);self.assertEqual(args[1],'python3');self.assertEqual(exit_code,'0')
    def test_failure_not_hidden(self):
        r,args,exit_code=self.invoke('none',9);self.assertEqual(r.returncode,9);self.assertEqual(exit_code,'9')

if __name__=='__main__': unittest.main()
