import UIKit
import Capacitor
import WebKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        // The programmatic scene entry point must use our bridge subclass.
        // Main.storyboard alone is not consulted after replacing the window here.
        // Gate the bridge until the opted-in development reset fully completes.
        // WKWebView must not read an old localStorage session while it is cleared.
        window?.rootViewController = UIViewController()
        window?.rootViewController?.view.backgroundColor = UIColor(red:0.953,green:0.925,blue:0.882,alpha:1)
        window?.makeKeyAndVisible()
        prepareDevelopmentLaunch()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }


    private func prepareDevelopmentLaunch() {
        let bundle = Bundle.main, defaults = UserDefaults.standard
        // Off the main thread: retired face data must not delay the first frame.
        let legacySupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        DispatchQueue.global(qos: .utility).async { LegacyPeopleCleanup.run(support: legacySupport) }
        let build = "\(bundle.object(forInfoDictionaryKey: "CFBundleShortVersionString") ?? "")-\(bundle.object(forInfoDictionaryKey: "CFBundleVersion") ?? "")"
        guard DevelopmentReset.required(enabled:bundle.object(forInfoDictionaryKey:"CocoWashDevelopmentReset") as? Bool == true,current:build,previous:defaults.string(forKey:DevelopmentReset.key)) else {
            window?.rootViewController = ManoBridgeController(); return
        }
        Task { @MainActor in
            do {
                let support=FileManager.default.urls(for:.applicationSupportDirectory,in:.userDomainMask)[0]
                let caches=FileManager.default.urls(for:.cachesDirectory,in:.userDomainMask)[0]
                try await Task.detached(priority:.utility) { try DevelopmentReset.eraseDerivedFiles(support:support,caches:caches) }.value
                await withCheckedContinuation { (continuation: CheckedContinuation<Void,Never>) in
                    WKWebsiteDataStore.default().removeData(ofTypes:WKWebsiteDataStore.allWebsiteDataTypes(),modifiedSince:.distantPast) { continuation.resume() }
                }
                if let id=bundle.bundleIdentifier { defaults.removePersistentDomain(forName:id) }
                defaults.set(build,forKey:DevelopmentReset.key)
                window?.rootViewController = ManoBridgeController()
            } catch {
                // No reset marker, no bridge: retry on next launch, never load
                // a half-reset mixture of facial index and old browser session.
                let message=UILabel();message.numberOfLines=0;message.textAlignment = .center
                message.text="No se pudo preparar la versión de prueba. Cierra y vuelve a abrir CocoWash para reintentar. Tus fotos siguen intactas."
                message.frame=window?.bounds.insetBy(dx:28,dy:100) ?? .zero
                window?.rootViewController?.view.addSubview(message)
            }
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
