import Foundation
#if canImport(Darwin)
import Darwin
#endif
#if os(iOS)
import os
#endif

/// Local People breadcrumbs that survive an abrupt process end.
/// Only phase names, durations, counters and memory numbers are stored:
/// no photo IDs, person names, paths, images or facial data. The file never
/// leaves the device unless the user shares the text report explicitly.
final class PeopleTrace: @unchecked Sendable {
    struct Counters: Codable, Equatable {
        var processed = 0, total = 0, pending = 0, faces = 0, persons = 0, samples = 0
    }
    struct Memory: Codable, Equatable { var footprintMB: Int; var availableMB: Int? }
    struct Event: Codable, Equatable {
        var at: Double; var phase: String; var kind: String; var seconds: Double?
        var generation: Int; var counters: Counters; var memory: Memory?
    }
    struct OpenPhase: Codable, Equatable {
        var phase: String; var started: Double; var generation: Int; var counters: Counters
        var memory: Memory?; var peakFootprintMB: Int; var minAvailableMB: Int?
        var background: Bool; var build: String
    }
    struct Abnormal: Codable, Equatable {
        var phase: String; var concurrent: [String]; var at: Double; var started: Double; var build: String
        var background: Bool; var counters: Counters; var memory: Memory?; var peakFootprintMB: Int; var minAvailableMB: Int?
    }
    /// Longest duration and memory per phase across the whole run, so slow
    /// growth (e.g. grouping time vs. index size) survives the event ring.
    struct Stat: Codable, Equatable {
        var count = 0, slow = 0
        var maxSeconds = 0.0, lastSeconds = 0.0
        var maxFootprintMB = 0, minAvailableMB: Int?
        var countersAtMax = Counters()
    }
    struct State: Codable, Equatable {
        var schema = 1
        var stats: [String: Stat] = [:]
        var open: [String: OpenPhase] = [:]
        var events: [Event] = []
        var abnormal: [Abnormal] = []
        /// Consecutive abnormal process ends while a phase was open. A normal end resets it.
        var streaks: [String: Int] = [:]
        /// Phases the user retried explicitly; one attempt each.
        var allowed: Set<String> = []
        var peakFootprintMB = 0
        var minAvailableMB: Int?
        var modelLoads = 0
        var memoryWarnings = 0
        var lowMemoryStops = 0
        var system: [String] = []
        var exits: String?
    }

    static let eventLimit = 80, abnormalLimit = 12, systemLimit = 8, guardStreak = 2
    static let shared: PeopleTrace = {
        let support = FileManager.default.urls(for:.applicationSupportDirectory,in:.userDomainMask)[0]
        let info = Bundle.main.infoDictionary ?? [:]
        let build = "\(info["CFBundleShortVersionString"] as? String ?? "?")-\(info["CFBundleVersion"] as? String ?? "?")"
        return PeopleTrace(folder:support.appendingPathComponent("CocoPeopleTrace",isDirectory:true),build:build)
    }()

    private let lock = NSLock()
    private let file: URL, openFile: URL
    private let folder: URL
    let build: String
    private let clock: () -> Double
    private let measure: () -> Memory?
    private var state = State()
    private var loaded = false
    private var lastPersist = 0.0, lastFull = 0.0
    private var launchResult: Abnormal?
    private var sampler: DispatchSourceTimer?

    init(folder: URL, build: String, clock: @escaping () -> Double = { Date().timeIntervalSince1970 }, measure: @escaping () -> Memory? = PeopleTrace.memory) {
        self.folder = folder; self.file = folder.appendingPathComponent("trace.json"); self.openFile = folder.appendingPathComponent("open.json"); self.build = build
        self.clock = clock; self.measure = measure
    }

    /// Physical footprint is what iOS compares against the app memory limit.
    static func memory() -> Memory? {
        #if canImport(Darwin)
        var info = task_vm_info_data_t()
        var count = mach_msg_type_number_t(MemoryLayout<task_vm_info_data_t>.size / MemoryLayout<integer_t>.size)
        let result = withUnsafeMutablePointer(to:&info) { pointer in
            pointer.withMemoryRebound(to:integer_t.self,capacity:Int(count)) { task_info(mach_task_self_,task_flavor_t(TASK_VM_INFO),$0,&count) }
        }
        guard result == KERN_SUCCESS else { return nil }
        var available: Int?
        #if os(iOS)
        available = Int(os_proc_available_memory() / 1_048_576)
        #endif
        return Memory(footprintMB:Int(info.phys_footprint / 1_048_576),availableMB:available)
        #else
        return nil
        #endif
    }

    // MARK: Process boundaries

