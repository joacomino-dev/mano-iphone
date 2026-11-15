import Foundation

/// A single HTTP byte range, validated before converting offsets to unsigned file positions.
struct VideoByteRange {
    let lower: Int
    let upper: Int
    let partial: Bool
    var length: Int { upper - lower + 1 }

    static func parse(_ header: String?, size: Int) -> VideoByteRange? {
        guard size > 0 else { return nil }
        guard let header else { return VideoByteRange(lower: 0, upper: size - 1, partial: false) }
        let text = header.trimmingCharacters(in: .whitespaces)
        guard text.lowercased().hasPrefix("bytes=") else { return nil }
        let parts = text.dropFirst(6).split(separator: "-", omittingEmptySubsequences: false)
        guard parts.count == 2 else { return nil }
        func number(_ text: Substring) -> Int? {
            guard !text.isEmpty, text.allSatisfy({ $0 >= "0" && $0 <= "9" }) else { return nil }
            return Int(text)
        }
        if parts[0].isEmpty {
            guard let suffix = number(parts[1]), suffix > 0 else { return nil }
            return VideoByteRange(lower: max(0, size - suffix), upper: size - 1, partial: true)
        }
        guard let lower = number(parts[0]), lower < size else { return nil }
        let upper: Int
        if parts[1].isEmpty { upper = size - 1 }
        else { guard let end = number(parts[1]), end >= lower else { return nil }; upper = min(end, size - 1) }
        return VideoByteRange(lower: lower, upper: upper, partial: true)
    }
}
