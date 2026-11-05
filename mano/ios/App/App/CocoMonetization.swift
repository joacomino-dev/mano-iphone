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

private final class CocoNativeAdCard: UIView {
    var dismiss: (() -> Void)?
    private let surface = UIStackView()
    private let grip = UILabel()
    private var offset: CGFloat = 0

    init(ad: NativeAd, deck: Bool) {
        super.init(frame: .zero)
        let creative = NativeAdView()
        creative.backgroundColor = UIColor(red: 0.99, green: 0.97, blue: 0.93, alpha: 1)
        creative.layer.cornerRadius = 14
        creative.layer.borderColor = UIColor(red: 0.44, green: 0.37, blue: 0.30, alpha: 1).cgColor
        creative.layer.borderWidth = 1
        creative.clipsToBounds = true

        let attribution = UILabel()
        attribution.text = "Publicidad"
        attribution.font = .preferredFont(forTextStyle: .caption1)
        attribution.textColor = .darkGray
        let headline = UILabel()
        headline.text = ad.headline
        headline.textColor = .black
        headline.font = .preferredFont(forTextStyle: .headline)
        headline.numberOfLines = 2
        let media = MediaView()
        media.mediaContent = ad.mediaContent
        media.contentMode = .scaleAspectFit
        let action = UILabel()
        action.text = ad.callToAction
        action.textColor = UIColor(red: 0.08, green: 0.32, blue: 0.30, alpha: 1)
        action.font = .preferredFont(forTextStyle: .subheadline)
        action.numberOfLines = 2
        action.isHidden = ad.callToAction == nil

        let icon = UIImageView(image: ad.icon?.image)
        icon.contentMode = .scaleAspectFit
        icon.isHidden = ad.icon?.image == nil
        icon.widthAnchor.constraint(equalToConstant: 32).isActive = true
        icon.heightAnchor.constraint(equalToConstant: 32).isActive = true
        let title = UIStackView(arrangedSubviews: [icon, headline])
        title.alignment = .center
        title.spacing = 7
        let assets = UIStackView(arrangedSubviews: [attribution, title, media, action])
        assets.translatesAutoresizingMaskIntoConstraints = false
        assets.axis = .vertical
        assets.spacing = 5
        media.setContentCompressionResistancePriority(.defaultLow, for: .vertical)
        creative.addSubview(assets)
        NSLayoutConstraint.activate([
            assets.topAnchor.constraint(equalTo: creative.topAnchor, constant: 12),
            assets.bottomAnchor.constraint(equalTo: creative.bottomAnchor, constant: -10),
            assets.leadingAnchor.constraint(equalTo: creative.leadingAnchor, constant: 12),
            assets.trailingAnchor.constraint(equalTo: creative.trailingAnchor, constant: -44),
            media.heightAnchor.constraint(greaterThanOrEqualToConstant: 120),
        ])
        creative.iconView = icon
        creative.headlineView = headline
        creative.mediaView = media
        creative.callToActionView = action
        creative.nativeAd = ad

        let skip = UIButton(type: .system)
        skip.setTitle("Saltar", for: .normal)
        skip.addTarget(self, action: #selector(skipAd), for: .touchUpInside)
        skip.widthAnchor.constraint(equalToConstant: 62).isActive = true
        grip.text = "‹  Desliza para pasar  ›"
        grip.font = .preferredFont(forTextStyle: .footnote)
        grip.textColor = .secondaryLabel
        grip.textAlignment = .center
        grip.isHidden = !deck
        grip.isUserInteractionEnabled = deck
        if deck { grip.addGestureRecognizer(UIPanGestureRecognizer(target: self, action: #selector(drag(_:)))) }
        let controls = UIStackView(arrangedSubviews: [grip, skip])
        controls.backgroundColor = .secondarySystemBackground
        controls.layer.cornerRadius = 10
        controls.heightAnchor.constraint(equalToConstant: 44).isActive = true
        surface.axis = .vertical
        surface.spacing = 5
        surface.addArrangedSubview(creative)
        surface.addArrangedSubview(controls)
        surface.translatesAutoresizingMaskIntoConstraints = false
        addSubview(surface)
        NSLayoutConstraint.activate([
            surface.topAnchor.constraint(equalTo: topAnchor),
            surface.bottomAnchor.constraint(equalTo: bottomAnchor),
            surface.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 14),
            surface.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -14),
        ])
    }

    required init?(coder: NSCoder) { nil }

    @objc private func skipAd() { dismiss?() }

    @objc private func drag(_ gesture: UIPanGestureRecognizer) {
        let translation = gesture.translation(in: self)
        let distance = translation.x
        switch gesture.state {
        case .changed:
            surface.transform = CGAffineTransform(translationX: offset + max(-36, min(36, distance * 0.45)), y: 0)
        case .ended where abs(distance) >= 34 && abs(distance) > abs(translation.y):
            if offset != 0 {
                isUserInteractionEnabled = false
                UIView.animate(withDuration: UIAccessibility.isReduceMotionEnabled ? 0 : 0.16) {
                    self.surface.transform = CGAffineTransform(translationX: distance > 0 ? 48 : -48, y: 0)
                    self.surface.alpha = 0
                } completion: { [weak self] _ in self?.dismiss?() }
                return
            }
            offset = distance > 0 ? 11 : -11
            grip.text = "‹  Desliza otra vez  ›"
            UIAccessibility.post(notification: .announcement, argument: "Desliza otra vez para saltar el anuncio")
            settle()
        case .ended, .cancelled, .failed: settle()
        default: break
        }
    }

    private func settle() {
        let transform = CGAffineTransform(translationX: offset, y: 0)
        UIView.animate(withDuration: UIAccessibility.isReduceMotionEnabled ? 0 : 0.18) {
            self.surface.transform = transform
        }
    }
}
