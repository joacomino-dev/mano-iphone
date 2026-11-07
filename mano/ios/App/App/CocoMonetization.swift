import AppTrackingTransparency
import Capacitor
import GoogleMobileAds
import StoreKit
import UIKit
import UserMessagingPlatform

@objc(CocoMonetizationPlugin)
final class CocoMonetizationPlugin: CAPPlugin, CAPBridgedPlugin, NativeAdLoaderDelegate {
    let identifier = "CocoMonetizationPlugin"
    let jsName = "CocoMonetization"
    let pluginMethods: [CAPPluginMethod] = ["status", "catalog", "buy", "restore", "prepare", "show", "hide", "privacy"]
        .compactMap { CAPPluginMethod(name: $0, returnType: CAPPluginReturnPromise) }

    private static let annual = "work.joaquin.mano.noads.year"
    private static let lifetime = "work.joaquin.mano.noads.lifetime"
    private static let coffee = "work.joaquin.mano.coffee"
    private static let products = [annual, lifetime, coffee]

    private var updates: Task<Void, Never>?
    private var lifecycle: Task<Void, Never>?
    private var loader: AdLoader?
    private var loadCall: CAPPluginCall?
    private var loadTracking = false
    private var prepared: (ad: NativeAd, date: Date, tracking: Bool)?
    private var card: CocoNativeAdCard?
    private var initialized = false
    private var preparing = false
    private var refreshingPrivacy = false
    private var pendingPurchase = false
    private var generation = 0

    override func load() {
        updates = Task { @MainActor [weak self] in
            for await result in Transaction.updates {
                guard let self else { return }
                guard case .verified(let transaction) = result,
                      Self.products.contains(transaction.productID) else { continue }
                await transaction.finish()
                self.notifyListeners("purchaseChanged", data: [:])
                let state = await self.entitlements()
                if state["adFree"] as? Bool == true { self.invalidateAd() }
            }
        }
        // 0.9.9.1 (38): a letter never outlives its page. Going to the background
        // takes it off the screen and keeps its ad; back in the foreground the page
        // that still wants it places it again (show), while a page iOS reloaded in
        // the meantime (WebContent process ended) never asks, so nothing is left
        // floating over the main screen.
        lifecycle = Task { @MainActor [weak self] in
            for await _ in NotificationCenter.default.notifications(named: UIApplication.didEnterBackgroundNotification) {
                guard let self else { return }
                self.stashCard()
            }
        }
    }

    deinit { updates?.cancel(); lifecycle?.cancel() }

    @MainActor private func stashCard() {
        guard let card else { return }
        if prepared == nil { prepared = (card.ad, Date(), tracking) }
        generation += 1
        removeCard()
    }

    @MainActor private func entitlements() async -> [String: Any] {
        var expiry: Date?
        for await result in Transaction.currentEntitlements {
            guard case .verified(let transaction) = result, transaction.revocationDate == nil else { continue }
            if transaction.productID == Self.lifetime { return ["adFree": true, "expires": NSNull()] }
            if transaction.productID == Self.annual {
                // A non-renewing year: one year from its purchase. With several,
                // the latest end wins (StoreKit does not order them).
                var calendar = Calendar(identifier: .gregorian)
                calendar.timeZone = TimeZone(secondsFromGMT: 0) ?? .current
                if let end = calendar.date(byAdding: .year, value: 1, to: transaction.purchaseDate) {
                    expiry = max(expiry ?? end, end)
                }
            }
        }
        if let expiry, expiry > Date() {
            return ["adFree": true, "expires": expiry.timeIntervalSince1970 * 1000]
        }
        return ["adFree": false, "expires": NSNull()]
    }

    @objc func status(_ call: CAPPluginCall) {
        Task { @MainActor in call.resolve(await entitlements()) }
    }

    @objc func catalog(_ call: CAPPluginCall) {
        Task { @MainActor in
            do {
                let products = try await Product.products(for: Self.products)
                var data = await entitlements()
                data["products"] = products.map { ["id": $0.id, "price": $0.displayPrice] }
                call.resolve(data)
            } catch { call.reject("StoreKit catalog unavailable") }
        }
    }

