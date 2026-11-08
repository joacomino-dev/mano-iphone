#!/bin/bash
# CI only: a disposable test library on the emulator — three "photos" and one
# screenshot (screen captures of the emulator itself) and a 3 s screen recording —
# then media permission for CocoWash and a fresh launch with the DevTools socket.
# Nothing here comes from a person's phone.
set -euo pipefail
PKG=work.joaquin.mano
sh() { timeout 60 adb shell "$@"; }
sh mkdir -p /sdcard/DCIM/Camera /sdcard/Pictures/Screenshots /sdcard/Movies
for i in 1 2 3; do sh screencap -p "/sdcard/DCIM/Camera/cocowash-test-$i.png"; sleep 1; done
for i in $(seq 4 63); do sh cp /sdcard/DCIM/Camera/cocowash-test-1.png "/sdcard/DCIM/Camera/cocowash-test-$i.png"; done
sh screencap -p /sdcard/Pictures/Screenshots/Screenshot_cocowash-test.png
# Screenrecord on a static emulator can write a one-frame, zero-duration MP4.
# Require an independently probed animated fixture instead of a silent fallback.
command -v ffmpeg >/dev/null && command -v ffprobe >/dev/null
timeout 60 ffmpeg -loglevel error -y -f lavfi -i testsrc=duration=3:size=640x360:rate=15 -c:v libx264 -pix_fmt yuv420p "${RUNNER_TEMP:-/tmp}/cocowash-test.mp4"
ffprobe -v error -show_entries format=duration -of json "${RUNNER_TEMP:-/tmp}/cocowash-test.mp4" > build/android-startup/video-fixture.json
python3 -c 'import json; d=float(json.load(open("build/android-startup/video-fixture.json"))["format"]["duration"]); assert 2.9<=d<=3.1, "invalid generated video duration"'
timeout 60 adb push "${RUNNER_TEMP:-/tmp}/cocowash-test.mp4" /sdcard/Movies/cocowash-test.mp4 >/dev/null
for file in /sdcard/DCIM/Camera/cocowash-test-1.png /sdcard/DCIM/Camera/cocowash-test-2.png /sdcard/DCIM/Camera/cocowash-test-3.png \
            /sdcard/Pictures/Screenshots/Screenshot_cocowash-test.png /sdcard/Movies/cocowash-test.mp4; do
  sh am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d "file://$file" >/dev/null 2>&1 || true
done
sh content call --uri content://media --method scan_volume --arg external_primary >/dev/null 2>&1 || true
sleep 5
for permission in READ_MEDIA_IMAGES READ_MEDIA_VIDEO ACCESS_MEDIA_LOCATION; do
  sh pm grant "$PKG" "android.permission.$permission"
done
sh am force-stop "$PKG"
timeout 60 adb shell am start -W -n "$PKG/.MainActivity" >/dev/null
sleep 12
[ -n "$(sh pidof "$PKG" | tr -d '\r')" ] || { echo 'app not running after permission grant'; exit 1; }
echo 'E2E_LIBRARY_READY'
