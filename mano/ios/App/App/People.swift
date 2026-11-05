import Foundation
import Capacitor
import Photos
import UIKit
import CoreImage
import Vision
import CryptoKit
#if canImport(MediaIntelligence)
import MediaIntelligence
#endif
#if canImport(MetricKit)
import MetricKit
#endif

/// Shared, non-blocking priority signal. Never waits on the UI thread.
enum CocoMediaPressure {
    private static let lock = NSLock()
    private static var count = 0
    static func change(_ delta: Int) { lock.lock(); count = max(0, count + delta); lock.unlock() }
    static var busy: Bool { lock.lock(); defer { lock.unlock() }; return count > 0 }
}

@objc(PeoplePlugin)
public class PeoplePlugin: CAPPlugin, CAPBridgedPlugin, PHPhotoLibraryChangeObserver {
    public let identifier = "PeoplePlugin"
    public let jsName = "People"
    public let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "command", returnType: CAPPluginReturnPromise)]
    private var lifecycleObservers: [NSObjectProtocol] = []
    public override func load() {
        // Before any People phase: an open phase left by the previous process is an abrupt end.
        if let abnormal = PeopleTrace.shared.launch() { NSLog("COCOWASH_PEOPLE previous process ended abruptly phase=%@ background=%@", abnormal.phase, String(abnormal.background)) }
        #if canImport(MetricKit)
        PeopleSystemReports.shared.start()
        #endif
        PHPhotoLibrary.shared().register(self)
        if UIApplication.shared.applicationState == .active { PeopleActivityGate.shared.activate() }
        for name in [UIApplication.willResignActiveNotification, UIScene.willDeactivateNotification, UIApplication.protectedDataWillBecomeUnavailableNotification] {
            lifecycleObservers.append(NotificationCenter.default.addObserver(forName:name,object:nil,queue:.main) { _ in
                PeopleActivityGate.shared.suspend()
                #if canImport(MediaIntelligence) && !targetEnvironment(simulator)
                if #available(iOS 27.0, *) { Task { await PeopleIndex.shared.suspend() } }
                #endif
            })
        }
        lifecycleObservers.append(NotificationCenter.default.addObserver(forName:UIApplication.didEnterBackgroundNotification,object:nil,queue:.main) { _ in PeopleTrace.shared.background(true) })
        lifecycleObservers.append(NotificationCenter.default.addObserver(forName:UIApplication.willEnterForegroundNotification,object:nil,queue:.main) { _ in PeopleTrace.shared.background(false) })
        lifecycleObservers.append(NotificationCenter.default.addObserver(forName:UIApplication.didReceiveMemoryWarningNotification,object:nil,queue:nil) { _ in PeopleTrace.shared.note("memory-warning") })
        for name in [UIApplication.didBecomeActiveNotification, UIScene.didActivateNotification] {
            lifecycleObservers.append(NotificationCenter.default.addObserver(forName:name,object:nil,queue:.main) { [weak self] _ in
                PeopleActivityGate.shared.activate()
                self?.notifyListeners("stateChanged",data:[:])
            })
        }
    }
    deinit { PHPhotoLibrary.shared().unregisterChangeObserver(self); for token in lifecycleObservers { NotificationCenter.default.removeObserver(token) } }
    public func photoLibraryDidChange(_ changeInstance: PHChange) {
        #if canImport(MediaIntelligence) && !targetEnvironment(simulator)
        if #available(iOS 27.0, *) {
            Task { @MainActor [weak self] in
                if await PeopleIndex.shared.libraryChanged() { self?.notifyListeners("libraryChanged", data: [:]) }
            }
        }
        #endif
    }
    @objc func command(_ call: CAPPluginCall) {
        // Local diagnostics: counters and phase names only. Sharing is an explicit user action.
        if call.getString("action") == "diagnostics" { call.resolve(["report": PeopleTrace.shared.report()]); return }
        if call.getString("action") == "shareDiagnostics" {
            Task {
                let file = FileManager.default.temporaryDirectory.appendingPathComponent("CocoWash-diagnostico-Personas.txt")
                defer { try? FileManager.default.removeItem(at:file) }
                do {
                    try Data(PeopleTrace.shared.report().utf8).write(to:file,options:[.atomic,.completeFileProtection])
                    let controller = await MainActor.run { self.bridge?.viewController }
                    try await PhotoLibraryPlugin.presentShare(file, from: controller)
                    call.resolve()
                } catch { call.reject("No se pudo preparar el diagnóstico.", "PEOPLE_DIAGNOSTICS") }
            }
            return
        }
        #if canImport(MediaIntelligence) && !targetEnvironment(simulator)
        if #available(iOS 27.0, *) {
            Task(priority: call.getString("action") == "redact" || call.getString("action") == "portrait" ? .userInitiated : .utility) {
                do {
                    let result = try await PeopleIndex.shared.command(call)
                    if call.getString("action") == "shareRedacted", let path = result["path"] as? String {
                        let file = URL(fileURLWithPath: path)
                        defer { try? FileManager.default.removeItem(at: file) }
                        let controller = await MainActor.run { self.bridge?.viewController }
                        try await PhotoLibraryPlugin.presentShare(file, from: controller)
                        call.resolve()
                    } else { call.resolve(result) }
                }
                catch { call.reject("No se pudo completar Personas. Puedes reintentar o eliminar el índice local.", "PEOPLE_UNAVAILABLE") }
            }
            return
        }
        #endif
        call.resolve(["available": false, "reason": "Requiere iOS 27, SDK compatible y un dispositivo físico con Media Intelligence disponible."])
    }
}

