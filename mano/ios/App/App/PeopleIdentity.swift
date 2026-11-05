import Foundation

enum PeoplePolicy {
    static let minimumPhotos = 5
    static let representatives = 4
    static let batch = 4
    static let minimumMergeEvidence = 2
    static let mergeAgreement = 0.75
    static let indexPixels = 1536
    static let geometryVersion = 1
}

struct IdentitySample: Equatable {
    let face: String
    let photo: String
    let person: String
}

/// Logical IDs outlive opaque framework entities. Evidence is a count of
/// independent photographs, never a claimed model confidence probability.
struct PeopleIdentityGraph: Codable, Equatable {
    var aliases: [String: String] = [:]
    var barriers: Set<String> = []
    func canonical(_ id: String) -> String {
        var value = id, seen = Set<String>()
        while let next = aliases[value], next != value, seen.insert(value).inserted { value = next }
        return value
    }
    static func pair(_ a: String, _ b: String) -> String { [a,b].sorted().joined(separator: "|") }
    mutating func separate(_ a: String, _ b: String) { barriers.insert(Self.pair(canonical(a),canonical(b))) }
    func separated(_ a: String, _ b: String) -> Bool {
        let x = canonical(a), y = canonical(b)
        return barriers.contains { key in
            let ids = key.split(separator: "|", omittingEmptySubsequences: false).map(String.init)
            return ids.count == 2 && Set([canonical(ids[0]),canonical(ids[1])]) == Set([x,y])
        }
    }
    mutating func merge(_ source: String, into target: String) {
        let a = canonical(source), b = canonical(target)
        guard a != b else { return }; aliases[a] = b
        for id in Array(aliases.keys) { aliases[id] = canonical(id) }
    }
    static func isNamed(_ id: String, names: [String:String]) -> Bool {
        guard let name = names[id] else { return false }
        return name.range(of: "^Persona [0-9]+$", options: .regularExpression) == nil
    }
    /// One global model assignment per representative. A group must agree on
    /// one cluster with >=2 distinct photos and >=75% of its representatives.
    /// No pairwise image matrix, single-link bridges or irreversible renaming.
    mutating func reconcile(samples: [IdentitySample], assignments: [String:String], photos: [String:Set<String>], names: [String:String]) -> Int {
        var totals: [String:Set<String>] = [:], votes: [String:[String:Set<String>]] = [:]
        for s in samples {
            let person = canonical(s.person); totals[person,default:[]].insert(s.photo)
            if let entity = assignments[s.face] { votes[person,default:[:]][entity,default:[]].insert(s.photo) }
        }
        var candidates: [String:[String]] = [:]
        for (person, entities) in votes {
            let total = totals[person]?.count ?? 0
            let winners = entities.filter { $0.value.count >= PeoplePolicy.minimumMergeEvidence && Double($0.value.count) / Double(max(1,total)) >= PeoplePolicy.mergeAgreement }
            if winners.count == 1, let entity = winners.first?.key { candidates[entity,default:[]].append(person) }
        }
        var membership: [String:Set<String>] = [:]
        for (person, ids) in photos { membership[canonical(person),default:[]].formUnion(ids) }
        var merges = 0
        for entity in candidates.keys.sorted() {
            let ids = candidates[entity]!.sorted { a,b in
                let x = Self.isNamed(a,names:names), y = Self.isNamed(b,names:names)
                return x != y ? x : a < b
            }
            guard let first = ids.first else { continue }
            let target = canonical(first)
            for other in ids.dropFirst() {
                let source = canonical(other)
                guard source != target, !separated(source,target) else { continue }
                // Different faces in one original photo are a hard cannot-link.
                guard (membership[source] ?? []).isDisjoint(with: membership[target] ?? []) else { continue }
                if Self.isNamed(source,names:names) && Self.isNamed(target,names:names) && names[source] != names[target] { continue }
                merge(source,into:target); membership[target,default:[]].formUnion(membership[source] ?? []); merges += 1
            }
        }
        return merges
    }
}

