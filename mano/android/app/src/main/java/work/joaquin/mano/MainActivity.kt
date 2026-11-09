package work.joaquin.mano

import android.os.Bundle
import android.view.KeyEvent
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatDelegate
import com.getcapacitor.BridgeActivity

/**
 * CocoWash's single activity. The interface is the same React app as on the
 * iPhone, in a WebView; native features are Capacitor plugins with the same
 * JavaScript API as the Swift ones.
 */
class MainActivity : BridgeActivity() {
    private var onBack: (() -> Unit)? = null
    private var webBackActive = false
    private var fullscreenClient: CocoWebChromeClient? = null

    /** Fullscreen first, then the web sheet or anchored view: Back closes one layer.
     * Otherwise disabled, so Back (and the predictive back-to-home preview) behaves
     * like any Android app. */
    private val back = object : OnBackPressedCallback(false) {
        override fun handleOnBackPressed() {
            if (fullscreenClient?.handleBack() == true) return
            devLog("COCOWASH_BACK route=web")
            onBack?.invoke()
        }
    }

    private fun syncBackHandling() {
        back.isEnabled = webBackActive || fullscreenClient?.isFullscreen == true
    }

    fun setBackHandling(active: Boolean, handler: () -> Unit) {
        onBack = if (active) handler else null
        webBackActive = active
        syncBackHandling()
    }

    // WebView's native fullscreen view can consume the legacy Back key before
    // OnBackPressedDispatcher sees it. Own the key pair only for this overlay.
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.keyCode == KeyEvent.KEYCODE_BACK && fullscreenClient?.isFullscreen == true) {
            if (event.action == KeyEvent.ACTION_UP && !event.isCanceled) fullscreenClient?.handleBack()
            return true
        }
        return super.dispatchKeyEvent(event)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        // The paper design is light only (the iPhone forces dark status-bar text too):
        // keeps the system bars' icons dark and stops WebView auto-darkening.
        AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO)
        registerPlugin(PhotoLibraryPlugin::class.java)
        registerPlugin(CocoMonetizationPlugin::class.java)
        super.onCreate(savedInstanceState)
        onBackPressedDispatcher.addCallback(this, back)
        // Videos stream from MediaStore through the WebView (see CocoWebViewClient).
        bridge?.let {
            it.webViewClient = CocoWebViewClient(it)
            fullscreenClient = CocoWebChromeClient(it, this) { syncBackHandling() }
            it.webView.webChromeClient = fullscreenClient
        }
    }

    override fun onDestroy() { fullscreenClient?.exitFullscreen();super.onDestroy() }
}