    @objc func buy(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard !pendingPurchase, let id = call.getString("id"), Self.products.contains(id) else {
                call.reject("Purchase unavailable")
                return
            }
            pendingPurchase = true
            defer { pendingPurchase = false }
            do {
                guard let product = try await Product.products(for: [id]).first else {
                    call.reject("Product unavailable")
                    return
                }
                let outcome: String
                switch try await product.purchase() {
                case .success(.verified(let transaction)):
                    if id != Self.coffee { invalidateAd() }
                    await transaction.finish()
                    outcome = "purchased"
                case .success(.unverified):
                    call.reject("Unverified transaction")
                    return
                case .pending: outcome = "pending"
                case .userCancelled: outcome = "cancelled"
                @unknown default:
                    call.reject("Unknown purchase result")
                    return
                }
                var data = await entitlements()
                data["outcome"] = outcome
                call.resolve(data)
            } catch { call.reject("Purchase unavailable") }
        }
    }

    @objc func restore(_ call: CAPPluginCall) {
        Task { @MainActor in
            do {
                try await AppStore.sync()
                let data = await entitlements()
                if data["adFree"] as? Bool == true { invalidateAd() }
                call.resolve(data)
            } catch { call.reject("Restore unavailable") }
        }
    }

    private var unitID: String? {
        #if DEBUG
        let demo = "ca-app-pub-3940256099942544/"
        if let id = Bundle.main.object(forInfoDictionaryKey: "CocoNativeAdUnitID") as? String,
           id == demo + "2521693316" { return id }
        return demo + "3986624511"
        #else
        // Development IPA only (flag added when packaging, like the data reset):
        // Google's public test unit lets the gesture, consent and layout be tried
        // on a phone. App Store builds never carry this flag.
        if Bundle.main.object(forInfoDictionaryKey: "CocoWashTestAds") as? Bool == true { return "ca-app-pub-3940256099942544/3986624511" }
        guard let id = Bundle.main.object(forInfoDictionaryKey: "CocoNativeAdUnitID") as? String,
              let appID = Bundle.main.object(forInfoDictionaryKey: "GADApplicationIdentifier") as? String,
              id.hasPrefix("ca-app-pub-"), appID.hasPrefix("ca-app-pub-"),
              !id.hasPrefix("ca-app-pub-3940256099942544"), !appID.hasPrefix("ca-app-pub-3940256099942544")
        else { return nil }
        return id
        #endif
    }

    @MainActor private var tracking: Bool { ATTrackingManager.trackingAuthorizationStatus == .authorized }

    @objc func prepare(_ call: CAPPluginCall) {
        Task { @MainActor in
            let entitlement = await entitlements()
            guard let unitID, let controller = bridge?.viewController, controller.presentedViewController == nil,
                  UIApplication.shared.applicationState == .active, !preparing, !refreshingPrivacy,
                  loader == nil, entitlement["adFree"] as? Bool == false else {
                call.resolve(["ready": false])
                return
            }
            if let prepared, Date().timeIntervalSince(prepared.date) < 1800, prepared.tracking == tracking {
                call.resolve(["ready": true])
                return
            }
            prepared = nil
            preparing = true
            defer { preparing = false }
            let requestGeneration = generation
            if !initialized {
                do {
                    try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
                        ConsentInformation.shared.requestConsentInfoUpdate(with: RequestParameters()) { error in
                            if let error { continuation.resume(throwing: error) }
                            else { continuation.resume() }
                        }
                    }
                    try await ConsentForm.loadAndPresentIfRequired(from: controller)
                } catch {
                    call.resolve(["ready": false])
                    return
                }
                guard ConsentInformation.shared.canRequestAds, generation == requestGeneration else {
                    call.resolve(["ready": false])
                    return
                }
                // Apple's tracking prompt, once, after Google's consent form and before the
                // first ad request (the order Google recommends). If the AdMob IDFA
                // explainer is turned on, UMP has already asked and this is skipped.
                // Without permission every request stays non-personalized (npa=1 below).
                if ATTrackingManager.trackingAuthorizationStatus == .notDetermined,
                   UIApplication.shared.applicationState == .active {
                    _ = await ATTrackingManager.requestTrackingAuthorization()
                }
                // Family-safe ads only (G), whatever the AdMob console says.
                MobileAds.shared.requestConfiguration.maxAdContentRating = .general
                _ = await MobileAds.shared.start()
                initialized = true
            }
            guard ConsentInformation.shared.canRequestAds, generation == requestGeneration else {
                call.resolve(["ready": false])
                return
            }
            let request = Request()
            if !tracking {
                let extras = Extras()
                extras.additionalParameters = ["npa": "1"]
                request.register(extras)
            }
            let video = VideoOptions()
            video.shouldStartMuted = true
            let loader = AdLoader(adUnitID: unitID, rootViewController: controller, adTypes: [.native], options: [video])
            loader.delegate = self
            self.loader = loader
            loadCall = call
            loadTracking = tracking
            loader.load(request)
            Task { @MainActor [weak self, weak loader] in
                try? await Task.sleep(for: .seconds(8))
                guard let self, let loader, self.loader === loader else { return }
                self.finishLoad(ready: false)
            }
        }
    }

    func adLoader(_ adLoader: AdLoader, didReceive nativeAd: NativeAd) {
        Task { @MainActor in
            guard loader === adLoader else { return }
            guard loadTracking == tracking else { finishLoad(ready: false); return }
            prepared = (nativeAd, Date(), loadTracking)
            finishLoad(ready: true)
        }
    }

    func adLoader(_ adLoader: AdLoader, didFailToReceiveAdWithError error: Error) {
        Task { @MainActor in if loader === adLoader { finishLoad(ready: false) } }
    }

    /// Places (or moves) the native letter over the web placeholder. `style`:
    /// `deck` is the full letter in the pile, dismissed by swiping; `inline` is the
    /// compact fixed letter of the round summary and «Una última mirada», opened by
    /// tapping like any ad. `hidden` keeps the card but hides it while the page
    /// scrolls or the placeholder is not fully on screen, so it never drifts out of
    /// its frame. Texts come from the web side, already in the app's language.
    @objc func show(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let webView = bridge?.webView, let parent = webView.superview,
                  let x = call.getDouble("x"), let y = call.getDouble("y"),
                  let width = call.getDouble("width"), let height = call.getDouble("height"),
                  width >= 200, height >= 140, [x, y, width, height].allSatisfy(\.isFinite) else {
                call.resolve(["shown": false])
                return
            }
            let rect = CGRect(x: x, y: y, width: width, height: height)
            let inside = webView.bounds.insetBy(dx: -1, dy: -1).contains(rect)
            let hidden = call.getBool("hidden") == true || !inside
            guard ConsentInformation.shared.canRequestAds else {
                invalidateAd()
                call.resolve(["shown": false])
                return
            }
            // Leaving or coming back (not active yet): keep the ad, keep the letter
            // hidden, and let the page ask again in a moment.
            guard UIApplication.shared.applicationState == .active else {
                card?.conceal(true)
                call.resolve(hidden ? ["shown": card != nil] : ["shown": false, "retry": true])
                return
            }
            if let card {
                card.frame = webView.convert(rect, to: parent)
                card.conceal(hidden)
                call.resolve(["shown": true])
                return
            }
            guard !hidden else {
                call.resolve(["shown": false])
                return
            }
            let requestGeneration = generation
            let entitlement = await entitlements()
            guard entitlement["adFree"] as? Bool == false, generation == requestGeneration,
                  let prepared, Date().timeIntervalSince(prepared.date) < 1800, prepared.tracking == tracking else {
                call.resolve(["shown": false])
                return
            }
            self.prepared = nil
            let style: CocoNativeAdCard.Style = (call.getString("style") ?? (call.getBool("deck") == true ? "deck" : "inline")) == "deck" ? .deck : .inline
            let view = CocoNativeAdCard(ad: prepared.ad, style: style, labels: CocoNativeAdCard.Labels(call.getObject("labels")))
            view.dismiss = { [weak self] in
                self?.removeCard()
                self?.notifyListeners("adDismissed", data: [:])
            }
            card = view
            view.frame = webView.convert(rect, to: parent)
            parent.addSubview(view)
            call.resolve(["shown": true])
        }
    }

    @MainActor private func removeCard() {
        card?.removeFromSuperview()
        card = nil
    }

    @MainActor private func finishLoad(ready: Bool) {
        loader = nil
        loadCall?.resolve(["ready": ready])
        loadCall = nil
    }

    @MainActor private func invalidateAd() {
        generation += 1
        finishLoad(ready: false)
        prepared = nil
        removeCard()
    }

    @objc func hide(_ call: CAPPluginCall) {
        Task { @MainActor in
            generation += 1
            removeCard()
            call.resolve()
        }
    }

    @objc func privacy(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let controller = bridge?.viewController, !preparing, !refreshingPrivacy else {
                call.reject("Privacy options unavailable")
                return
            }
            refreshingPrivacy = true
            defer { refreshingPrivacy = false }
            invalidateAd()
            do {
                if ConsentInformation.shared.privacyOptionsRequirementStatus == .required {
                    try await ConsentForm.presentPrivacyOptionsForm(from: controller)
                } else if let url = URL(string: UIApplication.openSettingsURLString) {
                    await UIApplication.shared.open(url)
                }
                call.resolve()
            } catch { call.reject("Privacy options unavailable") }
        }
    }
}

