package work.joaquin.mano

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ColorFilter
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.Drawable
import android.graphics.drawable.GradientDrawable
import android.provider.Settings
import android.text.TextUtils
import android.util.TypedValue
import android.view.Gravity
import android.view.HapticFeedbackConstants
import android.view.MotionEvent
import android.view.VelocityTracker
import android.view.View
import android.view.ViewConfiguration
import android.view.ViewGroup
import android.view.accessibility.AccessibilityEvent
import android.view.animation.AccelerateInterpolator
import android.view.animation.OvershootInterpolator
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.view.ViewCompat
import androidx.core.view.accessibility.AccessibilityNodeInfoCompat
import com.getcapacitor.JSObject
import com.google.android.gms.ads.nativead.MediaView
import com.google.android.gms.ads.nativead.NativeAd
import com.google.android.gms.ads.nativead.NativeAdView
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.tanh

/**
 * Native ad drawn as a CocoWash letter, like CocoNativeAdCard on iOS: ivory writing
 * paper with airmail edges and «Publicidad» in a dashed postage-stamp frame.
 * - deck: the full letter in the pile. No buttons: like every card it leaves with a
 *   swipe — the first nudges it aside, the second sends it away. TalkBack gets a
 *   custom action instead.
 * - inline: a compact letter fixed in the round summary and «Una última mirada»;
 *   tapping it opens the ad, as with any ad.
 * The plugin positions this view; only its contents move.
 */
@SuppressLint("ViewConstructor")
class CocoNativeAdCard(context: Context, val ad: NativeAd, private val deck: Boolean, private val labels: Labels) : FrameLayout(context) {
    /** Texts in the app's language, sent by the web side (Monetization.tsx). */
    class Labels(private val raw: JSObject?) {
        private fun pick(key: String, fallback: String) = raw?.optString(key)?.takeIf { it.isNotEmpty() } ?: fallback
        val stamp = pick("stamp", "Publicidad")
        val greeting = pick("greeting", "Esta carta mantiene CocoWash gratis")
        val hint = pick("hint", "‹  Desliza para seguir  ›")
        val again = pick("again", "Una vez más y seguimos")
        val againSpoken = pick("againSpoken", "Desliza otra vez para seguir")
        val spokenDeck = pick("spokenDeck", "Anuncio. Desliza dos veces para volver a tus fotos.")
        val skip = pick("skip", "Seguir sin el anuncio")
        val rtl = pick("direction", "ltr") == "rtl"
    }

    var dismiss: (() -> Unit)? = null
    private val surface = Surface(context)
    private val hint = TextView(context)
    private var offset = 0f
    private var leaving = false
    private var concealed = false
    private val reduced: Boolean get() =
        Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f

