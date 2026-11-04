/// Exact Hamming candidates with insertion-order ties. Reuses bounded buckets:
/// only the first 64 values at any distance can enter the final 64 candidates.
/// No approximation or change to Vision's grouping threshold. The full scan is
/// retained: eliminating its worst-case quadratic cost needs measured evidence.
struct SignatureIndex {
    private var hashes: [(hash: UInt64, index: Int)] = []
    private var buckets = [[Int]](repeating: [], count: 65)
    private(set) var visitedNodes = 0
    mutating func insert(_ hash: UInt64, index: Int) { hashes.append((hash, index)) }
    mutating func nearest(_ hash: UInt64, limit: Int = 64) -> [Int] {
        visitedNodes = 0
        guard limit > 0 else { return [] }
        for i in buckets.indices { buckets[i].removeAll(keepingCapacity: true) }
        for value in hashes {
            visitedNodes += 1
            let distance = (value.hash ^ hash).nonzeroBitCount
            if buckets[distance].count < limit { buckets[distance].append(value.index) }
        }
        var result: [Int] = []; result.reserveCapacity(min(limit, hashes.count))
        for bucket in buckets where result.count < limit { result.append(contentsOf: bucket.prefix(limit - result.count)) }
        return result
    }
}
