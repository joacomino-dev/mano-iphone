#!/bin/bash
# Disposable simulator only: native entry/reset/relaunch, no Photos access.
set -euo pipefail
mkdir -p build/startup-safety
xcrun simctl list devices available -j > build/startup-safety/devices.json
SIM=$(python3 - <<'PY'
import json
v=json.load(open('build/startup-safety/devices.json'))
for runtime,devices in v['devices'].items():
 if 'iOS' in runtime:
  for d in devices:
   if d.get('isAvailable') and 'iPhone' in d['name']:
    print(d['udid']);raise SystemExit
raise SystemExit('No iOS simulator available')
PY
)
xcrun simctl boot "$SIM" || true
xcrun simctl bootstatus "$SIM" -b > build/startup-safety/boot.log 2>&1 &
BOOT=$!
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release -sdk iphonesimulator -destination "id=$SIM" -derivedDataPath build/startup-safety/derived CODE_SIGNING_ALLOWED=NO build > build/startup-safety/build.log 2>&1
wait "$BOOT"
APP=build/startup-safety/derived/Build/Products/Release-iphonesimulator/App.app
/usr/libexec/PlistBuddy -c 'Add :CocoWashDevelopmentReset bool true' "$APP/Info.plist"
xcrun simctl install "$SIM" "$APP"
DATA=$(xcrun simctl get_app_container "$SIM" work.joaquin.mano data)
export DATA
python3 - <<'PY'
import os
from pathlib import Path
p=Path(os.environ['DATA']).resolve()
assert '/CoreSimulator/Devices/' in str(p) and '/Containers/Data/Application/' in str(p)
(p/'Library/Application Support/CocoPeople').mkdir(parents=True,exist_ok=True)
(p/'Library/Application Support/CocoPeople/old-index').write_text('synthetic-old-index')
(p/'Documents').mkdir(exist_ok=True);(p/'Documents/preserve').write_text('not-derived')
PY
xcrun simctl launch "$SIM" work.joaquin.mano > build/startup-safety/launch.log
python3 - <<'PY'
import os,time,plistlib
from pathlib import Path
p=Path(os.environ['DATA']);stamp=p/'Library/Preferences/work.joaquin.mano.plist'
for _ in range(120):
 try:
  if plistlib.loads(stamp.read_bytes()).get('cocowash-development-data-build')=='0.9.9-36':break
 except (OSError,ValueError):pass
 time.sleep(1)
else:raise SystemExit('Reset did not commit build marker')
assert not (p/'Library/Application Support/CocoPeople/old-index').exists()
assert (p/'Documents/preserve').read_text()=='not-derived'
# Same-build relaunch must keep CocoWash's own derived data (no second reset)…
(p/'Library/Caches/ManoThumbnails').mkdir(parents=True,exist_ok=True)
(p/'Library/Caches/ManoThumbnails/same-build').write_text('keep-on-relaunch')
# …while 9.8 deletes any retired face data on every launch.
(p/'Library/Application Support/CocoPeople').mkdir(exist_ok=True)
(p/'Library/Application Support/CocoPeople/index.sqlite').write_text('retired-face-index')
PY
sleep 10
xcrun simctl io "$SIM" screenshot build/startup-safety/first-launch.png
xcrun simctl terminate "$SIM" work.joaquin.mano
xcrun simctl launch "$SIM" work.joaquin.mano >> build/startup-safety/launch.log
sleep 10
python3 - <<'PY'
import os
from pathlib import Path
data=Path(os.environ['DATA'])
assert (data/'Library/Caches/ManoThumbnails/same-build').read_text()=='keep-on-relaunch'
assert not (data/'Library/Application Support/CocoPeople').exists(), 'Retired face data must be deleted on launch'
PY
xcrun simctl io "$SIM" screenshot build/startup-safety/relaunch.png
# Termination succeeds only if the relaunched app is still running.
xcrun simctl terminate "$SIM" work.joaquin.mano
echo 'NATIVE_STARTUP_OK: opted-in reset, preserved non-derived file, same-build relaunch, retired face data removed' | tee build/startup-safety/result.txt
