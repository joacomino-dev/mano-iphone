import XCTest

final class PhotosSmokeTests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
        executionTimeAllowance = 600
    }

    @MainActor
    func testFullPhotosAuthorizationStartsSession() throws {
        // Only runs on the disposable CI simulator seeded with generated public
        // photo + H.264 fixtures. No native deletion or personal device is used.
        let app = XCUIApplication()
        app.resetAuthorizationStatus(for: .photos)
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
        for step in 1...3 {
            let next = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Continuar")).firstMatch
            // The first card waits for a cold simulator to start WebKit and load the
            // bundle: run 41168418401 (CoreSimulator needed >180 s to answer simctl
            // list) missed 120 s with unchanged app code. Same bound as Photos (240 s).
            guard next.waitForExistence(timeout: step == 1 ? 240 : 30) else {
                attachScreenshot(app, "Onboarding card \(step) missing")
                XCTFail("Onboarding card \(step) did not offer Continuar.")
                return
            }
            next.tap()
        }
        let allow = app.buttons["Permitir acceso a Fotos"].firstMatch
        guard allow.waitForExistence(timeout: 15) else {
            XCTFail("The privacy card did not offer the Photos request.")
            return
        }
        allow.tap()

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
        guard fullAccess.waitForExistence(timeout: 240) else {
            XCTFail("A FULL Photos authorization button was not offered.\n\(springboard.debugDescription)")
            return
        }
        fullAccess.tap()

        // No landing page: once authorized the session prepares and opens by itself.
        // Session header «Terminar» (#review-trigger); its label may append a hidden
        // discard count, and the review sheet's «Terminar …» buttons are not mounted yet.
        let finish = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Terminar")).firstMatch
        guard finish.waitForExistence(timeout: 90) else {
            XCTFail("Full Photos authorization and bounded media warmup did not open the real review session.\n\(app.debugDescription)")
            return
        }
        XCTAssertTrue(finish.isHittable, "Session toolbar must be usable after media warmup finishes.")
        // The shell independently requires the native prepareVideo bytes marker.
        // Do not invoke native bridge methods or bypass the real session UI here.
        print("MEMSWIPE_UI_AUTHORIZED_SESSION_OK")

        // Safe native mutation: a new album containing only simulator fixtures.
        // No discard, delete, favorites or real-device operations are performed.
        let album = app.buttons["Álbum"].firstMatch
        XCTAssertTrue(album.waitForExistence(timeout: 15))
        album.tap()
        let create = app.buttons["Crear álbum nuevo"].firstMatch
        XCTAssertTrue(create.waitForExistence(timeout: 15))
        create.tap()
        let name = app.textFields["Por ejemplo, Verano"].firstMatch
        XCTAssertTrue(name.waitForExistence(timeout: 15))
        name.tap()
        let fixtureAlbum = "CocoWash CI Generated"
        name.typeText(fixtureAlbum)
        let save = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Crear y añadir ")).firstMatch
        XCTAssertTrue(save.waitForExistence(timeout: 10))
        // The form button dismisses its own keyboard; do not inject JS or native calls.
        save.tap()
        XCTAssertTrue(album.waitForExistence(timeout: 30))
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
            app.staticTexts["Anclada"].firstMatch,
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

        // Diagnostic probes, not gates. Synthesized double tap and press-and-drag on
        // the card did not reach the anchored view in runs 41162917606/41164527679
        // although the same events work in the web preview. Record what XCTest sees
        // so the next change is based on evidence; verify the gestures on device.
        XCTAssertTrue(finish.waitForExistence(timeout: 15))
        let card = app.descendants(matching: .any).matching(NSPredicate(format:
            "label BEGINSWITH %@ OR label BEGINSWITH %@ OR label BEGINSWITH %@", "Foto 1 de", "Vídeo 1 de", "Live Photo 1 de")).firstMatch
        guard card.waitForExistence(timeout: 10) else { print("COCOWASH_UI_PROBE card not exposed"); return }
        print("COCOWASH_UI_PROBE app=\(app.frame) card=\(card.exists ? "\(card.frame)" : "gone") info=\(info.exists ? "\(info.frame)" : "gone")")
        let press = card.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.25))
        press.doubleTap()
        let doubleTapped = app.staticTexts["Anclada"].firstMatch.waitForExistence(timeout: 6)
        print(doubleTapped ? "COCOWASH_UI_DOUBLE_TAP_OK" : "COCOWASH_UI_DOUBLE_TAP_UNCONFIRMED")
        if doubleTapped, !closeOverlay(app, until: finish) { print("COCOWASH_UI_PROBE stopped: anchored view did not close"); return }
        let dock = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.89))
        press.press(forDuration: 1.0, thenDragTo: dock, withVelocity: .slow, thenHoldForDuration: 0.4)
        attachScreenshot(app, "After hold and drag to the anchor dock")
        if app.staticTexts["Anclada"].firstMatch.waitForExistence(timeout: 6) {
            print("COCOWASH_UI_ANCHOR_GESTURE_OK")
            _ = closeOverlay(app, until: finish)
        } else {
            print("COCOWASH_UI_ANCHOR_GESTURE_UNCONFIRMED")
        }
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

    @MainActor private func attachScreenshot(_ app: XCUIApplication, _ name: String) {
        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.name = name
        shot.lifetime = .keepAlways
        add(shot)
    }
}
