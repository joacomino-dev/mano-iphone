import Foundation

/// 9.8 retired People and Breakup Mode. Any facial index, crops, censored
/// derivatives or phase trace left by 9.7.x builds are deleted on launch:
/// no face data stays on the phone once the feature is gone.
enum LegacyPeopleCleanup {
    static let names = ["CocoPeople", "CocoPeopleTrace"]
    @discardableResult static func run(support: URL) -> Int {
        let manager = FileManager.default
        let parent = support.standardizedFileURL.resolvingSymlinksInPath()
        var removed = 0
        for name in names {
            let target = parent.appendingPathComponent(name).standardizedFileURL
            guard target.deletingLastPathComponent() == parent, manager.fileExists(atPath: target.path) else { continue }
            if (try? manager.removeItem(at: target)) != nil { removed += 1 }
        }
        return removed
    }
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
