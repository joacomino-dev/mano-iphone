"""Recorded simctl diagnostic regression; no claim of executing simctl on Windows."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('screens', Path(__file__).parents[1] / 'scripts/capture-simulator-screens.py')
screens = importlib.util.module_from_spec(spec)
spec.loader.exec_module(screens)


class CaptureTests(unittest.TestCase):
    def check_capture(self, responses, expected, displays):
        commands = []
        def run(command):
            commands.append(command)
            return responses.pop(0)
        with tempfile.TemporaryDirectory() as folder:
            self.assertEqual(screens.capture('fixture-device', folder, run), expected)
            self.assertTrue((Path(folder) / 'screen-capture.log').is_file())
        self.assertEqual([c[-2] for c in commands[1:]], displays)
        self.assertFalse(responses)

    def test_single_screen(self):
        self.check_capture([(0, 'Detected file type PNG')], 0, [])

    def test_duo_recorded_ids_and_duplicate_suppression(self):
        self.check_capture([(1, 'Cannot choose between 2 displays. Specify one with --display:\n --display=3 LCD-1\n --display=1 LCD\n --display=3'), (0, 'ok'), (0, 'ok')], 0, ['--display=3', '--display=1'])

    def test_one_display_failure_still_fails(self):
        self.check_capture([(1, '--display=3\n--display=1'), (124, 'timeout'), (0, 'ok')], 1, ['--display=3', '--display=1'])

    def test_unrelated_error_does_not_invent_screens(self):
        self.check_capture([(22, 'Unknown simulator')], 22, [])


if __name__ == '__main__':
    unittest.main()
