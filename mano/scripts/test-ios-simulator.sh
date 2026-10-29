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
import os, shlex, signal, subprocess, sys
seconds = int(sys.argv[1])
command_display = shlex.join(sys.argv[2:])
# stderr keeps UUID/SDK command-substitution stdout machine-readable.
print(f'RUN (timeout={seconds}s): {command_display}', file=sys.stderr, flush=True)
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
    print(f'ERROR: command exceeded {seconds}s: {command_display}', file=sys.stderr, flush=True)
    sys.exit(124)
PY
bounded() { python3 "$helper" "$@"; }
simulator_id=''
log_pid=''
simulator_booted=0
log_predicate='process == "App" OR process CONTAINS "WebKit"'
failure_predicate="$log_predicate OR process == \"installd\" OR process == \"installcoordinationd\" OR process == \"lsd\" OR process == \"SpringBoard\""
cleanup() {
  local result=$?
  trap - EXIT INT TERM
  set +e
  if [ "$result" -ne 0 ] && [ "$simulator_booted" -eq 1 ]; then
    echo 'Collecting diagnostics from the generated-photo-only ephemeral simulator.' >&2
    bounded 40 xcrun simctl io "$simulator_id" screenshot --type=png "$smoke_dir/failure.png"
    bounded 60 xcrun simctl spawn "$simulator_id" log show --last 5m --style compact \
      --predicate "$failure_predicate" > "$smoke_dir/failure-unified.log" 2>&1
    tail -n 100 "$smoke_dir/failure-unified.log" >&2
  fi
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
# Nondefault Xcode can require CoreSimulator cache rebuild before direct access.
# Runner maintainer's prewarm guidance: https://github.com/actions/runner-images/issues/12862
# Retry only this read-only startup probe; no simulator or app success is inferred.
simulator_ready=0
for attempt in 1 2; do
  echo "CoreSimulator readiness attempt $attempt/2 (up to 180s)" >&2
  if bounded 180 xcrun simctl list > /dev/null; then
    simulator_ready=1
    break
  fi
  if [ "$attempt" -lt 2 ]; then
    echo 'CoreSimulator is not ready; allow cache rebuild and retry once.' >&2
    sleep 5
  fi
done
if [ "$simulator_ready" -ne 1 ]; then
  echo 'ERROR: CoreSimulator did not become ready after two bounded probes. PhotoKit smoke test has NOT passed; packaging is blocked.' >&2
  exit 1
fi
bounded 120 xcrun simctl list -j > "$smoke_dir/inventory.json"
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

bounded 900 xcodebuild -project ios/App/App.xcodeproj -scheme ManoSmoke \
  -configuration Release -sdk iphonesimulator -destination "platform=iOS Simulator,id=$simulator_id" \
  -derivedDataPath build/simulator-smoke/DerivedData \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY='' build-for-testing \
  > "$smoke_dir/build.log" 2>&1 || { tail -n 100 "$smoke_dir/build.log"; exit 1; }
app="$smoke_dir/DerivedData/Build/Products/Release-iphonesimulator/App.app"
test -d "$app" || { echo 'ERROR: simulator app was not built.' >&2; exit 1; }
bundle_id="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$app/Info.plist")"
test "$bundle_id" = work.joaquin.mano || { echo 'ERROR: unexpected application bundle identifier.' >&2; exit 1; }
test -f public/assets/photos/lake.png || { echo 'ERROR: generated test photo missing.' >&2; exit 1; }

bounded 60 xcrun simctl boot "$simulator_id"
bounded 240 xcrun simctl bootstatus "$simulator_id" -b
simulator_booted=1
# ARM CI failure screenshot showed the installed icon while this command still
# awaited completion at 60s. Allow one bounded cold install; do not retry blindly.
bounded 180 xcrun simctl install "$simulator_id" "$app"
# This dedicated simulator contains only this generated public fixture; never real photos.
bounded 60 xcrun simctl addmedia "$simulator_id" "$PWD/public/assets/photos/lake.png"
# Do not pregrant Photos: on this iOS runtime that can leave .readWrite
# notDetermined. XCTest requests permission through the real app and OS dialog.

log_file="$smoke_dir/photos-read.log"
python3 "$helper" 900 xcrun simctl spawn "$simulator_id" log stream \
  --style compact --level debug \
  --predicate "$log_predicate" \
  > "$log_file" 2>&1 &
log_pid=$!
sleep 2
kill -0 "$log_pid" || { echo 'ERROR: simulator unified-log stream failed.' >&2; cat "$log_file"; exit 1; }

# XCTest owns exactly one app launch, taps Iniciar sesión, explicitly allows FULL
# access in SpringBoard, and requires Terminar sesión. Disable simulator cloning
# and parallel runs so that the test uses this exact generated-photo-only device.
bounded 600 xcodebuild -project ios/App/App.xcodeproj -scheme ManoSmoke \
  -configuration Release -sdk iphonesimulator -destination "platform=iOS Simulator,id=$simulator_id" \
  -derivedDataPath build/simulator-smoke/DerivedData \
  -resultBundlePath build/simulator-smoke/PhotosSmoke.xcresult \
  -only-testing:ManoUITests/PhotosSmokeTests/testFullPhotosAuthorizationStartsSession \
  -parallel-testing-enabled NO -maximum-concurrent-test-simulator-destinations 1 \
  -test-timeouts-enabled YES -maximum-test-execution-time-allowance 300 \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY='' test-without-building \
  > "$smoke_dir/ui-test.log" 2>&1 || { tail -n 120 "$smoke_dir/ui-test.log"; exit 1; }
tail -n 25 "$smoke_dir/ui-test.log"
grep -q 'MEMSWIPE_UI_AUTHORIZED_SESSION_OK' "$smoke_dir/ui-test.log" || {
  echo 'ERROR: UI test did not reach the authorized real session. Packaging is blocked.' >&2
  exit 1
}

# Successful UI assertions alone cannot pass: require the original native
# PhotoKit enumeration count from the actual JS call. Allow log flush, not relaunch.
deadline=$((SECONDS + 15))
while [ "$SECONDS" -lt "$deadline" ]; do
  sleep 1
  read_status="$(python3 - "$log_file" <<'PY'
import re, sys
text = open(sys.argv[1], errors='replace').read()
matches = re.findall(r'MEMSWIPE_PHOTOS_READ_OK count=(\d+)\b', text)
print('positive' if any(int(count) >= 1 for count in matches) else 'zero' if matches else 'waiting')
PY
)"
  if [ "$read_status" = positive ]; then
    grep 'MEMSWIPE_PHOTOS_READ_OK count=' "$log_file"
    echo 'PASS: real UI granted full Photos access, entered the session, and JavaScript invoked native PhotoKit with >=1 generated photo.'
    exit 0
  fi
  kill -0 "$log_pid" || { echo 'ERROR: unified-log stream ended before the PhotoKit assertion.' >&2; break; }
done
tail -n 120 "$log_file"
echo 'ERROR: no runtime MEMSWIPE_PHOTOS_READ_OK count>=1 after app launch. JS/native bridge or PhotoKit read failed; packaging is blocked.' >&2
exit 1
