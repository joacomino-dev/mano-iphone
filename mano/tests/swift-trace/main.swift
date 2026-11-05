import Foundation

func check(_ value: Bool, _ message: String) { if !value { fatalError(message) } }
final class Clock { var now = 1_800_000_000.0 }
let clock = Clock()
let root = FileManager.default.temporaryDirectory.appendingPathComponent("trace-\(UUID().uuidString)", isDirectory: true)
let memory = PeopleTrace.Memory(footprintMB: 700, availableMB: 900)
/// A new instance on the same folder is what the next process sees.
func process(_ build: String = "9.7.2-24", measured: PeopleTrace.Memory? = memory) -> PeopleTrace {
    PeopleTrace(folder: root, build: build, clock: { clock.now }, measure: { measured })
}
let counters = PeopleTrace.Counters(processed: 1040, total: 1530, pending: 490, faces: 2210, persons: 610, samples: 0)

var trace = process()
check(trace.launch() == nil, "First launch has nothing to report")
trace.begin("open"); clock.now += 0.1; trace.end("open")
check(process().launch() == nil, "A process that closed every phase ended normally")

trace = process(); _ = trace.launch()
trace.begin("batch", generation: 7, counters: counters, quiet: true); clock.now += 0.5
trace.begin("group", generation: 7, counters: counters)
clock.now += 2
trace.sample()
// Abrupt end: no end() call. The next process reads the persisted open phases.
trace = process()
guard let first = trace.launch() else { fatalError("Open phase survives an abrupt end") }
check(first.phase == "group" && first.concurrent == ["batch"], "Most recent open phase is primary, others concurrent")
check(first.counters == counters && first.memory == memory && !first.background, "Counters and memory of the last checkpoint are recovered")
check(trace.lastLaunch == first, "Launch result stays available to the index")
check(!trace.guarded("group"), "One abrupt end is reported, not yet guarded")

trace.begin("group", generation: 8, counters: counters)
trace = process(); _ = trace.launch()
check(trace.guarded("group") && trace.guardedPhases.contains("group"), "Two consecutive abrupt ends guard the phase from automatic runs")
check(trace.snapshot.abnormal.count == 2, "Both abrupt ends recorded")

trace.allowRetry()
check(!trace.guarded("group"), "Explicit retry admits one attempt")
check(!process().guarded("group"), "The admission persists until that attempt starts")
trace.begin("group"); trace = process(); _ = trace.launch()
check(trace.guarded("group"), "A failed retry guards the phase again")
trace.allowRetry(); trace.begin("group"); clock.now += 30; trace.end("group", counters: counters)
check(!trace.guarded("group") && trace.snapshot.streaks["group"] == nil, "A completed phase clears its streak")
check(trace.snapshot.stats["group"]?.maxSeconds == 30, "Phase duration is kept beyond the event ring")

// Background termination of a suspended app is reported but never counted against a phase.
trace.begin("insert", quiet: true); trace.background(true)
trace = process()
check(trace.launch()?.background == true, "Background end is labelled as such")
check(trace.snapshot.streaks["insert"] == nil, "Background end does not build a streak")

// Quiet per-photo phases: completions are not logged, anomalies are.
let before = trace.snapshot.events.count
trace.begin("insert", quiet: true); clock.now += 0.4; trace.end("insert", quiet: true)
trace.begin("insert", quiet: true); trace.end("insert", kind: "deferred", quiet: true)
check(trace.snapshot.events.count == before, "Fast completed photos do not flood the history")
trace.begin("insert", quiet: true); clock.now += 0.2; trace.end("insert", kind: "cancel", quiet: true)
check(trace.snapshot.events.count == before + 1, "A cancellation is logged")
trace.begin("insert", quiet: true); clock.now += 9; trace.end("insert", quiet: true)
check(trace.snapshot.events.last?.kind == "end" && trace.snapshot.stats["insert"]?.slow == 1, "A slow photo is logged")

// Bounded storage.
for i in 0..<400 { trace.begin("read", generation: i, counters: counters); clock.now += 1; trace.end("read") }
for i in 0..<20 { trace.system("informe \(i)") }
let state = trace.snapshot
check(state.events.count <= PeopleTrace.eventLimit && state.abnormal.count <= PeopleTrace.abnormalLimit && state.system.count <= PeopleTrace.systemLimit, "History is bounded")
let size = ((try? FileManager.default.attributesOfItem(atPath: root.appendingPathComponent("trace.json").path)[.size]) as? Int) ?? 0
check(size > 0 && size < 96_000, "Persisted history stays small: \(size) bytes")

// Report: readable, no paths, explicit about content.
let report = trace.report(device: "iPhone-test", now: clock.now)
check(report.contains("fase group") && report.contains("Fases (veces"), "Report names the phase and per-phase stats")
check(!report.contains(root.path) && !report.contains("trace.json"), "Report contains no file paths")

// Corrupt files never block launch.
try Data("{".utf8).write(to: root.appendingPathComponent("trace.json"))
try Data("[".utf8).write(to: root.appendingPathComponent("open.json"))
check(process().launch() == nil, "Unreadable diagnostics are ignored")

// Real measurement on the test host.
check((PeopleTrace.memory()?.footprintMB ?? 0) > 0, "Physical footprint is measurable")

try? FileManager.default.removeItem(at: root)
print("PEOPLE_TRACE_OK: open phases survive abrupt ends, streak guard and explicit retry, background excluded, bounded history, no paths")
