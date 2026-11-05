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
    }

    deinit { updates?.cancel() }

    @MainActor private func entitlements() async -> [String: Any] {
        var expiry: Date?
        for await result in Transaction.currentEntitlements {
            guard case .verified(let transaction) = result, transaction.revocationDate == nil else { continue }
            if transaction.productID == Self.lifetime { return ["adFree": true, "expires": NSNull()] }
            if transaction.productID == Self.annual {
                var calendar = Calendar(identifier: .gregorian)
                calendar.timeZone = TimeZone(secondsFromGMT: 0) ?? .current
                expiry = calendar.date(byAdding: .year, value: 1, to: transaction.purchaseDate)
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
                  loader == nil, card == nil, entitlement["adFree"] as? Bool == false else {
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

    @objc func show(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let webView = bridge?.webView, let parent = webView.superview,
                  let x = call.getDouble("x"), let y = call.getDouble("y"),
                  let width = call.getDouble("width"), let height = call.getDouble("height"),
                  width >= 220, height >= 220, [x, y, width, height].allSatisfy(\.isFinite) else {
                call.resolve(["shown": false])
                return
            }
            let rect = CGRect(x: x, y: y, width: width, height: height)
            guard webView.bounds.insetBy(dx: -1, dy: -1).contains(rect),
                  UIApplication.shared.applicationState == .active,
                  ConsentInformation.shared.canRequestAds else {
                invalidateAd()
                call.resolve(["shown": false])
                return
            }
            if card == nil {
                let requestGeneration = generation
                let entitlement = await entitlements()
                guard entitlement["adFree"] as? Bool == false, generation == requestGeneration,
                      let prepared, Date().timeIntervalSince(prepared.date) < 1800, prepared.tracking == tracking else {
                    call.resolve(["shown": false])
                    return
                }
                self.prepared = nil
                let view = CocoNativeAdCard(ad: prepared.ad, deck: call.getBool("deck") == true)
                view.dismiss = { [weak self] in
                    self?.removeCard()
                    self?.notifyListeners("adDismissed", data: [:])
                }
                card = view
                view.frame = webView.convert(rect, to: parent)
                parent.addSubview(view)
            } else {
                card?.frame = webView.convert(rect, to: parent)
            }
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
/// edge, «Publicidad» in a postage-stamp frame and a short greeting. No buttons:
/// like every card in CocoWash it leaves with a swipe — the first one nudges it
/// aside, the second sends it away. VoiceOver gets a custom action instead.
private final class CocoNativeAdCard: UIView {
    var dismiss: (() -> Void)?
    private let surface = UIView()
    private let hint = UILabel()
    private var offset: CGFloat = 0
    private var leaving = false
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

    private static func font(_ size: CGFloat, _ weight: UIFont.Weight, _ style: UIFont.TextStyle) -> UIFont {
        let base = UIFont.systemFont(ofSize: size, weight: weight)
        let rounded = base.fontDescriptor.withDesign(.rounded).map { UIFont(descriptor: $0, size: size) } ?? base
        return UIFontMetrics(forTextStyle: style).scaledFont(for: rounded)
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

    init(ad: NativeAd, deck: Bool) {
        super.init(frame: .zero)
        let creative = NativeAdView()
        creative.backgroundColor = .clear

        let stamp = StampLabel()
        stamp.text = "Publicidad"
        stamp.font = Self.font(12, .semibold, .caption1)
        stamp.adjustsFontForContentSizeCategory = true
        stamp.textColor = Self.turquoise
        stamp.stroke = Self.turquoise

        let greeting = UILabel()
        greeting.text = "Esta carta mantiene CocoWash gratis"
        greeting.font = Self.font(13, .medium, .footnote)
        greeting.adjustsFontForContentSizeCategory = true
        greeting.textColor = Self.inkSoft
        greeting.numberOfLines = 2

        let headline = UILabel()
        headline.text = ad.headline
        headline.textColor = Self.ink
        headline.font = Self.font(17, .semibold, .headline)
        headline.adjustsFontForContentSizeCategory = true
        headline.numberOfLines = 2

        let media = MediaView()
        media.mediaContent = ad.mediaContent
        media.contentMode = .scaleAspectFit
        media.backgroundColor = Self.paper
        media.layer.cornerRadius = 4
        media.clipsToBounds = true

        // The SDK handles the tap on the call to action; the button only draws it.
        var config = UIButton.Configuration.filled()
        config.baseBackgroundColor = Self.teal
        config.baseForegroundColor = Self.paper
        config.cornerStyle = .capsule
        config.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { attributes in
            var next = attributes; next.font = Self.font(15, .semibold, .subheadline); return next
        }
        let action = UIButton(configuration: config)
        action.setTitle(ad.callToAction, for: .normal)
        action.isUserInteractionEnabled = false
        action.isHidden = ad.callToAction == nil
        action.heightAnchor.constraint(greaterThanOrEqualToConstant: 44).isActive = true

        let icon = UIImageView(image: ad.icon?.image)
        icon.contentMode = .scaleAspectFill
        icon.layer.cornerRadius = 8
        icon.clipsToBounds = true
        icon.isHidden = ad.icon?.image == nil
        icon.widthAnchor.constraint(equalToConstant: 36).isActive = true
        icon.heightAnchor.constraint(equalToConstant: 36).isActive = true
        let title = UIStackView(arrangedSubviews: [icon, headline])
        title.alignment = .center
        title.spacing = 10
        let top = UIStackView(arrangedSubviews: [stamp, UIView()])
        let assets = UIStackView(arrangedSubviews: [top, greeting, title, media, action])
        assets.translatesAutoresizingMaskIntoConstraints = false
        assets.axis = .vertical
        assets.spacing = 8
        assets.setCustomSpacing(12, after: greeting)
        assets.setCustomSpacing(12, after: media)
        media.setContentCompressionResistancePriority(.defaultLow, for: .vertical)
        creative.addSubview(assets)
        NSLayoutConstraint.activate([
            assets.topAnchor.constraint(equalTo: creative.topAnchor, constant: 18),
            assets.bottomAnchor.constraint(equalTo: creative.bottomAnchor, constant: -18),
            assets.leadingAnchor.constraint(equalTo: creative.leadingAnchor, constant: 16),
            assets.trailingAnchor.constraint(equalTo: creative.trailingAnchor, constant: -16),
            // Room for the AdChoices mark the SDK places in the top corner.
            top.trailingAnchor.constraint(equalTo: assets.trailingAnchor, constant: -28),
            media.heightAnchor.constraint(greaterThanOrEqualToConstant: 110),
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
        surface.layer.shadowOpacity = 0.16
        surface.layer.shadowRadius = 14
        surface.layer.shadowOffset = CGSize(width: 0, height: 8)
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

        hint.text = "‹  Desliza para seguir  ›"
        hint.font = Self.font(13, .medium, .footnote)
        hint.adjustsFontForContentSizeCategory = true
        hint.textColor = Self.inkSoft
        hint.textAlignment = .center
        hint.translatesAutoresizingMaskIntoConstraints = false
        addSubview(hint)
        NSLayoutConstraint.activate([
            surface.topAnchor.constraint(equalTo: topAnchor),
            surface.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 14),
            surface.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -14),
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
            hint.topAnchor.constraint(equalTo: surface.bottomAnchor, constant: 8),
            hint.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 14),
            hint.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -14),
            hint.bottomAnchor.constraint(lessThanOrEqualTo: bottomAnchor),
            surface.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -32),
        ])
        for band in bands {
            band.heightAnchor.constraint(equalToConstant: 6).isActive = true
            band.leadingAnchor.constraint(equalTo: paperClip.leadingAnchor).isActive = true
            band.trailingAnchor.constraint(equalTo: paperClip.trailingAnchor).isActive = true
        }
        surface.addGestureRecognizer(UIPanGestureRecognizer(target: self, action: #selector(drag(_:))))
        accessibilityElements = [creative, hint]
        hint.accessibilityLabel = deck ? "Anuncio. Desliza dos veces para volver a tus fotos." : "Anuncio. Desliza dos veces para seguir."
        hint.accessibilityCustomActions = [UIAccessibilityCustomAction(name: "Seguir sin el anuncio") { [weak self] _ in self?.leave(1, velocity: 0); return true }]
    }

    required init?(coder: NSCoder) { nil }

    /// Same entrance as a dealt card on the web side: up 16 pt, 96 % scale.
    override func didMoveToSuperview() {
        super.didMoveToSuperview()
        guard superview != nil, !reduced else { return }
        // The plugin repositions this view by frame; only its contents move.
        alpha = 0
        surface.transform = CGAffineTransform(translationX: 0, y: 16).scaledBy(x: 0.96, y: 0.96)
        UIView.animate(withDuration: 0.3, delay: 0, usingSpringWithDamping: 0.86, initialSpringVelocity: 0) {
            self.alpha = 1
            self.surface.transform = .identity
        }
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
            hint.text = "Una vez más y seguimos"
            UIAccessibility.post(notification: .announcement, argument: "Desliza otra vez para seguir")
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
