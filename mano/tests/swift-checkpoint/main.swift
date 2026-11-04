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
}
print("PEOPLE_CHECKPOINT_OK: 50000 synthetic records, incremental update/delete, reopen and bound identifiers; not a face performance benchmark")