    /// Call once per process before any People phase starts. Any phase still
    /// open in the file means the previous process ended inside it.
    @discardableResult func launch() -> Abnormal? {
        lock.lock(); defer { lock.unlock() }
        loadLocked()
        guard !state.open.isEmpty else { launchResult = nil; return nil }
        let ordered = state.open.values.sorted { $0.started > $1.started }
        let last = ordered[0]
        let value = Abnormal(phase:last.phase,concurrent:ordered.dropFirst().map(\.phase),at:clock(),started:last.started,build:last.build,
                             background:ordered.contains { $0.background },counters:last.counters,memory:last.memory,
                             peakFootprintMB:ordered.map(\.peakFootprintMB).max() ?? 0,minAvailableMB:ordered.compactMap(\.minAvailableMB).min())
        state.abnormal.append(value)
        if state.abnormal.count > Self.abnormalLimit { state.abnormal.removeFirst(state.abnormal.count-Self.abnormalLimit) }
        // iOS may end a suspended app at any time: that is not evidence against a phase.
        if !value.background { for phase in Set(ordered.map(\.phase)) { state.streaks[phase,default:0] += 1; state.allowed.remove(phase) } }
        state.open = [:]
        appendLocked(Event(at:clock(),phase:last.phase,kind:value.background ? "ended-in-background" : "ended-abruptly",seconds:nil,generation:last.generation,counters:last.counters,memory:last.memory))
        persistLocked(force:true)
        launchResult = value
        return value
    }
    /// Abnormal end detected at this launch, if any.
    var lastLaunch: Abnormal? { lock.lock(); defer { lock.unlock() }; return launchResult }

    // MARK: Phases

    /// quiet: per-photo phases. Their start is not added to the event ring and
    /// the full history is flushed at most every 10 s; the open marker is always written.
    func begin(_ phase: String, generation: Int = 0, counters: Counters = Counters(), quiet: Bool = false) {
        lock.lock(); defer { lock.unlock() }
        loadLocked()
        let memory = measure()
        state.open[phase] = OpenPhase(phase:phase,started:clock(),generation:generation,counters:counters,memory:memory,
                                      peakFootprintMB:memory?.footprintMB ?? 0,minAvailableMB:memory?.availableMB,background:false,build:build)
        trackLocked(memory)
        if !quiet { appendLocked(Event(at:clock(),phase:phase,kind:"start",seconds:nil,generation:generation,counters:counters,memory:memory)) }
        persistLocked(force:true,full:!quiet)
        startSamplerLocked()
    }
    /// kind: "end" (completed), "deferred" (skipped without work), "cancel"
    /// (yield/lifecycle/stale) or "fail" (thrown error).
    func end(_ phase: String, kind: String = "end", counters: Counters? = nil, quiet: Bool = false) {
        lock.lock(); defer { lock.unlock() }
        loadLocked()
        guard let open = state.open.removeValue(forKey:phase) else { return }
        let memory = measure()
        trackLocked(memory)
        let seconds = max(0,clock()-open.started)
        var stat = state.stats[phase] ?? Stat()
        stat.count += 1; stat.lastSeconds = seconds; if seconds >= 5 { stat.slow += 1 }
        if seconds > stat.maxSeconds { stat.maxSeconds = seconds; stat.countersAtMax = counters ?? open.counters }
        stat.maxFootprintMB = max(stat.maxFootprintMB,open.peakFootprintMB,memory?.footprintMB ?? 0)
        if let value = [open.minAvailableMB,memory?.availableMB].compactMap({ $0 }).min() { stat.minAvailableMB = min(stat.minAvailableMB ?? value,value) }
        state.stats[phase] = stat
        // Quiet phases only log anomalies: slow items, cancellations, failures.
        let completed = kind == "end" || kind == "deferred"
        if !quiet || !completed || seconds >= 5 { appendLocked(Event(at:clock(),phase:phase,kind:kind,seconds:seconds,generation:open.generation,counters:counters ?? open.counters,memory:memory)) }
        if completed { state.streaks.removeValue(forKey:phase); state.allowed.remove(phase) }
        persistLocked(force:true,full:!quiet)
        if state.open.isEmpty { sampler?.cancel(); sampler = nil }
    }
    /// Interval memory sample while a phase is open. Persisted at most every 3 s.
    func sample() {
        lock.lock(); defer { lock.unlock() }
        guard !state.open.isEmpty else { return }
        let memory = measure()
        trackLocked(memory)
        for key in Array(state.open.keys) {
            guard var open = state.open[key] else { continue }
            open.memory = memory
            if let value = memory?.footprintMB { open.peakFootprintMB = max(open.peakFootprintMB,value) }
            if let value = memory?.availableMB { open.minAvailableMB = min(open.minAvailableMB ?? value,value) }
            state.open[key] = open
        }
        persistLocked(force:false,full:false)
    }
    func background(_ value: Bool) {
        lock.lock(); defer { lock.unlock() }
        guard !state.open.isEmpty else { return }
        for key in Array(state.open.keys) { state.open[key]?.background = value }
        appendLocked(Event(at:clock(),phase:"app",kind:value ? "background" : "foreground",seconds:nil,generation:0,counters:Counters(),memory:measure()))
        persistLocked(force:true)
    }
    func note(_ kind: String) {
        lock.lock(); defer { lock.unlock() }
        loadLocked()
        if kind == "model-load" { state.modelLoads += 1 }
        if kind == "memory-warning" { state.memoryWarnings += 1 }
        if kind.hasPrefix("low-memory") { state.lowMemoryStops += 1 }
        let memory = measure(); trackLocked(memory)
        appendLocked(Event(at:clock(),phase:"app",kind:kind,seconds:nil,generation:0,counters:Counters(),memory:memory))
        persistLocked(force:kind != "model-load")
    }

