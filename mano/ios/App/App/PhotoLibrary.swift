import Foundation
import UIKit
import Capacitor
import Photos
import PhotosUI
import Vision
import AVKit
import CryptoKit

@objc(ManoBridgeController)
class ManoBridgeController: CAPBridgeViewController {
    override func capacitorDidLoad() { bridge?.registerPluginInstance(PhotoLibraryPlugin()) }
    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }
}

@objc(PhotoLibraryPlugin)
public class PhotoLibraryPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PhotoLibraryPlugin"
    public let jsName = "PhotoLibrary"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authorize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "assets", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "thumbnail", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "albums", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "addToAlbum", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "favorite", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deleteAssets", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "preview", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "analyze", returnType: CAPPluginReturnPromise)
    ]
    private let imageManager = PHCachingImageManager()
    private let analysisQueue = DispatchQueue(label: "work.joaquin.mano.vision", qos: .utility)
    private var analyzing = false
    private var livePreview: UIViewController?
    private var status: String {
        switch PHPhotoLibrary.authorizationStatus(for: .readWrite) {
        case .authorized: return "authorized"
        case .limited: return "limited"
        case .denied, .restricted: return "denied"
        default: return "notDetermined"
        }
    }
    private func allowed(_ call: CAPPluginCall) -> Bool {
        guard ["authorized", "limited"].contains(status) else { call.reject("Permite acceso a Fotos en Ajustes."); return false }; return true
    }
    private func asset(_ call: CAPPluginCall) -> PHAsset? {
        guard let id = call.getString("id"), let item = PHAsset.fetchAssets(withLocalIdentifiers: [id], options: nil).firstObject else { call.reject("Este elemento ya no está disponible en Fotos."); return nil }; return item
    }
    @objc func authorize(_ call: CAPPluginCall) {
        PHPhotoLibrary.requestAuthorization(for: .readWrite) { _ in call.resolve(["status": self.status]) }
    }
    @objc func assets(_ call: CAPPluginCall) {
        guard ["authorized", "limited"].contains(status) else { call.resolve(["assets": [], "status": status]); return }
        DispatchQueue.global(qos: .userInitiated).async {
            let options = PHFetchOptions()
            options.predicate = NSPredicate(format: "(mediaType == %d OR mediaType == %d) AND favorite == NO AND hidden == NO", PHAssetMediaType.image.rawValue, PHAssetMediaType.video.rawValue)
            options.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: true)]
            let result = PHAsset.fetchAssets(with: options)
            var items: [[String: Any]] = []
            result.enumerateObjects { item, _, _ in
                let kind = item.mediaType == .video ? "video" : item.mediaSubtypes.contains(.photoLive) ? "live" : "photo"
                items.append(["id": item.localIdentifier, "kind": kind, "date": (item.creationDate?.timeIntervalSince1970 ?? 0) * 1000,
                              "width": item.pixelWidth, "height": item.pixelHeight, "duration": item.duration])
            }
            call.resolve(["assets": items, "status": self.status])
        }
    }
    @objc func thumbnail(_ call: CAPPluginCall) {
        guard allowed(call), let item = asset(call) else { return }
        let size = min(1800, max(200, call.getInt("size") ?? 900))
        let folder = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("ManoThumbnails", isDirectory: true)
        let fingerprint = item.localIdentifier + "-\(size)-\(item.modificationDate?.timeIntervalSince1970 ?? 0)"
        let name = SHA256.hash(data: Data(fingerprint.utf8)).map { String(format: "%02x", $0) }.joined() + ".jpg"
        let path = folder.appendingPathComponent(name)
        if FileManager.default.fileExists(atPath: path.path) { call.resolve(["path": path.path]); return }
        let options = PHImageRequestOptions(); options.isNetworkAccessAllowed = true; options.deliveryMode = .highQualityFormat; options.resizeMode = .fast
        imageManager.requestImage(for: item, targetSize: CGSize(width: CGFloat(size), height: CGFloat(size)), contentMode: .aspectFit, options: options) { image, info in
            if (info?[PHImageResultIsDegradedKey] as? Bool) == true { return }
            guard let data = image?.jpegData(compressionQuality: 0.88) else { call.reject("No se pudo descargar la vista previa. Comprueba tu conexión a iCloud."); return }
            do { try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true); try data.write(to: path, options: .atomic); call.resolve(["path": path.path]) }
            catch { call.reject("No se pudo guardar la vista previa: \(error.localizedDescription)") }
        }
    }
    @objc func albums(_ call: CAPPluginCall) {
        guard allowed(call) else { return }
        let result = PHAssetCollection.fetchAssetCollections(with: .album, subtype: .any, options: nil)
        var items: [[String: String]] = []
        result.enumerateObjects { album, _, _ in
            if album.canPerform(.addContent) { items.append(["id": album.localIdentifier, "title": album.localizedTitle ?? "Sin título"]) }
        }
        call.resolve(["albums": items.sorted { ($0["title"] ?? "") < ($1["title"] ?? "") }])
    }
    private func change(_ call: CAPPluginCall, block: @escaping () -> Void, result: [String: Any] = [:]) {
        DispatchQueue.main.async {
            PHPhotoLibrary.shared().performChanges(block) { success, error in
                if success { call.resolve(result) }
                else { call.reject(error?.localizedDescription ?? "Fotos no confirmó el cambio. Tu cola se conserva.") }
            }
        }
    }
    @objc func favorite(_ call: CAPPluginCall) {
        guard allowed(call), let ids = call.getArray("ids", String.self) else { return }
        let value = call.getBool("value") ?? true
        let result = PHAsset.fetchAssets(withLocalIdentifiers: ids, options: nil)
        guard result.count == ids.count else { call.reject("Alguna foto ya no está disponible."); return }
        change(call, block: { result.enumerateObjects { item, _, _ in PHAssetChangeRequest(for: item).isFavorite = value } })
    }
    @objc func addToAlbum(_ call: CAPPluginCall) {
        guard allowed(call), let ids = call.getArray("ids", String.self), let albumId = call.getString("albumId"),
              let album = PHAssetCollection.fetchAssetCollections(withLocalIdentifiers: [albumId], options: nil).firstObject else { call.reject("No se encontró el álbum."); return }
        let result = PHAsset.fetchAssets(withLocalIdentifiers: ids, options: nil)
        guard result.count == ids.count, album.canPerform(.addContent) else { call.reject("No se pueden añadir esos elementos a este álbum."); return }
        change(call, block: { PHAssetCollectionChangeRequest(for: album)?.addAssets(result) })
    }
    @objc func deleteAssets(_ call: CAPPluginCall) {
        guard allowed(call), let ids = call.getArray("ids", String.self), !ids.isEmpty else { call.reject("No hay descartes para borrar."); return }
        let fetched = PHAsset.fetchAssets(withLocalIdentifiers: Array(Set(ids)), options: nil)
        // Recheck favorites at the last moment. Photos changed elsewhere remain protected.
        var safe: [PHAsset] = []; var deleted: [String] = []
        fetched.enumerateObjects { item, _, _ in if !item.isFavorite && !item.isHidden { safe.append(item); deleted.append(item.localIdentifier) } }
        guard !safe.isEmpty else { call.reject("No se borró nada: los elementos ya no están disponibles o ahora son favoritos."); return }
        change(call, block: { PHAssetChangeRequest.deleteAssets(safe as NSArray) }, result: ["deleted": deleted])
    }
    @objc func preview(_ call: CAPPluginCall) {
        guard allowed(call), let item = asset(call) else { return }
        if item.mediaType == .video {
            let options = PHVideoRequestOptions(); options.isNetworkAccessAllowed = true
            imageManager.requestPlayerItem(forVideo: item, options: options) { playerItem, _ in
                guard let playerItem else { call.reject("No se pudo descargar el vídeo desde iCloud."); return }
                DispatchQueue.main.async {
                    let controller = AVPlayerViewController(); controller.player = AVPlayer(playerItem: playerItem)
                    self.bridge?.viewController?.present(controller, animated: true) { controller.player?.play(); call.resolve() }
                }
            }
        } else if item.mediaSubtypes.contains(.photoLive) {
            let options = PHLivePhotoRequestOptions(); options.isNetworkAccessAllowed = true; options.deliveryMode = .highQualityFormat
            imageManager.requestLivePhoto(for: item, targetSize: CGSize(width: 1400, height: 1400), contentMode: .aspectFit, options: options) { photo, info in
                if (info?[PHImageResultIsDegradedKey] as? Bool) == true { return }
                guard let photo else { call.reject("No se pudo descargar la Live Photo desde iCloud."); return }
                DispatchQueue.main.async {
                    let controller = LivePhotoController(photo: photo); self.livePreview = controller
                    self.bridge?.viewController?.present(controller, animated: true) { call.resolve() }
                }
            }
        } else { call.resolve() }
    }
    @objc func analyze(_ call: CAPPluginCall) {
        guard allowed(call), let ids = call.getArray("ids", String.self) else { return }
        DispatchQueue.main.async {
            guard !self.analyzing else { call.reject("Ya hay un análisis en curso."); return }; self.analyzing = true
            self.analysisQueue.async {
                defer { DispatchQueue.main.async { self.analyzing = false } }
                let threshold = Float(min(0.6, max(0.05, call.getDouble("threshold") ?? 0.28)))
                let fetched = PHAsset.fetchAssets(withLocalIdentifiers: ids, options: nil)
                var items: [PHAsset] = []; fetched.enumerateObjects { item, _, _ in items.append(item) }
                items.sort { ($0.creationDate ?? .distantPast) < ($1.creationDate ?? .distantPast) }
                var prints: [(String, VNFeaturePrintObservation)] = []; var skipped = 0
                var parent = Array(0..<items.count)
                func root(_ n: Int) -> Int { var k = n; while parent[k] != k { k = parent[k] }; return k }
                for (index, item) in items.enumerated() {
                    autoreleasepool {
                        let options = PHImageRequestOptions(); options.isSynchronous = true; options.isNetworkAccessAllowed = false
                        options.deliveryMode = .highQualityFormat; options.resizeMode = .fast
                        var image: UIImage?
                        self.imageManager.requestImage(for: item, targetSize: CGSize(width: 300, height: 300), contentMode: .aspectFit, options: options) { value, _ in image = value }
                        guard let cgImage = image?.cgImage else { skipped += 1; return }
                        let request = VNGenerateImageFeaturePrintRequest(); request.revision = VNGenerateImageFeaturePrintRequestRevision2
                        do {
                            try VNImageRequestHandler(cgImage: cgImage, options: [:]).perform([request])
                            guard let print = request.results?.first as? VNFeaturePrintObservation else { skipped += 1; return }
                            // Compare every existing representative: no upload, and includes distant dates.
                            var nearest: (Int, Float)?
                            for (i, existing) in prints.enumerated() {
                                var distance: Float = 1
                                try print.computeDistance(&distance, to: existing.1)
                                if distance < threshold && (nearest == nil || distance < nearest!.1) { nearest = (i, distance) }
                            }
                            if let nearest, let originalIndex = items.firstIndex(where: { $0.localIdentifier == prints[nearest.0].0 }) { parent[index] = root(originalIndex) }
                            else { prints.append((item.localIdentifier, print)) }
                        } catch { skipped += 1 }
                    }
                    if index % 10 == 0 || index == items.count - 1 { self.notifyListeners("analysisProgress", data: ["done": index + 1, "total": items.count]) }
                }
                var groups: [Int: [String]] = [:]
                for i in items.indices { groups[root(i), default: []].append(items[i].localIdentifier) }
                call.resolve(["groups": groups.values.filter { $0.count > 1 }, "skipped": skipped])
            }
        }
    }
}

