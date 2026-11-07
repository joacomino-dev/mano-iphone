package work.joaquin.mano

import android.Manifest
import android.app.Activity
import android.content.ContentUris
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Color
import android.location.Address
import android.location.Geocoder
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import android.os.CancellationSignal
import android.os.Handler
import android.os.Looper
import android.os.OperationCanceledException
import android.provider.MediaStore
import android.provider.Settings
import android.util.Log
import android.util.Size
import android.view.HapticFeedbackConstants
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.exifinterface.media.ExifInterface
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONObject
import java.io.File
import java.security.MessageDigest
import java.util.Locale
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToLong

/** Test markers and diagnostics: written only in debug builds (like `devLog` on iOS). */
fun devLog(message: String) {
    if (BuildConfig.DEBUG) Log.i("CocoWash", message)
}

/**
 * Android counterpart of PhotoLibrary.swift, with the same JavaScript API
 * (src/library.ts). Everything happens on the phone: MediaStore for the library,
 * the system's own trash and favourite requests (each confirmed by Android),
 * previews in a bounded app cache. Photos never leave the device; the only
 * network use is the place-name lookup (rounded coordinates, «Ubicación» on).
 *
 * Asset ids are MediaStore row ids (decimal strings), stable for the file's life.
 */
@CapacitorPlugin(name = "PhotoLibrary")
class PhotoLibraryPlugin : Plugin() {
    private val main = Handler(Looper.getMainLooper())
    private val io = Executors.newFixedThreadPool(2)
    private val previews = Executors.newFixedThreadPool(3)
    private val places = Executors.newSingleThreadExecutor()
    private val thumbnailJobs = ConcurrentHashMap<String, CancellationSignal>()
    @Volatile private var thumbnailBudget = 0L
    @Volatile private var thumbnailWrites = 0

    private lateinit var permissionLauncher: ActivityResultLauncher<Array<String>>
    private lateinit var systemRequestLauncher: ActivityResultLauncher<IntentSenderRequest>
    private var permissionCall: PluginCall? = null
    private var permissionChange = false
    private var systemCall: PluginCall? = null
    private var systemResult: JSObject? = null

    private val placeCache = ConcurrentHashMap<String, JSObject>() // rounded coordinates → names; memory only
    @Volatile private var lastGeocode = 0L

