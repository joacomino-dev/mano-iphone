import importlib.util
from pathlib import Path
import tempfile
import unittest

spec=importlib.util.spec_from_file_location('evidence',Path(__file__).parents[1]/'verify-native-gate-evidence.py');gate=importlib.util.module_from_spec(spec);spec.loader.exec_module(gate)
class NativeEvidenceTests(unittest.TestCase):
    def test_shell_zero_without_ui_is_not_pass(self):
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(FileNotFoundError): gate.verify(d)
    def test_incomplete_invocation(self):
        with tempfile.TemporaryDirectory() as d:
            Path(d,'ui-test-exit-code.txt').write_text('RUNNING')
            with self.assertRaises(ValueError): gate.verify(d)
    def test_fabricated_marker_without_actual_test_result_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            Path(d,'ui-test-exit-code.txt').write_text('0');Path(d,'ui-test.log').write_text('\n'.join(gate.MARKERS));Path(d,'photos-read.log').write_text('')
            with self.assertRaisesRegex(ValueError,'Case did not really pass'): gate.verify(d)
    def test_skipped_case_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            Path(d,'ui-test-exit-code.txt').write_text('0');Path(d,'ui-test.log').write_text("Test Case '-[ManoUITests.PhotosSmokeTests testFullPhotosAuthorizationStartsSession]' skipped (0.0 seconds).")
            Path(d,'photos-read.log').write_text('')
            with self.assertRaisesRegex(ValueError,'Case did not really pass'): gate.verify(d)

if __name__=='__main__': unittest.main()
