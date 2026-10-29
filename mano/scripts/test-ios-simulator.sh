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
boot_pid=''
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
  if [ -n "$boot_pid" ]; then
    kill -TERM "$boot_pid" 2>/dev/null
    wait "$boot_pid" 2>/dev/null
    tail -n 30 "$smoke_dir/bootstatus.log" >&2
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

# Cold Intel iOS runtimes migrate their data on first boot. Start that work
# alongside compilation, then require real boot completion before installation.
bounded 60 xcrun simctl boot "$simulator_id"
python3 "$helper" 900 xcrun simctl bootstatus "$simulator_id" -b \
  > "$smoke_dir/bootstatus.log" 2>&1 &
boot_pid=$!

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

# The official macos-26 ARM inventory does not advertise ffmpeg:
# https://github.com/actions/runner-images/blob/main/images/macos/macos-26-arm64-Readme.md
# Generate a silent, tiny H.264 fixture with the already-required Apple SDK instead.
# This is runner-only test media derived from our public image, never a user asset.
cat > "$smoke_dir/make-video.swift" <<'SWIFT'
import AppKit
import AVFoundation
import CoreVideo
import Foundation

func fail(_ message: String) -> Never {
    fputs("ERROR: generated video fixture: \(message)\n", stderr)
    exit(1)
}
let width = 320, height = 240
guard CommandLine.arguments.count == 3,
      let image = NSImage(contentsOfFile: CommandLine.arguments[1]),
      let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil)
else { fail("public source image could not be decoded") }
let output = URL(fileURLWithPath: CommandLine.arguments[2])
if FileManager.default.fileExists(atPath: output.path) {
    try FileManager.default.removeItem(at: output)
}
let writer = try AVAssetWriter(outputURL: output, fileType: .mp4)
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: width, AVVideoHeightKey: height
])
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input,
    sourcePixelBufferAttributes: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB,
        kCVPixelBufferWidthKey as String: width, kCVPixelBufferHeightKey as String: height])
guard writer.canAdd(input) else { fail("writer cannot accept H.264 input") }
writer.add(input)
guard writer.startWriting() else { fail(writer.error?.localizedDescription ?? "writer did not start") }
writer.startSession(atSourceTime: .zero)
var buffer: CVPixelBuffer?
guard CVPixelBufferCreate(kCFAllocatorDefault, width, height, kCVPixelFormatType_32ARGB,
    [kCVPixelBufferCGImageCompatibilityKey as String: true, kCVPixelBufferCGBitmapContextCompatibilityKey as String: true] as CFDictionary,
    &buffer) == kCVReturnSuccess, let pixels = buffer else { fail("pixel buffer allocation failed") }
CVPixelBufferLockBaseAddress(pixels, [])
guard let context = CGContext(data: CVPixelBufferGetBaseAddress(pixels), width: width, height: height,
    bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(pixels), space: CGColorSpaceCreateDeviceRGB(),
    bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue) else { fail("drawing context unavailable") }
context.draw(cgImage, in: CGRect(x: 0, y: 0, width: CGFloat(width), height: CGFloat(height)))
CVPixelBufferUnlockBaseAddress(pixels, [])
let deadline = Date().addingTimeInterval(20)
for frame in 0..<24 {
    while !input.isReadyForMoreMediaData {
        guard writer.status == .writing, Date() < deadline else { fail("encoder readiness timed out") }
        Thread.sleep(forTimeInterval: 0.01)
    }
    guard adaptor.append(pixels, withPresentationTime: CMTime(value: Int64(frame), timescale: 12))
    else { fail(writer.error?.localizedDescription ?? "frame rejected") }
}
input.markAsFinished()
let done = DispatchSemaphore(value: 0)
writer.finishWriting { done.signal() }
guard done.wait(timeout: .now() + 20) == .success, writer.status == .completed
else { fail(writer.error?.localizedDescription ?? "finalization failed") }
let bytes = (try FileManager.default.attributesOfItem(atPath: output.path)[.size] as? NSNumber)?.int64Value ?? 0
guard bytes > 0 else { fail("empty output") }
print("Generated public test video bytes=\(bytes)")
SWIFT
bounded 120 xcrun swift "$smoke_dir/make-video.swift" "$PWD/public/assets/photos/lake.png" "$smoke_dir/lake-fixture.mp4"
test -s "$smoke_dir/lake-fixture.mp4" || { echo 'ERROR: generated MP4 missing or empty.' >&2; exit 1; }