final class LivePhotoController: UIViewController {
    private let photo: PHLivePhoto
    init(photo: PHLivePhoto) { self.photo = photo; super.init(nibName: nil, bundle: nil) }
    required init?(coder: NSCoder) { fatalError("init(coder:) is not used") }
    override func viewDidLoad() {
        super.viewDidLoad(); view.backgroundColor = .black
        let live = PHLivePhotoView(); live.livePhoto = photo; live.contentMode = .scaleAspectFit; live.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(live)
        NSLayoutConstraint.activate([live.leadingAnchor.constraint(equalTo: view.leadingAnchor), live.trailingAnchor.constraint(equalTo: view.trailingAnchor), live.topAnchor.constraint(equalTo: view.topAnchor), live.bottomAnchor.constraint(equalTo: view.bottomAnchor)])
        let close = UIButton(type: .system); close.setTitle("Cerrar", for: .normal); close.tintColor = .white; close.translatesAutoresizingMaskIntoConstraints = false
        close.addTarget(self, action: #selector(done), for: .touchUpInside); view.addSubview(close)
        NSLayoutConstraint.activate([close.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 12), close.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20), close.heightAnchor.constraint(equalToConstant: 44)])
        live.startPlayback(with: .full)
    }
    @objc private func done() { dismiss(animated: true) }
}
