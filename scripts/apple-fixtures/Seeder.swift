// Standalone, simulator-only fixture creator. Never part of CocoWash.app.
#if !targetEnvironment(simulator)
#error("FixtureSeeder may only compile for an ephemeral iOS simulator")
#endif
import UIKit
import Photos

@main final class FixtureSeeder: UIResponder, UIApplicationDelegate {
    var window: UIWindow?
    private let label = UILabel()
    private var created: [String] = []
    func application(_ application: UIApplication, didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey:Any]?) -> Bool {
        NSLog("FIXTURE_SEED_DID_LAUNCH")
        return true
    }
    func begin(on scene: UIWindowScene) {
        let controller = UIViewController();controller.view.backgroundColor = .white
        label.frame = CGRect(x:20,y:100,width:300,height:200);label.numberOfLines = 0
        label.text = "SEEDING_SYNTHETIC_FIXTURES";controller.view.addSubview(label)
        window = UIWindow(windowScene:scene);window?.rootViewController = controller;window?.makeKeyAndVisible()
        if CommandLine.arguments.contains("--audit") { audit();return }
        if FileManager.default.fileExists(atPath: reportURL.path) { label.text = "FIXTURES_ALREADY_SEEDED";return }
        NSLog("FIXTURE_AUTH_REQUEST")
        PHPhotoLibrary.requestAuthorization(for:.readWrite) { status in
            NSLog("FIXTURE_AUTH_RESULT status=%ld",status.rawValue)
            guard status == .authorized else { self.finish(["status":"FAIL","stage":"authorization","authorization":status.rawValue]);return }
            self.seed()
        }
    }
    private var reportURL: URL { FileManager.default.urls(for:.documentDirectory,in:.userDomainMask)[0].appendingPathComponent("fixture-report.json") }
    private var ownershipURL: URL { reportURL.deletingLastPathComponent().appendingPathComponent("owned-assets.json") }
    private var runtimeDemoURL: URL { reportURL.deletingLastPathComponent().appendingPathComponent("runtime-demo-assets.json") }
    private func audit() {
        do {
            let ids = try JSONDecoder().decode([String].self,from:Data(contentsOf:ownershipURL))
            let demo = try JSONDecoder().decode([String].self,from:Data(contentsOf:runtimeDemoURL))
            let owned = Set(ids+demo)
            let all = PHAsset.fetchAssets(with:nil)
            var unknown = 0
            all.enumerateObjects { asset,_,_ in if !owned.contains(asset.localIdentifier) { unknown += 1 } }
            let generatedRemaining=PHAsset.fetchAssets(withLocalIdentifiers:ids,options:nil).count
            let demoRemaining=PHAsset.fetchAssets(withLocalIdentifiers:demo,options:nil).count
            let result:[String:Any] = ["status":unknown == 0 ? "PASS":"FAIL","createdCount":ids.count,"preloadedRuntimeDemoCount":demo.count,"remainingCount":all.count,"unknownCount":unknown,"removedCount":ids.count+demo.count-all.count,"removedGeneratedCount":ids.count-generatedRemaining,"removedRuntimeDemoCount":demo.count-demoRemaining]
            try JSONSerialization.data(withJSONObject:result,options:.sortedKeys).write(to:reportURL.deletingLastPathComponent().appendingPathComponent("audit-report.json"),options:.atomic)
        } catch { NSLog("FIXTURE_AUDIT_FAIL") }
    }
    private func finish(_ result: [String:Any]) {
        do { try JSONSerialization.data(withJSONObject:result,options:[.prettyPrinted,.sortedKeys]).write(to:reportURL,options:.atomic) }
        catch { NSLog("SEED_REPORT_WRITE_FAIL") }
        DispatchQueue.main.async { self.label.text = result["status"] as? String == "PASS" ? "FIXTURES_READY" : "FIXTURES_FAILED" }
    }
    private func seed() {
        NSLog("FIXTURE_IMPORT_BEGIN")
        guard let photo = Bundle.main.url(forResource:"key-photo",withExtension:"jpg"),
              let motion = Bundle.main.url(forResource:"paired-motion",withExtension:"mov") else { finish(["status":"FAIL","stage":"resources"]);return }
        // A NEW simulator on the observed iOS27 runtime contains six runtime demo
        // assets before any import (CocoWash native enumeration 70=64+6). This
        // helper can only be launched by the fresh, run-owned simulator wrapper.
        // Keep that baseline separate; never silently adopt later/unknown assets.
        let preloaded=PHAsset.fetchAssets(with:nil)
        guard preloaded.count<=6 else { finish(["status":"FAIL","stage":"unexpectedFreshRuntimeLibrary","preloadedCount":preloaded.count]);return }
        var demo:[String]=[]
        preloaded.enumerateObjects { asset,_,_ in demo.append(asset.localIdentifier) }
        do { try JSONEncoder().encode(demo).write(to:runtimeDemoURL,options:.atomic) }
        catch { finish(["status":"FAIL","stage":"privateRuntimeBaselineWrite"]);return }
        PHPhotoLibrary.shared().performChanges({
            for index in 0..<3 {
                let request = PHAssetCreationRequest.forAsset()
                request.creationDate = Date(timeIntervalSince1970:978307200+Double(index))
                request.addResource(with:.photo,fileURL:photo,options:nil)
                request.addResource(with:.pairedVideo,fileURL:motion,options:nil)
                if let id = request.placeholderForCreatedAsset?.localIdentifier { self.created.append(id) }
            }
            for index in 0..<60 {
                let request = PHAssetCreationRequest.forAsset()
                request.creationDate = Date(timeIntervalSince1970:978307210+Double(index))
                request.addResource(with:.photo,fileURL:photo,options:nil)
                if let id = request.placeholderForCreatedAsset?.localIdentifier { self.created.append(id) }
            }
            let request = PHAssetCreationRequest.forAsset()
            request.creationDate = Date(timeIntervalSince1970:978307199)
            request.addResource(with:.video,fileURL:motion,options:nil)
            if let id = request.placeholderForCreatedAsset?.localIdentifier { self.created.append(id) }
        }) { success,error in
            NSLog("FIXTURE_IMPORT_COMPLETE success=%d code=%ld",success ? 1:0,(error as NSError?)?.code ?? 0)
            guard success else { self.finish(["status":"FAIL","stage":"performChanges","errorCode":(error as NSError?)?.code ?? -1]);return }
            do { try JSONEncoder().encode(self.created).write(to:self.ownershipURL,options:.atomic) }
            catch { self.finish(["status":"FAIL","stage":"privateOwnershipWrite"]);return }
            let assets = PHAsset.fetchAssets(withLocalIdentifiers:self.created,options:nil)
            var live = 0,video = 0,paired = 0
            assets.enumerateObjects { item,_,_ in
                if item.mediaSubtypes.contains(.photoLive) { live += 1 }
                if item.mediaType == .video { video += 1 }
                paired += PHAssetResource.assetResources(for:item).filter{$0.type == .pairedVideo || $0.type == .fullSizePairedVideo}.count
            }
            self.finish(["status":assets.count == 64 && live == 3 && paired >= 3 && video == 1 ? "PASS":"FAIL","createdCount":assets.count,"preloadedRuntimeDemoCount":demo.count,"initialTotal":assets.count+demo.count,"livePhotoCount":live,"pairedResourceCount":paired,"videoCount":video,"boundary":"Fresh run-owned simulator only: generated fixtures plus explicitly counted preloaded runtime demo assets; no personal library or CocoWash playback assertions"])
        }
    }
}

@objc(FixtureSceneDelegate) final class FixtureSceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options: UIScene.ConnectionOptions) {
        guard let scene = scene as? UIWindowScene,
              let delegate = UIApplication.shared.delegate as? FixtureSeeder else { return }
        delegate.begin(on:scene);window=delegate.window
    }
}
