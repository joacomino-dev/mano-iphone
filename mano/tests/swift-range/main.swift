import Foundation

let fixture = try String(contentsOfFile: "tests/fixtures/video-ranges.tsv", encoding: .utf8)
let rows = fixture.split(separator: "\n")
for row in rows {
    let fields = row.split(separator: "\t").map(String.init)
    let value = VideoByteRange.parse(fields[0] == "none" ? nil : fields[0], size: Int(fields[1])!)
    if fields[2] == "invalid" { precondition(value == nil, "Accepted invalid range: \(fields[0])") }
    else {
        precondition(value?.lower == Int(fields[2]) && value?.upper == Int(fields[3]))
        precondition(value?.partial == (fields[4] == "true"))
        precondition(value!.lower >= 0 && value!.length > 0)
    }
}
print("PASS: \(rows.count) video ranges; invalid offsets never reach unsigned conversion")