    // MARK: Crash-loop breaker

    /// A phase that ended the process twice in a row is not started
    /// automatically again; only an explicit user retry admits one attempt.
    func guarded(_ phase: String) -> Bool {
        lock.lock(); defer { lock.unlock() }
        loadLocked()
        return (state.streaks[phase] ?? 0) >= Self.guardStreak && !state.allowed.contains(phase)
    }
    var guardedPhases: [String] {
        lock.lock(); defer { lock.unlock() }
        loadLocked()
        return state.streaks.filter { $0.value >= Self.guardStreak && !state.allowed.contains($0.key) }.map(\.key).sorted()
    }
    func allowRetry() {
        lock.lock(); defer { lock.unlock() }
        loadLocked()
        state.allowed.formUnion(state.streaks.filter { $0.value >= Self.guardStreak }.keys)
        persistLocked(force:true)
    }
    /// Stops counting a phase as dangerous, e.g. after the user deleted the index.
    func clearStreaks() {
        lock.lock(); defer { lock.unlock() }
        loadLocked(); state.streaks = [:]; state.allowed = []; persistLocked(force:true)
    }

    // MARK: System reports (MetricKit summaries, already sanitized by the caller)

    func system(_ line: String) {
        lock.lock(); defer { lock.unlock() }
        loadLocked()
        guard !state.system.contains(line) else { return }
        state.system.append(line)
        if state.system.count > Self.systemLimit { state.system.removeFirst(state.system.count-Self.systemLimit) }
        persistLocked(force:true)
    }
    func exits(_ line: String) {
        lock.lock(); defer { lock.unlock() }
        loadLocked(); state.exits = line; persistLocked(force:true)
    }

    var snapshot: State { lock.lock(); defer { lock.unlock() }; loadLocked(); return state }