#if canImport(MediaIntelligence) && !targetEnvironment(simulator)
@available(iOS 27.0, *)
private actor PeopleIndex {
    static let shared = PeopleIndex()
    private typealias Face = PeopleFace
    private typealias Entry = PeopleEntry
    private typealias Store = PeopleState
    private let folder = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("CocoPeople", isDirectory: true)
    private var analyzer: FaceGroupAnalyzer?
    private var reconciler: FaceGroupAnalyzer?
    private var publication: [PublishedPerson] = []
    private var cycleScope = Set<String>(), deferredLibraryChanges = false
    private var phase = "indexing"
    private var reconcileSamples: [IdentitySample] = []
    private var reconcileQueue: [String] = []
    private var locations: [String:(photo:String,index:Int)] = [:]
    private var checkpoint: PeopleCheckpoint?
    private var dirtyEntries = Set<String>()
    private var metadataDirty = true
    private var work: Task<Void, Error>?
    private var store = Store(), loaded = false, running = false, scanning = false
    private var generation = 0
    private var assets: [String: PHAsset] = [:], pending: [String] = [], deferred: Set<String> = []
    private var sinceGrouping = 0
    private var refreshing = false
    private var total = 0
    private var blocked = ""
    private var needsRefresh = false
    private var modelNeedsPrune = true
    private var activeImage: PHImageRequestID?
    private let manager = PHImageManager()
    private let ci = CIContext(options: [.cacheIntermediates: false])
    private var memoryPauseUntil = Date.distantPast
    private var memoryObserver: NSObjectProtocol?
    private var quarantined = 0
    private enum Failure: Error { case unavailable, stale, invalid }
    private struct Inflight: Codable { var phase: String; var photo: String? }
    private var inflightURL: URL { folder.appendingPathComponent("analysis-inflight") }
    /// Protected marker inside the facial index folder (the only place that
    /// may hold a library ID). It names the photo being read or inserted.
    private func mark(_ phase: String, photo: String? = nil) {
        try? JSONEncoder().encode(Inflight(phase:phase,photo:photo)).write(to:inflightURL,options:[.atomic,.completeFileProtection])
    }
    private func counters() -> PeopleTrace.Counters {
        PeopleTrace.Counters(processed:store.entries.count,total:total,pending:pending.count,faces:locations.count,persons:store.entities.count,samples:reconcileSamples.count)
    }
    /// Last-resort guard before work that can allocate a lot at once (model
    /// load, SDK grouping, image decode). A pause is recoverable; a jetsam kill is not.
    private func headroom(_ neededMB: Int, _ phase: String) -> Bool {
        guard let available = PeopleTrace.memory()?.availableMB, available < neededMB else { return true }
        ci.clearCaches(); memoryPauseUntil = Date().addingTimeInterval(20); blocked = "memory"
        // Callers return right away; models reload when memory is available again.
        analyzer = nil; reconciler = nil
        NSLog("COCOWASH_PEOPLE low memory before %@ available=%d", phase, available)
        PeopleTrace.shared.note("low-memory-\(phase)")
        return false
    }

    private func open() throws {
        guard !loaded else { return }
        PeopleTrace.shared.begin("open")
        var opened = false
        defer { PeopleTrace.shared.end("open", kind: opened ? "end" : "fail") }
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true, attributes: [.protectionKey: FileProtectionType.complete])
        var url = folder; var flags = URLResourceValues(); flags.isExcludedFromBackup = true; try url.setResourceValues(flags)
        let database = try PeopleCheckpoint(folder.appendingPathComponent("index.sqlite"))
        let (meta, rows) = try database.read()
        if let meta { store = try Store.decode(meta) }
        let legacy = meta.flatMap { try? JSONSerialization.jsonObject(with:$0) as? [String:Any] }?["schema"] == nil
        if legacy && meta != nil {
            let backup = folder.appendingPathComponent("index-v1-backup.sqlite")
            if !FileManager.default.fileExists(atPath:backup.path) {
                try database.backup(to:backup)
                let restored = try PeopleCheckpoint(backup).read()
                guard restored.0 == meta, restored.1.count == rows.count else { throw Failure.invalid }
            }
            let oldEngine = folder.appendingPathComponent("Analyzer"), engineBackup = folder.appendingPathComponent("Analyzer-v1-backup")
            if FileManager.default.fileExists(atPath:oldEngine.path) && !FileManager.default.fileExists(atPath:engineBackup.path) { try FileManager.default.copyItem(at:oldEngine,to:engineBackup) }
        }
        for (id, data) in rows { store.entries[id] = try JSONDecoder().decode(Entry.self, from: data) }
        if legacy {
            store.wantsAnalysis = store.consent
            let nativePeople = Set(store.entities.values)
            for id in Array(store.entries.keys) {
                guard var entry = store.entries[id] else { continue }
                for i in entry.faces.indices {
                    let face = entry.faces[i]
                    entry.faces[i].person = store.overrides[face.id] ?? store.entities[face.entity]
                    if let override = store.overrides[face.id], !nativePeople.contains(override), let old = store.entities[face.entity], old != override { store.graph.separate(old,override) }
                }
                store.entries[id] = entry; dirtyEntries.insert(id)
            }
        }
        publication = try database.readPublication().map { try JSONDecoder().decode(PublishedPerson.self,from:$0.1) }
        cycleScope = try database.readScope()
        checkpoint = database
        rebuildLocations()
        // Interrupted transient inputs never become a permanent photo cache.
        for file in try FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: nil) where file.lastPathComponent.hasPrefix("input-") { try? FileManager.default.removeItem(at: file) }
        let work = folder.appendingPathComponent("Analyzer", isDirectory: true)
        try FileManager.default.createDirectory(at: work, withIntermediateDirectories: true, attributes: [.protectionKey: FileProtectionType.complete])
        // Loading the persistent ML model is reserved for an explicit scan.
        // Status/launch must stay usable even after interrupted analysis.
        if store.strikesBuild != PeopleTrace.shared.build { store.strikes = [:]; store.strikesBuild = PeopleTrace.shared.build; metadataDirty = true }
        if FileManager.default.fileExists(atPath:inflightURL.path) {
            store.wantsAnalysis = false; metadataDirty = true; blocked = "interrupted"
            // A photo that was being read or inserted when the process ended gets a strike.
            // Two strikes in the same build quarantine only that photo; nothing is deleted.
            // A suspended app killed by iOS in the background is not evidence against the photo.
            if PeopleTrace.shared.lastLaunch?.background != true,
               let data = try? Data(contentsOf:inflightURL), let value = try? JSONDecoder().decode(Inflight.self,from:data), let photo = value.photo {
                store.strikes[photo,default:0] += 1
            }
            try? FileManager.default.removeItem(at:inflightURL)
        }
        // Any People phase open at an abrupt foreground end (not only a scan) pauses automatic analysis.
        if let abnormal = PeopleTrace.shared.lastLaunch, !abnormal.background, store.consent {
            store.wantsAnalysis = false; metadataDirty = true; blocked = "interrupted"
        }
        memoryObserver = NotificationCenter.default.addObserver(forName: UIApplication.didReceiveMemoryWarningNotification, object: nil, queue: nil) { _ in
            Task { await PeopleIndex.shared.memoryWarning() }
        }
        let global = folder.appendingPathComponent("Reconciler",isDirectory:true)
        try FileManager.default.createDirectory(at:global,withIntermediateDirectories:true,attributes:[.protectionKey:FileProtectionType.complete])
        loaded = true
        phase = store.publicReady ? "ready" : "indexing"
        if legacy || metadataDirty { try save() }
        opened = true
    }
    func suspend() {
        running = false; generation += 1; work?.cancel()
        if let id=activeImage { manager.cancelImageRequest(id) }
        if !scanning && !refreshing { analyzer = nil; reconciler = nil }
        // A cleanly drained batch removes its marker. An interrupted one pauses
        // on the next launch instead of entering an automatic crash loop.
        try? save()
    }
    private func permitted(_ token: Int) -> Bool { PeopleActivityGate.shared.accepts(token) && !Task.isCancelled }
    private func primary() throws -> FaceGroupAnalyzer {
        if let analyzer { return analyzer }
        reconciler = nil
        PeopleTrace.shared.note("model-load"); PeopleTrace.shared.begin("model-load",generation:generation,counters:counters())
        defer { PeopleTrace.shared.end("model-load") }
        let value = try FaceGroupAnalyzer(workingDirectory:folder.appendingPathComponent("Analyzer"))
        analyzer = value; return value
    }
    private func memoryWarning() {
        memoryPauseUntil = Date().addingTimeInterval(30); generation += 1; work?.cancel(); if let id=activeImage { manager.cancelImageRequest(id) }; ci.clearCaches()
        // Idle models are the largest resident allocation; reload them only when needed.
        if !scanning && !refreshing { analyzer = nil; reconciler = nil }
    }
    func libraryChanged() -> Bool {
        guard loaded, store.consent else { return false }
        needsRefresh = true
        if !store.cycleActive { generation += 1; work?.cancel() }
        return true
    }
    private func save(publication next: [PublishedPerson]? = nil, scope: Set<String>? = nil) throws {
        if !metadataDirty && dirtyEntries.isEmpty && next == nil && scope == nil { return }
        var meta = store; meta.entries = [:]
        let rows = try dirtyEntries.map { id -> (String, Data?) in (id, try store.entries[id].map { try JSONEncoder().encode($0) }) }
        guard let checkpoint else { throw Failure.unavailable }
        let published = try next.map { values in try values.map { ($0.id,try JSONEncoder().encode($0)) } }
        try checkpoint.write(meta: metadataDirty ? JSONEncoder().encode(meta) : nil, rows: rows, publication: published, scope:scope)
        if let next { publication = next }
        dirtyEntries.removeAll(); metadataDirty = false
    }
    private func signature(_ a: PHAsset) -> String { "\(a.modificationDate?.timeIntervalSince1970 ?? 0):\(a.pixelWidth):\(a.pixelHeight)" }
    private func group(_ f: Face) -> String? { store.group(f) }
    private func permission() -> Bool { let p = PHPhotoLibrary.authorizationStatus(for: .readWrite); return p == .authorized || p == .limited }
    private func refresh() async throws {
        guard !scanning, !refreshing else { throw Failure.stale }
        refreshing = true; defer { refreshing = false }
        PeopleTrace.shared.begin("refresh",generation:generation,counters:counters())
        var refreshed = false
        defer { PeopleTrace.shared.end("refresh",kind:refreshed ? "end" : "fail",counters:counters()) }
        generation += 1; metadataDirty = true
        let options = PHFetchOptions(); options.predicate = NSPredicate(format: "mediaType == %d AND hidden == NO", PHAssetMediaType.image.rawValue)
        var current: [String: PHAsset] = [:]
        if permission() { PHAsset.fetchAssets(with: options).enumerateObjects { a, _, _ in if !a.mediaSubtypes.contains(.photoScreenshot) { current[a.localIdentifier] = a } } }
        let changed = current.count != store.entries.count || current.contains { id,asset in store.entries[id]?.signature != signature(asset) }
        let needCycle = changed || store.needsReconciliation || !store.publicReady
        let choice=PeoplePolicy.cycle(available:Set(current.keys),scope:store.cycleActive ? cycleScope : nil)
        let newScope: Set<String>? = !store.cycleActive && needCycle ? choice.ids : nil
        if let newScope { cycleScope = newScope; store.cycleActive = true }
        deferredLibraryChanges = choice.hasNext
        current = current.filter { choice.ids.contains($0.key) }
        let obsolete = store.entries.keys.filter { id in current[id].map { signature($0) != store.entries[id]?.signature } ?? true }
        for id in obsolete {
            if current[id] != nil, let old = store.entries[id] {
                let corrected=old.faces.filter { store.overrides[$0.id] != nil || store.excluded.contains($0.id) }.map(\.id)
                if !corrected.isEmpty { store.pendingCorrections[id]=Array(Set((store.pendingCorrections[id] ?? [])+corrected)) }
            } else { store.pendingCorrections.removeValue(forKey:id) }
        }
        // SDK cleanup is deferred to the scanning task, never status/startup.
        // It runs once per process (orphans after an interruption) and when
        // entries became obsolete, not on every refresh with pending photos.
        if !obsolete.isEmpty { modelNeedsPrune = true }
        for id in obsolete { store.entries.removeValue(forKey:id); dirtyEntries.insert(id) }
        assets = current; total = current.count; deferred = []
        store.strikes = store.strikes.filter { current[$0.key] != nil && store.entries[$0.key] == nil }
        let unsafe = Set(store.strikes.filter { $0.value >= PeoplePolicy.quarantineStrikes }.keys)
        pending = current.keys.filter { store.entries[$0] == nil && !unsafe.contains($0) }.sorted(by: >)
        quarantined = unsafe.count
        store.pendingCorrections = store.pendingCorrections.filter { current[$0.key] != nil }
        let faces = Set(store.entries.values.flatMap { $0.faces.map(\.id) }+store.pendingCorrections.values.flatMap{$0})
        store.excluded.formIntersection(faces); store.overrides = store.overrides.filter { faces.contains($0.key) }
        rebuildLocations()
        if !obsolete.isEmpty || !pending.isEmpty { store.needsReconciliation = true }
        phase = !pending.isEmpty ? "indexing" : (store.needsReconciliation || !store.publicReady ? "reconciling" : "ready")
        reconcileSamples = []; reconcileQueue = []
        if !obsolete.isEmpty { store.protectionRevision += 1 }
        // Remove inaccessible references from the last public snapshot immediately.
        let pruned = publication.compactMap { value -> PublishedPerson? in
            var p = value; p.photos = p.photos.filter { current[$0] != nil && store.entries[$0] != nil }
            p.portraits = p.portraits.filter { p.photos.contains($0.id) }
            return p.photos.isEmpty ? nil : p
        }
        if pruned != publication { store.revision += 1 }
        try save(publication:pruned == publication ? nil : pruned,scope:newScope)
        needsRefresh = false; refreshed = true
    }
    private func snapshot(includeGroups: Bool = true) -> [String:Any] {
        let groups: [[String:Any]] = includeGroups && store.publicReady ? publication.filter { PeoplePolicy.visible($0.photos.count) }.map { p in
            ["id":p.id,"name":p.name,"count":p.photos.count,"representative":p.portraits.first?.id ?? "",
             "portraits":p.portraits.map { ["id":$0.id,"face":$0.face,"version":$0.version ?? ""] }]
        } : []
        var result: [String:Any] = ["available":true,"consent":store.consent,"running":running && PeopleActivityGate.shared.active,"phase":running && PeopleActivityGate.shared.active ? phase : (phase == "ready" ? "ready" : "paused"),
                "hasPublication":store.publicReady,"revision":store.revision,"protectionRevision":store.protectionRevision,
                "minimumPhotos":PeoplePolicy.minimumPhotos,"blocked":blocked,"correctionsNeedReview": !store.pendingCorrections.isEmpty,
                "processed":store.entries.count,"total":total,"remaining":pending.count,"waiting":deferred.count,"skipped":quarantined,
                "interruptedPhase":blocked == "interrupted" ? (PeopleTrace.shared.lastLaunch?.phase ?? "") : "","guarded":PeopleTrace.shared.guardedPhases]
        if includeGroups { result["groups"] = groups; result["aliases"] = store.graph.aliases }
        return result
    }
    private func rebuildLocations() {
        locations.removeAll(keepingCapacity:true)
        for (id,entry) in store.entries { for i in entry.faces.indices { locations[entry.faces[i].id] = (id,i) } }
    }
    private func image(_ asset: PHAsset, size: Int, tracked: Bool = false) async -> UIImage? {
        let fence=PeopleActivityGate.shared, epoch=fence.epoch, ticket=UUID()
        guard fence.accepts(epoch) else { return nil }
        defer { fence.remove(ticket); if tracked { activeImage = nil } }
        return await withCheckedContinuation { continuation in
            let delivery = PeopleImageDelivery(continuation)
            let options = PHImageRequestOptions(); options.isNetworkAccessAllowed = false; options.deliveryMode = .highQualityFormat; options.resizeMode = .exact
            let request = manager.requestImage(for:asset,targetSize:CGSize(width:CGFloat(size),height:CGFloat(size)),contentMode:.aspectFit,options:options) { image,info in
                if (info?[PHImageResultIsDegradedKey] as? Bool) == true { return }
                delivery.finish(fence.accepts(epoch) ? image : nil)
            }
            delivery.limit(manager:manager,request:request)
            let manager=self.manager
            fence.register(ticket,epoch:epoch) { manager.cancelImageRequest(request); delivery.finish(nil) }
            if tracked { activeImage = request }
        }
    }
    /// Normalize orientation once. Both analysis and redaction use these pixels.
    private func upright(_ source: UIImage) -> UIImage {
        let format = UIGraphicsImageRendererFormat(); format.scale = 1; format.opaque = true
        return UIGraphicsImageRenderer(size: source.size, format: format).image { _ in source.draw(in: CGRect(origin: .zero, size: source.size)) }
    }
    private func scan() async throws {
        guard running, store.consent, !scanning, !refreshing, PeopleActivityGate.shared.active else { return }
        let active = await MainActor.run { UIApplication.shared.applicationState == .active }
        blocked = !active ? "foreground" : !permission() ? "permission" : CocoMediaPressure.busy ? "media" : Date() < memoryPauseUntil ? "memory" :
            (ProcessInfo.processInfo.thermalState == .nominal || ProcessInfo.processInfo.thermalState == .fair) ? "" : "thermal"
        guard blocked.isEmpty else { return }
        scanning = true; defer { scanning = false; if !PeopleActivityGate.shared.active { analyzer = nil; reconciler = nil } }
        let token = generation
        // Wall clock only: no boot-time API (privacy manifest required reason).
        let started = Date()
        NSLog("COCOWASH_PEOPLE batch start phase=%@ generation=%d", phase, token)
        PeopleTrace.shared.begin("batch",generation:token,counters:counters(),quiet:true)
        var batchKind = "cancel"
        defer {
            NSLog("COCOWASH_PEOPLE batch ended generation=%d seconds=%.2f cancelled=%@", token, Date().timeIntervalSince(started), String(Task.isCancelled))
            PeopleTrace.shared.end("batch",kind:batchKind,counters:counters(),quiet:true)
        }
        let lifecycle=PeopleActivityGate.shared.epoch
        guard permitted(lifecycle) else { return }
        if self.analyzer == nil && self.reconciler == nil && !headroom(PeoplePolicy.modelHeadroomMB,"model") { batchKind = "end"; return }
        if modelNeedsPrune {
            NSLog("COCOWASH_PEOPLE prune start generation=%d", token)
            let engine=try primary(); var removed: [MediaIntelligenceImageAsset.ID] = []
            PeopleTrace.shared.begin("prune",generation:token,counters:counters())
            var pruned = false
            defer { PeopleTrace.shared.end("prune",kind:pruned ? "end" : "cancel") }
            for try await id in engine.allAssetIDs { guard running,token == generation,permitted(lifecycle) else { return }; if assets[id.rawValue] == nil { removed.append(id) } }
            guard running,token == generation,permitted(lifecycle) else { return }
            if !removed.isEmpty { try await engine.deleteAssets(removed) }
            guard running,token == generation,permitted(lifecycle) else { return }; modelNeedsPrune = false; pruned = true
        }
        if phase == "reconciling" {
            NSLog("COCOWASH_PEOPLE reconcile start generation=%d", token)
            try await reconcileStep(token:token); batchKind = "end"; return
        }
        NSLog("COCOWASH_PEOPLE insert start generation=%d", token)
        let analyzer = try primary()
        // One in-flight image; batches of four bound work and checkpoint latency.
        for _ in 0..<PeoplePolicy.batch {
            guard running, token == generation, permitted(lifecycle), !pending.isEmpty, !CocoMediaPressure.busy else { break }
            let id = pending.removeLast()
            defer { if store.entries[id] == nil && assets[id] != nil && !deferred.contains(id) && !pending.contains(id) { pending.append(id) } }
            guard let asset = assets[id] else { continue }
            guard headroom(PeoplePolicy.insertHeadroomMB,"insert") else { break }
            guard accessible(id, signature: signature(asset)) != nil else { deferred.insert(id); continue }
            mark("insert",photo:id)
            PeopleTrace.shared.begin("insert",generation:token,counters:counters(),quiet:true)
            var outcome = "cancel"
            defer { mark("batch"); PeopleTrace.shared.end("insert",kind:outcome,counters:counters(),quiet:true) }
            let source = await image(asset, size: PeoplePolicy.indexPixels, tracked: true)
            guard running, token == generation, permitted(lifecycle) else { break }
            guard let source, accessible(id, signature: signature(asset)) != nil else { deferred.insert(id); outcome = "deferred"; continue }
            let file = folder.appendingPathComponent("input-\(UUID().uuidString).jpg")
            defer { try? FileManager.default.removeItem(at: file) }
            guard let data = autoreleasepool(invoking: { upright(source).jpegData(compressionQuality: 0.9) }) else { deferred.insert(id); outcome = "deferred"; continue }
            try data.write(to: file, options: [.atomic, .completeFileProtection])
            guard running, token == generation, PeopleActivityGate.shared.active, !Task.isCancelled else { return }
            let results = try await analyzer.insertOrUpdateAssets([MediaIntelligenceImageAsset(id: .init(id), kind: .url(file))])
            for try await _ in results { }
            guard running, token == generation, permitted(lifecycle) else { pending.append(id); break }
            store.entries[id] = Entry(signature: signature(asset), faces: []); dirtyEntries.insert(id); sinceGrouping += 1; store.needsReconciliation = true
            store.strikes.removeValue(forKey:id); outcome = "end"
        }
        guard running, token == generation, PeopleActivityGate.shared.active, !Task.isCancelled, !CocoMediaPressure.busy else { try save(); return }
        if sinceGrouping < 64 && !pending.isEmpty && !store.entities.isEmpty { try save(); batchKind = "end"; return }
        // Checkpoint inserted photos before the largest SDK step.
        try save()
        guard headroom(PeoplePolicy.modelHeadroomMB,"group") else { batchKind = "end"; return }
        NSLog("COCOWASH_PEOPLE group start generation=%d", token)
        if await analyzer.state == .stale {
            guard running,token == generation,PeopleActivityGate.shared.active,!Task.isCancelled else { return }
            PeopleTrace.shared.begin("group",generation:token,counters:counters())
            var grouped = false
            defer { PeopleTrace.shared.end("group",kind:grouped ? "end" : "cancel",counters:counters()) }
            try await analyzer.update(); grouped = true
        }
        guard running, token == generation else { return }
        NSLog("COCOWASH_PEOPLE read start generation=%d", token)
        try await readPrimary(token:token)
        if pending.isEmpty { phase = "reconciling"; reconcileSamples = []; reconcileQueue = [] }
        try save(); batchKind = "end"
    }
    private func readPrimary(token: Int) async throws {
        guard let analyzer else { throw Failure.unavailable }
        PeopleTrace.shared.begin("read",generation:token,counters:counters())
        var read = false
        defer { PeopleTrace.shared.end("read",kind:read ? "end" : "cancel",counters:counters()) }
        var detected: [(photo:String,face:Face)] = []
        for try await (entity,faces) in analyzer.allFacesByEntityID {
            for f in faces {
                let id = f.assetID.rawValue; guard store.entries[id] != nil else { continue }
                let b = f.bounds
                let box = [Double(b.minX),Double(b.minY),Double(b.width),Double(b.height)]
                guard PeopleGeometry.valid(box) else { continue }
                detected.append((id,Face(id:f.id.rawValue,entity:entity.rawValue,box:box)))
            }
        }
        guard token == generation, !Task.isCancelled else { throw CancellationError() }
        let previous = store.entries
        store.assign(detected); metadataDirty = true
        for (id,entry) in store.entries where previous[id]?.faces != entry.faces { dirtyEntries.insert(id) }
        for id in Array(store.pendingCorrections.keys) where store.entries[id] != nil {
            let present=Set(store.entries[id]?.faces.map(\.id) ?? [])
            let missing=(store.pendingCorrections[id] ?? []).filter { !present.contains($0) }
            if missing.isEmpty { store.pendingCorrections.removeValue(forKey:id) } else { store.pendingCorrections[id]=missing }
        }
        rebuildLocations(); sinceGrouping = 0; read = true
    }
    private func selections() -> [String:[PeoplePortrait]] {
        var byPerson: [String:[String:PeopleFace]] = [:]
        for (photo,entry) in store.entries {
            for face in entry.faces {
                guard let person = group(face) else { continue }
                if let old = byPerson[person]?[photo], old.box[2]*old.box[3] >= face.box[2]*face.box[3] { continue }
                byPerson[person,default:[:]][photo] = face
            }
        }
        let dates = assets.mapValues { $0.creationDate?.timeIntervalSince1970 ?? 0 }
        var result: [String:[PeoplePortrait]] = [:]
        for (person,photos) in byPerson {
            var candidates = photos.keys.sorted(), chosen: [String] = []
            let maxArea = photos.values.map { $0.box[2]*$0.box[3] }.max() ?? 1
            while !candidates.isEmpty && chosen.count < PeoplePolicy.representatives {
                let next = candidates.max { a,b in
                    func score(_ id: String) -> Double {
                        let face = photos[id]!, area = face.box[2]*face.box[3]/max(0.000001,maxArea)
                        let date = dates[id] ?? 0
                        let spread = chosen.map { abs(date-(dates[$0] ?? 0)) }.min() ?? 0
                        return area*0.6+min(1,spread/(30*86400))*0.4
                    }
                    let x = score(a), y = score(b); return x == y ? a > b : x < y
                }!
                chosen.append(next); candidates.removeAll { $0 == next }
            }
            result[person] = chosen.map { PeoplePortrait(id:$0,face:photos[$0]!.id,version:store.entries[$0]?.signature) }
        }
        return result
    }
    private func stamp(_ face: Face, photo: String) -> String {
        let value = "portrait-\(PeoplePolicy.geometryVersion):\(store.entries[photo]?.signature ?? ""):\(face.id):\(face.box):\(String(describing:face.refinement))"
        return SHA256.hash(data:Data(value.utf8)).map { String(format:"%02x",$0) }.joined()
    }
    private func refine(_ face: Face, photo: String, image: UIImage) -> Face {
        let pixels=max(image.cgImage?.width ?? 0,image.cgImage?.height ?? 0)
        if let geometry=face.refinement, geometry.version==PeoplePolicy.geometryVersion, pixels<=Int(Double(geometry.sourcePixels ?? 0)*1.25) { return face }
        var value = face
        value.refinement = autoreleasepool { PeopleProcessing.refinement(face,image:image) } ?? PeopleRefinement(version:PeoplePolicy.geometryVersion,box:face.box,eyes:nil,angle:0,sourcePixels:pixels)
        if let location = locations[face.id], location.photo == photo, store.entries[photo]?.faces.indices.contains(location.index) == true {
            store.entries[photo]?.faces[location.index].refinement = value.refinement; dirtyEntries.insert(photo)
        }
        return value
    }
    private func face(_ id: String) -> (String,Face)? {
        guard let location = locations[id], let entry = store.entries[location.photo], entry.faces.indices.contains(location.index), entry.faces[location.index].id == id else { return nil }
        return (location.photo,entry.faces[location.index])
    }
    private func prepareReconciliation() async throws {
        PeopleTrace.shared.begin("reconcile-prepare",generation:generation,counters:counters())
        var prepared = false
        defer { PeopleTrace.shared.end("reconcile-prepare",kind:prepared ? "end" : "cancel",counters:counters()) }
        // Identities with a single photo can never reach the merge evidence rule;
        // crops for them would only add image decodes and model work.
        reconcileSamples = PeoplePolicy.reconcilable(selections().flatMap { person,refs in refs.map { IdentitySample(face:$0.face,photo:$0.id,person:person) } }).sorted { $0.face < $1.face }
        let wanted = Set(reconcileSamples.map(\.face))
        var obsoleteSamples: [MediaIntelligenceImageAsset.ID] = []
        if let reconciler { for try await id in reconciler.allAssetIDs { if !wanted.contains(id.rawValue) { obsoleteSamples.append(id) } } }
        if !obsoleteSamples.isEmpty { try await reconciler?.deleteAssets(obsoleteSamples) }
        let stale = store.entries.values.flatMap { $0.faces }.filter { $0.sampleStamp != nil && !wanted.contains($0.id) }
        if !stale.isEmpty {
            try await reconciler?.deleteAssets(stale.map { .init($0.id) })
            for value in stale { if let location = locations[value.id] { store.entries[location.photo]?.faces[location.index].sampleStamp = nil; dirtyEntries.insert(location.photo) } }
        }
        reconcileQueue = Array(reconcileSamples.filter { sample in
            guard let (_,f) = face(sample.face) else { return false }; return f.sampleStamp != stamp(f,photo:sample.photo)
        }.map(\.face).reversed())
        prepared = true
    }
    private func reconcileStep(token: Int) async throws {
        if reconcileSamples.isEmpty && reconcileQueue.isEmpty {
            if let analyzer, await analyzer.state == .stale { guard running,token == generation,PeopleActivityGate.shared.active,!Task.isCancelled else { return }; try await analyzer.update(); guard token == generation else { return }; try await readPrimary(token:token) }
        }
        analyzer = nil // At most one retained identity-model context per phase.
        if reconciler == nil {
            guard headroom(PeoplePolicy.modelHeadroomMB,"reconcile-model") else { return }
            PeopleTrace.shared.note("model-load"); PeopleTrace.shared.begin("model-load",generation:token,counters:counters())
            defer { PeopleTrace.shared.end("model-load") }
            reconciler = try FaceGroupAnalyzer(workingDirectory:folder.appendingPathComponent("Reconciler"))
        }
        guard let reconciler else { throw Failure.unavailable }
        if reconcileSamples.isEmpty && reconcileQueue.isEmpty { try await prepareReconciliation() }
        for _ in 0..<PeoplePolicy.batch {
            guard running, token == generation, PeopleActivityGate.shared.active, !Task.isCancelled, !CocoMediaPressure.busy else { try save(); return }
            guard headroom(PeoplePolicy.insertHeadroomMB,"reconcile-insert") else { try save(); return }
            guard let id = reconcileQueue.popLast() else { break }
            var completed = false
            PeopleTrace.shared.begin("reconcile-insert",generation:token,counters:counters(),quiet:true)
            defer { if !completed && !reconcileQueue.contains(id) { reconcileQueue.append(id) }; PeopleTrace.shared.end("reconcile-insert",kind:completed ? "end" : "cancel",quiet:true) }
            guard let (photo,original) = face(id), let asset = assets[photo] else { completed = true; continue }
            guard let source = await image(asset,size:PeoplePolicy.indexPixels,tracked:true) else { completed = true; continue }
            guard token == generation, running, PeopleActivityGate.shared.active else { return }
            let up = autoreleasepool { PeopleProcessing.upright(source) }, refined = refine(original,photo:photo,image:up)
            guard let crop = autoreleasepool(invoking:{PeopleProcessing.crop(refined,image:up,maxSize:512)}), let data = crop.jpegData(compressionQuality:0.92) else { completed = true; continue }
            let file = folder.appendingPathComponent("input-\(UUID().uuidString).jpg"); defer { try? FileManager.default.removeItem(at:file) }
            try data.write(to:file,options:[.atomic,.completeFileProtection])
            guard running,token == generation,PeopleActivityGate.shared.active,!Task.isCancelled else { return }
            let results = try await reconciler.insertOrUpdateAssets([MediaIntelligenceImageAsset(id:.init(id),kind:.url(file))])
            for try await _ in results { }
            guard token == generation, running, PeopleActivityGate.shared.active else { return }
            // Compute before writing: `store.entries[...]?.… = stamp(…)` opens a
            // modify access on `store` before the right side runs, and stamp()
            // reads `store` → Swift exclusivity trap (SIGABRT, build 20–24).
            let sampled = stamp(refined,photo:photo)
            if let location = locations[id], store.entries[photo]?.faces.indices.contains(location.index) == true {
                store.entries[photo]?.faces[location.index].sampleStamp = sampled; dirtyEntries.insert(photo)
            }
            completed = true
        }
        try save()
        guard reconcileQueue.isEmpty, running, token == generation, PeopleActivityGate.shared.active, !Task.isCancelled, !CocoMediaPressure.busy else { return }
        guard headroom(PeoplePolicy.modelHeadroomMB,"reconcile-group") else { return }
        PeopleTrace.shared.begin("reconcile-group",generation:token,counters:counters())
        var regrouped = false
        defer { PeopleTrace.shared.end("reconcile-group",kind:regrouped ? "end" : "cancel",counters:counters()) }
        if await reconciler.state == .stale { guard running,token == generation,PeopleActivityGate.shared.active,!Task.isCancelled else { return }; try await reconciler.update() }
        guard token == generation, running, PeopleActivityGate.shared.active, !Task.isCancelled else { return }
        // Accept only the central face of each crop. Extra people near its edge
        // cannot vote for another identity just because they share the photo.
        var matches: [String:[(String,Double)]] = [:]
        for try await (entity,faces) in reconciler.allFacesByEntityID {
            for value in faces {
                let id = value.assetID.rawValue
                guard let (_,original) = face(id), let asset = assets[locations[id]?.photo ?? ""],
                      let crop = PeopleGeometry.crop(original.refinement?.box ?? original.box,width:Double(asset.pixelWidth),height:Double(asset.pixelHeight)),
                      let box = PeopleGeometry.rect(original.refinement?.box ?? original.box,width:Double(asset.pixelWidth),height:Double(asset.pixelHeight)) else { continue }
                let expected = CGRect(x:(box.minX-crop.minX)/crop.width,y:(box.minY-crop.minY)/crop.height,width:box.width/crop.width,height:box.height/crop.height)
                let score = PeopleGeometry.iou(expected,value.bounds)
                if score >= 0.4 { matches[id,default:[]].append((entity.rawValue,score)) }
            }
        }
        var assignments: [String:String] = [:]
        for (id,options) in matches {
            let sorted = options.sorted { $0.1 > $1.1 }
            if sorted.count == 1 || sorted[0].1-sorted[1].1 >= 0.15 { assignments[id] = sorted[0].0 }
        }
        regrouped = true
        var graph = store.graph
        _ = graph.reconcile(samples:reconcileSamples,assignments:assignments,photos:store.membership(),names:store.names)
        guard token == generation, running, PeopleActivityGate.shared.active else { return }
        let previousGraph = store.graph, previousRevision = store.revision, previousProtection = store.protectionRevision, previousReady = store.publicReady
        if graph != store.graph { store.graph = graph; store.protectionRevision += 1 }
        let previousNeeds = store.needsReconciliation, previousCycle = store.cycleActive
        store.needsReconciliation = false; store.cycleActive = false
        do { try publish(scope:[]) } catch {
            store.needsReconciliation = previousNeeds; store.cycleActive = previousCycle
            store.graph = previousGraph; store.revision = previousRevision; store.protectionRevision = previousProtection; store.publicReady = previousReady
            throw error
        }
        cycleScope = []; phase = "ready"; running = false; reconcileSamples = []; reconcileQueue = []; self.reconciler = nil
        if deferredLibraryChanges && store.wantsAnalysis { needsRefresh = true; running = true; phase = "indexing" }
    }
    private func publish(allowed: Set<String>? = nil, scope: Set<String>? = nil) throws {
        PeopleTrace.shared.begin("publish",generation:generation,counters:counters())
        var published = false
        defer { PeopleTrace.shared.end("publish",kind:published ? "end" : "fail",counters:counters()) }
        metadataDirty = true
        let membership = store.membership(), selected = selections()
        let values = membership.compactMap { person,photos -> PublishedPerson? in
            let visible = allowed.map { photos.intersection($0) } ?? photos
            guard !visible.isEmpty else { return nil }
            let portraits = (selected[person] ?? []).filter { visible.contains($0.id) }
            return PublishedPerson(id:person,name:store.names[person] ?? "Persona",photos:visible.sorted(),portraits:portraits)
        }.sorted { $0.id < $1.id }
        store.publicReady = true
        if values != publication { store.revision += 1 }
        try save(publication:values,scope:scope); published = true
    }
    private func cacheFile(_ category: String, key: String) throws -> URL {
        let cache = folder.appendingPathComponent(category,isDirectory:true)
        try FileManager.default.createDirectory(at:cache,withIntermediateDirectories:true,attributes:[.protectionKey:FileProtectionType.complete])
        let hash = SHA256.hash(data:Data(key.utf8)).map { String(format:"%02x",$0) }.joined()
        return cache.appendingPathComponent(hash+".jpg")
    }
    private func pruneCache(_ file: URL, count: Int, budget: Int) throws {
        let directory = file.deletingLastPathComponent()
        let files = try FileManager.default.contentsOfDirectory(at:directory,includingPropertiesForKeys:[.contentModificationDateKey,.fileSizeKey]).sorted {
            ((try? $0.resourceValues(forKeys:[.contentModificationDateKey]))?.contentModificationDate ?? .distantPast) > ((try? $1.resourceValues(forKeys:[.contentModificationDateKey]))?.contentModificationDate ?? .distantPast)
        }
        var bytes = 0
        for (i,url) in files.enumerated() {
            bytes += (try? url.resourceValues(forKeys:[.fileSizeKey]).fileSize) ?? 0
            if (i >= count || bytes > budget) && url != file { try? FileManager.default.removeItem(at:url) }
        }
    }
    private func accessible(_ id: String, signature: String) -> PHAsset? {
        guard permission(), let asset = PHAsset.fetchAssets(withLocalIdentifiers:[id],options:nil).firstObject,
              !asset.isHidden, !asset.mediaSubtypes.contains(.photoScreenshot), self.signature(asset) == signature else { return nil }
        return asset
    }
    private func portrait(id: String, person: String) async throws -> [String:Any] {
        let lifecycle=PeopleActivityGate.shared.epoch; guard permitted(lifecycle) else { throw Failure.stale }
        guard store.consent, let (photo,value) = face(id), group(value) == store.graph.canonical(person),
              let entry = store.entries[photo], let asset = accessible(photo,signature:entry.signature) else { throw Failure.stale }
        var file = try cacheFile("Portraits",key:"v1:\(stamp(value,photo:photo))")
        if FileManager.default.fileExists(atPath:file.path) { return ["path":file.path] }
        // Twice ended the process: mosaics fall back to their placeholder until a retry.
        guard !PeopleTrace.shared.guarded("portrait") else { throw Failure.stale }
        CocoMediaPressure.change(1); defer { CocoMediaPressure.change(-1) }
        PeopleTrace.shared.begin("portrait",quiet:true); var rendered = false
        defer { PeopleTrace.shared.end("portrait",kind:rendered ? "end" : "cancel",quiet:true) }
        guard let source = await image(asset,size:PeoplePolicy.indexPixels), permitted(lifecycle), accessible(photo,signature:entry.signature) != nil,
              let (_,current) = face(id), group(current) == store.graph.canonical(person) else { throw Failure.stale }
        let up = autoreleasepool { PeopleProcessing.upright(source) }, refined = refine(current,photo:photo,image:up)
        file = try cacheFile("Portraits",key:"v1:\(stamp(refined,photo:photo))")
        guard let crop = autoreleasepool(invoking:{PeopleProcessing.crop(refined,image:up,maxSize:256)}), let data = crop.jpegData(compressionQuality:0.9) else { throw Failure.invalid }
        try data.write(to:file,options:[.atomic,.completeFileProtection]); try save(); rendered = true
        try pruneCache(file,count:256,budget:48*1024*1024)
        return ["path":file.path]
    }
    private func redact(id: String, person: String, size: Int, style: String, refresh: Bool) async throws -> [String:Any] {
        let lifecycle=PeopleActivityGate.shared.epoch; guard permitted(lifecycle) else { throw Failure.stale }
        let person = store.graph.canonical(person)
        guard store.consent, let entry = store.entries[id], let asset = accessible(id,signature:entry.signature) else { throw Failure.stale }
        let selected = entry.faces.filter { group($0) == person }
        guard !selected.isEmpty else { throw Failure.stale }
        let token = store.protectionRevision
        let key = "oval-eyes-\(PeoplePolicy.geometryVersion):\(id):\(entry.signature):\(person):\(token):\(size):\(style)"
        func renderFile(_ values: [Face]) throws -> URL {
            let encoder=JSONEncoder();encoder.outputFormatting=[.sortedKeys]
            let geometry=try encoder.encode(values.map(\.refinement))
            let version=SHA256.hash(data:geometry).map { String(format:"%02x",$0) }.joined()
            return try cacheFile("Redacted",key:key+":"+version)
        }
        var file = try renderFile(selected)
        if !refresh && FileManager.default.fileExists(atPath:file.path) { return ["path":file.path] }
        // Twice ended the process: keep the cover until the user retries explicitly.
        guard refresh || !PeopleTrace.shared.guarded("redact") else { throw Failure.stale }
        CocoMediaPressure.change(1); defer { CocoMediaPressure.change(-1) }
        PeopleTrace.shared.begin("redact",quiet:true); var rendered = false
        defer { PeopleTrace.shared.end("redact",kind:rendered ? "end" : "cancel",quiet:true) }
        guard let source = await image(asset,size:size), permitted(lifecycle), token == store.protectionRevision,
              accessible(id,signature:entry.signature) != nil else { throw Failure.stale }
        let up = autoreleasepool { PeopleProcessing.upright(source) }
        var refined: [Face] = []
        for value in selected { refined.append(refine(value,photo:id,image:up)) }
        guard let output = autoreleasepool(invoking:{PeopleProcessing.censor(up,faces:refined,style:style,context:ci)}),
              permitted(lifecycle), token == store.protectionRevision, let data = output.jpegData(compressionQuality:0.9) else { throw Failure.invalid }
        file = try renderFile(refined)
        try data.write(to:file,options:[.atomic,.completeFileProtection]); try save(); rendered = true
        try pruneCache(file,count:24,budget:32*1024*1024)
        return ["path":file.path]
    }
    func command(_ call: CAPPluginCall) async throws -> [String: Any] {
        let action = call.getString("action") ?? "status"
        if action == "reset" {
            guard !scanning, !refreshing else { running = false; generation += 1; throw Failure.stale }
            running = false; generation += 1; analyzer = nil; reconciler = nil; checkpoint = nil; dirtyEntries.removeAll()


            if FileManager.default.fileExists(atPath:folder.path) { try FileManager.default.removeItem(at:folder) }; store = Store(); publication = []; cycleScope = []; loaded = false; phase = "indexing"
            if let observer = memoryObserver { NotificationCenter.default.removeObserver(observer); memoryObserver = nil }
            quarantined = 0; PeopleTrace.shared.clearStreaks()
            return ["available": true, "consent": false, "groups": [], "processed": 0, "total": 0, "remaining": 0, "waiting": 0, "running": false]
        }
        // A user action is the only way past a phase that ended the process twice.
        let explicit = ["consent","resume","reconcile"].contains(action) || (action == "redact" && call.getBool("refresh") == true)
        if explicit { PeopleTrace.shared.allowRetry() }
        // Pausing never needs to open an index whose opening ended the process.
        if !loaded && ["pause","yield"].contains(action) { return ["available": true, "running": false] }
        if !loaded && PeopleTrace.shared.guarded("open") { throw Failure.unavailable }
        try open()
        if needsRefresh && !scanning && !refreshing && ["scan", "person"].contains(action) && !PeopleTrace.shared.guarded("refresh") { try await refresh() }
        if action == "yield" { generation += 1; work?.cancel(); if let request = activeImage { manager.cancelImageRequest(request) }; return ["available": true] }
        if action == "pause" { metadataDirty = true; running = false; if call.getString("reason") != "suspend" { store.wantsAnalysis = false }; generation += 1; work?.cancel(); if let request = activeImage { manager.cancelImageRequest(request) }; try save(); return snapshot() }
        if action == "status", store.consent, !scanning, !refreshing, PeopleActivityGate.shared.active, !PeopleTrace.shared.guarded("refresh") { try await refresh(); running = store.wantsAnalysis && phase != "ready"; if phase == "ready" { analyzer = nil; reconciler = nil } }
        if action == "consent" { metadataDirty = true; store.consent = true; store.wantsAnalysis = true; try save(); try await refresh(); running = true }
        if action == "refresh", store.consent { try await refresh(); running = store.wantsAnalysis && phase != "ready"; if phase == "ready" { analyzer = nil; reconciler = nil } }
        if ["resume","reconcile"].contains(action), store.consent {
            metadataDirty = true; store.wantsAnalysis = true; store.needsReconciliation = true; try await refresh(); phase = pending.isEmpty ? "reconciling" : "indexing"; running = true
        }
        if action == "scan" {
            guard running,PeopleActivityGate.shared.active,work == nil else { return snapshot() }
            mark("batch")
            let task = Task(priority:.utility) { try await self.scan() }; work = task
            defer { work = nil; try? FileManager.default.removeItem(at:inflightURL) }
            do { try await task.value } catch {
                NSLog("COCOWASH_PEOPLE batch failed generation=%d", generation)
                if running && !task.isCancelled {
                    running = false; store.wantsAnalysis = false; metadataDirty = true; try? save()
                    throw error
                }
            }
        }
        if action == "redact" || action == "shareRedacted" {
            let sharing = action == "shareRedacted"
            let result = try await redact(id: call.getString("id") ?? "", person: call.getString("person") ?? "",
                size: sharing ? 3072 : min(3072, max(256, call.getInt("size") ?? 1400)),
                style: call.getString("style") == "eyes" ? "eyes" : "oval", refresh: call.getBool("refresh") == true)
            guard sharing else { return result }
            guard let path = result["path"] as? String else { throw Failure.stale }
            let file = FileManager.default.temporaryDirectory.appendingPathComponent("CocoWash-\(UUID().uuidString).jpg")
            try FileManager.default.copyItem(at: URL(fileURLWithPath: path), to: file)
            return ["path": file.path]
        }
        if action == "portrait" { return try await portrait(id:call.getString("face") ?? "",person:call.getString("person") ?? "") }
        if action == "person" {
            let person = store.graph.canonical(call.getString("person") ?? "")
            let publishedIDs = Set(publication.filter { store.graph.canonical($0.id) == person }.flatMap(\.photos))
            let entries = store.entries.filter { publishedIDs.contains($0.key) && $0.value.faces.contains { group($0) == person } }
            let ids = entries.keys.sorted()
            let offset = max(0, call.getInt("offset") ?? 0)
            return ["ids": ids, "items": Array(ids.dropFirst(offset).prefix(30)).map { id -> [String: Any] in
                ["id": id, "faces": entries[id]!.faces.filter { group($0) == person }.map { ["id": $0.id, "box": $0.box] as [String: Any] }]
            }]
        }
        if action == "correct" {
            guard !scanning, !refreshing else { throw Failure.stale }
            generation += 1
            let previous = store, previousDirty = dirtyEntries; var committed = false
            defer { if !committed { store = previous; dirtyEntries = previousDirty } }
            let person = store.graph.canonical(call.getString("person") ?? ""), operation = call.getString("operation") ?? ""
            let ids = Set(call.getArray("ids", String.self) ?? [])
            let selectedFaces = Set(call.getArray("faces", String.self) ?? [])
            let faces = store.entries.filter { ids.contains($0.key) || !selectedFaces.isEmpty }.values.flatMap { $0.faces }.filter { group($0) == person && (selectedFaces.isEmpty || selectedFaces.contains($0.id)) }
            guard store.names[person] != nil else { throw Failure.invalid }
            if operation == "rename", let name = call.getString("name"), !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { store.names[person] = String(name.prefix(60)) }
            if operation == "exclude" { store.excluded.formUnion(faces.map(\.id)) }
            if operation == "split", !faces.isEmpty { store.ordinal += 1; let target = UUID().uuidString; store.names[target] = "Persona \(store.ordinal)"; store.graph.separate(person,target); for face in faces { store.overrides[face.id] = target } }
            if operation == "merge", let requested = call.getString("target") {
                let target = store.graph.canonical(requested)
                guard target != person, store.names[target] != nil else { throw Failure.invalid }
                if !PeopleIdentityGraph.isNamed(target,names:store.names), PeopleIdentityGraph.isNamed(person,names:store.names) { store.names[target] = store.names[person] }
                store.graph.merge(person,into:target); store.graph.compress()
            }
            metadataDirty = true; if operation != "rename" { store.protectionRevision += 1 }; reconcileSamples = []; reconcileQueue = []
            try publish(allowed:Set(publication.flatMap(\.photos))); committed = true
        }
        return snapshot(includeGroups:call.getInt("sinceRevision") != store.revision)
    }
}
#endif

