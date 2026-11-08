"""Read-only native/DOM input diagnostics on an ephemeral CI COPY only.
The enabled variant changes one WebKit preference to isolate its effect. This is
not a shipping fix and does not type text, set field values or force-enable UI.
"""
import json
import os
from pathlib import Path
import sys

assert sys.platform=='darwin' and os.environ.get('GITHUB_ACTIONS')=='true' and os.environ.get('RUNNER_ENVIRONMENT')=='github-hosted'
variant=sys.argv[1];assert variant in ['current','enabled']
path=Path('ios/App/App/PhotoLibrary.swift')
source=path.read_text()
needle='configuration.preferences.isTextInteractionEnabled = true'
assert source.count(needle)==1,'Unexpected source; refusing broad replacement'
# "current" preserves the pre-fix disabled control for reproducibility.
if variant=='current': source=source.replace(needle,'configuration.preferences.isTextInteractionEnabled = false')
handler=r'''
// CI injected read-only observer; absent from committed/shipping app sources.
@MainActor private final class CocoReadOnlyInputProbe: NSObject, WKScriptMessageHandler {
    func userContentController(_ controller:WKUserContentController,didReceive message:WKScriptMessage) {
        guard message.frameInfo.isMainFrame,let raw=message.body as? [String:Any] else { return }
        var safe:[String:Any]=[:]
        for key in ["length","activeInput","hasFocus","trusted","defaultPrevented","inert"] {
            if let value=raw[key] as? NSNumber { safe[key]=value }
        }
        if let event=raw["event"] as? String,["focusin","focusout","beforeinput","input","keydown","keyup","snapshot"].contains(event) { safe["event"]=event }
        func responder(_ view:UIView)->UIView? {
            if view.isFirstResponder { return view }
            for child in view.subviews { if let match=responder(child) { return match } }
            return nil
        }
        for scene in UIApplication.shared.connectedScenes.compactMap({$0 as? UIWindowScene}) {
            for window in scene.windows {
                if let found=responder(window) {
                    safe["nativeResponderClass"]=NSStringFromClass(type(of:found))
                    safe["nativeWindowKey"]=window.isKeyWindow
                    var parent:UIView?=found
                    while let view=parent {
                        if let web=view as? WKWebView { safe["nativeResponderHost"]=web.url?.host ?? "none";break }
                        parent=view.superview
                    }
                }
            }
        }
        if let data=try? JSONSerialization.data(withJSONObject:safe,options:.sortedKeys),let text=String(data:data,encoding:.utf8) { devLog("COCOWASH_INPUT_PROBE %@",text) }
    }
}
'''
source=source.replace('@objc(ManoBridgeController)',handler+'\n@objc(ManoBridgeController)',1)
script=r'''(()=>{
const input=()=>document.querySelector('input[placeholder]');let previous='';
function send(event,e){const field=input();if(!field)return;
 const data={event,length:field.value.length,activeInput:document.activeElement===field,hasFocus:document.hasFocus(),trusted:!!e?.isTrusted,defaultPrevented:!!e?.defaultPrevented,inert:!!field.closest('[inert]')};
 window.webkit.messageHandlers.CocoReadOnlyInput.postMessage(data);
}
for(const type of ['focusin','focusout','beforeinput','input','keydown','keyup'])document.addEventListener(type,e=>{if(e.target===input())setTimeout(()=>send(type,e),0);},true);
setInterval(()=>{const f=input();if(!f)return;const key=[f.value.length,document.activeElement===f,document.hasFocus(),!!f.closest('[inert]')].join(':');if(key!==previous){previous=key;send('snapshot');}},500);
})();'''
injection='configuration.userContentController.add(CocoReadOnlyInputProbe(),name:"CocoReadOnlyInput")\n        configuration.userContentController.addUserScript(WKUserScript(source:'+json.dumps(script)+',injectionTime:.atDocumentEnd,forMainFrameOnly:true))\n        '
source=source.replace('return configuration',injection+'return configuration',1)
path.write_text(source)
Path('build/input-variant.json').write_text(json.dumps({'sourceSha':os.environ['GITHUB_SHA'],'variant':variant,'boundary':'Read-only diagnostics + one WebKit-preference experiment in CI copy; not release acceptance'},indent=2))