    private fun dp(value: Float) = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value, resources.displayMetrics)
    private fun dpi(value: Float) = dp(value).toInt()
    private fun text(size: Float, color: Int, bold: Boolean = false) = TextView(context).apply {
        setTextSize(TypedValue.COMPLEX_UNIT_SP, size)
        setTextColor(color)
        typeface = Typeface.create(letterFont(context), if (bold) 600 else 500, false)
        gravity = Gravity.START or Gravity.CENTER_VERTICAL
        textDirection = View.TEXT_DIRECTION_FIRST_STRONG
        includeFontPadding = false
    }

    init {
        layoutDirection = if (labels.rtl) View.LAYOUT_DIRECTION_RTL else View.LAYOUT_DIRECTION_LTR
        textDirection = View.TEXT_DIRECTION_FIRST_STRONG
        clipChildren = false
        clipToPadding = false
        val creative = NativeAdView(context)

        // «Publicidad» in a dashed stamp frame, read first by TalkBack.
        val stamp = text(12f, TURQUOISE, bold = true).apply {
            text = labels.stamp
            setPadding(dpi(8f), dpi(3f), dpi(8f), dpi(3f))
            background = GradientDrawable().apply {
                cornerRadius = dp(3f)
                setStroke(dpi(1.5f), TURQUOISE, dp(3f), dp(2f))
            }
        }
        val headline = text(if (deck) 17f else 15f, INK, bold = true).apply {
            text = ad.headline
            maxLines = 2
            ellipsize = TextUtils.TruncateAt.END
        }
        val media = MediaView(context).apply {
            setImageScaleType(if (deck) ImageView.ScaleType.FIT_CENTER else ImageView.ScaleType.CENTER_CROP)
            setBackgroundColor(PAPER)
            clipToOutline = true
            outlineProvider = android.view.ViewOutlineProvider.BACKGROUND
            background = GradientDrawable().apply { setColor(PAPER); cornerRadius = dp(4f) }
            ad.mediaContent?.let { mediaContent = it }
        }
        // The SDK handles the tap on the call to action; the view only draws it.
        val action = text(if (deck) 15f else 14f, PAPER, bold = true).apply {
            text = ad.callToAction
            visibility = if (ad.callToAction == null) View.GONE else View.VISIBLE
            gravity = Gravity.CENTER
            minHeight = dpi(if (deck) 44f else 36f)
            setPadding(dpi(14f), dpi(6f), dpi(14f), dpi(6f))
            maxLines = 1
            ellipsize = TextUtils.TruncateAt.END
            background = GradientDrawable().apply { setColor(TEAL); cornerRadius = dp(100f) }
        }
        val icon = ImageView(context).apply {
            scaleType = ImageView.ScaleType.CENTER_CROP
            clipToOutline = true
            background = GradientDrawable().apply { cornerRadius = dp(8f) }
            outlineProvider = android.view.ViewOutlineProvider.BACKGROUND
            setImageDrawable(ad.icon?.drawable)
            visibility = if (ad.icon?.drawable == null) View.GONE else View.VISIBLE
        }
        val iconSize = dpi(if (deck) 36f else 28f)
        // Room on the right for the AdChoices mark the SDK places in the top corner.
        val top = LinearLayout(context).apply {
            addView(stamp, LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT))
            setPadding(0, 0, dpi(28f), 0)
        }
        val title = LinearLayout(context).apply {
            gravity = Gravity.CENTER_VERTICAL
            addView(icon, LinearLayout.LayoutParams(iconSize, iconSize).apply { marginEnd = dpi(if (deck) 10f else 8f) })
            addView(headline, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        }
        val assets: LinearLayout
        if (deck) {
            val greeting = text(13f, INK_SOFT).apply { text = labels.greeting; maxLines = 2 }
            assets = LinearLayout(context).apply {
                orientation = LinearLayout.VERTICAL
                addView(top)
                addView(greeting, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dpi(8f) })
                addView(title, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dpi(12f) })
                addView(media, LinearLayout.LayoutParams(-1, 0, 1f).apply { topMargin = dpi(8f) })
                addView(action, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dpi(12f) })
            }
            media.minimumHeight = dpi(120f)
        } else {
            // [media 120×120] [«Publicidad» · headline · call to action]
            val column = LinearLayout(context).apply {
                orientation = LinearLayout.VERTICAL
                addView(top)
                addView(title, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dpi(6f) })
                addView(View(context), LinearLayout.LayoutParams(-1, 0, 1f))
                addView(action, LinearLayout.LayoutParams(-2, -2))
            }
            assets = LinearLayout(context).apply {
                addView(media, LinearLayout.LayoutParams(dpi(120f), dpi(120f)).apply { marginEnd = dpi(12f); gravity = Gravity.CENTER_VERTICAL })
                addView(column, LinearLayout.LayoutParams(0, -1, 1f))
            }
        }
        val pad = dpi(if (deck) 18f else 14f)
        assets.setPadding(dpi(if (deck) 16f else 14f), pad, dpi(if (deck) 16f else 14f), pad)
        creative.addView(assets, LayoutParams(-1, -1))
        creative.headlineView = headline
        creative.mediaView = media
        creative.callToActionView = action
        creative.iconView = icon
        creative.setNativeAd(ad)

        surface.background = GradientDrawable().apply {
            setColor(IVORY); cornerRadius = dp(6f); setStroke(dpi(1f), EDGE)
        }
        surface.elevation = dp(if (deck) 8f else 5f)
        surface.outlineProvider = android.view.ViewOutlineProvider.BACKGROUND
        surface.clipToOutline = true
        surface.addView(creative, LayoutParams(-1, -1))
        for (gravity in listOf(Gravity.TOP, Gravity.BOTTOM)) {
            surface.addView(View(context).apply { background = Airmail(dp(28f)) }, LayoutParams(-1, dpi(6f), gravity))
        }
        addView(surface, LayoutParams(-1, -1).apply {
            if (deck) { leftMargin = dpi(14f); rightMargin = dpi(14f); bottomMargin = dpi(32f) }
        })

        if (deck) {
            hint.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            hint.typeface = letterFont(context)
            hint.setTextColor(INK_SOFT)
            hint.gravity = Gravity.CENTER
            hint.text = labels.hint
            hint.contentDescription = labels.spokenDeck
            addView(hint, LayoutParams(-1, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM).apply {
                leftMargin = dpi(14f); rightMargin = dpi(14f); bottomMargin = dpi(4f)
            })
            ViewCompat.addAccessibilityAction(hint, labels.skip) { _, _ -> leave(1f, 0f); true }
            ViewCompat.addAccessibilityAction(surface, labels.skip) { _, _ -> leave(1f, 0f); true }
        }
        alpha = 0f
    }

    /** Called by the plugin with window pixels. */
    fun place(left: Float, top: Float, width: Int, height: Int) {
        val params = layoutParams
        if (params != null && (params.width != width || params.height != height)) { params.width = width; params.height = height; layoutParams = params }
        x = left; y = top
    }

    /** Deck: the entrance of a dealt card (up 16 dp, 96 % scale). Inline: a fade in place. */
    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        if (reduced) { alpha = if (concealed) 0f else 1f; return }
        if (deck) { surface.translationY = dp(16f); surface.scaleX = 0.96f; surface.scaleY = 0.96f }
        animate().alpha(if (concealed) 0f else 1f).setDuration(if (deck) 300 else 200).start()
        surface.animate().translationY(0f).scaleX(1f).scaleY(1f).setDuration(300).setInterpolator(OvershootInterpolator(0.6f)).start()
    }

    /** Hidden while its placeholder moves or is partly off screen; same frame after. */
    fun conceal(hidden: Boolean) {
        if (hidden == concealed || leaving) return
        concealed = hidden
        isEnabled = !hidden
        importantForAccessibility = if (hidden) View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS else View.IMPORTANT_FOR_ACCESSIBILITY_AUTO
        animate().cancel()
        animate().alpha(if (hidden) 0f else 1f).setDuration(if (hidden || reduced) 80 else 160).start()
    }

    override fun dispatchTouchEvent(event: MotionEvent): Boolean = if (concealed) false else super.dispatchTouchEvent(event)

    private fun leave(direction: Float, velocity: Float) {
        if (leaving) return
        leaving = true
        isEnabled = false
        performHapticFeedback(HapticFeedbackConstants.CONTEXT_CLICK)
        val distance = width + dp(120f)
        val duration = if (reduced) 140L else min(320f, max(180f, distance / max(abs(velocity), 900f) * 1000f)).toLong()
        hint.animate().alpha(0f).setDuration(duration).start()
        surface.animate().alpha(0f).apply {
            if (!reduced) translationX(direction * distance).translationY(-dp(24f)).rotation(direction * 12.6f)
        }.setDuration(duration).setInterpolator(AccelerateInterpolator()).withEndAction { dismiss?.invoke() }.start()
    }

    private fun settle() {
        surface.animate().translationX(offset).rotation(if (reduced) 0f else offset / resources.displayMetrics.density / 15.7f)
            .setDuration(if (reduced) 0 else 420).setInterpolator(OvershootInterpolator(1.4f)).start()
    }

    /** Swipe handling for the deck letter: horizontal drags belong to the letter;
     * taps still reach the ad (the SDK records clicks on its assets). */
    private inner class Surface(context: Context) : FrameLayout(context) {
        private var downX = 0f
        private var downY = 0f
        private var dragging = false
        private var tracker: VelocityTracker? = null
        private val slop = ViewConfiguration.get(context).scaledTouchSlop

        override fun onInterceptTouchEvent(event: MotionEvent): Boolean {
            if (!deck) return false
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> { downX = event.rawX; downY = event.rawY; dragging = false; tracker?.recycle(); tracker = VelocityTracker.obtain(); tracker?.addMovement(event) }
                MotionEvent.ACTION_MOVE -> {
                    tracker?.addMovement(event)
                    val dx = event.rawX - downX; val dy = event.rawY - downY
                    if (abs(dx) > slop && abs(dx) > abs(dy)) { dragging = true; parent?.requestDisallowInterceptTouchEvent(true) }
                }
            }
            return dragging
        }

        @SuppressLint("ClickableViewAccessibility")
        override fun onTouchEvent(event: MotionEvent): Boolean {
            if (!deck || leaving) return super.onTouchEvent(event)
            tracker?.addMovement(event)
            val dx = event.rawX - downX
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> { downX = event.rawX; downY = event.rawY; tracker?.recycle(); tracker = VelocityTracker.obtain(); tracker?.addMovement(event); return true }
                MotionEvent.ACTION_MOVE -> {
                    // First swipe resists like a rubber band; after the nudge it follows the finger.
                    val x = if (offset == 0f) dp(44f) * tanh(dx / dp(110f)) else offset + dx
                    translationX = x
                    rotation = if (reduced) 0f else x / 15.7f / resources.displayMetrics.density
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    tracker?.computeCurrentVelocity(1000)
                    val v = (tracker?.xVelocity ?: 0f) / resources.displayMetrics.density
                    val moved = dx / resources.displayMetrics.density
                    tracker?.recycle(); tracker = null; dragging = false
                    when {
                        event.actionMasked == MotionEvent.ACTION_UP && offset != 0f && (abs(moved) >= 60 || abs(v) >= 700) ->
                            leave(if (moved + v * 0.05f >= 0) 1f else -1f, v * resources.displayMetrics.density)
                        event.actionMasked == MotionEvent.ACTION_UP && offset == 0f && abs(moved) >= 30 -> {
                            offset = if (moved > 0) dp(16f) else -dp(16f)
                            performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)
                            hint.text = labels.again
                            hint.announceForAccessibility(labels.againSpoken)
                            settle()
                        }
                        else -> settle()
                    }
                }
            }
            return true
        }
    }

    /** Diagonal airmail stripes: turquoise, paper, heart pink, paper. */
    private class Airmail(private val tile: Float) : Drawable() {
        private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        override fun draw(canvas: Canvas) {
            val b = bounds
            canvas.save(); canvas.clipRect(b)
            paint.color = IVORY; canvas.drawRect(b, paint)
            var start = b.left - b.height() - tile
            var i = 0
            while (start < b.right + tile) {
                paint.color = if (i % 2 == 0) TURQUOISE else HEART
                val w = tile * 9f / 28f; val h = b.height().toFloat()
                val path = Path().apply {
                    moveTo(start, b.bottom.toFloat()); lineTo(start + w, b.bottom.toFloat())
                    lineTo(start + w + h, b.top.toFloat()); lineTo(start + h, b.top.toFloat()); close()
                }
                canvas.drawPath(path, paint)
                start += tile / 2; i++
            }
            canvas.restore()
        }
        override fun setAlpha(alpha: Int) { paint.alpha = alpha }
        override fun setColorFilter(colorFilter: ColorFilter?) { paint.colorFilter = colorFilter }
        @Deprecated("Deprecated in Java")
        override fun getOpacity() = PixelFormat.OPAQUE
    }

    companion object {
        @Volatile private var cachedLetterFont: Typeface? = null
        private fun letterFont(context: Context): Typeface = cachedLetterFont ?: synchronized(this) {
            cachedLetterFont ?: runCatching {
                Typeface.Builder(context.assets, "fonts/fredoka-variable.ttf")
                    .setFontVariationSettings("'wght' 600, 'wdth' 100")
                    .setFallback("sans-serif").build()
            }.getOrNull().let { font ->
                // A missing font must never make advertising crash the gallery.
                (font ?: Typeface.create("sans-serif", Typeface.NORMAL)).also { cachedLetterFont = it }
            }
        }
        // Same values as the web tokens (prototype.css) and the iOS letter.
        val IVORY = Color.rgb(255, 253, 247)
        val INK = Color.rgb(37, 58, 58)
        val INK_SOFT = Color.rgb(59, 78, 75)
        val TEAL = Color.rgb(29, 64, 66)
        val TURQUOISE = Color.rgb(30, 116, 112)
        val HEART = Color.rgb(239, 154, 152)
        val PAPER = Color.rgb(242, 231, 213)
        val EDGE = Color.rgb(217, 200, 172)
    }
}