/// Native ad drawn as a CocoWash letter: ivory writing paper with an airmail
/// edge and «Publicidad» in a postage-stamp frame.
/// - deck: the full letter in the pile. No buttons: like every card it leaves
///   with a swipe — the first nudges it aside, the second sends it away.
///   VoiceOver gets a custom action instead.
/// - inline: a compact letter fixed in the round summary and in «Una última
///   mirada». It stays in place; tapping it opens the ad, as with any ad.
final class CocoNativeAdCard: UIView {
    enum Style { case deck, inline }
    /// Texts in the app's language, sent by the web side (Monetization.tsx).
    struct Labels {
        var stamp = "Publicidad", greeting = "Esta carta mantiene CocoWash gratis"
        var hint = "‹  Desliza para seguir  ›", again = "Una vez más y seguimos", againSpoken = "Desliza otra vez para seguir"
        var spokenDeck = "Anuncio. Desliza dos veces para volver a tus fotos.", spokenInline = "Anuncio", skip = "Seguir sin el anuncio"
        init(_ raw: JSObject?) {
            guard let raw else { return }
            func pick(_ key: String, _ value: inout String) { if let text = raw[key] as? String, !text.isEmpty { value = text } }
            pick("stamp", &stamp); pick("greeting", &greeting); pick("hint", &hint); pick("again", &again)
            pick("againSpoken", &againSpoken); pick("spokenDeck", &spokenDeck); pick("spokenInline", &spokenInline); pick("skip", &skip)
        }
    }
    var dismiss: (() -> Void)?
    private let style: Style
    private let labels: Labels
    private let surface = UIView()
    private let hint = UILabel()
    private var offset: CGFloat = 0
    private var leaving = false
    private var concealed = false
    private let light = UIImpactFeedbackGenerator(style: .light)