    override fun load() {
        // Registered while the activity is being created (before STARTED), as required.
        permissionLauncher = bridge.registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
            val call = permissionCall ?: return@registerForActivityResult
            permissionCall = null
            prefs().edit().putBoolean(ASKED, true).apply()
            if (permissionChange) call.resolve(JSObject().put("changed", true))
            else call.resolve(JSObject().put("status", status()))
        }
        systemRequestLauncher = bridge.registerForActivityResult(ActivityResultContracts.StartIntentSenderForResult()) { result ->
            val call = systemCall ?: return@registerForActivityResult
            val value = systemResult ?: JSObject()
            systemCall = null; systemResult = null
            // «Cancelar» in Android's own confirmation: a choice, not a failure — the
            // web side keeps the queue quietly (same code as iOS).
            if (result.resultCode == Activity.RESULT_OK) call.resolve(value) else call.reject("Cancelado", "CANCELLED")
        }
        devLog("COCOWASH_BRIDGE_READY")
    }

    // region Permissions

    private fun prefs() = context.getSharedPreferences("cocowash-native", 0)
    private fun granted(permission: String) = ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED

    private fun requested(): Array<String> = when {
        Build.VERSION.SDK_INT >= 34 -> arrayOf(Manifest.permission.READ_MEDIA_IMAGES, Manifest.permission.READ_MEDIA_VIDEO,
            Manifest.permission.READ_MEDIA_VISUAL_USER_SELECTED, Manifest.permission.ACCESS_MEDIA_LOCATION)
        Build.VERSION.SDK_INT >= 33 -> arrayOf(Manifest.permission.READ_MEDIA_IMAGES, Manifest.permission.READ_MEDIA_VIDEO, Manifest.permission.ACCESS_MEDIA_LOCATION)
        else -> arrayOf(Manifest.permission.READ_EXTERNAL_STORAGE, Manifest.permission.ACCESS_MEDIA_LOCATION)
    }

    /** authorized · limited (Android 14 «Seleccionar fotos») · denied · notDetermined. */
    private fun status(): String {
        val full = if (Build.VERSION.SDK_INT >= 33) granted(Manifest.permission.READ_MEDIA_IMAGES) || granted(Manifest.permission.READ_MEDIA_VIDEO)
        else granted(Manifest.permission.READ_EXTERNAL_STORAGE)
        if (full) return "authorized"
        if (Build.VERSION.SDK_INT >= 34 && granted(Manifest.permission.READ_MEDIA_VISUAL_USER_SELECTED)) return "limited"
        if (!prefs().getBoolean(ASKED, false)) return "notDetermined"
        // Android can still ask after one refusal (the rationale case); after a second
        // refusal only Settings can grant it.
        val main = if (Build.VERSION.SDK_INT >= 33) Manifest.permission.READ_MEDIA_IMAGES else Manifest.permission.READ_EXTERNAL_STORAGE
        return if (activity?.shouldShowRequestPermissionRationale(main) == true) "notDetermined" else "denied"
    }

    private fun allowed(call: PluginCall): Boolean {
        if (status() == "authorized" || status() == "limited") return true
        call.reject("Permite acceso a Fotos en Ajustes."); return false
    }

    @PluginMethod
    fun authorize(call: PluginCall) {
        if (status() == "authorized") { call.resolve(JSObject().put("status", "authorized")); return }
        if (permissionCall != null) { call.reject("No se pudo abrir el selector de Fotos."); return }
        permissionCall = call; permissionChange = false
        permissionLauncher.launch(requested())
    }

    /** Reads the current state without ever showing the system prompt. */
    @PluginMethod
    fun permissionStatus(call: PluginCall) { call.resolve(JSObject().put("status", status())) }

    /** Android 14+ partial access: asking again shows the system selector to add photos. */
    @PluginMethod
    fun manageLimitedAccess(call: PluginCall) {
        if (status() != "limited") { call.resolve(JSObject().put("changed", false)); return }
        if (permissionCall != null) { call.reject("No se pudo abrir el selector de Fotos."); return }
        permissionCall = call; permissionChange = true
        permissionLauncher.launch(requested())
    }

    @PluginMethod
    fun openSettings(call: PluginCall) {
        try {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", context.packageName, null))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent); call.resolve()
        } catch (e: Exception) { call.reject("No se pudo abrir Ajustes.") }
    }

    /** Help and privacy pages open in the browser. Only https pages of the CocoWash site. */
    @PluginMethod
    fun openLink(call: PluginCall) {
        val uri = call.getString("url")?.let { Uri.parse(it) }
        if (uri == null || uri.scheme != "https" || uri.host != "joaquinmino.work") { call.reject("No se pudo abrir el enlace."); return }
        try {
            context.startActivity(Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            call.resolve()
        } catch (e: Exception) { call.reject("No se pudo abrir el enlace.") }
    }

    // endregion
    // region Feedback and diagnostics

    /** Short, contextual feedback through the system's haptic constants (follows the
     * phone's own touch-feedback setting; no vibration permission). */
    @PluginMethod
    fun haptic(call: PluginCall) {
        val kind = call.getString("kind") ?: "light"
        val constant = when (kind) {
            "selection" -> if (Build.VERSION.SDK_INT >= 34) HapticFeedbackConstants.SEGMENT_FREQUENT_TICK else HapticFeedbackConstants.CLOCK_TICK
            "success" -> HapticFeedbackConstants.CONFIRM
            "warning", "error" -> HapticFeedbackConstants.REJECT
            "medium", "rigid" -> HapticFeedbackConstants.CONTEXT_CLICK
            "soft" -> HapticFeedbackConstants.CLOCK_TICK
            else -> HapticFeedbackConstants.KEYBOARD_TAP
        }
        main.post { bridge.webView?.performHapticFeedback(constant); call.resolve() }
    }

    /** JS error text from the web layer, for the emulator CI. Debug builds only. */
    @PluginMethod
    fun diagnostic(call: PluginCall) {
        devLog("COCOWASH_JS_ERROR " + (call.getString("message") ?: "").take(1500).replace("\n", " | "))
        call.resolve()
    }

    /** Back button / predictive back gesture: while the web side has a sheet or the
     * anchored view open, Back closes it (event `backButton`) instead of leaving. */
    @PluginMethod
    fun backHandling(call: PluginCall) {
        val active = call.getBoolean("active") ?: false
        main.post { (activity as? MainActivity)?.setBackHandling(active) { notifyListeners("backButton", JSObject()) }; call.resolve() }
    }

    // endregion
    // region Library

    private fun itemUri(id: Long, video: Boolean): Uri = ContentUris.withAppendedId(
        if (video) MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL) else MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL), id)

    private data class Row(
        val id: Long, val video: Boolean, val date: Long, val modified: Long, val width: Int, val height: Int,
        val duration: Double, val favorite: Boolean, val screenshot: Boolean, val bytes: Long, val mime: String?, val name: String?,
    )

    private val columns = arrayOf(
        MediaStore.MediaColumns._ID, MediaStore.MediaColumns.DATE_TAKEN, MediaStore.MediaColumns.DATE_ADDED,
        MediaStore.MediaColumns.DATE_MODIFIED, MediaStore.MediaColumns.WIDTH, MediaStore.MediaColumns.HEIGHT,
        MediaStore.MediaColumns.ORIENTATION, MediaStore.MediaColumns.DURATION, MediaStore.MediaColumns.IS_FAVORITE,
        MediaStore.MediaColumns.RELATIVE_PATH, MediaStore.MediaColumns.BUCKET_DISPLAY_NAME, MediaStore.MediaColumns.SIZE,
        MediaStore.MediaColumns.MIME_TYPE, MediaStore.MediaColumns.DISPLAY_NAME,
    )

    /** Images and videos, each from its own collection (what partial access on
     * Android 14+ filters); trashed and pending items are excluded by MediaStore.
     * Row ids are unique across both (one MediaStore files table). */
    private fun query(ids: Collection<Long>? = null): List<Row> {
        val rows = ArrayList<Row>()
        for (video in listOf(false, true)) {
            val collection = if (video) MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL) else MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL)
            for (chunk in ids?.chunked(500) ?: listOf(null)) {
                val selection = chunk?.let { "${MediaStore.MediaColumns._ID} IN (${it.joinToString(",")})" }
                context.contentResolver.query(collection, columns, selection, null, "${MediaStore.MediaColumns.DATE_ADDED} ASC")?.use { c ->
                    val i = columns.map { c.getColumnIndexOrThrow(it) }
                    while (c.moveToNext()) {
                        val taken = if (c.isNull(i[1])) 0L else c.getLong(i[1])
                        val date = if (taken > 0) taken else c.getLong(i[2]) * 1000
                        val quarter = (if (c.isNull(i[6])) 0 else c.getInt(i[6])) % 180 != 0
                        val w = c.getInt(i[4]); val h = c.getInt(i[5])
                        val where = ((c.getString(i[9]) ?: "") + "/" + (c.getString(i[10]) ?: "")).lowercase(Locale.ROOT)
                        rows += Row(
                            id = c.getLong(i[0]), video = video, date = date, modified = c.getLong(i[3]) * 1000,
                            width = if (quarter) h else w, height = if (quarter) w else h,
                            duration = if (video && !c.isNull(i[7])) c.getLong(i[7]) / 1000.0 else 0.0,
                            favorite = c.getInt(i[8]) == 1,
                            screenshot = where.contains("screenshot") || where.contains("screen record") || where.contains("screenrecord"),
                            bytes = if (c.isNull(i[11])) 0L else c.getLong(i[11]), mime = c.getString(i[12]), name = c.getString(i[13]),
                        )
                    }
                }
            }
        }
        if (ids == null) rows.sortBy { it.date }
        return rows
    }

    /** A video's length in seconds: MediaStore's, or read from the file's own header
     * when the media scanner left it empty (seen with some recordings). Cached. */
    private val durations = ConcurrentHashMap<String, Double>()
    private fun duration(row: Row): Double {
        if (!row.video || row.duration > 0) return row.duration
        return durations.getOrPut("${row.id}-${row.modified}") {
            try {
                val retriever = MediaMetadataRetriever()
                try {
                    retriever.setDataSource(context, itemUri(row.id, true))
                    (retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull() ?: 0L) / 1000.0
                } finally { retriever.release() }
            } catch (e: Exception) { 0.0 }
        }
    }

    private fun ids(call: PluginCall): List<Long>? =
        call.getArray("ids")?.toList<Any>()?.mapNotNull { it.toString().toLongOrNull() }

    private fun one(call: PluginCall): Row? {
        val id = call.getString("id")?.toLongOrNull()
        val row = id?.let { query(listOf(it)).firstOrNull() }
        if (row == null) call.reject("Este elemento ya no está disponible en Fotos.")
        return row
    }

    @PluginMethod
    fun assets(call: PluginCall) {
        val status = status()
        devLog("COCOWASH_PHOTOS_REQUEST status=$status")
        if (status != "authorized" && status != "limited") { call.resolve(JSObject().apply { put("assets", JSArray()); put("status", status) }); return }
        io.execute {
            try {
                val list = JSArray()
                for (r in query()) list.put(JSObject().apply {
                    put("id", r.id.toString()); put("kind", if (r.video) "video" else "photo"); put("date", r.date)
                    put("width", r.width); put("height", r.height); put("duration", duration(r)); put("modified", r.modified)
                    // Reading each file's location up front would open every original;
                    // the caption asks place() per card and an absent place stays empty.
                    put("hasLocation", true)
                    put("favorite", r.favorite); put("screenshot", r.screenshot)
                })
                // Runtime smoke-test signal: no ids, names, paths or image data.
                devLog("COCOWASH_PHOTOS_READ_OK count=${list.length()} status=$status")
                call.resolve(JSObject().apply { put("assets", list); put("status", status()) })
            } catch (e: Exception) { call.reject("Este elemento ya no está disponible en Fotos.") }
        }
    }

    // endregion
    // region Previews

    private fun digest(text: String): String =
        MessageDigest.getInstance("SHA-256").digest(text.toByteArray()).joinToString("") { "%02x".format(it) }

    /** Preview only (card or anchored view, per the quality profile); never the original.
     * The system thumbnail service decodes at the requested size; the JPEG lives in
     * a size-bounded cache (oldest-used first). Android has no cloud-only items in
     * MediaStore, so `cloud` is always false and `network` changes nothing. */
    @PluginMethod
    fun thumbnail(call: PluginCall) {
        if (!allowed(call)) return
        val token = call.getString("requestId") ?: UUID.randomUUID().toString()
        if (token.isEmpty() || token.length > 160) { call.reject("Identificador de vista previa no válido.", "INVALID_REQUEST"); return }
        val size = min(3072, max(200, call.getInt("size") ?: 900))
        val limit = min(max((call.getInt("cacheBytes") ?: (300 * 1024 * 1024)).toLong(), 1L), 600L * 1024 * 1024)
        val id = call.getString("id")?.toLongOrNull()
        if (id == null) { call.reject("Este elemento ya no está disponible en Fotos."); return }
        if (thumbnailJobs.putIfAbsent(token, CancellationSignal()) != null) { call.reject("Esa vista previa ya se está preparando.", "PREPARATION_BUSY"); return }
        previews.execute {
            val signal = thumbnailJobs[token] ?: return@execute
            try {
                val row = query(listOf(id)).firstOrNull() ?: throw NoSuchElementException()
                val folder = File(context.cacheDir, "ManoThumbnails").apply { mkdirs() }
                val file = File(folder, digest("${row.id}-$size-${row.modified}") + ".jpg")
                if (file.length() > 0) {
                    file.setLastModified(System.currentTimeMillis())
                    if (thumbnailBudget != limit) { thumbnailBudget = limit; prune(folder, limit) }
                    call.resolve(JSObject().apply { put("path", file.absolutePath); put("cloud", false) }); return@execute
                }
                val started = System.currentTimeMillis()
                var bitmap = context.contentResolver.loadThumbnail(itemUri(row.id, row.video), Size(size, size), signal)
                val longest = max(bitmap.width, bitmap.height)
                if (longest > size) {
                    val scale = size.toFloat() / longest
                    val scaled = Bitmap.createScaledBitmap(bitmap, max(1, (bitmap.width * scale).toInt()), max(1, (bitmap.height * scale).toInt()), true)
                    if (scaled !== bitmap) bitmap.recycle()
                    bitmap = scaled
                }
                if (signal.isCanceled) throw OperationCanceledException()
                val partial = File(folder, file.name + ".part")
                partial.outputStream().use { bitmap.compress(Bitmap.CompressFormat.JPEG, 88, it) }
                bitmap.recycle()
                if (!partial.renameTo(file)) throw IllegalStateException("rename")
                call.resolve(JSObject().apply { put("path", file.absolutePath); put("cloud", false) })
                devLog("COCOWASH_PREVIEW size=$size bytes=${file.length()} ms=${System.currentTimeMillis() - started}")
                thumbnailWrites++
                if (thumbnailBudget != limit || thumbnailWrites % 16 == 1) { thumbnailBudget = limit; prune(folder, limit) }
            } catch (e: OperationCanceledException) {
                call.reject("Preparación cancelada.", "PREPARATION_CANCELLED")
            } catch (e: NoSuchElementException) {
                call.reject("Este elemento ya no está disponible en Fotos.")
            } catch (e: SecurityException) {
                call.reject("Permite acceso a Fotos en Ajustes.")
            } catch (e: Exception) {
                call.reject("No se pudo preparar el archivo.", "THUMBNAIL_UNAVAILABLE")
            } finally { thumbnailJobs.remove(token) }
        }
    }

    @PluginMethod
    fun cancelThumbnailPreparation(call: PluginCall) {
        val token = call.getString("requestId") ?: run { call.reject("Falta el identificador de preparación.", "INVALID_REQUEST"); return }
        val signal = thumbnailJobs[token]
        signal?.cancel()
        call.resolve(JSObject().put("cancelled", signal != null))
    }

    /** Oldest-used first until under `limit`. */
    private fun prune(folder: File, limit: Long) {
        val entries = folder.listFiles()?.filter { it.isFile && it.name.endsWith(".jpg") } ?: return
        var total = entries.sumOf { it.length() }
        if (total <= limit) return
        for (f in entries.sortedBy { it.lastModified() }) {
            if (total <= limit) break
            val bytes = f.length()
            if (f.delete()) total -= bytes
        }
    }

    // endregion
    // region Details

    /** The original's EXIF (with location only when ACCESS_MEDIA_LOCATION is granted). */
    private fun exif(row: Row): ExifInterface? = try {
        var uri = itemUri(row.id, false)
        if (granted(Manifest.permission.ACCESS_MEDIA_LOCATION)) uri = MediaStore.setRequireOriginal(uri)
        context.contentResolver.openInputStream(uri)?.use { ExifInterface(it) }
    } catch (e: Exception) { null }

    /** Latitude and longitude of a photo (EXIF) or a video (ISO 6709 metadata). */
    private fun location(row: Row): Pair<Double, Double>? {
        if (!row.video) return exif(row)?.latLong?.let { it[0] to it[1] }?.takeIf { it.first != 0.0 || it.second != 0.0 }
        return try {
            val retriever = MediaMetadataRetriever()
            try {
                var uri = itemUri(row.id, true)
                if (granted(Manifest.permission.ACCESS_MEDIA_LOCATION)) uri = MediaStore.setRequireOriginal(uri)
                retriever.setDataSource(context, uri)
                val text = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_LOCATION) ?: return null
                val match = Regex("^([+-]\\d+(?:\\.\\d+)?)([+-]\\d+(?:\\.\\d+)?)").find(text) ?: return null
                match.groupValues[1].toDouble() to match.groupValues[2].toDouble()
            } finally { retriever.release() }
        } catch (e: Exception) { null }
    }

    @PluginMethod
    fun metadata(call: PluginCall) {
        if (!allowed(call)) return
        val includeExif = call.getBoolean("includeExif") ?: false
        io.execute {
            val row = one(call) ?: return@execute
            val result = JSObject().apply {
                put("id", row.id.toString()); put("kind", if (row.video) "video" else "photo")
                put("width", row.width); put("height", row.height); put("duration", duration(row))
                put("isFavorite", row.favorite); put("isHidden", false)
                put("creationDate", row.date); put("modified", row.modified)
            }
            row.name?.let { result.put("filename", it) }
            row.mime?.let { result.put("uniformTypeIdentifier", it) }
            location(row)?.let { (lat, lng) -> result.put("location", JSObject().apply { put("latitude", lat); put("longitude", lng) }) }
            if (row.video) { result.put("exifStatus", "notApplicable"); call.resolve(result); return@execute }
            if (!includeExif) { result.put("exifStatus", "notRequested"); call.resolve(result); return@execute }
            val exif = exif(row)
            if (exif == null) { result.put("exifStatus", "unavailable"); call.resolve(result); return@execute }
            val fields = JSObject()
            for ((name, tag) in listOf("cameraMake" to ExifInterface.TAG_MAKE, "cameraModel" to ExifInterface.TAG_MODEL,
                    "lensModel" to ExifInterface.TAG_LENS_MODEL, "dateTimeOriginal" to ExifInterface.TAG_DATETIME_ORIGINAL)) {
                exif.getAttribute(tag)?.takeIf { it.isNotBlank() }?.let { fields.put(name, it.take(256)) }
            }
            for ((name, tag) in listOf("fNumber" to ExifInterface.TAG_F_NUMBER, "exposureTime" to ExifInterface.TAG_EXPOSURE_TIME,
                    "focalLength" to ExifInterface.TAG_FOCAL_LENGTH, "orientation" to ExifInterface.TAG_ORIENTATION,
                    "iso" to ExifInterface.TAG_PHOTOGRAPHIC_SENSITIVITY)) {
                val v = exif.getAttributeDouble(tag, 0.0)
                if (v.isFinite() && v > 0) fields.put(name, v)
            }
            result.put("exifStatus", if (fields.length() == 0) "absent" else "available")
            if (fields.length() > 0) result.put("exif", fields)
            call.resolve(result)
        }
    }

    /** City/region for an item's capture location, from the system geocoder (a
     * network lookup on most phones; see the privacy policy). Only coordinates
     * rounded to ~1 km leave the device, never the photo; absent location resolves {}.
     * The web side asks only while «Ubicación» is on in Ajustes. */
    @PluginMethod
    fun place(call: PluginCall) {
        if (!allowed(call)) return
        places.execute {
            val row = one(call) ?: return@execute
            val (lat0, lng0) = location(row) ?: run { call.resolve(JSObject()); return@execute }
            val lat = (lat0 * 100).roundToLong() / 100.0; val lng = (lng0 * 100).roundToLong() / 100.0
            val key = "$lat,$lng"
            placeCache[key]?.let { call.resolve(it); return@execute }
            if (!Geocoder.isPresent()) { call.resolve(JSObject()); return@execute }
            // Keep lookups spaced out, like on iOS, so bursts are never throttled.
            val wait = lastGeocode + 1200 - System.currentTimeMillis()
            if (wait > 0) Thread.sleep(wait)
            lastGeocode = System.currentTimeMillis()
            val done = java.util.concurrent.CountDownLatch(1)
            var address: Address? = null; var failed = false
            val geocoder = Geocoder(context, Locale.getDefault())
            try {
                if (Build.VERSION.SDK_INT >= 33) {
                    geocoder.getFromLocation(lat, lng, 1, object : Geocoder.GeocodeListener {
                        override fun onGeocode(list: MutableList<Address>) { address = list.firstOrNull(); done.countDown() }
                        override fun onError(message: String?) { failed = true; done.countDown() }
                    })
                    if (!done.await(15, java.util.concurrent.TimeUnit.SECONDS)) failed = true
                } else {
                    @Suppress("DEPRECATION")
                    address = geocoder.getFromLocation(lat, lng, 1)?.firstOrNull()
                }
            } catch (e: Exception) { failed = true }
            val result = JSObject()
            address?.let { a ->
                (a.locality ?: a.subAdminArea ?: a.adminArea ?: a.featureName)?.let { result.put("locality", it) }
                a.adminArea?.takeIf { it != result.getString("locality") }?.let { result.put("region", it) }
                a.countryName?.let { result.put("country", it) }
                a.countryCode?.let { result.put("countryCode", it) }
            }
            // Offline lookups are not cached: a later card may succeed.
            if (!failed) placeCache[key] = result else if (result.length() == 0) result.put("retry", "1")
            call.resolve(result)
        }
    }

    /** Bytes of each original, straight from MediaStore (nothing is read or downloaded). */
    @PluginMethod
    fun sizes(call: PluginCall) {
        if (!allowed(call)) return
        val list = ids(call) ?: run { call.reject("Nada seleccionado."); return }
        io.execute {
            val sizes = JSObject()
            for (r in query(list.take(2000))) if (r.bytes > 0) sizes.put(r.id.toString(), r.bytes)
            call.resolve(JSObject().put("sizes", sizes))
        }
    }

    // endregion
    // region Changes (each one confirmed by Android's own dialog)

    private fun launchSystemRequest(call: PluginCall, sender: android.app.PendingIntent, result: JSObject) {
        main.post {
            if (systemCall != null) { call.reject("No se pudo abrir el selector de Fotos.", "BUSY"); return@post }
            systemCall = call; systemResult = result
            try { systemRequestLauncher.launch(IntentSenderRequest.Builder(sender.intentSender).build()) }
            catch (e: Exception) { systemCall = null; systemResult = null; call.reject("No se pudo abrir el selector de Fotos.") }
        }
    }

    @PluginMethod
    fun favorite(call: PluginCall) {
        if (!allowed(call)) return
        val list = ids(call) ?: run { call.reject("Nada seleccionado."); return }
        val value = call.getBoolean("value") ?: true
        io.execute {
            val rows = query(list)
            val present = rows.map { it.id }.toSet()
            val missing = JSArray(list.filter { it !in present }.map { it.toString() })
            if (missing.length() > 0 && call.getBoolean("ignoreMissing") != true) { call.reject("Alguna foto ya no está disponible."); return@execute }
            val changing = rows.filter { it.favorite != value }
            if (changing.isEmpty()) { call.resolve(JSObject().put("missing", missing)); return@execute }
            val request = MediaStore.createFavoriteRequest(context.contentResolver, changing.map { itemUri(it.id, it.video) }, value)
            launchSystemRequest(call, request, JSObject().put("missing", missing))
        }
    }

    /** Moves the queued items to Android's trash (30 days, recoverable), after the
     * system's own confirmation. Favourites are rechecked at the last moment and
     * never deleted. */
    @PluginMethod
    fun deleteAssets(call: PluginCall) {
        if (!allowed(call)) return
        val list = ids(call)?.distinct()
        if (list.isNullOrEmpty()) { call.reject("No hay descartes para borrar."); return }
        io.execute {
            val safe = query(list).filter { !it.favorite }
            if (safe.isEmpty()) { call.reject("No se borró nada: los elementos ya no están disponibles o ahora son favoritos."); return@execute }
            val request = MediaStore.createTrashRequest(context.contentResolver, safe.map { itemUri(it.id, it.video) }, true)
            launchSystemRequest(call, request, JSObject().put("deleted", JSArray(safe.map { it.id.toString() })))
        }
    }

    // Android keeps albums as folders (moving a file changes where other apps find it);
    // CocoWash does not move or copy originals.
    @PluginMethod fun albums(call: PluginCall) { call.resolve(JSObject().put("albums", JSArray())) }
    @PluginMethod fun addToAlbum(call: PluginCall) { call.reject("No se pueden añadir esos elementos a este álbum.", "UNSUPPORTED") }
    @PluginMethod fun createAlbum(call: PluginCall) { call.reject("No se pueden añadir esos elementos a este álbum.", "UNSUPPORTED") }

    // endregion
    // region Sharing and video

    @PluginMethod
    fun share(call: PluginCall) {
        if (!allowed(call)) return
        io.execute {
            val row = one(call) ?: return@execute
            val send = Intent(Intent.ACTION_SEND).setType(row.mime ?: if (row.video) "video/*" else "image/*")
                .putExtra(Intent.EXTRA_STREAM, itemUri(row.id, row.video)).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            main.post {
                try { activity.startActivity(Intent.createChooser(send, null)); call.resolve() }
                catch (e: Exception) { call.reject("No se pudo compartir el archivo. Comprueba la conexión e inténtalo de nuevo.") }
            }
        }
    }

    /** Fullscreen fallback: a video opens in the phone's own player; photos stay in the app. */
    @PluginMethod
    fun preview(call: PluginCall) {
        if (!allowed(call)) return
        io.execute {
            val row = one(call) ?: return@execute
            if (!row.video) { call.resolve(); return@execute }
            val view = Intent(Intent.ACTION_VIEW).setDataAndType(itemUri(row.id, true), row.mime ?: "video/*")
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            main.post {
                try { activity.startActivity(view); call.resolve() }
                catch (e: Exception) { call.reject("No se pudo abrir el reproductor.", "PLAYBACK_FAILED") }
            }
        }
    }

    /** Videos stream straight from MediaStore through the WebView (CocoWebViewClient,
     * HTTP ranges); nothing is copied, so «preparing» is immediate. */
    @PluginMethod
    fun prepareVideo(call: PluginCall) {
        if (!allowed(call)) return
        val token = call.getString("requestId")
        if (token.isNullOrEmpty() || token.length > 160) { call.reject("Falta el identificador de preparación.", "INVALID_REQUEST"); return }
        io.execute {
            val row = one(call) ?: return@execute
            if (!row.video) { call.reject("Este elemento no es un vídeo.", "NOT_VIDEO"); return@execute }
            devLog("COCOWASH_VIDEO_PREPARED_OK bytes=${row.bytes} cached=1")
            call.resolve(JSObject().apply {
                put("path", ""); put("url", CocoWebViewClient.mediaUrl(row.id))
                put("mimeType", row.mime ?: "video/mp4"); put("cached", true); put("bytes", row.bytes)
            })
        }
    }
    @PluginMethod fun cancelVideoPreparation(call: PluginCall) { call.resolve(JSObject().put("cancelled", false)) }
    @PluginMethod fun releasePreparedVideos(call: PluginCall) { call.resolve(JSObject().put("released", 0)) }

    // endregion
    // region On-device analysis (no models, nothing leaves the phone)

    private val analysisQueue = Executors.newSingleThreadExecutor()
    private val classifyQueue = Executors.newSingleThreadExecutor()
    @Volatile private var analysisCancelled = false
    @Volatile private var classifyCancelled = false
    @Volatile private var analyzing = false
    @Volatile private var insightSavedAt = 0L

    private fun cacheFile(name: String) = File(context.cacheDir, name)
    private fun loadCache(name: String): JSONObject =
        try { JSONObject(cacheFile(name).readText()) } catch (e: Exception) { JSONObject() }
    private fun saveCache(cache: JSONObject, name: String) {
        try { val tmp = cacheFile("$name.part"); tmp.writeText(cache.toString()); tmp.renameTo(cacheFile(name)) } catch (e: Exception) { }
    }

    /** A small local preview from the system thumbnail service (never downloaded or uploaded). */
    private fun preview(row: Row, size: Int): Bitmap? = try {
        context.contentResolver.loadThumbnail(itemUri(row.id, row.video), Size(size, size), null)
    } catch (e: Exception) { null }

    private fun luma(pixel: Int) = (Color.red(pixel) * 299 + Color.green(pixel) * 587 + Color.blue(pixel) * 114) / 1000

    /** 64-bit difference hash on a 9×8 grey copy (the signature iOS uses to shortlist). */
    private fun dHash(image: Bitmap): Long {
        val grey = Bitmap.createScaledBitmap(image, 9, 8, true)
        var hash = 0L
        for (y in 0 until 8) for (x in 0 until 8) {
            if (luma(grey.getPixel(x, y)) > luma(grey.getPixel(x + 1, y))) hash = hash or (1L shl (y * 8 + x))
        }
        if (grey !== image) grey.recycle()
        return hash
    }

    /** Similar photos: near-identical shots (bursts, retakes) by the Hamming distance
     * of their difference hashes, each compared with one representative per group.
     * `threshold` (0.05–0.6, default 0.28 as on iOS) allows 2–22 differing bits of 64.
     * Hashes persist per item (id + edit date) in the app cache; no image data. */
    @PluginMethod
    fun analyze(call: PluginCall) {
        if (!allowed(call)) return
        val list = ids(call) ?: run { call.reject("Nada seleccionado."); return }
        if (analyzing) { call.reject("Ya hay un análisis en curso."); return }
        analyzing = true; analysisCancelled = false
        val limit = (min(0.6, max(0.05, call.getDouble("threshold") ?: 0.28)) * 36).roundToLong().toInt()
        analysisQueue.execute {
            try {
                val rows = query(list).filter { !it.video }.sortedBy { it.date }
                val cache = loadCache("ManoPrints.json"); val live = JSONObject()
                val parent = IntArray(rows.size) { it }
                fun root(n: Int): Int { var k = n; while (parent[k] != k) k = parent[k]; return k }
                val representatives = ArrayList<Pair<Int, Long>>()
                var skipped = 0
                for ((index, row) in rows.withIndex()) {
                    if (analysisCancelled) break
                    val key = "${row.id}-${row.modified}"
                    val hash: Long? = if (cache.has(key)) java.lang.Long.parseUnsignedLong(cache.getString(key), 16) else {
                        val image = preview(row, 256)
                        if (image == null) { skipped++; null } else dHash(image).also { image.recycle() }
                    }
                    if (hash != null) {
                        live.put(key, java.lang.Long.toUnsignedString(hash, 16))
                        var best = -1; var bestDistance = Int.MAX_VALUE
                        for ((i, rep) in representatives) {
                            val d = java.lang.Long.bitCount(hash xor rep)
                            if (d <= limit && d < bestDistance) { best = i; bestDistance = d }
                        }
                        if (best >= 0) parent[index] = root(best) else representatives += index to hash
                    }
                    if (index % 10 == 0 || index == rows.size - 1) notifyListeners("analysisProgress", JSObject().apply { put("done", index + 1); put("total", rows.size) })
                }
                // A complete pass knows every live hash: deleted or edited items drop out.
                if (analysisCancelled) { val keys = live.keys(); while (keys.hasNext()) { val k = keys.next(); cache.put(k, live.get(k)) }; saveCache(cache, "ManoPrints.json") }
                else saveCache(live, "ManoPrints.json")
                val groups = LinkedHashMap<Int, JSArray>()
                for (i in rows.indices) groups.getOrPut(root(i)) { JSArray() }.put(rows[i].id.toString())
                val result = JSArray()
                for (group in groups.values) if (group.length() > 1) result.put(group)
                call.resolve(JSObject().apply { put("groups", result); put("skipped", skipped); put("cancelled", analysisCancelled) })
            } catch (e: Exception) {
                call.reject("Ya hay un análisis en curso.")
            } finally { analyzing = false }
        }
    }
    @PluginMethod fun cancelAnalysis(call: PluginCall) { analysisCancelled = true; call.resolve() }

    /** Signals for the clean-up filters from a 512 px local preview: sharpness
     * (variance of the Laplacian on a 256 px grey copy, as on iOS), mean brightness
     * and faces (Android's own on-device face detector). Text needs a bundled model
     * (pending), so text coverage and lines read 0 for now. JS decides the
     * categories (insights.ts). Cached per item (id + edit date). */
    @PluginMethod
    fun classify(call: PluginCall) {
        if (!allowed(call)) return
        val list = ids(call) ?: run { call.reject("Nada seleccionado."); return }
        val flush = call.getBoolean("flush") == true
        classifyQueue.execute {
            classifyCancelled = false
            val cache = loadCache(INSIGHTS); var changed = false
            val results = JSObject(); var skipped = 0
            try {
                for (row in query(list.take(400))) {
                    if (classifyCancelled) break
                    if (row.video) continue
                    val key = "${row.id}-${row.modified}"
                    if (cache.has(key)) { results.put(row.id.toString(), cache.getJSONObject(key)); continue }
                    val image = preview(row, 512)
                    if (image == null) { skipped++; continue }
                    val metrics = insights(image)
                    image.recycle()
                    cache.put(key, metrics); results.put(row.id.toString(), metrics); changed = true
                }
            } catch (e: Exception) { }
            if (changed && (flush || classifyCancelled || System.currentTimeMillis() - insightSavedAt > 20_000)) {
                saveCache(cache, INSIGHTS); insightSavedAt = System.currentTimeMillis()
            }
            call.resolve(JSObject().apply { put("results", results); put("skipped", skipped); put("cancelled", classifyCancelled) })
        }
    }
    @PluginMethod fun cancelClassify(call: PluginCall) { classifyCancelled = true; call.resolve() }

    private fun insights(image: Bitmap): JSONObject {
        val width = 256
        val height = max(3, min(512, (image.height.toDouble() / max(1, image.width) * width).toInt()))
        val grey = Bitmap.createScaledBitmap(image, width, height, true)
        val pixels = IntArray(width * height)
        grey.getPixels(pixels, 0, width, 0, 0, width, height)
        if (grey !== image) grey.recycle()
        val v = IntArray(pixels.size) { luma(pixels[it]) }
        var light = 0.0
        for (value in v) light += value
        var sum = 0.0; var squares = 0.0; var count = 0.0
        for (y in 1 until height - 1) for (x in 1 until width - 1) {
            val i = y * width + x
            val l = 4.0 * v[i] - v[i - 1] - v[i + 1] - v[i - width] - v[i + width]
            sum += l; squares += l * l; count++
        }
        val mean = sum / max(1.0, count)
        // Android's face detector wants an even-width RGB_565 image.
        val faces = try {
            val evenWidth = max(2, image.width and 1.inv())
            val scaled = Bitmap.createScaledBitmap(image, evenWidth, max(1, image.height), false)
            val copy = scaled.copy(Bitmap.Config.RGB_565, false)
            if (scaled !== image) scaled.recycle()
            val found = android.media.FaceDetector(copy.width, copy.height, 8).findFaces(copy, arrayOfNulls(8))
            copy.recycle(); found
        } catch (e: Exception) { 0 }
        return JSONObject().apply {
            put("text", 0); put("lines", 0); put("faces", faces)
            put("sharp", squares / max(1.0, count) - mean * mean)
            put("luma", light / v.size / 255.0)
        }
    }

    // endregion

    companion object {
        private const val ASKED = "photos-permission-asked"
        /** Versioned: when text detection arrives, older entries (text 0) are recomputed. */
        private const val INSIGHTS = "ManoInsights-a1.json"
    }
}