    /// Plain text the user can read and share. Contains no library data.
    func report(device: String = PeopleTrace.device(), now: Double? = nil) -> String {
        let value = snapshot, at = now ?? clock()
        func stamp(_ t: Double) -> String {
            let format = ISO8601DateFormatter(); format.formatOptions = [.withInternetDateTime]
            return format.string(from:Date(timeIntervalSince1970:t))
        }
        func memory(_ m: Memory?) -> String { m.map { "huella \($0.footprintMB) MB" + ($0.availableMB.map { ", libre \($0) MB" } ?? "") } ?? "memoria no disponible" }
        func counters(_ c: Counters) -> String { "revisadas \(c.processed)/\(c.total), pendientes \(c.pending), rostros \(c.faces), grupos \(c.persons), muestras \(c.samples)" }
        var lines = ["CocoWash · diagnóstico local de Personas", "Generado: \(stamp(at))", "Build: \(build)", "Dispositivo: \(device)",
                     "Sin IDs de fotos, nombres, rutas, imágenes ni datos faciales.", ""]
        if value.abnormal.isEmpty { lines.append("Cierres abruptos registrados: ninguno") }
        else {
            lines.append("Cierres abruptos registrados (más reciente al final):")
            for a in value.abnormal {
                let also = a.concurrent.isEmpty ? "" : " (también abiertas: " + a.concurrent.joined(separator:", ") + ")"
                let place = a.background ? "en segundo plano" : "en primer plano"
                let free = a.minAvailableMB.map { " · mínimo libre \($0) MB" } ?? ""
                lines.append("- fase \(a.phase)\(also) · build \(a.build) · \(place) · inicio \(stamp(a.started)) · detectado al abrir \(stamp(a.at))")
                lines.append("  \(counters(a.counters)) · \(memory(a.memory)) · pico \(a.peakFootprintMB) MB\(free)")
            }
        }
        let guarded = value.streaks.filter { $0.value >= Self.guardStreak }.map { "\($0.key)×\($0.value)" }.sorted()
        lines.append("Fases en pausa de seguridad: \(guarded.isEmpty ? "ninguna" : guarded.joined(separator:", "))")
        lines.append("Pico de memoria observado: \(value.peakFootprintMB) MB" + (value.minAvailableMB.map { " · mínimo libre \($0) MB" } ?? ""))
        lines.append("Cargas del modelo: \(value.modelLoads) · avisos de memoria: \(value.memoryWarnings) · paradas por memoria baja: \(value.lowMemoryStops)")
        if let exits = value.exits { lines.append("Salidas según iOS (MetricKit): \(exits)") }
        if !value.system.isEmpty { lines.append("Informes de iOS (MetricKit):"); lines.append(contentsOf:value.system.map { "- \($0)" }) }
        if !value.open.isEmpty { lines.append("Fases abiertas ahora: \(value.open.keys.sorted().joined(separator:", "))") }
        if !value.stats.isEmpty {
            lines.append(""); lines.append("Fases (veces · lentas ≥5 s · máx. s · último s · pico MB · mínimo libre MB · contadores en el máximo):")
            for (phase,stat) in value.stats.sorted(by: { $0.key < $1.key }) {
                let times = String(format:"%.1f · %.1f",stat.maxSeconds,stat.lastSeconds)
                let free = stat.minAvailableMB.map { "\($0)" } ?? "?"
                lines.append("- \(phase): \(stat.count) · \(stat.slow) · \(times) · \(stat.maxFootprintMB) · \(free) · \(counters(stat.countersAtMax))")
            }
        }
        lines.append(""); lines.append("Últimos eventos:")
        for e in value.events.suffix(40) {
            let seconds = e.seconds.map { String(format:" %.1fs",$0) } ?? ""
            lines.append("\(stamp(e.at)) \(e.phase) \(e.kind)\(seconds) g\(e.generation) · \(counters(e.counters)) · \(memory(e.memory))")
        }
        return lines.joined(separator:"\n")
    }
    static func device() -> String {
        var name = "?"
        #if canImport(Darwin)
        var system = utsname(); uname(&system)
        name = withUnsafeBytes(of:&system.machine) { bytes in String(decoding:bytes.prefix { $0 != 0 },as:UTF8.self) }
        #endif
        return "\(name) · \(ProcessInfo.processInfo.operatingSystemVersionString) · RAM \(ProcessInfo.processInfo.physicalMemory / 1_073_741_824) GB"
    }

    // MARK: Storage

    private func trackLocked(_ memory: Memory?) {
        guard let memory else { return }
        state.peakFootprintMB = max(state.peakFootprintMB,memory.footprintMB)
        if let available = memory.availableMB { state.minAvailableMB = min(state.minAvailableMB ?? available,available) }
    }
    private func appendLocked(_ event: Event) {
        state.events.append(event)
        if state.events.count > Self.eventLimit { state.events.removeFirst(state.events.count-Self.eventLimit) }
    }
    private func loadLocked() {
        guard !loaded else { return }
        loaded = true
        if let data = try? Data(contentsOf:file), let value = try? JSONDecoder().decode(State.self,from:data), value.schema == 1 { state = value }
        // The tiny open-phase file is written on every phase boundary and wins.
        if let data = try? Data(contentsOf:openFile), let open = try? JSONDecoder().decode([String:OpenPhase].self,from:data) { state.open = open }
    }
    private func persistLocked(force: Bool, full: Bool = true) {
        let now = clock()
        guard force || now-lastPersist >= 3 else { return }
        lastPersist = now
        do {
            if !FileManager.default.fileExists(atPath:folder.path) {
                try FileManager.default.createDirectory(at:folder,withIntermediateDirectories:true)
                var url = folder; var flags = URLResourceValues(); flags.isExcludedFromBackup = true; try? url.setResourceValues(flags)
            }
            try write(JSONEncoder().encode(state.open),to:openFile)
            if full || now-lastFull >= 10 {
                lastFull = now
                var history = state; history.open = [:]
                try write(JSONEncoder().encode(history),to:file)
            }
        } catch {
            // Diagnostics must never stop analysis or launch.
        }
    }
    private func write(_ data: Data, to url: URL) throws {
        try data.write(to:url,options:[.atomic])
        #if os(iOS)
        // Counters only; readable right after launch.
        try? FileManager.default.setAttributes([.protectionKey:FileProtectionType.completeUntilFirstUserAuthentication],ofItemAtPath:url.path)
        #endif
    }
    private func startSamplerLocked() {
        guard sampler == nil else { return }
        let timer = DispatchSource.makeTimerSource(queue:DispatchQueue.global(qos:.utility))
        timer.schedule(deadline:.now()+1,repeating:1,leeway:.milliseconds(250))
        timer.setEventHandler { [weak self] in self?.sample() }
        sampler = timer; timer.resume()
    }
}
