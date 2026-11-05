import Foundation

func require(_ value: Bool, _ message: String) { if !value { fatalError(message) } }
let folder = FileManager.default.temporaryDirectory.appendingPathComponent("cocowash-checkpoint-test-" + UUID().uuidString)
try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
defer { try? FileManager.default.removeItem(at: folder) }
let file = folder.appendingPathComponent("index.sqlite")
let payload = Data("synthetic-face-metadata-no-photographs".utf8)
do {
    let db = try PeopleCheckpoint(file)
    try db.write(meta: Data("consent".utf8), rows: (0..<50_000).map { ("synthetic-\($0)", payload) })
    let (meta, rows) = try db.read()
    require(meta == Data("consent".utf8) && rows.count == 50_000, "Persist 50,000 metadata rows")
    // Update one, delete one, safely bind an identifier containing a quote.
    try db.write(meta: Data("paused".utf8), rows: [("synthetic-1", nil),("synthetic-2",Data("changed".utf8)),("quote' ; DROP TABLE records; --",payload)])
}
do {
    let reopened = try PeopleCheckpoint(file)
    let (meta, rows) = try reopened.read(), values = Dictionary(uniqueKeysWithValues: rows)
    require(meta == Data("paused".utf8) && values.count == 50_000, "Resume metadata and decisions atomically")
    require(values["synthetic-1"] == nil && values["synthetic-2"] == Data("changed".utf8), "Update and obsolete reference deletion persist")
    require(values["synthetic-3"] == payload && values["quote' ; DROP TABLE records; --"] == payload, "Unrelated records and bound values remain intact")
    let backup = folder.appendingPathComponent("before-migration.sqlite")
    try reopened.backup(to:backup)
    try reopened.write(meta:Data("v2".utf8),rows:[],publication:[("one",Data("stable-publication".utf8))],scope:["photo-at-cycle-start"])
    try reopened.write(meta:nil,rows:[("synthetic-2",payload)])
    require(try reopened.readScope() == ["photo-at-cycle-start"],"Finite cycle scope survives durable checkpoints")
    do {
        try reopened.write(meta:Data("broken-partial".utf8),rows:[("new-invalid-cycle",payload)],publication:[("duplicate",payload),("duplicate",payload)],scope:["must-not-leak"])
        fatalError("Conflicting publication committed")
    } catch { }
    let (valid,after) = try reopened.read(), published = try reopened.readPublication()
    require(valid == Data("v2".utf8) && after.count == 50_000 && published.count == 1 && published[0].0 == "one","A failed publication is fully rolled back")
    require(try reopened.readScope() == ["photo-at-cycle-start"],"Scope and public snapshot roll back together")
    let original = try PeopleCheckpoint(backup).read()
    require(original.0 == Data("paused".utf8) && original.1.count == 50_000,"Pre-migration backup remains recoverable")
}
print("PEOPLE_CHECKPOINT_OK: 50000 synthetic records, incremental update/delete, reopen and bound identifiers; not a face performance benchmark")