    // Same values as the web tokens (prototype.css): --pal-surface, --pal-text,
    // --cw-teal-800, --pal-turquoise, --pal-heart, --cw-paper, --cw-paper-edge.
    private static let ivory = UIColor(red: 1.0, green: 0.992, blue: 0.969, alpha: 1)
    private static let ink = UIColor(red: 0.145, green: 0.227, blue: 0.227, alpha: 1)
    private static let inkSoft = UIColor(red: 0.231, green: 0.306, blue: 0.294, alpha: 1)
    private static let teal = UIColor(red: 0.114, green: 0.251, blue: 0.259, alpha: 1)
    private static let turquoise = UIColor(red: 0.118, green: 0.455, blue: 0.439, alpha: 1)
    private static let heart = UIColor(red: 0.937, green: 0.604, blue: 0.596, alpha: 1)
    private static let paper = UIColor(red: 0.949, green: 0.906, blue: 0.835, alpha: 1)
    private static let edge = UIColor(red: 0.851, green: 0.784, blue: 0.675, alpha: 1)
    private var reduced: Bool { UIAccessibility.isReduceMotionEnabled }

    private static func font(_ size: CGFloat, _ weight: UIFont.Weight, _ style: UIFont.TextStyle, maximum: CGFloat? = nil) -> UIFont {
        let base = UIFont.systemFont(ofSize: size, weight: weight)
        let rounded = base.fontDescriptor.withDesign(.rounded).map { UIFont(descriptor: $0, size: size) } ?? base
        let metrics = UIFontMetrics(forTextStyle: style)
        if let maximum { return metrics.scaledFont(for: rounded, maximumPointSize: maximum) }
        return metrics.scaledFont(for: rounded)
    }
    /// Diagonal airmail stripes: turquoise, paper, heart pink, paper.
    private static let airmail: UIColor = {
        let tile = CGSize(width: 28, height: 28)
        let image = UIGraphicsImageRenderer(size: tile).image { ctx in
            CocoNativeAdCard.ivory.setFill(); ctx.fill(CGRect(origin: .zero, size: tile))
            let c = ctx.cgContext
            for (i, color) in [CocoNativeAdCard.turquoise, CocoNativeAdCard.heart].enumerated() {
                color.setFill()
                for shift in [-28.0, 0.0, 28.0] {
                    let x = CGFloat(i) * 14 + shift
                    c.move(to: CGPoint(x: x, y: 28)); c.addLine(to: CGPoint(x: x + 9, y: 28))
                    c.addLine(to: CGPoint(x: x + 37, y: 0)); c.addLine(to: CGPoint(x: x + 28, y: 0)); c.closePath(); c.fillPath()
                }
            }
        }
        return UIColor(patternImage: image)
    }()

