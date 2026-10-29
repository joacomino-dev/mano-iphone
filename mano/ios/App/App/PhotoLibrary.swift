import Foundation
import UIKit
import Capacitor
import Photos
import PhotosUI
import Vision
import AVFoundation
import AVKit
import CryptoKit

@objc(ManoBridgeController)
class ManoBridgeController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(PhotoLibraryPlugin())
        NSLog("MEMSWIPE_BRIDGE_READY")
    }
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
        CAPPluginMethod(name: "cancelThumbnailPreparation", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "albums", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "addToAlbum", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "favorite", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deleteAssets", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "preview", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "prepareVideo", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelVideoPreparation", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "releasePreparedVideos", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "analyze", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelAnalysis", returnType: CAPPluginReturnPromise)
    ]
    private let imageManager = PHCachingImageManager()
    private let analysisQueue = DispatchQueue(label: "work.joaquin.mano.vision", qos: .utility)
    private let videoQueue = DispatchQueue(label: "work.joaquin.mano.video-cache", qos: .userInitiated)
    private let thumbnailQueue = DispatchQueue(label: "work.joaquin.mano.thumbnail-cache", qos: .userInitiated)
    private var thumbnailJobs: [String: PreparedThumbnailJob] = [:]
    private var videoJobs: [String: PreparedVideoJob] = [:]
    private var pinnedVideos: [String: String] = [:] // Cache key -> Photos identifier; never logged.
    private let videoCacheLimit: Int64 = 1024 * 1024 * 1024
    private let videoFileLimit: Int64 = 512 * 1024 * 1024
    private var videoFolder: URL {
        FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("MemSwipeVideos", isDirectory: true)
    }
    private var analyzing = false
    private let cancelLock = NSLock()
    private var cancelRequested = false
    private func cancelled() -> Bool { cancelLock.lock(); defer { cancelLock.unlock() }; return cancelRequested }
    @objc func cancelAnalysis(_ call: CAPPluginCall) { cancelLock.lock(); cancelRequested = true; cancelLock.unlock(); call.resolve() }
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
        NSLog("MEMSWIPE_PHOTOS_REQUEST status=%@", status)
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
                              "width": item.pixelWidth, "height": item.pixelHeight, "duration": item.duration,
                              "modified": (item.modificationDate?.timeIntervalSince1970 ?? 0) * 1000])
            }
            // Runtime smoke-test signal: no asset IDs, names, paths or image data.
            NSLog("MEMSWIPE_PHOTOS_READ_OK count=%d status=%@", items.count, self.status)
            call.resolve(["assets": items, "status": self.status])
        }
    }
    @objc func thumbnail(_ call: CAPPluginCall) {
        guard allowed(call), let item = asset(call) else { return }
        let token = call.getString("requestId") ?? UUID().uuidString
        guard !token.isEmpty, token.count <= 160 else { call.reject("Identificador de vista previa no válido.", "INVALID_REQUEST"); return }
        let size = min(1800, max(200, call.getInt("size") ?? 900))
        let folder = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("ManoThumbnails", isDirectory: true)
        let fingerprint = item.localIdentifier + "-\(size)-\(item.modificationDate?.timeIntervalSince1970 ?? 0)"
        let name = SHA256.hash(data: Data(fingerprint.utf8)).map { String(format: "%02x", $0) }.joined() + ".jpg"
        let path = folder.appendingPathComponent(name)
        thumbnailQueue.async {
            guard self.thumbnailJobs[token] == nil else { call.reject("Esa vista previa ya se está preparando.", "PREPARATION_BUSY"); return }
            if let bytes = self.videoSize(path), bytes > 0 {
                try? FileManager.default.setAttributes([.modificationDate: Date()], ofItemAtPath: path.path)
                call.resolve(["path": path.path]); return
            }
            let job = PreparedThumbnailJob(call: call)
            self.thumbnailJobs[token] = job
            let timeout = DispatchWorkItem { [weak self, weak job] in
                guard let self, let job else { return }
                self.stopThumbnail(token, job: job, message: "La vista previa tardó demasiado. Comprueba iCloud y reintenta.", code: "PREPARATION_TIMEOUT")
            }
            job.timeout = timeout
            self.thumbnailQueue.asyncAfter(deadline: .now() + 60, execute: timeout)
            // requestImage produces a video's poster without requesting/exporting
            // its full AVAsset. One final result settles this promise exactly once.
            let options = PHImageRequestOptions()
            options.isNetworkAccessAllowed = true; options.deliveryMode = .highQualityFormat; options.resizeMode = .fast
            job.photoRequest = self.imageManager.requestImage(for: item, targetSize: CGSize(width: CGFloat(size), height: CGFloat(size)), contentMode: .aspectFit, options: options) { [weak self, weak job] image, info in
                guard let self, let job else { return }
                self.thumbnailQueue.async {
                    guard self.thumbnailJobs[token] === job else { return }
                    if (info?[PHImageResultIsDegradedKey] as? Bool) == true { return }
                    if (info?[PHImageCancelledKey] as? Bool) == true {
                        self.stopThumbnail(token, job: job, message: "Preparación cancelada.", code: "PREPARATION_CANCELLED"); return
                    }
                    guard let data = image?.jpegData(compressionQuality: 0.88) else {
                        self.stopThumbnail(token, job: job, message: "No se pudo descargar la vista previa. Comprueba tu conexión a iCloud.", code: "THUMBNAIL_UNAVAILABLE"); return
                    }
                    do {
                        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
                        try data.write(to: path, options: .atomic)
                        job.timeout?.cancel(); self.thumbnailJobs.removeValue(forKey: token)
                        call.resolve(["path": path.path])
                    } catch {
                        self.stopThumbnail(token, job: job, message: "No se pudo guardar la vista previa. Libera espacio y reintenta.", code: "CACHE_WRITE_FAILED")
                    }
                }
            }
        }
    }
    @objc func cancelThumbnailPreparation(_ call: CAPPluginCall) {
        guard let token = call.getString("requestId") else { call.reject("Falta el identificador de preparación.", "INVALID_REQUEST"); return }
        thumbnailQueue.async {
            guard let job = self.thumbnailJobs[token] else { call.resolve(["cancelled": false]); return }
            self.stopThumbnail(token, job: job, message: "Preparación cancelada.", code: "PREPARATION_CANCELLED")
            call.resolve(["cancelled": true])
        }
    }
    private func stopThumbnail(_ token: String, job: PreparedThumbnailJob, message: String, code: String) {
        guard thumbnailJobs[token] === job else { return }
        thumbnailJobs.removeValue(forKey: token); job.timeout?.cancel()
        if job.photoRequest != PHInvalidImageRequestID { imageManager.cancelImageRequest(job.photoRequest) }
        job.call.reject(message, code)
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
        var present = Set<String>(); result.enumerateObjects { item, _, _ in present.insert(item.localIdentifier) }
        let missing = ids.filter { !present.contains($0) }
        guard missing.isEmpty || call.getBool("ignoreMissing") == true else { call.reject("Alguna foto ya no está disponible."); return }
        if result.count == 0 { call.resolve(["missing": missing]); return }
        change(call, block: { result.enumerateObjects { item, _, _ in PHAssetChangeRequest(for: item).isFavorite = value } }, result: ["missing": missing])
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
    /// Prepare an app-owned local file for <video playsinline>. Photos originals
    /// remain untouched; iCloud is Apple's on-device download, never an upload.
    @objc func prepareVideo(_ call: CAPPluginCall) {
        guard allowed(call), let item = asset(call) else { return }
        guard item.mediaType == .video else { call.reject("Este elemento no es un vídeo.", "NOT_VIDEO"); return }
        guard let token = call.getString("requestId"), !token.isEmpty, token.count <= 160 else {
            call.reject("Falta el identificador de preparación.", "INVALID_REQUEST"); return
        }
        let fingerprint = item.localIdentifier + "-\(item.modificationDate?.timeIntervalSince1970 ?? 0)"
        let key = SHA256.hash(data: Data(fingerprint.utf8)).map { String(format: "%02x", $0) }.joined()
        videoQueue.async {
            guard self.videoJobs[token] == nil else { call.reject("Ese vídeo ya se está preparando.", "PREPARATION_BUSY"); return }
            do {
                try FileManager.default.createDirectory(at: self.videoFolder, withIntermediateDirectories: true)
                // A killed app cannot run its cancellation cleanup. Remove only
                // abandoned files in our own cache, never an active job or Photos.
                let activePartials = Set(self.videoJobs.values.compactMap { $0.partial?.path })
                let cachedFiles = try FileManager.default.contentsOfDirectory(at: self.videoFolder, includingPropertiesForKeys: nil)
                for file in cachedFiles where file.lastPathComponent.hasPrefix("partial-") && !activePartials.contains(file.path) {
                    try? FileManager.default.removeItem(at: file)
                }
                for ext in ["mp4", "mov", "m4v"] {
                    let file = self.videoFolder.appendingPathComponent(key + "." + ext)
                    if let bytes = self.videoSize(file), bytes > 0 {
                        self.pinnedVideos[key] = item.localIdentifier
                        try? FileManager.default.setAttributes([.modificationDate: Date()], ofItemAtPath: file.path)
                        NSLog("MEMSWIPE_VIDEO_PREPARED_OK bytes=%lld cached=1", bytes)
                        call.resolve(["path": file.path, "mimeType": self.videoMime(ext), "cached": true, "bytes": bytes]); return
                    }
                }
            } catch { call.reject("No hay espacio para preparar el vídeo.", "CACHE_WRITE_FAILED", error); return }
            guard self.videoJobs.count < 2, !self.videoJobs.values.contains(where: { $0.key == key }) else {
                call.reject("Hay otros vídeos preparándose. Reinténtalo en un momento.", "PREPARATION_BUSY"); return
            }
            let job = PreparedVideoJob(token: token, key: key, assetID: item.localIdentifier, call: call)
            self.videoJobs[token] = job
            let timeout = DispatchWorkItem { [weak self, weak job] in
                guard let self, let job else { return }
                self.stopVideo(job, message: "El vídeo tardó demasiado en descargarse. Comprueba iCloud y vuelve a intentarlo.", code: "PREPARATION_TIMEOUT")
            }
            job.timeout = timeout
            self.videoQueue.asyncAfter(deadline: .now() + 180, execute: timeout)
            let options = PHVideoRequestOptions()
            options.isNetworkAccessAllowed = true
            options.version = .current
            options.deliveryMode = .highQualityFormat
            options.progressHandler = { [weak self, weak job] progress, _, stop, _ in
                guard let self, let job else { stop.pointee = true; return }
                if job.isCancelled { stop.pointee = true; return }
                self.notifyListeners("mediaPreparationProgress", data: ["requestId": token, "progress": progress])
            }
            job.photoRequest = self.imageManager.requestAVAsset(forVideo: item, options: options) { [weak self, weak job] asset, audioMix, info in
                guard let self, let job else { return }
                self.videoQueue.async {
                    guard self.videoJobs[token] === job, !job.isCancelled else { return }
                    if (info?[PHImageCancelledKey] as? Bool) == true {
                        self.stopVideo(job, message: "Preparación cancelada.", code: "PREPARATION_CANCELLED"); return
                    }
                    guard let asset else {
                        self.stopVideo(job, message: "No se pudo descargar el vídeo desde iCloud. Comprueba la conexión y reintenta.", code: "VIDEO_UNAVAILABLE"); return
                    }
                    if let local = asset as? AVURLAsset, local.url.isFileURL {
                        self.copyVideo(local.url, job: job)
                    } else {
                        self.exportVideo(asset, audioMix: audioMix, job: job)
                    }
                }
            }
        }
    }
    @objc func cancelVideoPreparation(_ call: CAPPluginCall) {
        guard let token = call.getString("requestId") else { call.reject("Falta el identificador de preparación.", "INVALID_REQUEST"); return }
        videoQueue.async {
            guard let job = self.videoJobs[token] else { call.resolve(["cancelled": false]); return }
            self.stopVideo(job, message: "Preparación cancelada.", code: "PREPARATION_CANCELLED")
            call.resolve(["cancelled": true])
        }
    }
    /// Call only after the session's video elements have stopped/unmounted. With
    /// ids omitted, release all session pins; supplied ids release a moving window.
    @objc func releasePreparedVideos(_ call: CAPPluginCall) {
        let ids = call.getArray("ids", String.self).map { Set($0) }
        videoQueue.async {
            let keys = self.pinnedVideos.filter { ids == nil || ids!.contains($0.value) }.map { $0.key }
            for key in keys { self.pinnedVideos.removeValue(forKey: key) }
            call.resolve(["released": keys.count])
        }
    }
    private func videoSize(_ url: URL) -> Int64? {
        ((try? FileManager.default.attributesOfItem(atPath: url.path)[.size]) as? NSNumber)?.int64Value
    }
    private func videoMime(_ ext: String) -> String { ext == "mov" ? "video/quicktime" : "video/mp4" }
    private func reserveVideoSpace(_ bytes: Int64) throws {
        guard bytes > 0 else { throw VideoPreparationFailure.unavailable }
        guard bytes <= videoFileLimit else { throw VideoPreparationFailure.tooLarge }
        let files = try FileManager.default.contentsOfDirectory(at: videoFolder, includingPropertiesForKeys: [.contentModificationDateKey])
            .filter { ["mp4", "mov", "m4v"].contains($0.pathExtension) && !$0.lastPathComponent.hasPrefix("partial-") }
        var total = files.reduce(Int64(0)) { $0 + (videoSize($1) ?? 0) }
        let oldest = files.sorted {
            ((try? $0.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? .distantPast) <
            ((try? $1.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? .distantPast)
        }
        for file in oldest where total + bytes > videoCacheLimit {
            let key = file.deletingPathExtension().lastPathComponent
            guard pinnedVideos[key] == nil else { continue }
            let size = videoSize(file) ?? 0
            try FileManager.default.removeItem(at: file)
            total -= size
        }
        guard total + bytes <= videoCacheLimit else { throw VideoPreparationFailure.cacheFull }
    }
    private func stopVideo(_ job: PreparedVideoJob, message: String, code: String) {
        guard videoJobs[job.token] === job else { return }
        job.cancel()
        job.timeout?.cancel()
        videoJobs.removeValue(forKey: job.token)
        if job.photoRequest != PHInvalidImageRequestID { imageManager.cancelImageRequest(job.photoRequest) }
        job.exporter?.cancelExport()
        if let partial = job.partial { try? FileManager.default.removeItem(at: partial) }
        job.call.reject(message, code)
    }
    private func failVideo(_ job: PreparedVideoJob, error: Error) {
        let failure = error as? VideoPreparationFailure
        let message: String
        let code: String
        switch failure {
        case .some(.tooLarge): message = "El vídeo supera 512 MB. Puedes abrirlo con el reproductor de Fotos."; code = "VIDEO_TOO_LARGE"
        case .some(.cacheFull): message = "La caché de vídeos de esta sesión está llena. Termina la sesión para liberar espacio."; code = "VIDEO_CACHE_FULL"
        case .some(.cancelled): message = "Preparación cancelada."; code = "PREPARATION_CANCELLED"
        case .some(.unavailable): message = "El archivo del vídeo no está disponible. Comprueba iCloud y reintenta."; code = "VIDEO_UNAVAILABLE"
        default: message = "No se pudo guardar el vídeo para reproducirlo. Comprueba el espacio libre y reintenta."; code = "CACHE_WRITE_FAILED"
        }
        stopVideo(job, message: message, code: code)
    }
    private func copyVideo(_ source: URL, job: PreparedVideoJob) {
        // The direct Photos AVURL is already downloaded. Copy bytes unchanged:
        // no transcoding, full-file Data allocation, or AVAsset export on this path.
        let ext = ["mp4", "mov", "m4v"].contains(source.pathExtension.lowercased()) ? source.pathExtension.lowercased() : "mov"
        let partial = videoFolder.appendingPathComponent("partial-" + UUID().uuidString + "." + ext)
        job.partial = partial
        do { try reserveVideoSpace(videoSize(source) ?? 0) }
        catch { failVideo(job, error: error); return }
        DispatchQueue.global(qos: .userInitiated).async {
            do {
                guard !job.isCancelled else { throw VideoPreparationFailure.cancelled }
                guard FileManager.default.createFile(atPath: partial.path, contents: nil) else { throw VideoPreparationFailure.writeFailed }
                let input = try FileHandle(forReadingFrom: source)
                defer { try? input.close() }
                let output = try FileHandle(forWritingTo: partial)
                defer { try? output.close() }
                var bytes: Int64 = 0
                while let data = try input.read(upToCount: 1024 * 1024), !data.isEmpty {
                    guard !job.isCancelled else { throw VideoPreparationFailure.cancelled }
                    bytes += Int64(data.count)
                    guard bytes <= self.videoFileLimit else { throw VideoPreparationFailure.tooLarge }
                    try output.write(contentsOf: data)
                }
                try output.synchronize()
                self.videoQueue.async { self.commitVideo(job, ext: ext) }
            } catch {
                try? FileManager.default.removeItem(at: partial)
                self.videoQueue.async { self.failVideo(job, error: error) }
            }
        }
    }
    private func exportVideo(_ asset: AVAsset, audioMix: AVAudioMix?, job: PreparedVideoJob) {
        // Edited/slow-motion assets can be AVComposition rather than AVURLAsset.
        guard let exporter = AVAssetExportSession(asset: asset, presetName: AVAssetExportPresetHighestQuality) else {
            stopVideo(job, message: "Este vídeo no se puede preparar. Ábrelo con el reproductor de Fotos.", code: "VIDEO_UNSUPPORTED"); return
        }
        let type: AVFileType = exporter.supportedFileTypes.contains(.mp4) ? .mp4 : .mov
        guard exporter.supportedFileTypes.contains(type) else {
            stopVideo(job, message: "Este formato no permite reproducción integrada.", code: "VIDEO_UNSUPPORTED"); return
        }
        let ext = type == .mp4 ? "mp4" : "mov"
        let partial = videoFolder.appendingPathComponent("partial-" + UUID().uuidString + "." + ext)
        job.partial = partial; job.exporter = exporter
        exporter.outputURL = partial
        exporter.outputFileType = type
        exporter.audioMix = audioMix
        exporter.shouldOptimizeForNetworkUse = true
        exporter.fileLengthLimit = videoFileLimit
        exporter.exportAsynchronously {
            self.videoQueue.async {
                guard self.videoJobs[job.token] === job, !job.isCancelled else { try? FileManager.default.removeItem(at: partial); return }
                guard exporter.status == .completed else {
                    self.stopVideo(job, message: "No se pudo preparar el vídeo editado. Puedes abrirlo con Fotos.", code: "VIDEO_EXPORT_FAILED"); return
                }
                self.commitVideo(job, ext: ext)
            }
        }
    }
    private func commitVideo(_ job: PreparedVideoJob, ext: String) {
        guard let partial = job.partial else { return }
        guard videoJobs[job.token] === job, !job.isCancelled else { try? FileManager.default.removeItem(at: partial); return }
        do {
            let bytes = videoSize(partial) ?? 0
            try reserveVideoSpace(bytes)
            let file = videoFolder.appendingPathComponent(job.key + "." + ext)
            if FileManager.default.fileExists(atPath: file.path) { try FileManager.default.removeItem(at: file) }
            try FileManager.default.moveItem(at: partial, to: file)
            try? FileManager.default.setAttributes([.modificationDate: Date()], ofItemAtPath: file.path)
            pinnedVideos[job.key] = job.assetID
            job.timeout?.cancel()
            videoJobs.removeValue(forKey: job.token)
            NSLog("MEMSWIPE_VIDEO_PREPARED_OK bytes=%lld cached=0", bytes)
            job.call.resolve(["path": file.path, "mimeType": videoMime(ext), "cached": false, "bytes": bytes])
        } catch { failVideo(job, error: error) }
    }
    @objc func analyze(_ call: CAPPluginCall) {
        guard allowed(call), let ids = call.getArray("ids", String.self) else { return }
        DispatchQueue.main.async {
            guard !self.analyzing else { call.reject("Ya hay un análisis en curso."); return }; self.analyzing = true
            self.cancelLock.lock(); self.cancelRequested = false; self.cancelLock.unlock()
            self.analysisQueue.async {
                defer { DispatchQueue.main.async { self.analyzing = false } }
                let threshold = Float(min(0.6, max(0.05, call.getDouble("threshold") ?? 0.28)))
                let fetched = PHAsset.fetchAssets(withLocalIdentifiers: ids, options: nil)
                var items: [PHAsset] = []; fetched.enumerateObjects { item, _, _ in items.append(item) }
                items.sort { ($0.creationDate ?? .distantPast) < ($1.creationDate ?? .distantPast) }
                var prints: [(index: Int, hash: UInt64, feature: VNFeaturePrintObservation)] = []; var skipped = 0
                var parent = Array(0..<items.count)
                func root(_ n: Int) -> Int { var k = n; while parent[k] != k { k = parent[k] }; return k }
                for (index, item) in items.enumerated() {
                    if self.cancelled() { break }
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
                            // A coarse luminance signature shortlists cross-date candidates. Bound
                            // expensive Vision comparisons to 64 per image, rather than all prints.
                            let signature = self.imageHash(cgImage)
                            let candidates = prints.indices.sorted {
                                (prints[$0].hash ^ signature).nonzeroBitCount < (prints[$1].hash ^ signature).nonzeroBitCount
                            }.prefix(64)
                            var nearest: (Int, Float)?
                            for i in candidates {
                                if self.cancelled() { break }
                                var distance: Float = 1
                                try print.computeDistance(&distance, to: prints[i].feature)
                                if distance < threshold && (nearest == nil || distance < nearest!.1) { nearest = (i, distance) }
                            }
                            if let nearest { parent[index] = root(prints[nearest.0].index) }
                            else { prints.append((index, signature, print)) }
                        } catch { skipped += 1 }
                    }
                    if index % 10 == 0 || index == items.count - 1 { self.notifyListeners("analysisProgress", data: ["done": index + 1, "total": items.count]) }
                }
                var groups: [Int: [String]] = [:]
                for i in items.indices { groups[root(i), default: []].append(items[i].localIdentifier) }
                call.resolve(["groups": groups.values.filter { $0.count > 1 }, "skipped": skipped, "cancelled": self.cancelled()])
            }
        }
    }
    private func imageHash(_ image: CGImage) -> UInt64 {
        var pixels = [UInt8](repeating: 0, count: 72)
        return pixels.withUnsafeMutableBytes { buffer in
            guard let context = CGContext(data: buffer.baseAddress, width: 9, height: 8, bitsPerComponent: 8,
                                          bytesPerRow: 9, space: CGColorSpaceCreateDeviceGray(), bitmapInfo: CGImageAlphaInfo.none.rawValue) else { return 0 }
            context.interpolationQuality = .low
            context.draw(image, in: CGRect(x: 0, y: 0, width: 9, height: 8))
            var hash: UInt64 = 0
            for y in 0..<8 { for x in 0..<8 {
                if buffer[y * 9 + x] > buffer[y * 9 + x + 1] { hash |= UInt64(1) << (y * 8 + x) }
            } }
            return hash
        }
    }
}

private enum VideoPreparationFailure: Error { case tooLarge, cacheFull, cancelled, writeFailed, unavailable }

private final class PreparedThumbnailJob {
    let call: CAPPluginCall
    var photoRequest: PHImageRequestID = PHInvalidImageRequestID
    var timeout: DispatchWorkItem?
    init(call: CAPPluginCall) { self.call = call }
}

private final class PreparedVideoJob {
    let token: String
    let key: String
    let assetID: String
    let call: CAPPluginCall
    var photoRequest: PHImageRequestID = PHInvalidImageRequestID
    var exporter: AVAssetExportSession?
    var partial: URL?
    var timeout: DispatchWorkItem?
    private let lock = NSLock()
    private var cancellation = false
    var isCancelled: Bool { lock.lock(); defer { lock.unlock() }; return cancellation }
    func cancel() { lock.lock(); cancellation = true; lock.unlock() }
    init(token: String, key: String, assetID: String, call: CAPPluginCall) {
        self.token = token; self.key = key; self.assetID = assetID; self.call = call
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
