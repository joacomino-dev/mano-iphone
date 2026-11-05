import Foundation

/// Process-local lifecycle fence, updated synchronously by native notifications.
/// An epoch invalidates async media results even if JavaScript is suspended.
final class PeopleActivityGate: @unchecked Sendable {
    static let shared = PeopleActivityGate()
    private let lock = NSLock()
    private var foreground = false
    private var generation = 0
    private var cancellations: [UUID: () -> Void] = [:]
    var epoch: Int { lock.lock(); defer { lock.unlock() }; return generation }
    var active: Bool { lock.lock(); defer { lock.unlock() }; return foreground }
    func accepts(_ epoch: Int) -> Bool { lock.lock(); defer { lock.unlock() }; return foreground && epoch == generation }
    func activate() { lock.lock(); foreground = true; lock.unlock() }
    func suspend() {
        lock.lock(); foreground = false; generation += 1
        let callbacks = Array(cancellations.values); cancellations.removeAll(); lock.unlock()
        for cancel in callbacks { cancel() }
    }
    func register(_ id: UUID, epoch: Int, cancel: @escaping () -> Void) {
        lock.lock(); let accept = foreground && epoch == generation
        if accept { cancellations[id] = cancel }; lock.unlock()
        if !accept { cancel() }
    }
    func remove(_ id: UUID) { lock.lock(); cancellations.removeValue(forKey:id); lock.unlock() }
}

/// Explicit opt-in in development IPA only. Never touches the Photos library,
/// Documents, credentials or any path outside the two app-owned sandbox roots.
enum DevelopmentReset {
    static let key = "cocowash-development-data-build"
    static func required(enabled: Bool, current: String, previous: String?) -> Bool {
        enabled && !current.isEmpty && current != previous
    }
    static func eraseDerivedFiles(support: URL, caches: URL) throws {
        let manager = FileManager.default
        for (root, names) in [(support,["CocoPeople"]), (caches,["ManoPrints","ManoThumbnails","MemSwipeVideos","ManoSizes.json","ManoInsights.json"])] {
            let parent = root.standardizedFileURL.resolvingSymlinksInPath()
            for name in names {
                let target = parent.appendingPathComponent(name).standardizedFileURL
                guard target.deletingLastPathComponent() == parent else { throw CocoaError(.fileWriteInvalidFileName) }
                if manager.fileExists(atPath:target.path) { try manager.removeItem(at:target) }
            }
        }
    }
}