    /// Kept so the letter can be stashed and placed again after the background.
    let ad: NativeAd

    init(ad: NativeAd, style: Style, labels: Labels) {
        self.ad = ad
        self.style = style
        self.labels = labels
        super.init(frame: .zero)
        let inline = style == .inline
        let creative = NativeAdView()
        creative.backgroundColor = .clear

        let stamp = StampLabel()
        stamp.text = labels.stamp
        stamp.font = Self.font(12, .semibold, .caption1, maximum: 18)
        stamp.adjustsFontForContentSizeCategory = true
        stamp.textColor = Self.turquoise
        stamp.stroke = Self.turquoise
        stamp.setContentHuggingPriority(.required, for: .horizontal)

        let headline = UILabel()
        headline.text = ad.headline
        headline.textColor = Self.ink
        // Capped so the largest accessibility sizes still leave the 120 pt media (AdMob minimum) its room.
        headline.font = Self.font(inline ? 15 : 17, .semibold, .headline, maximum: inline ? 20 : 26)
        headline.adjustsFontForContentSizeCategory = true
        headline.numberOfLines = 2

        let media = MediaView()
        media.mediaContent = ad.mediaContent
        media.contentMode = inline ? .scaleAspectFill : .scaleAspectFit
        media.backgroundColor = Self.paper
        media.layer.cornerRadius = 4
        media.clipsToBounds = true

        // The SDK handles the tap on the call to action; the button only draws it.
        var config = UIButton.Configuration.filled()
        config.baseBackgroundColor = Self.teal
        config.baseForegroundColor = Self.paper
        config.cornerStyle = .capsule
        config.contentInsets = NSDirectionalEdgeInsets(top: 6, leading: 14, bottom: 6, trailing: 14)
        config.titleLineBreakMode = .byTruncatingTail
        config.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { attributes in
            var next = attributes; next.font = Self.font(inline ? 14 : 15, .semibold, .subheadline, maximum: inline ? 19 : 22); return next
        }
        let action = UIButton(configuration: config)
        action.setTitle(ad.callToAction, for: .normal)
        action.isUserInteractionEnabled = false
        action.isHidden = ad.callToAction == nil
        action.heightAnchor.constraint(greaterThanOrEqualToConstant: inline ? 36 : 44).isActive = true

        let icon = UIImageView(image: ad.icon?.image)
        icon.contentMode = .scaleAspectFill
        icon.layer.cornerRadius = 8
        icon.clipsToBounds = true
        icon.isHidden = ad.icon?.image == nil
        icon.widthAnchor.constraint(equalToConstant: inline ? 28 : 36).isActive = true
        icon.heightAnchor.constraint(equalToConstant: inline ? 28 : 36).isActive = true

        let assets: UIStackView
        // Room for the AdChoices mark the SDK places in the top corner.
        let top = UIStackView(arrangedSubviews: [stamp, UIView()])
        if inline {
            // [media 120×120] [«Publicidad» · headline · call to action]
            let headlineRow = UIStackView(arrangedSubviews: [icon, headline])
            headlineRow.alignment = .center
            headlineRow.spacing = 8
            let actionRow = UIStackView(arrangedSubviews: [action, UIView()])
            let column = UIStackView(arrangedSubviews: [top, headlineRow, UIView(), actionRow])
            column.axis = .vertical
            column.spacing = 6
            assets = UIStackView(arrangedSubviews: [media, column])
            assets.axis = .horizontal
            assets.alignment = .fill
            assets.spacing = 12
            NSLayoutConstraint.activate([
                media.widthAnchor.constraint(equalToConstant: 120),
                media.heightAnchor.constraint(equalToConstant: 120),
            ])
        } else {
            let greeting = UILabel()
            greeting.text = labels.greeting
            greeting.font = Self.font(13, .medium, .footnote, maximum: 19)
            greeting.adjustsFontForContentSizeCategory = true
            greeting.textColor = Self.inkSoft
            greeting.numberOfLines = 2
            let title = UIStackView(arrangedSubviews: [icon, headline])
            title.alignment = .center
            title.spacing = 10
            assets = UIStackView(arrangedSubviews: [top, greeting, title, media, action])
            assets.axis = .vertical
            assets.spacing = 8
            assets.setCustomSpacing(12, after: greeting)
            assets.setCustomSpacing(12, after: media)
            media.setContentCompressionResistancePriority(.defaultLow, for: .vertical)
            media.heightAnchor.constraint(greaterThanOrEqualToConstant: 120).isActive = true
        }
        assets.translatesAutoresizingMaskIntoConstraints = false
        creative.addSubview(assets)
        let pad: CGFloat = inline ? 14 : 18
        NSLayoutConstraint.activate([
            assets.topAnchor.constraint(equalTo: creative.topAnchor, constant: pad),
            assets.bottomAnchor.constraint(equalTo: creative.bottomAnchor, constant: -pad),
            assets.leadingAnchor.constraint(equalTo: creative.leadingAnchor, constant: inline ? 14 : 16),
            assets.trailingAnchor.constraint(equalTo: creative.trailingAnchor, constant: inline ? -14 : -16),
            top.trailingAnchor.constraint(equalTo: assets.trailingAnchor, constant: -28),
        ])
        creative.iconView = icon
        creative.headlineView = headline
        creative.mediaView = media
        creative.callToActionView = action
        creative.nativeAd = ad

        surface.backgroundColor = Self.ivory
        surface.layer.cornerRadius = 6
        surface.layer.borderColor = Self.edge.cgColor
        surface.layer.borderWidth = 1
        surface.layer.shadowColor = Self.ink.cgColor
        surface.layer.shadowOpacity = inline ? 0.12 : 0.16
        surface.layer.shadowRadius = inline ? 10 : 14
        surface.layer.shadowOffset = CGSize(width: 0, height: inline ? 5 : 8)
        let paperClip = UIView()
        paperClip.layer.cornerRadius = 6
        paperClip.clipsToBounds = true
        paperClip.translatesAutoresizingMaskIntoConstraints = false
        surface.addSubview(paperClip)
        let bands = [UIView(), UIView()]
        for band in bands { band.backgroundColor = Self.airmail; band.translatesAutoresizingMaskIntoConstraints = false; paperClip.addSubview(band) }
        creative.translatesAutoresizingMaskIntoConstraints = false
        paperClip.addSubview(creative)
        surface.translatesAutoresizingMaskIntoConstraints = false
        surface.isAccessibilityElement = false
        addSubview(surface)
        NSLayoutConstraint.activate([
            surface.topAnchor.constraint(equalTo: topAnchor),
            surface.leadingAnchor.constraint(equalTo: leadingAnchor, constant: inline ? 0 : 14),
            surface.trailingAnchor.constraint(equalTo: trailingAnchor, constant: inline ? 0 : -14),
            surface.bottomAnchor.constraint(equalTo: bottomAnchor, constant: inline ? 0 : -32),
            paperClip.topAnchor.constraint(equalTo: surface.topAnchor),
            paperClip.bottomAnchor.constraint(equalTo: surface.bottomAnchor),
            paperClip.leadingAnchor.constraint(equalTo: surface.leadingAnchor),
            paperClip.trailingAnchor.constraint(equalTo: surface.trailingAnchor),
            bands[0].topAnchor.constraint(equalTo: paperClip.topAnchor),
            bands[1].bottomAnchor.constraint(equalTo: paperClip.bottomAnchor),
            creative.topAnchor.constraint(equalTo: paperClip.topAnchor),
            creative.bottomAnchor.constraint(equalTo: paperClip.bottomAnchor),
            creative.leadingAnchor.constraint(equalTo: paperClip.leadingAnchor),
            creative.trailingAnchor.constraint(equalTo: paperClip.trailingAnchor),
        ])
        for band in bands {
            band.heightAnchor.constraint(equalToConstant: 6).isActive = true
            band.leadingAnchor.constraint(equalTo: paperClip.leadingAnchor).isActive = true
            band.trailingAnchor.constraint(equalTo: paperClip.trailingAnchor).isActive = true
        }
        if inline {
            // VoiceOver reads the stamp («Publicidad») first, then the ad's own assets.
            accessibilityElements = [creative]
            return
        }
        hint.text = labels.hint
        hint.font = Self.font(13, .medium, .footnote, maximum: 19)
        hint.adjustsFontForContentSizeCategory = true
        hint.textColor = Self.inkSoft
        hint.textAlignment = .center
        hint.translatesAutoresizingMaskIntoConstraints = false
        addSubview(hint)
        NSLayoutConstraint.activate([
            hint.topAnchor.constraint(equalTo: surface.bottomAnchor, constant: 8),
            hint.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 14),
            hint.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -14),
            hint.bottomAnchor.constraint(lessThanOrEqualTo: bottomAnchor),
        ])
        surface.addGestureRecognizer(UIPanGestureRecognizer(target: self, action: #selector(drag(_:))))
        accessibilityElements = [creative, hint]
        hint.accessibilityLabel = labels.spokenDeck
        hint.accessibilityCustomActions = [UIAccessibilityCustomAction(name: labels.skip) { [weak self] _ in self?.leave(1, velocity: 0); return true }]
    }

    required init?(coder: NSCoder) { nil }

    /// Deck: the entrance of a dealt card (up 16 pt, 96 % scale). Inline: a fade in place.
    override func didMoveToSuperview() {
        super.didMoveToSuperview()
        guard superview != nil, !reduced else { return }
        // The plugin repositions this view by frame; only its contents move.
        alpha = 0
        if style == .deck { surface.transform = CGAffineTransform(translationX: 0, y: 16).scaledBy(x: 0.96, y: 0.96) }
        UIView.animate(withDuration: style == .deck ? 0.3 : 0.2, delay: 0, usingSpringWithDamping: 0.86, initialSpringVelocity: 0) {
            self.alpha = self.concealed ? 0 : 1
            self.surface.transform = .identity
        }
    }

    /// Hidden while its placeholder scrolls or is partly off screen; same frame after.
    func conceal(_ hidden: Bool) {
        guard hidden != concealed, !leaving else { return }
        concealed = hidden
        isUserInteractionEnabled = !hidden
        layer.removeAllAnimations()
        UIView.animate(withDuration: hidden || reduced ? 0.08 : 0.16) { self.alpha = hidden ? 0 : 1 }
    }

    private func leave(_ direction: CGFloat, velocity: CGFloat) {
        guard !leaving else { return }
        leaving = true
        isUserInteractionEnabled = false
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        let distance = bounds.width + 120
        let duration = reduced ? 0.14 : TimeInterval(min(0.32, max(0.18, distance / max(abs(velocity), 900))))
        UIView.animate(withDuration: duration, delay: 0, options: [.curveEaseIn]) {
            self.surface.alpha = 0
            self.hint.alpha = 0
            if !self.reduced {
                self.surface.transform = CGAffineTransform(translationX: direction * distance, y: -24).rotated(by: direction * 0.22)
            }
        } completion: { [weak self] _ in self?.dismiss?() }
    }

    @objc private func drag(_ gesture: UIPanGestureRecognizer) {
        let t = gesture.translation(in: self), v = gesture.velocity(in: self).x
        let horizontal = abs(t.x) > abs(t.y)
        switch gesture.state {
        case .began:
            light.prepare()
        case .changed:
            // First swipe resists like a rubber band; after the nudge it follows the finger.
            let x = offset == 0 ? 44 * tanh(t.x / 110) : offset + t.x
            surface.transform = reduced ? CGAffineTransform(translationX: x, y: 0) : CGAffineTransform(translationX: x, y: 0).rotated(by: x / 900)
        case .ended where horizontal && offset != 0 && (abs(t.x) >= 60 || abs(v) >= 700):
            leave(t.x + v * 0.05 >= 0 ? 1 : -1, velocity: v)
        case .ended where horizontal && offset == 0 && abs(t.x) >= 30:
            offset = t.x > 0 ? 16 : -16
            light.impactOccurred()
            hint.text = labels.again
            UIAccessibility.post(notification: .announcement, argument: labels.againSpoken)
            settle()
        case .ended, .cancelled, .failed:
            settle()
        default: break
        }
    }

    private func settle() {
        let target = reduced ? CGAffineTransform(translationX: offset, y: 0) : CGAffineTransform(translationX: offset, y: 0).rotated(by: offset / 900)
        UIView.animate(withDuration: reduced ? 0 : 0.42, delay: 0, usingSpringWithDamping: 0.62, initialSpringVelocity: 0.4, options: [.allowUserInteraction]) {
            self.surface.transform = target
        }
    }
}

/// «Publicidad» inside a dashed postage-stamp frame.
private final class StampLabel: UILabel {
    var stroke: UIColor = .black
    private let frameLayer = CAShapeLayer()
    override init(frame: CGRect) {
        super.init(frame: frame)
        frameLayer.fillColor = UIColor.clear.cgColor
        frameLayer.lineWidth = 1.5
        frameLayer.lineDashPattern = [3, 2]
        layer.addSublayer(frameLayer)
    }
    required init?(coder: NSCoder) { nil }
    override func layoutSubviews() {
        super.layoutSubviews()
        frameLayer.strokeColor = stroke.cgColor
        frameLayer.path = UIBezierPath(roundedRect: bounds.insetBy(dx: 0.75, dy: 0.75), cornerRadius: 3).cgPath
    }
    override func drawText(in rect: CGRect) { super.drawText(in: rect.insetBy(dx: 8, dy: 3)) }
    override var intrinsicContentSize: CGSize {
        let size = super.intrinsicContentSize
        return CGSize(width: size.width + 16, height: size.height + 6)
    }
}
