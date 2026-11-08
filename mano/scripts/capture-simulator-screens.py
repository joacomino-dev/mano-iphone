#!/usr/bin/env python3
"""Capture only the disposable fixture simulator; discover multi-display IDs.

No guessed Duo IDs. Preserve the simctl error and fail if any capture fails.
This helper never changes the result of the calling XCTest cleanup.
"""
import argparse
import os
from pathlib import Path
import re
import signal
import subprocess


def invoke(command):
    process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                               text=True, start_new_session=True)
    try:
        output, _ = process.communicate(timeout=40)
        return process.returncode, output
    except subprocess.TimeoutExpired:
        os.killpg(process.pid, signal.SIGKILL)
        output, _ = process.communicate(timeout=5)
        return 124, output + '\nScreenshot exceeded 40s.\n'


def capture(device, folder, run=invoke):
    folder = Path(folder)
    folder.mkdir(parents=True, exist_ok=True)
    base = ['xcrun', 'simctl', 'io', device, 'screenshot', '--type=png']
    status, output = run(base + [str(folder / 'failure.png')])
    (folder / 'screen-capture.log').write_text(output, encoding='utf-8')
    if status == 0:
        return 0
    # Xcode27.1 error in run42438304068 lists --display=3 and --display=1.
    # Discover from this exact invocation, never assume IDs or screen count.
    displays = list(dict.fromkeys(re.findall(r'--display=(\d+)\b', output)))
    if not displays:
        return status
    failed = False
    for display in displays:
        code, detail = run(base + [f'--display={display}', str(folder / f'failure-display-{display}.png')])
        with (folder / 'screen-capture.log').open('a', encoding='utf-8') as log:
            log.write(f'\nDISPLAY {display} exit={code}\n{detail}')
        failed |= code != 0
    return 1 if failed else 0


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('device')
    parser.add_argument('folder')
    args = parser.parse_args()
    raise SystemExit(capture(args.device, args.folder))