struct PeopleRefinement: Codable, Equatable {
    var version: Int
    var box: [Double]
    var eyes: [[Double]]?
    var angle: Double
}
struct PeopleFace: Codable, Equatable {
    var id: String
    var entity: String
    var box: [Double]
    var person: String?
    var ambiguous: Bool?
    var refinement: PeopleRefinement?
    var sampleStamp: String?
}
struct PeopleEntry: Codable { var signature: String; var faces: [PeopleFace] }
struct PeoplePortrait: Codable, Equatable { var id: String; var face: String }
struct PublishedPerson: Codable, Equatable {
    var id: String; var name: String; var photos: [String]; var portraits: [PeoplePortrait]
}
struct PeopleState: Codable {
    var consent = false
    var entries: [String:PeopleEntry] = [:]
    var entities: [String:String] = [:]
    var names: [String:String] = [:]
    var overrides: [String:String] = [:]
    var excluded: Set<String> = []
    var ordinal = 0
    var schema = 2
    var graph = PeopleIdentityGraph()
    var publicReady = false
    var revision = 0
    var protectionRevision = 0
    /// Defaults migrate v1 metadata without resetting IDs, names or corrections.
    static func decode(_ data: Data) throws -> PeopleState {
        guard var defaults = try JSONSerialization.jsonObject(with: JSONEncoder().encode(PeopleState())) as? [String:Any],
              let legacy = try JSONSerialization.jsonObject(with:data) as? [String:Any] else {
            throw DecodingError.dataCorrupted(.init(codingPath:[],debugDescription:"Invalid facial metadata"))
        }
        defaults.merge(legacy) { _,old in old }
        return try JSONDecoder().decode(PeopleState.self,from:JSONSerialization.data(withJSONObject:defaults))
    }
    func group(_ face: PeopleFace) -> String? {
        guard !excluded.contains(face.id) else { return nil }
        if let id = overrides[face.id] { return graph.canonical(id) }
        guard face.ambiguous != true, let id = face.person ?? entities[face.entity] else { return nil }
        return graph.canonical(id)
    }
    func membership() -> [String:Set<String>] {
        var result: [String:Set<String>] = [:]
        for (id,entry) in entries { for face in entry.faces { if let person = group(face) { result[person,default:[]].insert(id) } } }
        return result
    }
    /// Preserve the same logical person when Apple's entity label changes.
    /// A previously corrected face always wins over any automatic entity label.
    mutating func assign(_ faces: [(photo:String, face:PeopleFace)]) {
        let previous = Dictionary(entries.values.flatMap { $0.faces }.map { ($0.id,$0) }, uniquingKeysWith: { a,_ in a })
        let previousOwners = previous.mapValues { group($0) }
        var byEntity: [String:[(String,PeopleFace)]] = [:]
        for item in faces { byEntity[item.face.entity,default:[]].append((item.photo,item.face)) }
        var replacements: [String:[PeopleFace]] = [:]
        for (entity, items) in byEntity {
            let owners = Set(items.compactMap { previousOwners[$0.1.id] ?? nil })
            let owner: String?
            if owners.count == 1 { owner = owners.first }
            else if owners.isEmpty {
                if let existing = entities[entity] { owner = graph.canonical(existing) }
                else { ordinal += 1; let id = UUID().uuidString; names[id] = "Persona \(ordinal)"; owner = id }
            } else { owner = nil } // ambiguous bridge: do not force new faces
            if let owner { entities[entity] = owner }
            for (photo,newFace) in items {
                var face = newFace
                if let old = previous[face.id] {
                    face.person = previousOwners[face.id] ?? nil; face.ambiguous = face.person == nil
                    face.refinement = old.box == face.box ? old.refinement : nil
                    face.sampleStamp = old.box == face.box ? old.sampleStamp : nil
                } else { face.person = owner; face.ambiguous = owner == nil }
                replacements[photo,default:[]].append(face)
            }
        }
        for id in Array(entries.keys) { entries[id]?.faces = (replacements[id] ?? []).sorted { $0.id < $1.id } }
    }
}
