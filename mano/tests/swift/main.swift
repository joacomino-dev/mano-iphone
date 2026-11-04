import Foundation

var seed: UInt64 = 0xC0C0
func random() -> UInt64 { seed = seed &* 6364136223846793005 &+ 1442695040888963407; return seed }
var index = SignatureIndex(), hashes: [UInt64] = []
func verify(_ query: UInt64, limit: Int = 64) {
    let expected = hashes.indices.sorted {
        let a = (hashes[$0] ^ query).nonzeroBitCount, b = (hashes[$1] ^ query).nonzeroBitCount
        return a == b ? $0 < $1 : a < b
    }.prefix(limit)
    precondition(index.nearest(query, limit: limit) == Array(expected), "Exact Hamming candidate mismatch")
}
verify(0)
for i in 0..<2000 {
    let hash: UInt64 = i < 150 ? 0 : (i < 300 ? UInt64(i % 64) : random())
    index.insert(hash, index: i); hashes.append(hash)
    if i % 37 == 0 { verify(random()); verify(hash); verify(hash, limit: 1) }
}
for _ in 0..<50 { verify(random()) }
verify(0, limit: 0); verify(0, limit: 3000)
print("Exact signature index PASS: empty, duplicates, ties, random, incremental and full-range queries")
