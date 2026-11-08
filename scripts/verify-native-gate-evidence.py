"""Independent postcondition. A shell exit 0 is insufficient native evidence."""
import json
from pathlib import Path
import re
import sys

CASES=['testFullPhotosAuthorizationStartsSession','testYGeneratedLivePhotoInlineAndAnchored','testZTenNativeDeletionRounds']
MARKERS=['COCOWASH_UI_AUTHORIZED_SESSION_OK','COCOWASH_UI_GENERATED_ALBUM_OK','COCOWASH_UI_LOCAL_METADATA_OK','COCOWASH_UI_LIVE_CARD_KEY_OK','COCOWASH_UI_LIVE_ANCHOR_TIMELINE_ZOOM_OK','COCOWASH_UI_NATIVE_TEN_CYCLES_OK','COCOWASH_UI_NATIVE_RELAUNCH_OK']

def verify(folder,mode='full'):
    folder=Path(folder)
    def require(value,reason):
        if not value: raise ValueError(reason)
    require((folder/'ui-test-exit-code.txt').read_text().strip()=='0','Missing successful completed xcodebuild invocation')
    log=(folder/'ui-test.log').read_text(errors='replace')
    native=(folder/'photos-read.log').read_text(errors='replace')
    cases=CASES if mode=='full' else ['testFullPhotosAuthorizationStartsSession'] if mode=='album' else ['testAdHostCaptureThroughRealConsent']
    markers=MARKERS if mode=='full' else MARKERS[:3] if mode=='album' else ['COCOWASH_UI_AD_HOST_RESEARCH_OK']
    for case in cases: require(re.search(r'Test Case .*'+case+r'.* passed \(',log),'Case did not really pass: '+case)
    for marker in markers: require(marker in log,'UI marker missing: '+marker)
    require((folder/'PhotosSmoke.xcresult').is_dir(),'Actual xcresult missing')
    require(any(int(x)>0 for x in re.findall(r'COCOWASH_PHOTOS_READ_OK count=(\d+)',native)),'No actual PhotoKit enumeration')
    if mode=='full':
        require(any(int(x)>0 for x in re.findall(r'COCOWASH_LIVE_PREPARED_OK bytes=(\d+)',native)),'No nonempty paired resource from PhotoKit')
        metrics=json.loads((folder/'native-cycles.json').read_text())
        require(metrics.get('performanceAcceptance',{}).get('status')=='PASS','Native performance budget not passed')
        require(len(metrics['rows'])==11,'Native baseline+10 rounds missing')
        audit=json.loads((folder/'fixtures/photokit-audit.json').read_text())
        require(audit.get('status')=='PASS' and audit.get('unknownCount')==0 and audit.get('removedCount')==10,'PhotoKit final destructive audit missing/incorrect')
    if mode=='ads':
        capture=json.loads((folder/'traffic/host-capture-report.json').read_text())
        require(capture.get('status')=='PASS' and capture.get('calibrationObserved') is True and not capture.get('restorationErrors'),'Host capture/calibration/restoration not passed')
        require('COCOWASH_TEST_AD_REQUEST' in native,'Real test-ad SDK request missing')
    return {'status':'PASS','boundary':mode,'verifiedCases':cases}

if __name__=='__main__':
    try:
        result=verify(sys.argv[1],sys.argv[2] if len(sys.argv)>2 else 'full')
        print(json.dumps(result))
    except Exception as error:
        print(json.dumps({'status':'FAIL','reason':str(error)}));sys.exit(1)
