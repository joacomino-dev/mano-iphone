package work.joaquin.mano

import android.graphics.Color
import android.view.View
import android.view.ViewGroup
import android.webkit.WebChromeClient
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.getcapacitor.Bridge
import com.getcapacitor.BridgeWebChromeClient

/** Capacitor keeps permission/dialog handling. Only its immediately-dismissed
 * custom video view is replaced: the same inline decoder enters/leaves fullscreen. */
class CocoWebChromeClient(private val cocoBridge: Bridge, private val host: AppCompatActivity, private val fullscreenChanged: () -> Unit) : BridgeWebChromeClient(cocoBridge) {
    private var videoView: View? = null
    private var hidden: WebChromeClient.CustomViewCallback? = null
    private var webVisibility = View.VISIBLE
    private var statusVisible = true
    private var navigationVisible = true
    private var barsBehavior = 0
    private val bars get() = WindowInsetsControllerCompat(host.window, host.window.decorView)
    val isFullscreen get() = videoView != null

    override fun onShowCustomView(view: View, callback: WebChromeClient.CustomViewCallback) {
        if (videoView != null) { callback.onCustomViewHidden(); return }
        val insets = ViewCompat.getRootWindowInsets(host.window.decorView)
        statusVisible = insets?.isVisible(WindowInsetsCompat.Type.statusBars()) ?: true
        navigationVisible = insets?.isVisible(WindowInsetsCompat.Type.navigationBars()) ?: true
        barsBehavior = bars.systemBarsBehavior
        webVisibility = cocoBridge.webView.visibility
        videoView = view; hidden = callback
        view.setBackgroundColor(Color.BLACK)
        host.addContentView(view, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        cocoBridge.webView.visibility = View.INVISIBLE
        bars.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        bars.hide(WindowInsetsCompat.Type.systemBars())
        fullscreenChanged()
        devLog("COCOWASH_FULLSCREEN shown=true")
    }

    override fun onHideCustomView() { exitFullscreen() }

    /** One Activity callback gives fullscreen priority over the web overlay.
     * Exit the DOM fullscreen state as well as the native custom surface. */
    fun handleBack(): Boolean {
        if (!isFullscreen) return false
        devLog("COCOWASH_BACK route=fullscreen")
        cocoBridge.webView.evaluateJavascript(
            "if(document.fullscreenElement){document.exitFullscreen().catch(function(){});}", null
        )
        exitFullscreen()
        return true
    }

    fun exitFullscreen() {
        val view = videoView ?: return
        val callback = hidden
        videoView = null; hidden = null
        (view.parent as? ViewGroup)?.removeView(view)
        cocoBridge.webView.visibility = webVisibility
        bars.systemBarsBehavior = barsBehavior
        if (statusVisible) bars.show(WindowInsetsCompat.Type.statusBars()) else bars.hide(WindowInsetsCompat.Type.statusBars())
        if (navigationVisible) bars.show(WindowInsetsCompat.Type.navigationBars()) else bars.hide(WindowInsetsCompat.Type.navigationBars())
        callback?.onCustomViewHidden()
        fullscreenChanged()
        devLog("COCOWASH_FULLSCREEN shown=false")
    }
}
