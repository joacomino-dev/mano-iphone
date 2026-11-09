import XCTest
import UIKit

final class PhotosSmokeTests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
        // 0.9.3 passed in 527 s and 0.9.4 in 590 s on the free simulator runner.
        executionTimeAllowance = 840
    }

    @MainActor
    func testStoreScreensSevenLanguages() throws {
        let contractURL=try XCTUnwrap(Bundle(for:Self.self).url(forResource:"native-lab-contract",withExtension:"json"))
        let contract=try XCTUnwrap(JSONSerialization.jsonObject(with:Data(contentsOf:contractURL)) as? [String:Any])
        guard contract["storeScreens"] as? Bool == true else { throw XCTSkip("Store screenshots use a separate workflow") }
        #if !targetEnvironment(simulator)
        XCTFail("Store fixture capture refuses physical libraries");return
        #endif
        XCTAssertEqual(contract["simulator"] as? String,ProcessInfo.processInfo.environment["SIMULATOR_UDID"])
        // Real onboarding, Photos prompt, album and native metadata assertions.
        try testFullPhotosAuthorizationStartsSession()
        let tables=try XCTUnwrap(contract["storeScreenLabels"] as? [String:[String:String]])
        let directory=FileManager.default.urls(for:.documentDirectory,in:.userDomainMask)[0].appendingPathComponent("StoreScreens")
        try FileManager.default.createDirectory(at:directory,withIntermediateDirectories:true)
        let app=XCUIApplication()
        func capture(_ lang:String,_ screen:String) throws {
            Thread.sleep(forTimeInterval:1)
            let image=XCUIScreen.main.screenshot()
            try image.pngRepresentation.write(to:directory.appendingPathComponent("\(lang)-\(screen).png"),options:.atomic)
            print("COCOWASH_UI_STORE_SCREEN lang=\(lang) screen=\(screen)")
        }
        for lang in ["es","en","fr","de","it","ar","ja"] {
            let labels=try XCTUnwrap(tables[lang])
            app.terminate();app.launchArguments=["-AppleLanguages","(\(lang))","-AppleLocale",lang];app.launch()
            let finish=app.buttons.matching(NSPredicate(format:"label BEGINSWITH %@",try XCTUnwrap(labels["Terminar"]))).firstMatch
            XCTAssertTrue(finish.waitForExistence(timeout:120),"Native launch must render the requested language")
            let filters=app.buttons[try XCTUnwrap(labels["Filtros"])].firstMatch
            XCTAssertTrue(filters.isHittable);try capture(lang,"01-cards")
            let discard=app.buttons[try XCTUnwrap(labels["Eliminar"])].firstMatch
            XCTAssertTrue(discard.isEnabled && discard.isHittable);discard.tap();finish.tap()
            let recover=app.buttons[try XCTUnwrap(labels["Recuperar"])].firstMatch
            XCTAssertTrue(recover.waitForExistence(timeout:20));XCTAssertTrue(recover.isHittable);try capture(lang,"02-review");recover.tap()
            let close=app.buttons[try XCTUnwrap(labels["Cerrar"])].firstMatch
            XCTAssertTrue(close.isHittable);close.tap();XCTAssertTrue(filters.isHittable);filters.tap()
            let filterTab=app.descendants(matching:.any).matching(NSPredicate(format:"label == %@",try XCTUnwrap(labels["Filtros"]))).allElementsBoundByIndex.filter{$0.isHittable}.last
            try XCTUnwrap(filterTab).tap();try capture(lang,"03-filters")
            let settings=app.descendants(matching:.any).matching(NSPredicate(format:"label == %@",try XCTUnwrap(labels["Ajustes"]))).allElementsBoundByIndex.filter{$0.isHittable}.last
            try XCTUnwrap(settings).tap();try capture(lang,"04-settings")
            XCTAssertTrue(close.isHittable);close.tap()
        }
        print("COCOWASH_UI_NATIVE_STORE_SCREENS_OK count=28")
    }

    @MainActor
    func testAdHostCaptureThroughRealConsent() throws {
        let contractURL=try XCTUnwrap(Bundle(for:Self.self).url(forResource:"native-lab-contract",withExtension:"json"))
        let contract=try XCTUnwrap(JSONSerialization.jsonObject(with:Data(contentsOf:contractURL)) as? [String:Any])
        guard let mode=contract["adTraffic"] as? String,["allowed","denied"].contains(mode) else { throw XCTSkip("Host-only ad research is a separate workflow, not release acceptance") }
        #if !targetEnvironment(simulator)
        XCTFail("Ad research refuses a physical device");return
        #endif
        XCTAssertEqual(contract["simulator"] as? String,ProcessInfo.processInfo.environment["SIMULATOR_UDID"])
        // Only runs on the disposable CI simulator seeded with generated public
        // photo + H.264 fixtures. No native deletion or personal device is used.
        let app = XCUIApplication()
        app.resetAuthorizationStatus(for: .photos)
        // Since 9.8.1 the app follows the device language, and a fresh CI simulator
        // is English. This test reads the Spanish source text («Continuar»,
        // «Permitir acceso a Fotos»), so the app (not the system) runs in Spanish.
        app.launchArguments += ["-AppleLanguages", "(es)", "-AppleLocale", "es_ES"]
        // Log any system alert XCTest has to handle mid-test (run 41166497344 lost a
        // «Cerrar» tap to one). Returning false keeps XCTest's default handling.
        addUIInterruptionMonitor(withDescription: "System alert") { alert in
            print("COCOWASH_UI_INTERRUPTION label=\(alert.label) buttons=\(alert.buttons.allElementsBoundByIndex.map(\.label))")
            return false
        }
        app.launch()
        defer {
            let screenshot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
            screenshot.name = "Photos authorization session"
            screenshot.lifetime = .keepAlways
            add(screenshot)
        }

        // First launch shows the onboarding cards; Photos is requested only on the
        // last one, after the explanation. Every card must be passed (no skip).
        let next = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Continuar")).firstMatch
        let allow = app.buttons["Permitir acceso a Fotos"].firstMatch
        // The first card waits for a cold simulator to start WebKit and load the
        // bundle: run 41168418401 (CoreSimulator needed >180 s to answer simctl
        // list) missed 120 s with unchanged app code. Same bound as Photos (240 s).
        guard next.waitForExistence(timeout: 240) else {
            attachScreenshot(app, "Onboarding card 1 missing")
            XCTFail("Onboarding card 1 did not offer Continuar.")
            return
        }
        // Three cards precede the privacy card. Tap «Continuar» once it is enabled
        // (the gestures card keeps it disabled for one ~4 s demo cycle, first visit
        // only) until the privacy card appears. Run 41222676883 lost one of three
        // fixed taps and then looked for the privacy card one card too early, so a
        // tap that does not advance is simply repeated, at most 8 times.
        var taps = 0
        while !allow.exists && taps < 8 {
            guard next.waitForExistence(timeout: 30) else { break }
            // Standalone waiter: not registered with the test case, so the later
            // waitForExpectations(timeout:) never waits on it a second time.
            let enabled = XCTNSPredicateExpectation(predicate: NSPredicate(format: "enabled == true"), object: next)
            guard XCTWaiter().wait(for: [enabled], timeout: 30) == .completed else {
                attachScreenshot(app, "Onboarding Continuar stayed disabled")
                XCTFail("Continuar stayed disabled on the onboarding.")
                return
            }
            next.tap()
            taps += 1
            _ = allow.waitForExistence(timeout: 2)
        }
        print("COCOWASH_UI_ONBOARDING taps=\(taps)")
        guard allow.waitForExistence(timeout: 15) else {
            attachScreenshot(app, "Privacy card missing")
            XCTFail("The privacy card did not offer the Photos request.")
            return
        }
        // Grant the real OS prompt. This prompt is an expected step: address
        // SpringBoard directly rather than an interruption monitor or simulated response.
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let fullAccess = springboard.buttons.matching(NSPredicate(format:
            "(label CONTAINS[c] 'Full Access' OR label CONTAINS[c] 'All Photos' OR " +
            "label CONTAINS[c] 'todas las fotos' OR label CONTAINS[c] 'acceso completo' OR " +
            "label CONTAINS[c] 'acceso total') AND NOT (label CONTAINS[c] 'Limited' OR " +
            "label CONTAINS[c] 'Select' OR label BEGINSWITH[c] 'No ' OR " +
            "label BEGINSWITH[c] %@ OR label BEGINSWITH[c] %@)", "Don’t", "Don't"
        )).firstMatch
        // A tap that started the request turns the button into «Esperando permiso…».
        // Run 41231549707 tapped once and the request never started (no prompt in
        // 240 s), like the lost onboarding tap of run 41222676883: repeat a tap
        // that did not take, at most 3 times, before waiting for the prompt.
        var requested = false
        for attempt in 1...3 {
            if allow.exists { allow.tap() }
            let deadline = Date().addingTimeInterval(12)
            while Date() < deadline {
                if !allow.exists || fullAccess.exists { requested = true; break }
                Thread.sleep(forTimeInterval: 0.5)
            }
            if requested { break }
            print("COCOWASH_UI_ALLOW_RETRY \(attempt)")
        }
        // No debugDescription in failure paths: dumping the WebView hierarchy kept
        // xcodebuild busy until its 900 s limit (runs 41162917606, 41231549707).
        guard fullAccess.waitForExistence(timeout: 240) else {
            attachScreenshot(app, "Photos prompt missing")
            XCTFail("A FULL Photos authorization button was not offered (request started: \(requested)).")
            return
        }
        fullAccess.tap()

        // No landing page: once authorized the session prepares and opens by itself.
        // Session header «Terminar» (#review-trigger); its label may append a hidden
        // discard count, and the review sheet's «Terminar …» buttons are not mounted yet.
        let finish = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Terminar")).firstMatch
        guard finish.waitForExistence(timeout: 90) else {
            attachScreenshot(app, "Session did not open")
            XCTFail("Full Photos authorization and bounded media warmup did not open the real review session.")
            return
        }
        XCTAssertTrue(finish.isHittable, "Session toolbar must be usable after media warmup finishes.")
        // The shell independently requires the native prepareVideo bytes marker.
        // Do not invoke native bridge methods or bypass the real session UI here.
        print("COCOWASH_UI_AUTHORIZED_SESSION_OK")


        let system=XCUIApplication(bundleIdentifier:"com.apple.springboard")
        let deny=system.buttons.matching(NSPredicate(format:"label CONTAINS[c] 'Not to Track' OR label CONTAINS[c] 'no rastre'")).firstMatch
        guard deny.waitForExistence(timeout:75) else {
            attachScreenshot(app,"ATT research prompt unavailable")
            XCTFail("No real ATT prompt after the existing UMP flow; cannot claim either state was tested")
            return
        }
        if mode=="denied" { deny.tap() }
        else {
            let allow=system.buttons.matching(NSPredicate(format:"label IN %@",["Allow","Permitir"])).firstMatch
            XCTAssertTrue(allow.exists && allow.isHittable);allow.tap()
        }
        print("COCOWASH_UI_ATT_CHOICE mode=\(mode)")
        Thread.sleep(forTimeInterval:35)
        let keep=app.buttons["Conservar"].firstMatch
        XCTAssertTrue(keep.waitForExistence(timeout:20) && keep.isEnabled && keep.isHittable,"Photos must remain usable after the chosen ATT state and ad attempt")
        let progress=app.descendants(matching:.any).matching(NSPredicate(format:"label BEGINSWITH %@","Revisados ")).firstMatch
        XCTAssertTrue(progress.waitForExistence(timeout:15),"Actual reviewed progress must be exposed")
        let before=progress.label
        keep.tap()
        let changed=XCTNSPredicateExpectation(predicate:NSPredicate(format:"exists == true AND label != %@",before),object:progress)
        XCTAssertEqual(XCTWaiter().wait(for:[changed],timeout:15),.completed)
        print("COCOWASH_UI_PHOTOS_AFTER_ATT_OK")
        attachScreenshot(app,"After real ATT choice, test ad request only")
        print("COCOWASH_UI_AD_HOST_RESEARCH_OK")
    }

    @MainActor
    func testFullPhotosAuthorizationStartsSession() throws {
        // Only runs on the disposable CI simulator seeded with generated public
        // photo + H.264 fixtures. No native deletion or personal device is used.
        let app = XCUIApplication()
        app.resetAuthorizationStatus(for: .photos)
        // Since 9.8.1 the app follows the device language, and a fresh CI simulator
        // is English. This test reads the Spanish source text («Continuar»,
        // «Permitir acceso a Fotos»), so the app (not the system) runs in Spanish.
        app.launchArguments += ["-AppleLanguages", "(es)", "-AppleLocale", "es_ES"]
        // Log any system alert XCTest has to handle mid-test (run 41166497344 lost a
        // «Cerrar» tap to one). Returning false keeps XCTest's default handling.
        addUIInterruptionMonitor(withDescription: "System alert") { alert in
            print("COCOWASH_UI_INTERRUPTION label=\(alert.label) buttons=\(alert.buttons.allElementsBoundByIndex.map(\.label))")
            return false
        }
        app.launch()
        defer {
            let screenshot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
            screenshot.name = "Photos authorization session"
            screenshot.lifetime = .keepAlways
            add(screenshot)
        }

        // First launch shows the onboarding cards; Photos is requested only on the
        // last one, after the explanation. Every card must be passed (no skip).
        let next = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Continuar")).firstMatch
        let allow = app.buttons["Permitir acceso a Fotos"].firstMatch
        // The first card waits for a cold simulator to start WebKit and load the
        // bundle: run 41168418401 (CoreSimulator needed >180 s to answer simctl
        // list) missed 120 s with unchanged app code. Same bound as Photos (240 s).
        guard next.waitForExistence(timeout: 240) else {
            attachScreenshot(app, "Onboarding card 1 missing")
            XCTFail("Onboarding card 1 did not offer Continuar.")
            return
        }
        // Three cards precede the privacy card. Tap «Continuar» once it is enabled
        // (the gestures card keeps it disabled for one ~4 s demo cycle, first visit
        // only) until the privacy card appears. Run 41222676883 lost one of three
        // fixed taps and then looked for the privacy card one card too early, so a
        // tap that does not advance is simply repeated, at most 8 times.
        var taps = 0
        while !allow.exists && taps < 8 {
            guard next.waitForExistence(timeout: 30) else { break }
            // Standalone waiter: not registered with the test case, so the later
            // waitForExpectations(timeout:) never waits on it a second time.
            let enabled = XCTNSPredicateExpectation(predicate: NSPredicate(format: "enabled == true"), object: next)
            guard XCTWaiter().wait(for: [enabled], timeout: 30) == .completed else {
                attachScreenshot(app, "Onboarding Continuar stayed disabled")
                XCTFail("Continuar stayed disabled on the onboarding.")
                return
            }
            next.tap()
            taps += 1
            _ = allow.waitForExistence(timeout: 2)
        }
        print("COCOWASH_UI_ONBOARDING taps=\(taps)")
        guard allow.waitForExistence(timeout: 15) else {
            attachScreenshot(app, "Privacy card missing")
            XCTFail("The privacy card did not offer the Photos request.")
            return
        }
        // Grant the real OS prompt. This prompt is an expected step: address
        // SpringBoard directly rather than an interruption monitor or simulated response.
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let fullAccess = springboard.buttons.matching(NSPredicate(format:
            "(label CONTAINS[c] 'Full Access' OR label CONTAINS[c] 'All Photos' OR " +
            "label CONTAINS[c] 'todas las fotos' OR label CONTAINS[c] 'acceso completo' OR " +
            "label CONTAINS[c] 'acceso total') AND NOT (label CONTAINS[c] 'Limited' OR " +
            "label CONTAINS[c] 'Select' OR label BEGINSWITH[c] 'No ' OR " +
            "label BEGINSWITH[c] %@ OR label BEGINSWITH[c] %@)", "Don’t", "Don't"
        )).firstMatch
        // A tap that started the request turns the button into «Esperando permiso…».
        // Run 41231549707 tapped once and the request never started (no prompt in
        // 240 s), like the lost onboarding tap of run 41222676883: repeat a tap
        // that did not take, at most 3 times, before waiting for the prompt.
        var requested = false
        for attempt in 1...3 {
            if allow.exists { allow.tap() }
            let deadline = Date().addingTimeInterval(12)
            while Date() < deadline {
                if !allow.exists || fullAccess.exists { requested = true; break }
                Thread.sleep(forTimeInterval: 0.5)
            }
            if requested { break }
            print("COCOWASH_UI_ALLOW_RETRY \(attempt)")
        }
        // No debugDescription in failure paths: dumping the WebView hierarchy kept
        // xcodebuild busy until its 900 s limit (runs 41162917606, 41231549707).
        guard fullAccess.waitForExistence(timeout: 240) else {
            attachScreenshot(app, "Photos prompt missing")
            XCTFail("A FULL Photos authorization button was not offered (request started: \(requested)).")
            return
        }
        fullAccess.tap()

        // No landing page: once authorized the session prepares and opens by itself.
        // Session header «Terminar» (#review-trigger); its label may append a hidden
        // discard count, and the review sheet's «Terminar …» buttons are not mounted yet.
        let finish = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Terminar")).firstMatch
        guard finish.waitForExistence(timeout: 90) else {
            attachScreenshot(app, "Session did not open")
            XCTFail("Full Photos authorization and bounded media warmup did not open the real review session.")
            return
        }
        XCTAssertTrue(finish.isHittable, "Session toolbar must be usable after media warmup finishes.")
        // The shell independently requires the native prepareVideo bytes marker.
        // Do not invoke native bridge methods or bypass the real session UI here.
        print("COCOWASH_UI_AUTHORIZED_SESSION_OK")

        // Safe native mutation: a new album containing only simulator fixtures.
        // No discard, delete, favorites or real-device operations are performed.
        // Saving to an album now also keeps the item and advances: the progress
        // label («Revisados N de M…») must change once PhotoKit confirms.
        let progressLabel = app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH %@", "Revisados ")).firstMatch
        let reviewedBefore = progressLabel.waitForExistence(timeout: 15) ? progressLabel.label : ""
        let album = app.buttons["Álbum"].firstMatch
        XCTAssertTrue(album.waitForExistence(timeout: 15))
        let create = app.buttons["Crear álbum nuevo"].firstMatch
        XCTAssertTrue(tap(album, until: { create.exists }, "album"), "«Álbum» must open the album sheet.")
        let name = app.textFields["Por ejemplo, Verano"].firstMatch
        XCTAssertTrue(tap(create, until: { name.exists }, "create"), "«Crear álbum nuevo» must show the name field.")
        name.tap()
        let fixtureAlbum = "CocoWash CI Generated"
        print("COCOWASH_UI_ALBUM_FOCUS hittable=\(name.isHittable) keyboard=\(app.keyboards.count)")
        attachScreenshot(app, "Album before typing fixture name")
        // The field is already focused. Send to the active keyboard instead of
        // asking WKWebView's text-field accessibility proxy to route keystrokes.
        // Keep the exact value and enabled/save assertions below unchanged.
        app.typeText(fixtureAlbum)
        let save = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Crear y añadir ")).firstMatch
        XCTAssertTrue(save.waitForExistence(timeout: 10))
        // Diagnose the actual WKWebView field and React-derived enabled state;
        // never inject JS, force-enable the button or replace the native result.
        let typed = XCTNSPredicateExpectation(predicate: NSPredicate(format: "value == %@", fixtureAlbum), object: name)
        guard XCTWaiter().wait(for: [typed], timeout: 10) == .completed else {
            let fieldValue = name.value as? String ?? ""
            print("COCOWASH_UI_ALBUM_INPUT_MISMATCH valueLength=\(fieldValue.count) placeholder=\(fieldValue == name.placeholderValue) enabled=\(save.isEnabled) hittable=\(save.isHittable) keyboard=\(app.keyboards.count)")
            attachScreenshot(app, "Album input did not receive fixture name")
            // Diagnostic only: do not turn the failed full-name assertion into
            // a pass. A real software-keyboard tap distinguishes failed keyboard
            // event synthesis from an input that cannot accept user touches.
            print("COCOWASH_UI_KEYBOARD_KEYS \(app.keyboards.keys.allElementsBoundByIndex.map(\.label))")
            let diagnosticKey = app.keyboards.keys.matching(NSPredicate(format:"label ==[c] %@","c")).firstMatch
            if diagnosticKey.exists && diagnosticKey.isHittable {
                diagnosticKey.tap()
                Thread.sleep(forTimeInterval:2)
                let after = name.value as? String ?? ""
                print("COCOWASH_UI_SOFTWARE_KEY_PROBE placeholder=\(after == name.placeholderValue) valueLength=\(after.count)")
                attachScreenshot(app, "Album after real software-keyboard diagnostic")
            }
            XCTFail("WKWebView album field must contain the exact typed fixture name.")
            return
        }
        let savable = XCTNSPredicateExpectation(predicate: NSPredicate(format: "enabled == true"), object: save)
        guard XCTWaiter().wait(for: [savable], timeout: 10) == .completed else {
            print("COCOWASH_UI_ALBUM_SAVE_DISABLED inputMatches=true hittable=\(save.isHittable)")
            attachScreenshot(app, "Album save remained disabled")
            XCTFail("A nonempty native album name must enable Create and add.")
            return
        }
        print("COCOWASH_UI_ALBUM_READY inputMatches=true enabled=\(save.isEnabled) hittable=\(save.isHittable) keyboard=\(app.keyboards.count)")
        // The form button dismisses its own keyboard; do not inject JS or native calls.
        // A lost tap leaves the sheet open over «Álbum» (run 41235518150): repeat it.
        // While PhotoKit works the button is disabled, so a repeat cannot save twice.
        guard tap(save, until: { !save.exists }, "save") else {
            print("COCOWASH_UI_ALBUM_SAVE_STUCK fieldExists=\(name.exists) enabled=\(save.isEnabled) hittable=\(save.isHittable)")
            attachScreenshot(app, "Album sheet did not save")
            XCTFail("«Crear y añadir» must save the album and close the sheet.")
            return
        }
        XCTAssertTrue(album.waitForExistence(timeout: 30))
        if reviewedBefore.isEmpty {
            print("COCOWASH_UI_ALBUM_ADVANCE_UNCONFIRMED progress label not exposed")
        } else {
            let advanced = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == true AND label != %@", reviewedBefore), object: progressLabel)
            guard XCTWaiter().wait(for: [advanced], timeout: 30) == .completed else {
                attachScreenshot(app, "Album save did not keep and advance")
                XCTFail("Saving to an album must keep the item and advance the pile.")
                return
            }
            print("COCOWASH_UI_ALBUM_KEPT_AND_ADVANCED before=\(reviewedBefore) after=\(progressLabel.label)")
        }
        let returnedToSession = NSPredicate(format: "hittable == true")
        expectation(for: returnedToSession, evaluatedWith: album)
        waitForExpectations(timeout: 30)
        album.tap()
        let createdAlbum = app.buttons[fixtureAlbum].firstMatch
        XCTAssertTrue(createdAlbum.waitForExistence(timeout: 30), "Created native album must be returned by PhotoKit.")
        XCTAssertTrue(closeOverlay(app, until: finish), "«Cerrar» must close the album sheet.")
        print("COCOWASH_UI_GENERATED_ALBUM_OK")

        // Enable Geek in Ajustes (display settings apply immediately), then hold a
        // photo and drag it to the bottom anchor dock. Metadata proves the native read.
        app.buttons["Filtros"].firstMatch.tap()
        // The section switch uses aria-pressed, which WebKit exposes as a toggle,
        // not a plain button: match the exact label across element types.
        let settingsTab = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Ajustes")).firstMatch
        guard settingsTab.waitForExistence(timeout: 15) else {
            XCTFail("Filtros y ajustes did not expose the Ajustes section.")
            return
        }
        settingsTab.tap()
        let geek = app.switches.matching(NSPredicate(format: "label CONTAINS %@", "Modo Geek")).firstMatch
        XCTAssertTrue(geek.waitForExistence(timeout: 15))
        for _ in 0..<10 {
            if geek.isHittable { break }
            app.swipeUp()
        }
        XCTAssertTrue(geek.isHittable, "Geek switch must be reachable in Ajustes.")
        geek.tap()
        guard closeOverlay(app, until: finish) else {
            attachScreenshot(app, "Filtros y ajustes did not close")
            XCTFail("«Cerrar» must close Filtros y ajustes and return to the session.")
            return
        }
        // Gate: Modo Geek adds an explicit «Ver datos del archivo» control to the top
        // card (a real button, like the old «Ampliar y anclar»). It opens the anchored
        // view whose Geek panel proves the native metadata read.
        let info = app.buttons["Ver datos del archivo"].firstMatch
        guard info.waitForExistence(timeout: 15) else {
            attachScreenshot(app, "Geek data control missing")
            XCTFail("Modo Geek must add the data control to the top card.")
            return
        }
        // Any of the anchored view's own elements proves it opened; print what is
        // on screen either way (run 41203340645 saw none of them after the tap).
        let anchoredSignals: [XCUIElement] = [
            app.buttons["Cerrar"].firstMatch,
            app.buttons["Reducir zoom"].firstMatch,
            app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Inspeccionar recuerdo")).firstMatch,
            app.staticTexts["Modo Geek"].firstMatch,
        ]
        let fallback = app.staticTexts["No se pudo abrir la vista ampliada."].firstMatch
        func anchoredOpened(within seconds: TimeInterval) -> Bool {
            let deadline = Date().addingTimeInterval(seconds)
            repeat {
                if anchoredSignals.contains(where: { $0.exists }) { return true }
                if fallback.exists { return false }
                Thread.sleep(forTimeInterval: 0.5)
            } while Date() < deadline
            return false
        }
        info.tap()
        var opened = anchoredOpened(within: 10)
        if !opened, !fallback.exists, info.exists {
            print("COCOWASH_UI_DIAG data control tap had no effect; retrying by coordinate")
            info.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
            opened = anchoredOpened(within: 10)
        }
        // Read a frame only from an element that still exists: once the anchored
        // view opens, the card (and this control) leave the accessibility tree, and
        // resolving a vanished element fails the test (run 41208796103).
        let infoFrame = info.exists ? "\(info.frame)" : "gone"
        print("COCOWASH_UI_DIAG opened=\(opened) fallback=\(fallback.exists) session=\(finish.exists) infoFrame=\(infoFrame) signals=\(anchoredSignals.map(\.exists))")
        guard opened else {
            attachScreenshot(app, "Data control did not open the anchored view")
            XCTFail(fallback.exists ? "The anchored view failed to render (see COCOWASH_JS_ERROR)." : "The data control must open the anchored view.")
            return
        }
        XCTAssertTrue(app.staticTexts["Modo Geek"].firstMatch.waitForExistence(timeout: 15))
        XCTAssertTrue(app.staticTexts["Ancho"].firstMatch.waitForExistence(timeout: 30))
        XCTAssertTrue(app.staticTexts["Alto"].firstMatch.exists)
        XCTAssertTrue(app.staticTexts["Solo datos disponibles localmente. Sin descargar originales."].firstMatch.exists)
        print("COCOWASH_UI_LOCAL_METADATA_OK")
        guard closeOverlay(app, until: finish) else {
            attachScreenshot(app, "Anchored view did not close")
            print("COCOWASH_UI_PROBE skipped: anchored view did not close")
            return
        }

        // Diagnostic probes, not gates. Synthesized gestures on the card did not reach
        // the anchored view in runs 41162917606/41164527679 although the same events
        // work in the web preview. Double tap no longer opens it (a tap advances at
        // once); a pinch-out does. Record what XCTest sees; verify on device.
        XCTAssertTrue(finish.waitForExistence(timeout: 15))
        let card = app.descendants(matching: .any).matching(NSPredicate(format:
            "label BEGINSWITH %@ OR label BEGINSWITH %@ OR label BEGINSWITH %@", "Foto 1 de", "Vídeo 1 de", "Live Photo 1 de")).firstMatch
        guard card.waitForExistence(timeout: 10) else { print("COCOWASH_UI_PROBE card not exposed"); return }
        print("COCOWASH_UI_PROBE app=\(app.frame) card=\(card.exists ? "\(card.frame)" : "gone") info=\(info.exists ? "\(info.frame)" : "gone")")
        let press = card.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.25))
        card.pinch(withScale: 2.0, velocity: 1.5)
        let pinched = app.buttons["Cerrar"].firstMatch.waitForExistence(timeout: 6)
        print(pinched ? "COCOWASH_UI_PINCH_OK" : "COCOWASH_UI_PINCH_UNCONFIRMED")
        if pinched, !closeOverlay(app, until: finish) { print("COCOWASH_UI_PROBE stopped: anchored view did not close"); return }
        let dock = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.89))
        press.press(forDuration: 1.0, thenDragTo: dock, withVelocity: .slow, thenHoldForDuration: 0.4)
        attachScreenshot(app, "After hold and drag to the anchor dock")
        if app.buttons["Cerrar"].firstMatch.waitForExistence(timeout: 6) {
            print("COCOWASH_UI_ANCHOR_GESTURE_OK")
            _ = closeOverlay(app, until: finish)
        } else {
            print("COCOWASH_UI_ANCHOR_GESTURE_UNCONFIRMED")
        }
    }

    @MainActor private func ownedFullFixtureApp() throws -> XCUIApplication {
        let url=try XCTUnwrap(Bundle(for:Self.self).url(forResource:"native-lab-contract",withExtension:"json"))
        let contract=try XCTUnwrap(JSONSerialization.jsonObject(with:Data(contentsOf:url)) as? [String:Any])
        guard contract["enabled"] as? Bool == true && contract["liveOnly"] as? Bool != true else { throw XCTSkip("Full fixture safety lab only") }
        #if !targetEnvironment(simulator)
        throw NSError(domain:"CocoWashFixtureQA",code:2,userInfo:[NSLocalizedDescriptionKey:"Fixture safety refuses physical libraries"])
        #endif
        XCTAssertEqual(contract["simulator"] as? String,ProcessInfo.processInfo.environment["SIMULATOR_UDID"])
        let app=XCUIApplication();app.launchArguments=["-AppleLanguages","(es)","-AppleLocale","es_ES"];app.terminate();app.launch()
        XCTAssertTrue(app.buttons["Eliminar"].firstMatch.waitForExistence(timeout:120))
        // An earlier test that ended during a Photos operation leaves the R-61
        // «interrupted» notice, which blocks every operation until acknowledged.
        // Acknowledge it through the person's own control and log it visibly.
        let stale=app.otherElements.matching(NSPredicate(format:"label CONTAINS %@","quedó interrumpida")).firstMatch
        if stale.waitForExistence(timeout:3) {
            let close=app.buttons["Cerrar aviso"].firstMatch
            XCTAssertTrue(close.waitForExistence(timeout:5),"The interrupted-operation notice must offer its close control")
            close.tap();print("COCOWASH_UI_STALE_INTENT_ACKNOWLEDGED")
            XCTAssertEqual(XCTWaiter().wait(for:[XCTNSPredicateExpectation(predicate:NSPredicate(format:"exists == false"),object:stale)],timeout:10),.completed)
        }
        guard app.buttons["Terminar"].firstMatch.waitForExistence(timeout:20) else {
            attachScreenshot(app,"Safety fixture has an unexpected existing pending decision")
            throw NSError(domain:"CocoWashFixtureQA",code:3,userInfo:[NSLocalizedDescriptionKey:"Refused to reuse a pending decision from an earlier failed test"])
        }
        return app
    }

    @MainActor
    func testVGeneratedDeletionCancellation() throws {
        let app=try ownedFullFixtureApp()
        app.buttons["Eliminar"].firstMatch.tap()
        let finish=app.buttons.matching(NSPredicate(format:"label BEGINSWITH %@","Terminar")).firstMatch
        let acknowledged=XCTNSPredicateExpectation(predicate:NSPredicate(format:"label CONTAINS %@ AND enabled == true","1 para eliminar"),object:finish)
        XCTAssertEqual(XCTWaiter().wait(for:[acknowledged],timeout:20),.completed,"Wait for the actual durable decision acknowledgement")
        finish.tap()
        let confirm=app.buttons.matching(NSPredicate(format:"label == %@ OR label BEGINSWITH %@","Eliminar 1","Eliminar 1 (")).firstMatch
        XCTAssertTrue(confirm.waitForExistence(timeout:20));confirm.tap()
        let system=XCUIApplication(bundleIdentifier:"com.apple.springboard")
        let cancel=system.buttons.matching(NSPredicate(format:"label IN %@",["Cancel","Cancelar","Don't Allow","Don’t Allow","No permitir"])).firstMatch
        XCTAssertTrue(cancel.waitForExistence(timeout:30),"A real Photos cancellation button must be offered")
        cancel.tap()
        let retained=XCTNSPredicateExpectation(predicate:NSPredicate(format:"exists == true AND enabled == true"),object:confirm)
        XCTAssertEqual(XCTWaiter().wait(for:[retained],timeout:20),.completed,"Cancellation must preserve the queued item, never report deletion")
        XCTAssertFalse(app.buttons["Seguir revisando"].firstMatch.exists)
        let recover=app.buttons["Recuperar"].firstMatch
        XCTAssertTrue(recover.isHittable);recover.tap()
        XCTAssertEqual(XCTWaiter().wait(for:[XCTNSPredicateExpectation(predicate:NSPredicate(format:"exists == false"),object:recover)],timeout:20),.completed,"Recovery must be acknowledged before terminating this test")
        XCTAssertTrue(closeOverlay(app,until:finish))
        attachScreenshot(app,"Synthetic deletion canceled and recovered")
        print("COCOWASH_UI_NATIVE_DELETE_CANCEL_OK")
    }

    @MainActor
    func testWGeneratedPendingSurvivesTermination() throws {
        let app=try ownedFullFixtureApp()
        for trial in 1...5 {
        app.buttons["Eliminar"].firstMatch.tap()
        let pendingFinish=app.buttons.matching(NSPredicate(format:"label BEGINSWITH %@ AND label CONTAINS %@","Terminar","1 para eliminar")).firstMatch
        XCTAssertTrue(pendingFinish.waitForExistence(timeout:15),"Queue must first be acknowledged in the actual interface")
        // No artificial save delay and no system deletion confirmation here.
        app.terminate();app.launch()
        XCTAssertTrue(pendingFinish.waitForExistence(timeout:120),"Acknowledged pending decision must survive actual process termination")
        pendingFinish.tap()
        let recover=app.buttons["Recuperar"].firstMatch
        XCTAssertTrue(recover.waitForExistence(timeout:20));recover.tap()
        XCTAssertEqual(XCTWaiter().wait(for:[XCTNSPredicateExpectation(predicate:NSPredicate(format:"exists == false"),object:recover)],timeout:20),.completed)
        let finish=app.buttons.matching(NSPredicate(format:"label BEGINSWITH %@","Terminar")).firstMatch
        XCTAssertTrue(closeOverlay(app,until:finish))
        print("COCOWASH_UI_NATIVE_PENDING_RELAUNCH_OK trial=\(trial)")
        }
    }

    @MainActor
    func testXGeneratedLongPressHasNoPersistentSystemMenu() throws {
        let app=try ownedFullFixtureApp()
        func noMenu(_ name:String) {
            XCTAssertFalse(app.menuItems.firstMatch.exists,"App-owned content must not open a selection/context menu")
            let system=XCUIApplication(bundleIdentifier:"com.apple.springboard")
            let labels=["Copy","Copiar","Select All","Seleccionar todo","Live Text","Texto en vivo"]
            XCTAssertFalse(system.menuItems.matching(NSPredicate(format:"label IN %@",labels)).firstMatch.exists)
            attachScreenshot(app,name)
        }
        let photo=app.images["Foto del carrete"].firstMatch
        XCTAssertTrue(photo.waitForExistence(timeout:30));photo.press(forDuration:1.2)
        noMenu("Card long press released - selection and Live Text check")
        let progress=app.descendants(matching:.any).matching(NSPredicate(format:"label BEGINSWITH %@","Revisados ")).firstMatch
        XCTAssertTrue(progress.exists);progress.press(forDuration:1.2)
        noMenu("Text long press released - selection menu check")
        app.buttons["Eliminar"].firstMatch.tap()
        let finish=app.buttons.matching(NSPredicate(format:"label BEGINSWITH %@ AND label CONTAINS %@","Terminar","1 para eliminar")).firstMatch
        XCTAssertTrue(finish.waitForExistence(timeout:20));finish.tap()
        XCTAssertTrue(app.buttons["Recuperar"].firstMatch.waitForExistence(timeout:20))
        let reviewImages=app.images.matching(identifier:"Foto del carrete")
        XCTAssertTrue(reviewImages.firstMatch.waitForExistence(timeout:30),"The review thumbnail must finish loading before testing its long press")
        let reviewPhoto=reviewImages.firstMatch
        let thumbnailReady=XCTNSPredicateExpectation(predicate:NSPredicate(format:"hittable == true"),object:reviewPhoto)
        XCTAssertEqual(XCTWaiter().wait(for:[thumbnailReady],timeout:30),.completed,"Wait for the loaded review image to become interactable")
        reviewPhoto.press(forDuration:1.2)
        noMenu("Review long press released - selection menu check")
        let recover=app.buttons["Recuperar"].firstMatch;recover.tap()
        XCTAssertEqual(XCTWaiter().wait(for:[XCTNSPredicateExpectation(predicate:NSPredicate(format:"exists == false"),object:recover)],timeout:20),.completed)
        let toolbar=app.buttons.matching(NSPredicate(format:"label BEGINSWITH %@","Terminar")).firstMatch
        XCTAssertTrue(closeOverlay(app,until:toolbar))
        // XCTest cannot prove absence of a transient loupe during the held touch.
        // Claude must accept the native recording/physical gesture separately.
        print("COCOWASH_UI_NATIVE_PRESS_MENU_RELEASE_OK")
    }

    @MainActor
    func testYGeneratedLivePhotoInlineAndAnchored() throws {
        let url=try XCTUnwrap(Bundle(for:Self.self).url(forResource:"native-lab-contract",withExtension:"json"))
        let contract=try XCTUnwrap(JSONSerialization.jsonObject(with:Data(contentsOf:url)) as? [String:Any])
        guard contract["enabled"] as? Bool == true else { throw XCTSkip("Live fixture lab disabled") }
        #if !targetEnvironment(simulator)
        XCTFail("Live fixture lab refuses physical libraries");return
        #endif
        XCTAssertEqual(contract["simulator"] as? String,ProcessInfo.processInfo.environment["SIMULATOR_UDID"])
        let app=XCUIApplication();app.launchArguments += ["-AppleLanguages","(es)","-AppleLocale","es_ES"]
        app.terminate();app.launch()
        let finish=app.buttons.matching(NSPredicate(format:"label BEGINSWITH %@","Terminar")).firstMatch
        XCTAssertTrue(finish.waitForExistence(timeout:120))
        // Existing accessible data control opens the same pinned view as dragging.
        app.buttons["Filtros"].firstMatch.tap()
        let settings=app.descendants(matching:.any).matching(NSPredicate(format:"label == %@","Ajustes")).firstMatch
        XCTAssertTrue(settings.waitForExistence(timeout:15));settings.tap()
        let geek=app.switches.matching(NSPredicate(format:"label CONTAINS %@","Modo Geek")).firstMatch
        XCTAssertTrue(geek.waitForExistence(timeout:15))
        for _ in 0..<10 { if geek.isHittable { break };app.swipeUp() }
        XCTAssertTrue(geek.isHittable)
        if (geek.value as? String) != "1" { geek.tap() }
        XCTAssertTrue(closeOverlay(app,until:finish))
        try nativeMediaFilter(app,"Live Photos")
        // aria-pressed is exposed by WebKit as a toggle rather than Button.
        // Keep the exact accessible name and require a real visible chip, not
        // the video element that shares this accessible label after loading.
        let play=try nativeLiveControl(app,"Reproducir Live Photo",timeout:60)
        Thread.sleep(forTimeInterval:3)
        let card=app.descendants(matching:.any).matching(NSPredicate(format:"label BEGINSWITH %@","Live Photo 1 de")).firstMatch
        XCTAssertTrue(card.exists)
        let keyBefore=try nativePhotoCrop(app,card.frame,"Live key before")
        Thread.sleep(forTimeInterval:0.7)
        let keyStable=try nativePhotoCrop(app,card.frame,"Live paused baseline")
        XCTAssertEqual(keyBefore,keyStable,"Paused key photo must be stable before evaluating playback")
        play.tap()
        let pause=try nativeLiveControl(app,"Pausar",timeout:30)
        Thread.sleep(forTimeInterval:2)
        let motion1=try nativePhotoCrop(app,card.frame,"Live motion one")
        Thread.sleep(forTimeInterval:0.7)
        let motion2=try nativePhotoCrop(app,card.frame,"Live motion two")
        XCTAssertNotEqual(motion1,motion2,"Paired video must actually render changing pixels inline")
        pause.tap();_ = try nativeLiveControl(app,"Reproducir Live Photo",timeout:15);Thread.sleep(forTimeInterval:2)
        let keyAfter=try nativePhotoCrop(app,card.frame,"Live key after pause")
        let differences=zip(keyBefore,keyAfter).filter{$0.0 != $0.1}.count
        // Exact bytes are not the contract: compositing re-rasterizes the same key
        // photo with ±1–2 levels (runs 42519482281, 42547955639). The contract is
        // «the key photo, not a frozen motion frame»: visually identical to the key
        // and far closer to it than to the motion frames.
        func distance(_ a:Data,_ b:Data)->(max:Int,sum:Int){var m=0,s=0;for (x,y) in zip(a,b){let d=abs(Int(x)-Int(y));m=max(m,d);s+=d};return (m,s)}
        let toKey=distance(keyAfter,keyBefore),motionToKey=distance(motion1,keyBefore)
        print("COCOWASH_UI_LIVE_KEY_PIXELS bytes=\(keyBefore.count) changedChannels=\(differences) maxDelta=\(toKey.max) sum=\(toKey.sum) motionSum=\(motionToKey.sum)")
        XCTAssertEqual(keyAfter.count,keyBefore.count,"Key photo crop size must not change")
        XCTAssertLessThanOrEqual(toKey.max,12,"Pausing on the card must restore its key photo (max channel delta)")
        XCTAssertLessThan(differences*100,keyBefore.count,"Pausing on the card must restore its key photo (<1% channels differ)")
        XCTAssertLessThan(toKey.sum*20,motionToKey.sum,"The paused card must match the key photo, not freeze a motion frame")
        attachScreenshot(app,"Native Live Photo paused key photo")
        print("COCOWASH_UI_LIVE_CARD_KEY_OK")
        app.buttons["Ver datos del archivo"].firstMatch.tap()
        XCTAssertTrue(app.buttons["Cerrar"].firstMatch.waitForExistence(timeout:30))
        let timeline=app.sliders["Posición del vídeo"].firstMatch
        XCTAssertTrue(timeline.waitForExistence(timeout:30))
        let anchoredPlay=app.buttons["Reproducir"].firstMatch
        XCTAssertTrue(anchoredPlay.exists);anchoredPlay.tap()
        XCTAssertTrue(pause.waitForExistence(timeout:15));Thread.sleep(forTimeInterval:1)
        // The anchored view's only dock control is «Cerrar» (user, 2026-11-08). XCTest
        // cannot adjust() an HTML range in WKWebView: drag its thumb like a finger.
        pause.tap()
        let thumb=max(0.02,min(0.98,nativeLivePosition(timeline) ?? 0.02))
        timeline.coordinate(withNormalizedOffset:CGVector(dx:thumb,dy:0.5)).press(forDuration:0.05,thenDragTo:timeline.coordinate(withNormalizedOffset:CGVector(dx:0.85,dy:0.5)))
        let before=try XCTUnwrap(nativeLivePosition(timeline))
        XCTAssertGreaterThan(before,0.6,"Timeline must seek the actual three-second paired clip")
        anchoredPlay.tap()
        let deadline=Date().addingTimeInterval(4)
        var looped=false
        while Date()<deadline { if let position=nativeLivePosition(timeline),position<0.4 { looped=true;break };Thread.sleep(forTimeInterval:0.2) }
        XCTAssertTrue(looped,"Playback must wrap past the end of the paired video")
        pause.tap();Thread.sleep(forTimeInterval:2)
        attachScreenshot(app,"Native Live Photo anchored with timeline")
        // A paused, settled image isolates the real two-finger zoom from motion.
        let region=CGRect(x:app.frame.width*0.2,y:app.frame.height*0.2,width:app.frame.width*0.6,height:app.frame.height*0.45)
        let beforePinch=try nativePhotoCrop(app,region,"Live pinned before pinch")
        let timelineFrame=timeline.frame
        app.pinch(withScale:1.8,velocity:1)
        Thread.sleep(forTimeInterval:2)
        let afterPinch=try nativePhotoCrop(app,region,"Live pinned after pinch")
        XCTAssertEqual(timeline.frame,timelineFrame,"Pinch must zoom the photo without scaling its controls")
        XCTAssertNotEqual(beforePinch,afterPinch,"Native two-finger gesture must change the pinned photo's rendered zoom")
        attachScreenshot(app,"Native Live Photo after pinch zoom")
        XCTAssertTrue(closeOverlay(app,until:finish))
        try nativeMediaFilter(app,"Todo")
        print("COCOWASH_UI_LIVE_ANCHOR_TIMELINE_ZOOM_OK")
    }

    @MainActor private func nativeLiveControl(_ app:XCUIApplication,_ label:String,timeout:TimeInterval) throws -> XCUIElement {
        let query=app.descendants(matching:.any).matching(NSPredicate(format:"label == %@",label))
        let deadline=Date().addingTimeInterval(timeout)
        repeat {
            if let control=query.allElementsBoundByIndex.last(where:{$0.isHittable && $0.frame.height<=64 && $0.frame.width<=180}) {
                print("COCOWASH_UI_LIVE_CONTROL label=\(label) type=\(control.elementType.rawValue) frame=\(control.frame)")
                return control
            }
            Thread.sleep(forTimeInterval:0.4)
        } while Date()<deadline
        attachScreenshot(app,"Live control missing")
        print("COCOWASH_UI_LIVE_AX \(app.debugDescription)")
        throw NSError(domain:"CocoWashFixtureQA",code:1,userInfo:[NSLocalizedDescriptionKey:"Exact visible Live control missing: \(label)"])
    }

    @MainActor private func nativeMediaFilter(_ app:XCUIApplication,_ media:String) throws {
        app.buttons["Filtros"].firstMatch.tap()
        // The sheet remembers Ajustes after the Geek test. Select its filters
        // tab explicitly; never change app behavior just for this test.
        let tab=app.descendants(matching:.any).matching(NSPredicate(format:"label == %@","Filtros")).allElementsBoundByIndex.filter { $0.isHittable }.last
        try XCTUnwrap(tab).tap()
        let choice=app.descendants(matching:.any).matching(NSPredicate(format:"label == %@",media)).allElementsBoundByIndex.filter { $0.isHittable }.last
        try XCTUnwrap(choice).tap()
        let apply=app.buttons["Aplicar filtros"].firstMatch
        for _ in 0..<8 { if apply.isHittable { break };app.swipeUp() }
        XCTAssertTrue(apply.isHittable);apply.tap()
        let gone=XCTNSPredicateExpectation(predicate:NSPredicate(format:"exists == false"),object:apply)
        XCTAssertEqual(XCTWaiter().wait(for:[gone],timeout:20),.completed)
    }
    @MainActor private func nativePhotoCrop(_ app:XCUIApplication,_ bounds:CGRect,_ name:String) throws -> Data {
        let screenshot=XCUIScreen.main.screenshot()
        let image=try XCTUnwrap(screenshot.image.cgImage)
        let scale=CGFloat(image.width)/app.frame.width
        let inner=bounds.insetBy(dx:bounds.width*0.22,dy:bounds.height*0.24)
        let crop=CGRect(x:inner.minX*scale,y:inner.minY*scale,width:inner.width*scale,height:inner.height*scale)
        let raster=try XCTUnwrap(image.cropping(to:crop))
        let png=try XCTUnwrap(UIImage(cgImage:raster).pngData())
        let attachment=XCTAttachment(data:png,uniformTypeIdentifier:"public.png")
        attachment.name=name;attachment.lifetime = .keepAlways;add(attachment)
        // Compare actual channels, without PNG metadata or row padding. No
        // tolerance can hide an arbitrary frame left over from the video.
        let color=try XCTUnwrap(CGColorSpace(name:CGColorSpace.sRGB))
        let context=try XCTUnwrap(CGContext(data:nil,width:raster.width,height:raster.height,bitsPerComponent:8,bytesPerRow:raster.width*4,space:color,bitmapInfo:CGBitmapInfo.byteOrder32Big.rawValue|CGImageAlphaInfo.premultipliedLast.rawValue))
        context.interpolationQuality = .none
        context.draw(raster,in:CGRect(x:0,y:0,width:raster.width,height:raster.height))
        return Data(bytes:try XCTUnwrap(context.data),count:raster.width*raster.height*4)
    }
    @MainActor private func nativeLivePosition(_ slider:XCUIElement) -> Double? {
        let value=(slider.value as? String ?? "").replacingOccurrences(of:",",with:".")
        print("COCOWASH_UI_LIVE_TIMELINE value=\(value)")
        if value.hasSuffix("%"),let percent=Double(value.dropLast().trimmingCharacters(in:.whitespaces)) { return percent/100 }
        let tokens=value.components(separatedBy:" ")
        if let first=tokens.first {
            let clock=first.components(separatedBy:":")
            if clock.count==2,let minutes=Double(clock[0]),let seconds=Double(clock[1]) { return (minutes*60+seconds)/3 }
            if let seconds=Double(first) { return seconds/3 }
        }
        return nil
    }

    // Disabled by default. CI binds this contract to its newly-created simulator.
    @MainActor
    func testZTenNativeDeletionRounds() throws {
        let url = try XCTUnwrap(Bundle(for:Self.self).url(forResource:"native-lab-contract",withExtension:"json"))
        let contract = try XCTUnwrap(JSONSerialization.jsonObject(with:Data(contentsOf:url)) as? [String:Any])
        if contract["liveOnly"] as? Bool == true { throw XCTSkip("Dedicated Live probe; no destructive-cycle acceptance claimed") }
        guard contract["enabled"] as? Bool == true else { throw XCTSkip("Native destructive lab disabled; no generated CI ownership contract") }
        #if !targetEnvironment(simulator)
        XCTFail("Native destructive lab refuses physical devices");return
        #endif
        XCTAssertEqual(contract["simulator"] as? String,ProcessInfo.processInfo.environment["SIMULATOR_UDID"],"Must be the exact run-owned simulator")
        XCTAssertTrue((contract["run"] as? String)?.isEmpty == false)
        let app=XCUIApplication()
        app.launchArguments += ["-AppleLanguages","(es)","-AppleLocale","es_ES"]
        app.terminate();app.launch()
        let finish=app.buttons.matching(NSPredicate(format:"label BEGINSWITH %@","Terminar")).firstMatch
        XCTAssertTrue(finish.waitForExistence(timeout:120),"The real authorization/session must already exist")
        try nativeMediaFilter(app,"Todo") // Isolate cycles from a prior Live/filter test failure.
        Thread.sleep(forTimeInterval:20)
        try nativeCheckpoint(0)
        let options=XCTMeasureOptions();options.iterationCount=10
        var invocation=0,completed=0
        // Apple documents iterationCount+1 invocations, discarding the first.
        // The warmup is idle; exactly ten measured destructive rounds follow.
        measure(metrics:[XCTMemoryMetric(application:app),XCTCPUMetric(application:app)],options:options) {
            invocation += 1
            if invocation == 1 { Thread.sleep(forTimeInterval:3);return }
            do {
                try self.nativeDeletionRound(app)
                completed += 1
                try self.nativeCheckpoint(completed)
                if completed == 5 || completed == 10 { self.attachScreenshot(app,"Native generated-media round \(completed)") }
            } catch { XCTFail("Native lab round failed: \(error)") }
        }
        XCTAssertEqual(invocation,11,"XCTest warmup semantics changed")
        XCTAssertEqual(completed,10)
        print("COCOWASH_UI_NATIVE_TEN_CYCLES_OK")
        app.terminate();app.launch()
        XCTAssertTrue(finish.waitForExistence(timeout:90),"Completed rounds must survive process termination")
        print("COCOWASH_UI_NATIVE_RELAUNCH_OK")
    }

    @MainActor private func nativeDeletionRound(_ app:XCUIApplication) throws {
        let discard=app.buttons["Eliminar"].firstMatch
        XCTAssertTrue(discard.waitForExistence(timeout:45),"Single-item discard control required")
        XCTAssertTrue(discard.isEnabled)
        discard.tap()
        let finish=app.buttons.matching(NSPredicate(format:"label BEGINSWITH %@ AND label CONTAINS %@","Terminar","1 para eliminar")).firstMatch
        XCTAssertTrue(finish.waitForExistence(timeout:20),"The queued item must be acknowledged before review")
        finish.tap()
        let confirm=app.buttons.matching(NSPredicate(format:"label == %@ OR label BEGINSWITH %@","Eliminar 1","Eliminar 1 (")).firstMatch
        XCTAssertTrue(confirm.waitForExistence(timeout:15),"Review must contain exactly one generated item")
        confirm.tap()
        let system=XCUIApplication(bundleIdentifier:"com.apple.springboard")
        let remove=system.buttons.matching(NSPredicate(format:"label IN %@",["Delete","Delete Photo","Delete 1 Photo","Eliminar","Eliminar foto","Eliminar 1 foto"])).firstMatch
        guard remove.waitForExistence(timeout:30) else {
            self.attachScreenshot(app,"Expected system fixture deletion confirmation missing")
            XCTFail("No recognized real Photos deletion confirmation; never dismiss an unknown alert")
            return
        }
        remove.tap()
        let again=app.buttons["Seguir revisando"].firstMatch
        XCTAssertTrue(again.waitForExistence(timeout:45),"Successful native delete must reach the completed round")
        XCUIDevice.shared.press(.home);Thread.sleep(forTimeInterval:1);app.activate()
        XCTAssertTrue(again.waitForExistence(timeout:15));again.tap()
        XCTAssertTrue(discard.waitForExistence(timeout:45),"Next round must have a usable single-item control")
    }

    private func nativeCheckpoint(_ cycle:Int) throws {
        let dir=FileManager.default.urls(for:.documentDirectory,in:.userDomainMask)[0]
        let request=dir.appendingPathComponent("native-cycle-\(cycle).request")
        let response=dir.appendingPathComponent("native-cycle-\(cycle).response")
        try Data("generated CI cycle \(cycle)".utf8).write(to:request,options:.atomic)
        let deadline=Date().addingTimeInterval(90)
        while !FileManager.default.fileExists(atPath:response.path) && Date()<deadline { Thread.sleep(forTimeInterval:0.2) }
        XCTAssertTrue(FileManager.default.fileExists(atPath:response.path),"Host must collect real app+WebContent metrics before continuing")
        print("COCOWASH_NATIVE_CHECKPOINT cycle=\(cycle)")
    }

    /// Taps «Cerrar» (sheet header or anchored view) by coordinate and confirms the
    /// session is usable again. A system interruption handled mid-tap invalidates
    /// a targeted element and fails the test outright (run 41166497344); a
    /// coordinate tap is re-aimed on each attempt and the result is checked.
    @MainActor private func closeOverlay(_ app: XCUIApplication, until session: XCUIElement) -> Bool {
        for attempt in 1...3 {
            let close = app.buttons["Cerrar"].firstMatch
            if close.waitForExistence(timeout: 5), close.isHittable {
                close.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
            }
            let deadline = Date().addingTimeInterval(8)
            while Date() < deadline {
                // Both overlays own the only exact «Cerrar»; gone + session hittable = closed.
                if !app.buttons["Cerrar"].firstMatch.exists && session.exists && session.isHittable { return true }
                Thread.sleep(forTimeInterval: 0.25)
            }
            print("COCOWASH_UI_CLOSE_RETRY \(attempt)")
        }
        return false
    }

    /// Taps `element` until `done` holds: at most 3 taps, 10 s apart. Synthesized
    /// taps on the WebView are occasionally lost on a busy simulator (runs
    /// 41222676883, 41231549707, 41235518150); a control that did nothing is
    /// tapped again instead of failing the whole smoke test.
    @MainActor private func tap(_ element: XCUIElement, until done: () -> Bool, _ name: String) -> Bool {
        for attempt in 1...3 {
            if done() { return true }
            if element.exists { element.tap() }
            let deadline = Date().addingTimeInterval(10)
            while Date() < deadline {
                if done() { return true }
                Thread.sleep(forTimeInterval: 0.4)
            }
            print("COCOWASH_UI_TAP_RETRY \(name) \(attempt)")
        }
        return done()
    }

    @MainActor private func attachScreenshot(_ app: XCUIApplication, _ name: String) {
        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.name = name
        shot.lifetime = .keepAlways
        add(shot)
    }
}