#if canImport(MetricKit)
/// On-device MetricKit summaries for the local People report. iOS delivers
/// these to the app itself; nothing is uploaded. Only exit/exception types,
/// signal codes and binary frame offsets are kept: no messages or user data.
final class PeopleSystemReports: NSObject, MXMetricManagerSubscriber {
    static let shared = PeopleSystemReports()
    private var started = false
    func start() {
        guard !started else { return }
        started = true
        MXMetricManager.shared.add(self)
        receive(MXMetricManager.shared.pastDiagnosticPayloads)
    }
    func didReceive(_ payloads: [MXDiagnosticPayload]) { receive(payloads) }
    func didReceive(_ payloads: [MXMetricPayload]) {
        for payload in payloads {
            guard let exits = payload.applicationExitMetrics else { continue }
            let f = exits.foregroundExitData, b = exits.backgroundExitData
            let build = payload.metaData?.applicationBuildVersion ?? "?"
            PeopleTrace.shared.exits("build \(build), \(Self.day(payload.timeStampBegin))–\(Self.day(payload.timeStampEnd)) · primer plano: normal \(f.cumulativeNormalAppExitCount), límite de memoria \(f.cumulativeMemoryResourceLimitExitCount), watchdog \(f.cumulativeAppWatchdogExitCount), acceso inválido \(f.cumulativeBadAccessExitCount), instrucción ilegal \(f.cumulativeIllegalInstructionExitCount), anormal \(f.cumulativeAbnormalExitCount) · segundo plano: presión de memoria \(b.cumulativeMemoryPressureExitCount), límite de memoria \(b.cumulativeMemoryResourceLimitExitCount), watchdog \(b.cumulativeAppWatchdogExitCount), archivo bloqueado \(b.cumulativeSuspendedWithLockedFileExitCount)")
        }
    }
    private func receive(_ payloads: [MXDiagnosticPayload]) {
        for payload in payloads {
            for crash in payload.crashDiagnostics ?? [] {
                var parts = ["cierre \(Self.day(payload.timeStampEnd))", "build \(crash.metaData.applicationBuildVersion)"]
                if let value = crash.exceptionType { parts.append("excepción \(value)") }
                if let value = crash.exceptionCode { parts.append("código \(value)") }
                if let value = crash.signal { parts.append("señal \(value)") }
                if let value = crash.terminationReason { parts.append("motivo \(String(value.prefix(160)))") }
                if #available(iOS 17.0, *), let reason = crash.exceptionReason { parts.append("ObjC \(reason.exceptionName)/\(reason.className)") }
                let frames = Self.frames(crash.callStackTree.jsonRepresentation())
                if !frames.isEmpty { parts.append("pila " + frames.joined(separator:" < ")) }
                PeopleTrace.shared.system(parts.joined(separator:" · "))
            }
            for hang in payload.hangDiagnostics ?? [] {
                let frames = Self.frames(hang.callStackTree.jsonRepresentation())
                PeopleTrace.shared.system("bloqueo \(Self.day(payload.timeStampEnd)) · build \(hang.metaData.applicationBuildVersion) · duración \(hang.hangDuration)" + (frames.isEmpty ? "" : " · pila " + frames.joined(separator:" < ")))
            }
        }
    }
    private static func day(_ date: Date) -> String {
        let format = ISO8601DateFormatter(); format.formatOptions = [.withInternetDateTime]; return format.string(from:date)
    }
    /// First frames of the attributed thread as binary+offset only.
    private static func frames(_ data: Data) -> [String] {
        guard let root = try? JSONSerialization.jsonObject(with:data) as? [String:Any],
              let stacks = root["callStacks"] as? [[String:Any]] else { return [] }
        let stack = stacks.first { ($0["threadAttributed"] as? Bool) == true } ?? stacks.first
        var frame = (stack?["callStackRootFrames"] as? [[String:Any]])?.first, result: [String] = []
        while let value = frame, result.count < 14 {
            let name = (value["binaryName"] as? String) ?? "?"
            let offset = (value["offsetIntoBinaryTextSegment"] as? NSNumber)?.intValue ?? 0
            result.append("\(name)+0x\(String(offset,radix:16))")
            frame = (value["subFrames"] as? [[String:Any]])?.first
        }
        return result
    }
}
#endif
