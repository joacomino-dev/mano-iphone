package work.joaquin.mano

/** Same single-range contract as VideoByteRange.swift. Invalid ranges never reach file IO. */
internal data class VideoByteRange(val lower: Long, val upper: Long, val partial: Boolean) {
    val length: Long get() = upper - lower + 1

    companion object {
        fun parse(header: String?, size: Long): VideoByteRange? {
            if (size <= 0) return null
            if (header == null) return VideoByteRange(0, size - 1, false)
            val text = header.trim()
            if (!text.startsWith("bytes=", ignoreCase = true)) return null
            val parts = text.substring(6).split('-')
            if (parts.size != 2) return null
            fun number(value: String): Long? = if (value.isNotEmpty() && value.all { it in '0'..'9' }) value.toLongOrNull() else null
            if (parts[0].isEmpty()) {
                val suffix = number(parts[1]) ?: return null
                if (suffix <= 0) return null
                return VideoByteRange(maxOf(0, size - suffix), size - 1, true)
            }
            val lower = number(parts[0]) ?: return null
            if (lower >= size) return null
            val upper = if (parts[1].isEmpty()) size - 1 else {
                val end = number(parts[1]) ?: return null
                if (end < lower) return null
                minOf(end, size - 1)
            }
            return VideoByteRange(lower, upper, true)
        }
    }
}
