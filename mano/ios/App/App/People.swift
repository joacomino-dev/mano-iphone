import Foundation
import Capacitor
import Photos
import UIKit
import CoreImage
import CryptoKit
import SQLite3
#if canImport(MediaIntelligence)
import MediaIntelligence
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
    public override func load() { PHPhotoLibrary.shared().register(self) }
    deinit { PHPhotoLibrary.shared().unregisterChangeObserver(self) }
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
        #if canImport(MediaIntelligence) && !targetEnvironment(simulator)
        if #available(iOS 27.0, *) {
            Task {
                do { call.resolve(try await PeopleIndex.shared.command(call)) }
                catch { call.reject("No se pudo completar Personas. Puedes reintentar o eliminar el índice local.", "PEOPLE_UNAVAILABLE") }
            }
            return
        }
        #endif
        call.resolve(["available": false, "reason": "Requiere iOS 27, SDK compatible y un dispositivo físico con Media Intelligence disponible."])
    }
}

#if canImport(MediaIntelligence) && !targetEnvironment(simulator)
/// System SQLite, no dependency. Incremental durable checkpoints; no complete
/// 50,000-item JSON rewrite after each four-image batch.
private final class PeopleCheckpoint {
    private var db: OpaquePointer?
    private let transient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)
    private enum Failure: Error { case sqlite }
    init(_ url: URL) throws {
        guard sqlite3_open(url.path, &db) == SQLITE_OK else { throw Failure.sqlite }
        try execute("PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY, value BLOB NOT NULL); CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY CHECK(id=1), value BLOB NOT NULL);")
        try FileManager.default.setAttributes([.protectionKey: FileProtectionType.complete], ofItemAtPath: url.path)
    }
    deinit { sqlite3_close(db) }
    private func execute(_ sql: String) throws { guard sqlite3_exec(db, sql, nil, nil, nil) == SQLITE_OK else { throw Failure.sqlite } }
    func read() throws -> (Data?, [(String, Data)]) {
        var meta: Data?, rows: [(String, Data)] = []
        for table in ["settings", "records"] {
            var statement: OpaquePointer?
            guard sqlite3_prepare_v2(db, "SELECT id,value FROM \(table)", -1, &statement, nil) == SQLITE_OK else { throw Failure.sqlite }
            defer { sqlite3_finalize(statement) }
            var step = sqlite3_step(statement)
            while step == SQLITE_ROW {
                guard let bytes = sqlite3_column_blob(statement, 1) else { throw Failure.sqlite }
                let data = Data(bytes: bytes, count: Int(sqlite3_column_bytes(statement, 1)))
                if table == "settings" { meta = data }
                else if let id = sqlite3_column_text(statement, 0) { rows.append((String(cString: id), data)) }
                step = sqlite3_step(statement)
            }
            guard step == SQLITE_DONE else { throw Failure.sqlite }
        }
        return (meta, rows)
    }
    func write(meta: Data, rows: [(String, Data?)]) throws {
        try execute("BEGIN IMMEDIATE")
        do {
            for (id, data) in rows {
                var statement: OpaquePointer?
                let sql = data == nil ? "DELETE FROM records WHERE id=?" : "INSERT OR REPLACE INTO records(id,value) VALUES(?,?)"
                guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else { throw Failure.sqlite }
                defer { sqlite3_finalize(statement) }
                guard sqlite3_bind_text(statement, 1, id, -1, transient) == SQLITE_OK else { throw Failure.sqlite }
                if let data { let result = data.withUnsafeBytes { sqlite3_bind_blob(statement, 2, $0.baseAddress, Int32($0.count), transient) }; guard result == SQLITE_OK else { throw Failure.sqlite } }
                guard sqlite3_step(statement) == SQLITE_DONE else { throw Failure.sqlite }
            }
            var statement: OpaquePointer?
            guard sqlite3_prepare_v2(db, "INSERT OR REPLACE INTO settings(id,value) VALUES(1,?)", -1, &statement, nil) == SQLITE_OK else { throw Failure.sqlite }
            defer { sqlite3_finalize(statement) }
            let result = meta.withUnsafeBytes { sqlite3_bind_blob(statement, 1, $0.baseAddress, Int32($0.count), transient) }
            guard result == SQLITE_OK, sqlite3_step(statement) == SQLITE_DONE else { throw Failure.sqlite }
            try execute("COMMIT")
        } catch { try? execute("ROLLBACK"); throw error }
    }
}

