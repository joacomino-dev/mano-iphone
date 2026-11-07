package work.joaquin.mano

import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.ViewGroup
import androidx.lifecycle.Lifecycle
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.ConsumeParams
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.android.gms.ads.AdListener
import com.google.android.gms.ads.AdLoader
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.RequestConfiguration
import com.google.android.gms.ads.VideoOptions
import com.google.android.gms.ads.nativead.NativeAd
import com.google.android.gms.ads.nativead.NativeAdOptions
import com.google.android.ump.ConsentInformation
import com.google.android.ump.ConsentRequestParameters
import com.google.android.ump.UserMessagingPlatform
import org.json.JSONObject
import java.util.Calendar
import java.util.TimeZone

/**
 * Android counterpart of CocoMonetization.swift, same JavaScript API
 * (src/Monetization.tsx): Google's consent form (UMP), AdMob native ads drawn as a
 * CocoWash letter (CocoNativeAdCard) and Google Play Billing.
 *
 * - Ads are limited to the G rating in code. Android has no tracking prompt: the
 *   advertising ID is the system's, and the consent string (UMP/TCF) decides
 *   personalisation where the law requires it.
 * - Products have the same IDs as on the App Store. «Sin anuncios para siempre» is
 *   a one-time product kept (acknowledged); «Invítame un café» is consumed; «Un año
 *   sin anuncios» is a one-time product kept for a year from its purchase (the date
 *   comes from the purchase Google Play signed) and consumed when it ends, so it can
 *   be bought again. Play has no non-renewing subscriptions and its rentals last 60
 *   days at most (decision of 2026-11-07, ROADMAP_PLAYSTORE).
 * - Development builds use Google's sample app and test ad unit only.
 */
@CapacitorPlugin(name = "CocoMonetization")
class CocoMonetizationPlugin : Plugin() {
    private val main = Handler(Looper.getMainLooper())
    private lateinit var billing: BillingClient
    private var buyCall: PluginCall? = null
    private var buyId: String? = null

    private var initialized = false
    private var preparing = false
    private var refreshingPrivacy = false
    private var loader: AdLoader? = null
    private var loadCall: PluginCall? = null
    private var prepared: Pair<NativeAd, Long>? = null
    private var card: CocoNativeAdCard? = null
    private var generation = 0
    /** Debug builds only: consent unavailable with the sample app ID (see prepare). */
    private var testWithoutConsent = false

    private val consent: ConsentInformation get() = UserMessagingPlatform.getConsentInformation(context)

    override fun load() {
        billing = BillingClient.newBuilder(context)
            .setListener { result, purchases -> onPurchasesUpdated(result, purchases) }
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .enableAutoServiceReconnection()
            .build()
    }

    /** 0.9.9.1 (38) on iOS: a letter never outlives its page. Leaving the app takes it
     * off the screen and keeps its ad; the page that still wants it places it again. */
    override fun handleOnPause() {
        super.handleOnPause()
        main.post { stashCard() }
    }

    override fun handleOnDestroy() {
        super.handleOnDestroy()
        removeCard(); prepared?.first?.destroy(); prepared = null
        if (::billing.isInitialized) billing.endConnection()
    }

    // region Purchases

