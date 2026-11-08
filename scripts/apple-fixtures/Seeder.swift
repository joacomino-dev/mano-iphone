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
        let controller = UIViewController();controller.view.backgroundColor = .white
        label.frame = CGRect(x:20,y:100,width:300,height:200);label.numberOfLines = 0
        label.text = "SEEDING_SYNTHETIC_FIXTURES";controller.view.addSubview(label)
        window = UIWindow(frame: UIScreen.main.bounds);window?.rootViewController = controller;window?.makeKeyAndVisible()
        if FileManager.default.fileExists(atPath: reportURL.path) { label.text = "FIXTURES_ALREADY_SEEDED";return true }
        PHPhotoLibrary.requestAuthorization(for:.readWrite) { status in
            guard status == .authorized else { self.finish(["status":"FAIL","stage":"authorization","authorization":status.rawValue]);return }
            self.seed()
        }
        return true
    }
    private var reportURL: URL { FileManager.default.urls(for:.documentDirectory,in:.userDomainMask)[0].appendingPathComponent("fixture-report.json") }
    private func finish(_ result: [String:Any]) {
        do { try JSONSerialization.data(withJSONObject:result,options:[.prettyPrinted,.sortedKeys]).write(to:reportURL,options:.atomic) }
        catch { NSLog("SEED_REPORT_WRITE_FAIL") }
        DispatchQueue.main.async { self.label.text = result["status"] as? String == "PASS" ? "FIXTURES_READY" : "FIXTURES_FAILED" }
    }
    private func seed() {
        guard let photo = Bundle.main.url(forResource:"key-photo",withExtension:"jpg"),
              let motion = Bundle.main.url(forResource:"paired-motion",withExtension:"mov") else { finish(["status":"FAIL","stage":"resources"]);return }
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
            request.creationDate = Date(timeIntervalSince1970:978307200.5)
            request.addResource(with:.video,fileURL:motion,options:nil)
            if let id = request.placeholderForCreatedAsset?.localIdentifier { self.created.append(id) }
        }) { success,error in
            guard success else { self.finish(["status":"FAIL","stage":"performChanges","errorCode":(error as NSError?)?.code ?? -1]);return }
            let assets = PHAsset.fetchAssets(withLocalIdentifiers:self.created,options:nil)
            var live = 0,video = 0,paired = 0
            assets.enumerateObjects { item,_,_ in
                if item.mediaSubtypes.contains(.photoLive) { live += 1 }
                if item.mediaType == .video { video += 1 }
                paired += PHAssetResource.assetResources(for:item).filter{$0.type == .pairedVideo || $0.type == .fullSizePairedVideo}.count
            }
            self.finish(["status":assets.count == 64 && live == 3 && paired >= 3 && video == 1 ? "PASS":"FAIL","createdCount":assets.count,"livePhotoCount":live,"pairedResourceCount":paired,"videoCount":video,"boundary":"PhotoKit import/read on generated-media-only ephemeral simulator; no CocoWash runtime assertions"])
        }
    }
}