@available(iOS 27.0, *)
private actor PeopleIndex {
    static let shared = PeopleIndex()
    private struct Face: Codable, Equatable {
        var id: String; var entity: String; var box: [Double]
    }
    private struct Entry: Codable { var signature: String; var faces: [Face] }
    private struct Store: Codable {
        var consent = false
        var entries: [String: Entry] = [:]
        var entities: [String: String] = [:]
        var names: [String: String] = [:]
        var overrides: [String: String] = [:]
        var excluded: Set<String> = []
        var ordinal = 0
    }
    private let folder = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("CocoPeople", isDirectory: true)
    private var analyzer: FaceGroupAnalyzer?
    private var checkpoint: PeopleCheckpoint?
    private var dirtyEntries = Set<String>()
    private var work: Task<Void, Error>?
    private var store = Store(), loaded = false, running = false, scanning = false
    private var generation = 0
    private var assets: [String: PHAsset] = [:], pending: [String] = [], deferred: Set<String> = []
    private var sinceGrouping = 0
    private var refreshing = false
    private var total = 0
    private var blocked = ""
    private var protectionRevision = 0, needsRefresh = false
    private var activeImage: PHImageRequestID?
    private let manager = PHImageManager()
    private let ci = CIContext(options: [.cacheIntermediates: false])
    private var memoryPauseUntil = Date.distantPast
    private var memoryObserver: NSObjectProtocol?
    private enum Failure: Error { case unavailable, stale, invalid }

    private func open() throws {
        guard !loaded else { return }
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true, attributes: [.protectionKey: FileProtectionType.complete])
        var url = folder; var flags = URLResourceValues(); flags.isExcludedFromBackup = true; try url.setResourceValues(flags)
        let database = try PeopleCheckpoint(folder.appendingPathComponent("index.sqlite"))
        let (meta, rows) = try database.read()
        if let meta { store = try JSONDecoder().decode(Store.self, from: meta) }
        for (id, data) in rows { store.entries[id] = try JSONDecoder().decode(Entry.self, from: data) }
        checkpoint = database
        // Interrupted transient inputs never become a permanent photo cache.
        for file in try FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: nil) where file.lastPathComponent.hasPrefix("input-") { try? FileManager.default.removeItem(at: file) }
        let work = folder.appendingPathComponent("Analyzer", isDirectory: true)
        try FileManager.default.createDirectory(at: work, withIntermediateDirectories: true, attributes: [.protectionKey: FileProtectionType.complete])
        analyzer = try FaceGroupAnalyzer(workingDirectory: work)
        memoryObserver = NotificationCenter.default.addObserver(forName: UIApplication.didReceiveMemoryWarningNotification, object: nil, queue: nil) { _ in
            Task { await PeopleIndex.shared.memoryWarning() }
        }
        loaded = true
    }
    private func memoryWarning() { memoryPauseUntil = Date().addingTimeInterval(30); generation += 1; ci.clearCaches() }
    func libraryChanged() -> Bool {
        guard loaded, store.consent else { return false }
        needsRefresh = true; generation += 1; work?.cancel()
        return true
    }
    private func save() throws {
        var meta = store; meta.entries = [:]
        let rows = try dirtyEntries.map { id -> (String, Data?) in (id, try store.entries[id].map { try JSONEncoder().encode($0) }) }
        guard let checkpoint else { throw Failure.unavailable }
        try checkpoint.write(meta: JSONEncoder().encode(meta), rows: rows)
        dirtyEntries.removeAll()
    }
    private func signature(_ a: PHAsset) -> String { "\(a.modificationDate?.timeIntervalSince1970 ?? 0):\(a.pixelWidth):\(a.pixelHeight)" }
    private func group(_ f: Face) -> String? { store.excluded.contains(f.id) ? nil : store.overrides[f.id] ?? store.entities[f.entity] }
    private func permission() -> Bool { let p = PHPhotoLibrary.authorizationStatus(for: .readWrite); return p == .authorized || p == .limited }
    private func refresh() async throws {
        guard !scanning, !refreshing else { throw Failure.stale }
        refreshing = true; defer { refreshing = false }
        generation += 1
        let options = PHFetchOptions(); options.predicate = NSPredicate(format: "mediaType == %d AND hidden == NO", PHAssetMediaType.image.rawValue)
        var current: [String: PHAsset] = [:]
        if permission() { PHAsset.fetchAssets(with: options).enumerateObjects { a, _, _ in current[a.localIdentifier] = a } }
        let obsolete = store.entries.keys.filter { id in current[id].map { signature($0) != store.entries[id]?.signature } ?? true }
        if !obsolete.isEmpty { try await analyzer?.deleteAssets(obsolete.map { MediaIntelligenceImageAsset.ID($0) }); for id in obsolete { store.entries.removeValue(forKey: id); dirtyEntries.insert(id) } }
        assets = current; total = current.count; deferred = []
        pending = current.keys.filter { store.entries[$0] == nil }.sorted(by: >)
        let faces = Set(store.entries.values.flatMap { $0.faces.map(\.id) })
        store.excluded.formIntersection(faces); store.overrides = store.overrides.filter { faces.contains($0.key) }
        try save()
        needsRefresh = false
    }
    private func snapshot() -> [String: Any] {
        var grouped: [String: Set<String>] = [:]
        for (id, entry) in store.entries { for face in entry.faces { if let g = group(face) { grouped[g, default: []].insert(id) } } }
        let groups: [[String: Any]] = grouped.keys.sorted { (store.names[$0] ?? "") < (store.names[$1] ?? "") }.map { id in
            let ids = grouped[id]!.sorted()
            return ["id": id, "name": store.names[id] ?? "Persona", "count": ids.count, "representative": ids[0]]
        }
        return ["available": true, "consent": store.consent, "running": running, "processed": store.entries.count, "total": total,
                "waiting": deferred.count, "remaining": pending.count, "blocked": blocked, "protectionRevision": protectionRevision, "groups": groups]
    }
    private func image(_ asset: PHAsset, size: Int, tracked: Bool = false) async -> UIImage? {
        defer { if tracked { activeImage = nil } }
        return await withCheckedContinuation { continuation in
            let options = PHImageRequestOptions(); options.isNetworkAccessAllowed = false; options.deliveryMode = .highQualityFormat; options.resizeMode = .exact
            let request = manager.requestImage(for: asset, targetSize: CGSize(width: CGFloat(size), height: CGFloat(size)), contentMode: .aspectFit, options: options) { image, info in
                if (info?[PHImageResultIsDegradedKey] as? Bool) == true { return }
                continuation.resume(returning: image)
            }
            if tracked { activeImage = request }
        }
    }
    /// Normalize orientation once. Both analysis and redaction use these pixels.
    private func upright(_ source: UIImage) -> UIImage {
        let format = UIGraphicsImageRendererFormat(); format.scale = 1; format.opaque = true
        return UIGraphicsImageRenderer(size: source.size, format: format).image { _ in source.draw(in: CGRect(origin: .zero, size: source.size)) }
    }
    private func scan() async throws {
        guard running, store.consent, !scanning, !refreshing, let analyzer else { return }
        let active = await MainActor.run { UIApplication.shared.applicationState == .active }
        blocked = !active ? "foreground" : !permission() ? "permission" : CocoMediaPressure.busy ? "media" : Date() < memoryPauseUntil ? "memory" :
            (ProcessInfo.processInfo.thermalState == .nominal || ProcessInfo.processInfo.thermalState == .fair) ? "" : "thermal"
        guard blocked.isEmpty else { return }
        scanning = true; defer { scanning = false }
        let token = generation
        // One in-flight image; batches of four bound work and checkpoint latency.
        for _ in 0..<4 {
            guard running, token == generation, !Task.isCancelled, !pending.isEmpty, !CocoMediaPressure.busy else { break }
            let id = pending.removeLast()
            defer { if store.entries[id] == nil && assets[id] != nil && !deferred.contains(id) && !pending.contains(id) { pending.append(id) } }
            guard let asset = assets[id] else { continue }
            guard let source = await image(asset, size: 1024, tracked: true) else { deferred.insert(id); continue }
            guard running, token == generation else { pending.append(id); break }
            let file = folder.appendingPathComponent("input-\(UUID().uuidString).jpg")
            defer { try? FileManager.default.removeItem(at: file) }
            guard let data = autoreleasepool(invoking: { upright(source).jpegData(compressionQuality: 0.9) }) else { deferred.insert(id); continue }
            try data.write(to: file, options: [.atomic, .completeFileProtection])
            let results = try await analyzer.insertOrUpdateAssets([MediaIntelligenceImageAsset(id: .init(id), kind: .url(file))])
            for try await _ in results { }
            guard running, token == generation else { pending.append(id); break }
            store.entries[id] = Entry(signature: signature(asset), faces: []); dirtyEntries.insert(id); sinceGrouping += 1
        }
        guard running, token == generation, !Task.isCancelled, !CocoMediaPressure.busy else { try save(); return }
        if sinceGrouping < 64 && !pending.isEmpty && !store.entities.isEmpty { try save(); return }
        if await analyzer.state == .stale { try await analyzer.update() }
        guard running, token == generation else { return }
        // Reuse framework identities, never compare generic image feature prints.
        var facesByAsset: [String: [Face]] = [:]
        for try await (entity, faces) in analyzer.allFacesByEntityID {
            let entityKey = entity.rawValue
            if store.entities[entityKey] == nil { store.ordinal += 1; let id = UUID().uuidString; store.entities[entityKey] = id; store.names[id] = "Persona \(store.ordinal)" }
            for f in faces {
                let id = f.assetID.rawValue
                guard store.entries[id] != nil else { continue }
                let b = f.bounds
                guard b.minX.isFinite, b.minY.isFinite, b.width > 0, b.height > 0, b.minX >= 0, b.minY >= 0, b.maxX <= 1, b.maxY <= 1 else { continue }
                facesByAsset[id, default: []].append(Face(id: f.id.rawValue, entity: entityKey, box: [Double(b.minX),Double(b.minY),Double(b.width),Double(b.height)]))
            }
        }
        for id in Array(store.entries.keys) {
            let faces = (facesByAsset[id] ?? []).sorted { $0.id < $1.id }
            if store.entries[id]?.faces != faces {
                if !(store.entries[id]?.faces.isEmpty ?? true) { protectionRevision += 1 }
                store.entries[id]?.faces = faces; dirtyEntries.insert(id)
            }
        }
        sinceGrouping = 0
        if pending.isEmpty { running = false }
        try save()
    }
    private func redact(id: String, person: String, size: Int) async throws -> [String: Any] {
        guard store.consent, permission(), let entry = store.entries[id] else { throw Failure.stale }
        let fetched = PHAsset.fetchAssets(withLocalIdentifiers: [id], options: nil)
        guard let asset = fetched.firstObject, !asset.isHidden, signature(asset) == entry.signature else { throw Failure.stale }
        let faces = entry.faces.filter { group($0) == person }
        guard !faces.isEmpty else { throw Failure.stale }
        let token = generation
        guard let source = await image(asset, size: size), token == generation else { throw Failure.stale }
        guard permission(), let current = PHAsset.fetchAssets(withLocalIdentifiers: [id], options: nil).firstObject,
              !current.isHidden, signature(current) == entry.signature else { throw Failure.stale }
        let up = upright(source); guard let cg = up.cgImage else { throw Failure.invalid }
        let input = CIImage(cgImage: cg)
        let blurred = input.clampedToExtent().applyingFilter("CIGaussianBlur", parameters: [kCIInputRadiusKey: max(24, max(up.size.width,up.size.height) * 0.045)])
        guard let blurredCG = ci.createCGImage(blurred, from: input.extent) else { throw Failure.invalid }
        let blur = UIImage(cgImage: blurredCG)
        let format = UIGraphicsImageRendererFormat(); format.scale = 1; format.opaque = true
        let masks = faces.compactMap { PeopleGeometry.mask($0.box, width: Double(up.size.width), height: Double(up.size.height)) }
        guard masks.count == faces.count else { throw Failure.invalid }
        let output = UIGraphicsImageRenderer(size: up.size, format: format).image { ctx in
            let full = CGRect(origin: .zero, size: up.size); up.draw(in: full)
            for box in masks {
                ctx.cgContext.saveGState(); ctx.cgContext.clip(to: box); blur.draw(in: full); ctx.cgContext.restoreGState()
            }
        }
        guard token == generation, let data = output.jpegData(compressionQuality: 0.88) else { throw Failure.stale }
        let cache = folder.appendingPathComponent("Redacted", isDirectory: true)
        try FileManager.default.createDirectory(at: cache, withIntermediateDirectories: true, attributes: [.protectionKey: FileProtectionType.complete])
        let key = SHA256.hash(data: Data("\(id):\(entry.signature):\(person):\(generation):\(size)".utf8)).map { String(format: "%02x", $0) }.joined()
        let file = cache.appendingPathComponent(key + ".jpg")
        try data.write(to: file, options: [.atomic, .completeFileProtection])
        let files = try FileManager.default.contentsOfDirectory(at: cache, includingPropertiesForKeys: [.contentModificationDateKey]).sorted { ((try? $0.resourceValues(forKeys: [.contentModificationDateKey]))?.contentModificationDate ?? .distantPast) > ((try? $1.resourceValues(forKeys: [.contentModificationDateKey]))?.contentModificationDate ?? .distantPast) }
        var bytes = 0
        for (index, cached) in files.enumerated() {
            bytes += (try? cached.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
            if index >= 24 || bytes > 32 * 1024 * 1024 { if cached != file { try? FileManager.default.removeItem(at: cached) } }
        }
        return ["path": file.path]
    }
    func command(_ call: CAPPluginCall) async throws -> [String: Any] {
        let action = call.getString("action") ?? "status"
        try open()
        if needsRefresh && !scanning && !refreshing && ["scan", "person", "redact"].contains(action) { try await refresh() }
        if action == "yield" { generation += 1; work?.cancel(); if let request = activeImage { manager.cancelImageRequest(request) }; return ["available": true] }
        if action == "pause" { running = false; generation += 1; work?.cancel(); if let request = activeImage { manager.cancelImageRequest(request) }; try save(); return snapshot() }
        if action == "reset" {
            guard !scanning, !refreshing else { running = false; generation += 1; throw Failure.stale }
            running = false; generation += 1; analyzer = nil; checkpoint = nil; dirtyEntries.removeAll()
            try await FaceGroupAnalyzer.purge(workingDirectory: folder.appendingPathComponent("Analyzer"))
            try FileManager.default.removeItem(at: folder); store = Store(); loaded = false
            if let observer = memoryObserver { NotificationCenter.default.removeObserver(observer); memoryObserver = nil }
            return ["available": true, "consent": false, "groups": [], "processed": 0, "total": 0, "remaining": 0, "waiting": 0, "running": false]
        }
        if action == "status", store.consent { try await refresh() }
        if action == "consent" { store.consent = true; try save(); try await refresh(); running = true }
        if action == "refresh", store.consent { try await refresh() }
        if action == "resume", store.consent { if pending.isEmpty { try await refresh() }; running = true }
        if action == "scan" {
            guard work == nil else { return snapshot() }
            let task = Task { try await self.scan() }; work = task
            defer { work = nil }
            do { try await task.value } catch { if running && !task.isCancelled { throw error } }
        }
        if action == "redact" { return try await redact(id: call.getString("id") ?? "", person: call.getString("person") ?? "", size: min(3072,max(256,call.getInt("size") ?? 1400))) }
        if action == "person" {
            let person = call.getString("person") ?? ""
            let entries = store.entries.filter { $0.value.faces.contains { group($0) == person } }
            let ids = entries.keys.sorted()
            let offset = max(0, call.getInt("offset") ?? 0)
            return ["ids": ids, "items": Array(ids.dropFirst(offset).prefix(30)).map { id -> [String: Any] in
                ["id": id, "faces": entries[id]!.faces.filter { group($0) == person }.map { ["id": $0.id, "box": $0.box] as [String: Any] }]
            }]
        }
        if action == "correct" {
            guard !scanning, !refreshing else { throw Failure.stale }
            generation += 1
            let person = call.getString("person") ?? "", operation = call.getString("operation") ?? ""
            let ids = Set(call.getArray("ids", String.self) ?? [])
            let selectedFaces = Set(call.getArray("faces", String.self) ?? [])
            let faces = store.entries.filter { ids.contains($0.key) || !selectedFaces.isEmpty }.values.flatMap { $0.faces }.filter { group($0) == person && (selectedFaces.isEmpty || selectedFaces.contains($0.id)) }
            if operation == "rename", let name = call.getString("name"), !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { store.names[person] = String(name.prefix(60)) }
            if operation == "exclude" { store.excluded.formUnion(faces.map(\.id)) }
            if operation == "split", !faces.isEmpty { store.ordinal += 1; let target = UUID().uuidString; store.names[target] = "Persona \(store.ordinal)"; for face in faces { store.overrides[face.id] = target } }
            if operation == "merge", let target = call.getString("target"), target != person, store.names[target] != nil {
                for entry in store.entries.values { for face in entry.faces where group(face) == person { store.overrides[face.id] = target } }
            }
            if ["exclude", "split", "merge"].contains(operation) { protectionRevision += 1 }
            try save()
        }
        return snapshot()
    }
}
#endif
