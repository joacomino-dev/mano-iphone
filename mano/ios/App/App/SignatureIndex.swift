/// Exact Hamming candidates with insertion-order ties. Reuses bounded buckets:
/// only the first 64 values at any distance can enter the final 64 candidates.
/// No approximation or change to Vision's grouping threshold. The full scan is
/// retained: eliminating its worst-case quadratic cost needs measured evidence.
struct SignatureIndex {
    private var hashes: [UInt64] = []
    private var buckets = [[Int]](repeating: [], count: 65)
    private(set) var visitedNodes = 0
    mutating func insert(_ hash: UInt64, index: Int) { precondition(index == hashes.count); hashes.append(hash) }
    mutating func nearest(_ hash: UInt64, limit: Int = 64) -> [Int] {
        visitedNodes = 0
        guard limit > 0 else { return [] }
        for i in buckets.indices { buckets[i].removeAll(keepingCapacity: true) }
        for (index, value) in hashes.enumerated() {
            visitedNodes += 1
            let distance = (value ^ hash).nonzeroBitCount
            if buckets[distance].count < limit { buckets[distance].append(index) }
        }
        var result: [Int] = []; result.reserveCapacity(min(limit, hashes.count))
        for bucket in buckets where result.count < limit { result.append(contentsOf: bucket.prefix(limit - result.count)) }
        return result
    }
}
