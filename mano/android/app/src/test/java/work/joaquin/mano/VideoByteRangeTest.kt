package work.joaquin.mano

import java.io.File
import org.junit.Assert.*
import org.junit.Test

class VideoByteRangeTest {
    @Test fun sharedRangeContract() {
        val fixture = listOf(File("."), File(".."), File("../.."))
            .map { File(it, "tests/fixtures/video-ranges.tsv") }.first { it.isFile }
        for (row in fixture.readLines().filter { it.isNotBlank() }) {
            val fields = row.split('\t')
            val value = VideoByteRange.parse(fields[0].takeUnless { it == "none" }, fields[1].toLong())
            if (fields[2] == "invalid") assertNull(fields[0], value)
            else {
                assertNotNull(fields[0], value)
                assertEquals(fields[2].toLong(), value!!.lower)
                assertEquals(fields[3].toLong(), value.upper)
                assertEquals(fields[4].toBoolean(), value.partial)
                assertTrue(value.lower >= 0 && value.length > 0)
            }
        }
    }
}