    private fun connected(run: () -> Unit, failed: () -> Unit) {
        if (billing.isReady) { run(); return }
        billing.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                main.post { if (result.responseCode == BillingClient.BillingResponseCode.OK) run() else failed() }
            }
            override fun onBillingServiceDisconnected() {}
        })
    }

    /** Owned purchases → entitlement. Keeps every kept product acknowledged (Play
     * refunds unacknowledged ones after three days), consumes coffees and years
     * that ended. */
    private fun entitlements(done: (JSObject?) -> Unit) {
        connected({
            billing.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build()) { result, purchases ->
                main.post {
                    if (result.responseCode != BillingClient.BillingResponseCode.OK) { done(null); return@post }
                    var lifetime = false
                    var expiry = 0L
                    for (purchase in purchases) {
                        if (purchase.purchaseState != Purchase.PurchaseState.PURCHASED) continue
                        val id = purchase.products.firstOrNull() ?: continue
                        when (id) {
                            COFFEE -> consume(purchase)
                            LIFETIME -> { lifetime = true; acknowledge(purchase) }
                            ANNUAL -> {
                                val end = yearAfter(purchase.purchaseTime)
                                if (end > System.currentTimeMillis()) { expiry = maxOf(expiry, end); acknowledge(purchase) } else consume(purchase)
                            }
                        }
                    }
                    done(JSObject().apply {
                        when {
                            lifetime -> { put("adFree", true); put("expires", JSONObject.NULL) }
                            expiry > 0 -> { put("adFree", true); put("expires", expiry) }
                            else -> { put("adFree", false); put("expires", JSONObject.NULL) }
                        }
                    })
                }
            }
        }, { done(null) })
    }

    private fun yearAfter(time: Long): Long = Calendar.getInstance(TimeZone.getTimeZone("UTC")).apply {
        timeInMillis = time; add(Calendar.YEAR, 1)
    }.timeInMillis

    private fun acknowledge(purchase: Purchase) {
        if (purchase.isAcknowledged) return
        billing.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder().setPurchaseToken(purchase.purchaseToken).build()) { }
    }

    private fun consume(purchase: Purchase, done: (() -> Unit)? = null) {
        billing.consumeAsync(ConsumeParams.newBuilder().setPurchaseToken(purchase.purchaseToken).build()) { _, _ -> done?.let { main.post(it) } }
    }

    @PluginMethod
    fun status(call: PluginCall) {
        entitlements { state -> call.resolve(state ?: JSObject().apply { put("adFree", false); put("expires", JSONObject.NULL) }) }
    }

    private fun details(ids: List<String>, done: (List<ProductDetails>?) -> Unit) {
        val params = QueryProductDetailsParams.newBuilder().setProductList(ids.map {
            QueryProductDetailsParams.Product.newBuilder().setProductId(it).setProductType(BillingClient.ProductType.INAPP).build()
        }).build()
        billing.queryProductDetailsAsync(params) { result, list ->
            main.post { done(if (result.responseCode == BillingClient.BillingResponseCode.OK) list.productDetailsList else null) }
        }
    }

    @PluginMethod
    fun catalog(call: PluginCall) {
        connected({
            details(PRODUCTS) { list ->
                if (list.isNullOrEmpty()) { call.reject("Play catalog unavailable"); return@details }
                entitlements { state ->
                    val data = state ?: JSObject().apply { put("adFree", false); put("expires", JSONObject.NULL) }
                    data.put("products", JSArray(list.mapNotNull { p ->
                        p.oneTimePurchaseOfferDetails?.formattedPrice?.let { price -> JSObject().apply { put("id", p.productId); put("price", price) } }
                    }))
                    call.resolve(data)
                }
            }
        }, { call.reject("Play catalog unavailable") })
    }

    @PluginMethod
    fun buy(call: PluginCall) {
        val id = call.getString("id")
        if (buyCall != null || id == null || id !in PRODUCTS) { call.reject("Purchase unavailable"); return }
        connected({
            details(listOf(id)) { list ->
                val product = list?.firstOrNull()
                val activity = activity
                if (product == null || activity == null) { call.reject("Product unavailable"); return@details }
                buyCall = call; buyId = id
                val flow = BillingFlowParams.newBuilder().setProductDetailsParamsList(listOf(
                    BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(product).build())).build()
                val result = billing.launchBillingFlow(activity, flow)
                if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                    buyCall = null; buyId = null
                    if (result.responseCode == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) restoreInto(call, "purchased")
                    else call.reject("Purchase unavailable")
                }
            }
        }, { call.reject("Purchase unavailable") })
    }

    private fun onPurchasesUpdated(result: BillingResult, purchases: List<Purchase>?) {
        main.post {
            val call = buyCall; val id = buyId
            buyCall = null; buyId = null
            val ours = purchases.orEmpty().filter { p -> p.products.any { it in PRODUCTS } }
            var outcome = when (result.responseCode) {
                BillingClient.BillingResponseCode.OK -> if (ours.any { it.purchaseState == Purchase.PurchaseState.PENDING }) "pending" else "purchased"
                BillingClient.BillingResponseCode.USER_CANCELED -> "cancelled"
                BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED -> "purchased"
                else -> null
            }
            val bought = ours.filter { it.purchaseState == Purchase.PurchaseState.PURCHASED }
            for (purchase in bought) {
                when (purchase.products.firstOrNull()) {
                    COFFEE -> consume(purchase)
                    LIFETIME, ANNUAL -> { acknowledge(purchase); invalidateAd() }
                }
            }
            if (call == null) { if (bought.isNotEmpty()) notifyListeners("purchaseChanged", JSObject()); return@post }
            if (outcome == null) { call.reject("Purchase unavailable"); return@post }
            if (outcome == "purchased" && id != COFFEE && bought.isEmpty() && result.responseCode == BillingClient.BillingResponseCode.OK) outcome = "pending"
            restoreInto(call, outcome)
        }
    }

    private fun restoreInto(call: PluginCall, outcome: String?) {
        entitlements { state ->
            val data = state ?: JSObject().apply { put("adFree", false); put("expires", JSONObject.NULL) }
            if (data.optBoolean("adFree")) invalidateAd()
            outcome?.let { data.put("outcome", it) }
            call.resolve(data)
        }
    }

    @PluginMethod
    fun restore(call: PluginCall) {
        connected({ restoreInto(call, null) }, { call.reject("Restore unavailable") })
    }

    // endregion
    // region Ads

    /** Development builds: Google's test unit only. Release builds: the real unit,
     * and nothing if it is still Google's sample (as on iOS). */
    private val unitId: String?
        get() = if (BuildConfig.DEBUG || BuildConfig.COCO_TEST_ADS) TEST_UNIT
        else BuildConfig.ADMOB_NATIVE_UNIT.takeIf { it.startsWith("ca-app-pub-") && !it.startsWith("ca-app-pub-3940256099942544") }

    private fun resumed() = activity?.lifecycle?.currentState?.isAtLeast(Lifecycle.State.RESUMED) == true

    private fun adFree(done: (Boolean) -> Unit) = entitlements { done(it?.optBoolean("adFree") == true) }

    @PluginMethod
    fun prepare(call: PluginCall) {
        main.post {
            val activity = activity
            val unit = unitId
            if (unit == null || activity == null || !resumed() || preparing || refreshingPrivacy || loader != null) {
                call.resolve(JSObject().apply { put("ready", false) }); return@post
            }
            adFree { free ->
                if (free) { call.resolve(JSObject().apply { put("ready", false) }); return@adFree }
                prepared?.let { (ad, at) ->
                    if (System.currentTimeMillis() - at < 30 * 60_000) { call.resolve(JSObject().apply { put("ready", true) }); return@adFree }
                    ad.destroy()
                }
                prepared = null
                preparing = true
                val requestGeneration = generation
                val start = {
                    if (!(consent.canRequestAds() || testWithoutConsent) || generation != requestGeneration) { preparing = false; call.resolve(JSObject().apply { put("ready", false) }) }
                    else load(unit, call)
                }
                if (initialized) { start(); return@adFree }
                val initialize = {
                    // Family-safe ads only (G), whatever the AdMob console says.
                    MobileAds.setRequestConfiguration(RequestConfiguration.Builder()
                        .setMaxAdContentRating(RequestConfiguration.MAX_AD_CONTENT_RATING_G).build())
                    MobileAds.initialize(context) { main.post { initialized = true; start() } }
                }
                // Development builds carry Google's sample app ID, which has no consent
                // messages: UMP answers with an error. There, and only with the test unit,
                // the letter is still tried (non-personalised test ads). Store builds never
                // request an ad without the consent flow.
                val developmentFallback = { reason: String ->
                    devLog("COCOWASH_ADS_CONSENT_UNAVAILABLE $reason")
                    if (BuildConfig.DEBUG && unit == TEST_UNIT) { testWithoutConsent = true; initialize() }
                    else { preparing = false; call.resolve(JSObject().apply { put("ready", false) }) }
                }
                consent.requestConsentInfoUpdate(activity, ConsentRequestParameters.Builder().build(), {
                    UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity) { formError ->
                        if (formError != null) { developmentFallback("form ${formError.errorCode}"); return@loadAndShowConsentFormIfRequired }
                        if (!consent.canRequestAds()) { devLog("COCOWASH_ADS_NO_CONSENT"); preparing = false; call.resolve(JSObject().apply { put("ready", false) }); return@loadAndShowConsentFormIfRequired }
                        initialize()
                    }
                }, { error -> developmentFallback("update ${error.errorCode} ${error.message}") })
            }
        }
    }

    private fun load(unit: String, call: PluginCall) {
        loadCall = call
        val built = AdLoader.Builder(context, unit)
            .forNativeAd { ad ->
                main.post {
                    if (loader == null || activity?.isDestroyed != false) { ad.destroy(); return@post }
                    prepared = ad to System.currentTimeMillis()
                    finishLoad(true)
                }
            }
            .withAdListener(object : AdListener() {
                override fun onAdFailedToLoad(error: LoadAdError) {
                    devLog("COCOWASH_AD_LOAD_FAILED ${error.code} ${error.message}")
                    main.post { if (loader != null) finishLoad(false) }
                }
            })
            .withNativeAdOptions(NativeAdOptions.Builder()
                .setVideoOptions(VideoOptions.Builder().setStartMuted(true).build())
                .setAdChoicesPlacement(NativeAdOptions.ADCHOICES_TOP_RIGHT)
                .build())
            .build()
        loader = built
        built.loadAd(AdRequest.Builder().build())
        main.postDelayed({ if (loader === built) finishLoad(false) }, 8_000)
    }

    private fun finishLoad(ready: Boolean) {
        loader = null; preparing = false
        loadCall?.resolve(JSObject().apply { put("ready", ready) })
        loadCall = null
    }

    /** Places (or moves) the native letter over the web placeholder (CSS pixels of
     * the WebView). `deck`: the full letter in the pile, dismissed by swiping;
     * `inline`: the compact fixed letter of the summary and «Una última mirada».
     * `hidden` keeps it but hides it while the placeholder moves or is off screen. */
    @PluginMethod
    fun show(call: PluginCall) {
        main.post {
            val web = bridge.webView
            val root = activity?.findViewById<ViewGroup>(android.R.id.content)
            val x = call.getDouble("x"); val y = call.getDouble("y")
            val width = call.getDouble("width"); val height = call.getDouble("height")
            if (web == null || root == null || x == null || y == null || width == null || height == null ||
                width < 200 || height < 140 || listOf(x, y, width, height).any { !it.isFinite() }) {
                call.resolve(JSObject().apply { put("shown", false) }); return@post
            }
            val density = context.resources.displayMetrics.density
            val webAt = IntArray(2).also { web.getLocationInWindow(it) }
            val rootAt = IntArray(2).also { root.getLocationInWindow(it) }
            val left = webAt[0] - rootAt[0] + (x * density).toFloat()
            val top = webAt[1] - rootAt[1] + (y * density).toFloat()
            val w = (width * density).toInt(); val h = (height * density).toInt()
            val inside = x >= -1 && y >= -1 && (x + width) * density <= web.width + density && (y + height) * density <= web.height + density
            val hidden = call.getBoolean("hidden") == true || !inside
            if (!(consent.canRequestAds() || testWithoutConsent)) { invalidateAd(); call.resolve(JSObject().apply { put("shown", false) }); return@post }
            // Leaving or coming back (not resumed yet): keep the ad, hide the letter, ask again.
            if (!resumed()) {
                card?.conceal(true)
                call.resolve(JSObject().apply { if (hidden) put("shown", card != null) else { put("shown", false); put("retry", true) } })
                return@post
            }
            card?.let {
                it.place(left, top, w, h); it.conceal(hidden)
                call.resolve(JSObject().apply { put("shown", true) }); return@post
            }
            if (hidden) { call.resolve(JSObject().apply { put("shown", false) }); return@post }
            val requestGeneration = generation
            adFree { free ->
                val ready = prepared
                if (free || generation != requestGeneration || ready == null || System.currentTimeMillis() - ready.second > 30 * 60_000 || card != null) {
                    call.resolve(JSObject().apply { put("shown", card != null) }); return@adFree
                }
                prepared = null
                val deck = (call.getString("style") ?: if (call.getBoolean("deck") == true) "deck" else "inline") == "deck"
                val view = CocoNativeAdCard(context, ready.first, deck, CocoNativeAdCard.Labels(call.getObject("labels")))
                view.dismiss = { removeCard(destroy = true); notifyListeners("adDismissed", JSObject()) }
                card = view
                root.addView(view, ViewGroup.LayoutParams(w, h))
                view.place(left, top, w, h)
                call.resolve(JSObject().apply { put("shown", true) })
            }
        }
    }

    private fun stashCard() {
        val current = card ?: return
        if (prepared == null) prepared = current.ad to System.currentTimeMillis() else current.ad.destroy()
        generation++
        removeCard(destroy = false)
    }

    private fun removeCard(destroy: Boolean = true) {
        card?.let { (it.parent as? ViewGroup)?.removeView(it); if (destroy) it.ad.destroy() }
        card = null
    }

    private fun invalidateAd() {
        generation++
        if (loader != null) finishLoad(false)
        prepared?.first?.destroy(); prepared = null
        removeCard()
    }

    @PluginMethod
    fun hide(call: PluginCall) {
        main.post { generation++; removeCard(); call.resolve() }
    }

    /** «Privacidad de anuncios»: Google's privacy options where they apply (EEA/UK,
     * US states), otherwise Android's own privacy settings (advertising ID). */
    @PluginMethod
    fun privacy(call: PluginCall) {
        main.post {
            val activity = activity
            if (activity == null || preparing || refreshingPrivacy) { call.reject("Privacy options unavailable"); return@post }
            refreshingPrivacy = true
            invalidateAd()
            val open = {
                if (consent.privacyOptionsRequirementStatus == ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED) {
                    UserMessagingPlatform.showPrivacyOptionsForm(activity) { error ->
                        refreshingPrivacy = false
                        if (error == null) call.resolve() else call.reject("Privacy options unavailable")
                    }
                } else {
                    refreshingPrivacy = false
                    try { activity.startActivity(Intent(Settings.ACTION_PRIVACY_SETTINGS)); call.resolve() }
                    catch (e: Exception) { call.reject("Privacy options unavailable") }
                }
            }
            if (initialized) open()
            else consent.requestConsentInfoUpdate(activity, ConsentRequestParameters.Builder().build(), { open() }, { open() })
        }
    }

    // endregion

    companion object {
        const val ANNUAL = "work.joaquin.mano.noads.year"
        const val LIFETIME = "work.joaquin.mano.noads.lifetime"
        const val COFFEE = "work.joaquin.mano.coffee"
        val PRODUCTS = listOf(ANNUAL, LIFETIME, COFFEE)
        /** Google's public test unit for native ads on Android. */
        const val TEST_UNIT = "ca-app-pub-3940256099942544/2247696110"
    }
}
