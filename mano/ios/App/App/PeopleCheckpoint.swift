import Foundation
import SQLite3

/// System SQLite, no dependency. Incremental durable checkpoints; no complete
/// 50,000-item JSON rewrite after each four-image batch.
final class PeopleCheckpoint {
    private var db: OpaquePointer?
    private let transient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)
    private enum Failure: Error { case sqlite }
    init(_ url: URL) throws {
        guard sqlite3_open(url.path, &db) == SQLITE_OK else { throw Failure.sqlite }
        try execute("PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY, value BLOB NOT NULL); CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY CHECK(id=1), value BLOB NOT NULL);")
        #if os(iOS)
        try FileManager.default.setAttributes([.protectionKey: FileProtectionType.complete], ofItemAtPath: url.path)
        #endif
    }
    deinit { sqlite3_close(db) }
    private func execute(_ sql: String) throws { guard sqlite3_exec(db, sql, nil, nil, nil) == SQLITE_OK else { throw Failure.sqlite } }
    /// Consistent online backup before the first v2 write. The v1 index remains
    /// recoverable even if migration or a later transaction is interrupted.
    func backup(to url: URL) throws {
        var destination: OpaquePointer?
        guard sqlite3_open(url.path,&destination) == SQLITE_OK else { sqlite3_close(destination); throw Failure.sqlite }
        defer { sqlite3_close(destination) }
        guard let copy = sqlite3_backup_init(destination,"main",db,"main") else { throw Failure.sqlite }
        let result = sqlite3_backup_step(copy,-1), finish = sqlite3_backup_finish(copy)
        guard result == SQLITE_DONE, finish == SQLITE_OK else { throw Failure.sqlite }
    }
    func readPublication() throws -> [(String,Data)] {
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(db,"SELECT name FROM sqlite_master WHERE type='table' AND name='public_groups'",-1,&statement,nil) == SQLITE_OK else { throw Failure.sqlite }
        let exists = sqlite3_step(statement) == SQLITE_ROW; sqlite3_finalize(statement)
        if !exists { return [] }
        guard sqlite3_prepare_v2(db,"SELECT id,value FROM public_groups ORDER BY id",-1,&statement,nil) == SQLITE_OK else { throw Failure.sqlite }
        defer { sqlite3_finalize(statement) }
        var rows: [(String,Data)] = [], step = sqlite3_step(statement)
        while step == SQLITE_ROW {
            guard let id = sqlite3_column_text(statement,0), let value = sqlite3_column_blob(statement,1) else { throw Failure.sqlite }
            rows.append((String(cString:id),Data(bytes:value,count:Int(sqlite3_column_bytes(statement,1))))); step = sqlite3_step(statement)
        }
        guard step == SQLITE_DONE else { throw Failure.sqlite }; return rows
    }
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
    func write(meta: Data, rows: [(String, Data?)], publication: [(String,Data)]? = nil) throws {
        try execute("BEGIN IMMEDIATE")
        do {
            if let publication {
                try execute("CREATE TABLE IF NOT EXISTS public_groups(id TEXT PRIMARY KEY,value BLOB NOT NULL); DELETE FROM public_groups;")
                var insert: OpaquePointer?
                guard sqlite3_prepare_v2(db,"INSERT INTO public_groups(id,value) VALUES(?,?)",-1,&insert,nil) == SQLITE_OK else { throw Failure.sqlite }
                defer { sqlite3_finalize(insert) }
                for (id,data) in publication {
                    sqlite3_reset(insert); sqlite3_clear_bindings(insert)
                    guard sqlite3_bind_text(insert,1,id,-1,transient) == SQLITE_OK else { throw Failure.sqlite }
                    let result = data.withUnsafeBytes { sqlite3_bind_blob(insert,2,$0.baseAddress,Int32($0.count),transient) }
                    guard result == SQLITE_OK, sqlite3_step(insert) == SQLITE_DONE else { throw Failure.sqlite }
                }
            }
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
