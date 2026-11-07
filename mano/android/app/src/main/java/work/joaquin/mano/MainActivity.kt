package work.joaquin.mano

import android.os.Bundle
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

    /** Enabled only while a sheet or the anchored view is open: Back closes it.
     * Otherwise disabled, so Back (and the predictive back-to-home preview) behaves
     * like any Android app. */
    private val back = object : OnBackPressedCallback(false) {
        override fun handleOnBackPressed() { onBack?.invoke() }
    }

    fun setBackHandling(active: Boolean, handler: () -> Unit) {
        onBack = if (active) handler else null
        back.isEnabled = active
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        // The paper design is light only (the iPhone forces dark status-bar text too):
        // keeps the system bars' icons dark and stops WebView auto-darkening.
        AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO)
        registerPlugin(PhotoLibraryPlugin::class.java)
        registerPlugin(CocoMonetizationPlugin::class.java)
        super.onCreate(savedInstanceState)
        // Videos stream from MediaStore through the WebView (see CocoWebViewClient).
        bridge?.let { it.webViewClient = CocoWebViewClient(it) }
        onBackPressedDispatcher.addCallback(this, back)
    }
}
