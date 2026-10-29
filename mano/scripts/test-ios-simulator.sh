#!/bin/bash
# Real installed-app JS -> Capacitor -> PhotoKit smoke test. No physical devices.
set -euo pipefail
cd "$(dirname "$0")/.."
test "$(uname -s)" = Darwin || { echo 'ERROR: iOS smoke test requires macOS/Xcode.' >&2; exit 1; }
command -v python3 >/dev/null
mkdir -p build/simulator-smoke
smoke_dir="$PWD/build/simulator-smoke"
helper="$smoke_dir/run-bounded.py"
cat > "$helper" <<'PY'
import os, signal, subprocess, sys
seconds = int(sys.argv[1])
process = subprocess.Popen(sys.argv[2:], start_new_session=True)
def stop(signum, frame):
    try: os.killpg(process.pid, signal.SIGKILL)
    except ProcessLookupError: pass
    process.wait()
    sys.exit(128 + signum)
signal.signal(signal.SIGTERM, stop)
signal.signal(signal.SIGINT, stop)
try:
    sys.exit(process.wait(timeout=seconds))
except subprocess.TimeoutExpired:
    try: os.killpg(process.pid, signal.SIGKILL)
    except ProcessLookupError: pass
    process.wait()
    print(f'ERROR: command exceeded {seconds}s: {sys.argv[2]}', file=sys.stderr)
    sys.exit(124)
PY
bounded() { python3 "$helper" "$@"; }
simulator_id=''
log_pid=''
cleanup() {
  local result=$?
  trap - EXIT INT TERM
  set +e
  if [ -n "$log_pid" ]; then
    kill -TERM "$log_pid" 2>/dev/null
    wait "$log_pid" 2>/dev/null
  fi
  if [ -n "$simulator_id" ]; then
    bounded 25 xcrun simctl shutdown "$simulator_id" >/dev/null 2>&1
    bounded 25 xcrun simctl delete "$simulator_id" >/dev/null 2>&1
  fi
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Runner-image reference (Xcode 26.3 shares the preinstalled iOS 26.2 runtime):
# https://github.com/actions/runner-images/blob/main/images/macos/toolsets/toolset-15.json
# Discover what this exact runner exposes; never download runtimes or guess UDIDs.
bounded 60 xcrun simctl list -j > "$smoke_dir/inventory.json"
sdk_version="$(bounded 30 xcrun --sdk iphonesimulator --show-sdk-version)"
python3 - "$smoke_dir/inventory.json" "$sdk_version" > "$smoke_dir/selection.txt" <<'PY'
import json, sys
inventory = json.load(open(sys.argv[1]))
def version(value):
    return tuple((list(map(int, value.split('.'))) + [0, 0])[:3])
sdk = version(sys.argv[2].strip())
types = inventory.get('devicetypes', [])
for runtime in sorted(inventory.get('runtimes', []), key=lambda r: version(r['version']), reverse=True):
    if not runtime.get('identifier', '').startswith('com.apple.CoreSimulator.SimRuntime.iOS-'):
        continue
    if not runtime.get('isAvailable') or not (version('17') <= version(runtime['version']) <= sdk):
        continue
    for device in inventory.get('devices', {}).get(runtime['identifier'], []):
        if not device.get('isAvailable') or not device.get('name', '').startswith('iPhone'):
            continue
        kind = device.get('deviceTypeIdentifier')
        if not kind:
            kind = next((t['identifier'] for t in types if t['name'] == device['name']), None)
        if kind:
            print(runtime['identifier'])
            print(kind)
            print(f"{device['name']} / iOS {runtime['version']}")
            sys.exit(0)
sys.exit('ERROR: no available existing iPhone simulator with iOS >=17 and <=selected simulator SDK. No runtime will be downloaded.')
PY
runtime_id="$(sed -n '1p' "$smoke_dir/selection.txt")"
device_type="$(sed -n '2p' "$smoke_dir/selection.txt")"
echo "Smoke simulator: $(sed -n '3p' "$smoke_dir/selection.txt") (fresh ephemeral device)"
simulator_id="$(bounded 60 xcrun simctl create "MemSwipe-smoke-${GITHUB_RUN_ID:-local}-$$" "$device_type" "$runtime_id")"
[[ "$simulator_id" =~ ^[0-9A-Fa-f-]{36}$ ]] || { echo 'ERROR: simulator creation returned no valid UUID.' >&2; exit 1; }

bounded 900 xcodebuild -project ios/App/App.xcodeproj -scheme App \
  -configuration Release -sdk iphonesimulator -destination "platform=iOS Simulator,id=$simulator_id" \
  -derivedDataPath build/simulator-smoke/DerivedData \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY='' build \
  > "$smoke_dir/build.log" 2>&1 || { tail -n 100 "$smoke_dir/build.log"; exit 1; }
app="$smoke_dir/DerivedData/Build/Products/Release-iphonesimulator/App.app"
test -d "$app" || { echo 'ERROR: simulator app was not built.' >&2; exit 1; }
bundle_id="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$app/Info.plist")"
test "$bundle_id" = work.joaquin.mano || { echo 'ERROR: unexpected application bundle identifier.' >&2; exit 1; }
test -f public/assets/photos/lake.png || { echo 'ERROR: generated test photo missing.' >&2; exit 1; }

bounded 60 xcrun simctl boot "$simulator_id"
bounded 240 xcrun simctl bootstatus "$simulator_id" -b
bounded 60 xcrun simctl install "$simulator_id" "$app"
# This dedicated simulator contains only this generated public fixture; never real photos.
bounded 60 xcrun simctl addmedia "$simulator_id" "$PWD/public/assets/photos/lake.png"
bounded 30 xcrun simctl privacy "$simulator_id" grant photos "$bundle_id"

log_file="$smoke_dir/photos-read.log"
python3 "$helper" 180 xcrun simctl spawn "$simulator_id" log stream \
  --style compact --level debug \
  --predicate 'process == "App" AND eventMessage CONTAINS "MEMSWIPE_PHOTOS_READ_OK"' \
  > "$log_file" 2>&1 &
log_pid=$!
sleep 2
kill -0 "$log_pid" || { echo 'ERROR: simulator unified-log stream failed.' >&2; cat "$log_file"; exit 1; }

# Library.assets() is invoked by the real bundled JS on mount. A Swift source string,
# a successful build or a zero-photo read is never sufficient to pass this gate.
# Relaunch permits asynchronous simulator Photos indexing to finish, bounded to 100s.
deadline=$((SECONDS + 100))
while [ "$SECONDS" -lt "$deadline" ]; do
  bounded 20 xcrun simctl launch --terminate-running-process "$simulator_id" "$bundle_id"
  sleep 5
  if python3 - "$log_file" <<'PY'
import re, sys
text = open(sys.argv[1], errors='replace').read()
matches = re.findall(r'MEMSWIPE_PHOTOS_READ_OK count=(\d+)\b', text)
sys.exit(0 if any(int(count) >= 1 for count in matches) else 1)
PY
  then
    cat "$log_file"
    echo 'PASS: installed app JavaScript invoked native PhotoLibrary.assets and PhotoKit read >=1 generated photo.'
    exit 0
  fi
  kill -0 "$log_pid" || { echo 'ERROR: unified-log stream ended before the PhotoKit assertion.' >&2; break; }
done
cat "$log_file"
echo 'ERROR: no runtime MEMSWIPE_PHOTOS_READ_OK count>=1 after app launch. JS/native bridge or PhotoKit read failed; packaging is blocked.' >&2
exit 1