if wait "$boot_pid"; then
  boot_pid=''
else
  boot_pid=''
  tail -n 40 "$smoke_dir/bootstatus.log" >&2
  echo 'ERROR: first-boot migration did not complete within 900s. No app test or packaging was accepted.' >&2
  exit 1
fi
simulator_booted=1
# ARM CI failure screenshot showed the installed icon while this command still
# awaited completion at 60s. Allow one bounded cold install; do not retry blindly.
bounded 180 xcrun simctl install "$simulator_id" "$app"
# Only generated public fixtures are imported; never real photos or videos.
bounded 60 xcrun simctl addmedia "$simulator_id" "$PWD/public/assets/photos/lake.png" "$smoke_dir/lake-fixture.mp4"
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

# XCTest owns exactly one app launch, explicitly allows FULL access on welcome,
# then taps Iniciar sesión and requires Finalizar sesión after warmup. It also
# creates a fixture-only album and reads local Geek metadata through the UI.
# Disable simulator cloning
# and parallel runs so that the test uses this exact generated-photo-only device.
bounded 900 xcodebuild -project ios/App/App.xcodeproj -scheme ManoSmoke \
  -configuration Release -sdk iphonesimulator -destination "platform=iOS Simulator,id=$simulator_id" \
  -derivedDataPath build/simulator-smoke/DerivedData \
  -resultBundlePath build/simulator-smoke/PhotosSmoke.xcresult \
  -only-testing:ManoUITests/PhotosSmokeTests/testFullPhotosAuthorizationStartsSession \
  -parallel-testing-enabled NO -maximum-concurrent-test-simulator-destinations 1 \
  -test-timeouts-enabled YES -maximum-test-execution-time-allowance 600 \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY='' test-without-building \
  > "$smoke_dir/ui-test.log" 2>&1 || { tail -n 120 "$smoke_dir/ui-test.log"; exit 1; }
tail -n 25 "$smoke_dir/ui-test.log"
grep -q 'MEMSWIPE_UI_AUTHORIZED_SESSION_OK' "$smoke_dir/ui-test.log" || {
  echo 'ERROR: UI test did not reach the authorized real session. Packaging is blocked.' >&2
  exit 1
}
for marker in COCOWASH_UI_GENERATED_ALBUM_OK COCOWASH_UI_LOCAL_METADATA_OK; do
  grep -q "$marker" "$smoke_dir/ui-test.log" || {
    echo "ERROR: UI test did not prove $marker through the real generated-media UI. Packaging is blocked." >&2
    exit 1
  }
done

# Successful UI assertions alone cannot pass: require the original native
# PhotoKit enumeration and a nonempty prepared local video from actual JS calls.
# The small fresh library fits the session's <=10-item warmup; no test bypass API.
# Allow log flush, not relaunch.
deadline=$((SECONDS + 15))
while [ "$SECONDS" -lt "$deadline" ]; do
  sleep 1
  read_status="$(python3 - "$log_file" <<'PY'
import re, sys
text = open(sys.argv[1], errors='replace').read()
photos = re.findall(r'MEMSWIPE_PHOTOS_READ_OK count=(\d+)\b', text)
videos = re.findall(r'MEMSWIPE_VIDEO_PREPARED_OK bytes=(\d+)\b', text)
print('positive' if any(int(count) >= 1 for count in photos) and any(int(size) >= 1 for size in videos) else 'waiting')
PY
)"
  if [ "$read_status" = positive ]; then
    grep 'MEMSWIPE_PHOTOS_READ_OK count=' "$log_file"
    grep 'MEMSWIPE_VIDEO_PREPARED_OK bytes=' "$log_file"
    echo 'PASS: real UI granted full Photos access, completed session warmup, read native PhotoKit, and prepared a nonempty local generated video.'
    exit 0
  fi
  kill -0 "$log_pid" || { echo 'ERROR: unified-log stream ended before the PhotoKit assertion.' >&2; break; }
done
tail -n 120 "$log_file"
echo 'ERROR: missing runtime MEMSWIPE_PHOTOS_READ_OK count>=1 or MEMSWIPE_VIDEO_PREPARED_OK bytes>=1 after authorized session start. PhotoKit/video warmup has NOT passed; packaging is blocked.' >&2
exit 1
