package work.joaquin.mano

import android.Manifest
import android.content.ContentUris
import android.content.pm.PackageManager
import android.provider.MediaStore
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import androidx.core.content.ContextCompat
import com.getcapacitor.Bridge
import com.getcapacitor.BridgeWebViewClient
import java.io.FilterInputStream
import java.io.InputStream

/**
 * Capacitor's WebView client plus one route: `https://localhost/_cocowash_media/<id>`
 * streams a library video straight from MediaStore with HTTP range semantics
 * (206 + Content-Range), so <video> can seek without copying the file. Same origin
 * as the app, so the page's CSP (`media-src 'self'`) needs no change. Only numeric
 * MediaStore video ids, only while the app has media permission. Runs on WebView's
 * IO thread, never the main thread.
 */
class CocoWebViewClient(private val bridge: Bridge) : BridgeWebViewClient(bridge) {
    override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
        val url = request.url
        if (url.host == "localhost" && url.path?.startsWith(PREFIX) == true) return media(request)
        return super.shouldInterceptRequest(view, request)
    }

    private fun media(request: WebResourceRequest): WebResourceResponse {
        val context = bridge.context
        val id = request.url.lastPathSegment?.toLongOrNull() ?: return status(404, "Not Found")
        val allowed = listOf(Manifest.permission.READ_MEDIA_VIDEO, Manifest.permission.READ_MEDIA_VISUAL_USER_SELECTED, Manifest.permission.READ_EXTERNAL_STORAGE)
            .any { ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED }
        if (!allowed) return status(403, "Forbidden")
        val uri = ContentUris.withAppendedId(MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL), id)
        return try {
            val mime = context.contentResolver.getType(uri) ?: "video/mp4"
            val descriptor = context.contentResolver.openAssetFileDescriptor(uri, "r") ?: return status(404, "Not Found")
            val size = descriptor.length.takeIf { it > 0 } ?: descriptor.parcelFileDescriptor.statSize
            if (size <= 0) { descriptor.close(); return status(404, "Not Found") }
            var lower = 0L; var upper = size - 1
            val range = request.requestHeaders.entries.firstOrNull { it.key.equals("Range", true) }?.value
            if (range != null && range.startsWith("bytes=")) {
                val bounds = range.removePrefix("bytes=").split(",")[0].split("-")
                if (bounds.size == 2) {
                    if (bounds[0].isEmpty()) bounds[1].toLongOrNull()?.let { lower = maxOf(0, size - it) }
                    else { lower = bounds[0].toLongOrNull() ?: 0; bounds[1].toLongOrNull()?.let { upper = minOf(it, size - 1) } }
                }
            }
            if (lower > upper) {
                descriptor.close()
                return WebResourceResponse(mime, null, 416, "Range Not Satisfiable", mapOf("Content-Range" to "bytes */$size"), null)
            }
            val stream = descriptor.createInputStream()
            var skipped = 0L
            while (skipped < lower) { val n = stream.skip(lower - skipped); if (n <= 0) break; skipped += n }
            val length = upper - lower + 1
            val headers = mutableMapOf("Accept-Ranges" to "bytes", "Content-Length" to length.toString(), "Cache-Control" to "no-cache")
            if (range != null) headers["Content-Range"] = "bytes $lower-$upper/$size"
            WebResourceResponse(mime, null, if (range != null) 206 else 200, if (range != null) "Partial Content" else "OK", headers, Bounded(stream, length))
        } catch (e: Exception) { status(404, "Not Found") }
    }

    private fun status(code: Int, reason: String) = WebResourceResponse("text/plain", "utf-8", code, reason, emptyMap(), null)

    /** Stops after `remaining` bytes, so a range answer never runs past its end. */
    private class Bounded(input: InputStream, private var remaining: Long) : FilterInputStream(input) {
        override fun read(): Int { if (remaining <= 0) return -1; val b = super.read(); if (b >= 0) remaining--; return b }
        override fun read(b: ByteArray, off: Int, len: Int): Int {
            if (remaining <= 0) return -1
            val n = super.read(b, off, minOf(len.toLong(), remaining).toInt())
            if (n > 0) remaining -= n
            return n
        }
    }

    companion object {
        private const val PREFIX = "/_cocowash_media/"
        fun mediaUrl(id: Long) = "https://localhost$PREFIX$id"
    }
}
