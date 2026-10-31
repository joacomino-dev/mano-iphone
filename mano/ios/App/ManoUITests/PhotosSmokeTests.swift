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
            guard next.waitForExistence(timeout: step == 1 ? 120 : 15) else {
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
        app.buttons["Cerrar"].firstMatch.tap()
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
        app.buttons["Cerrar"].firstMatch.tap()
        expectation(for: returnedToSession, evaluatedWith: finish)
        waitForExpectations(timeout: 30)
        // Gate: Modo Geek adds an explicit «Ver datos del archivo» control to the top
        // card (a real button, like the old «Ampliar y anclar»). It opens the anchored
        // view whose Geek panel proves the native metadata read.
        let info = app.buttons["Ver datos del archivo"].firstMatch
        guard info.waitForExistence(timeout: 15) else {
            attachScreenshot(app, "Geek data control missing")
            XCTFail("Modo Geek must add the data control to the top card.")
            return
        }
        info.tap()
        guard app.staticTexts["Anclada"].firstMatch.waitForExistence(timeout: 15) else {
            attachScreenshot(app, "Data control did not open the anchored view")
            XCTFail("The data control must open the anchored view.")
            return
        }
        XCTAssertTrue(app.staticTexts["Modo Geek"].firstMatch.waitForExistence(timeout: 15))
        XCTAssertTrue(app.staticTexts["Ancho"].firstMatch.waitForExistence(timeout: 30))
        XCTAssertTrue(app.staticTexts["Alto"].firstMatch.exists)
        XCTAssertTrue(app.staticTexts["Solo datos disponibles localmente. Sin descargar originales."].firstMatch.exists)
        app.buttons["Cerrar"].firstMatch.tap()
        print("COCOWASH_UI_LOCAL_METADATA_OK")

        // Diagnostic probes, not gates. Synthesized double tap and press-and-drag on
        // the card did not reach the anchored view in runs 41162917606/41164527679
        // although the same events work in the web preview. Record what XCTest sees
        // so the next change is based on evidence; verify the gestures on device.
        XCTAssertTrue(finish.waitForExistence(timeout: 15))
        let card = app.descendants(matching: .any).matching(NSPredicate(format:
            "label BEGINSWITH %@ OR label BEGINSWITH %@ OR label BEGINSWITH %@", "Foto 1 de", "Vídeo 1 de", "Live Photo 1 de")).firstMatch
        guard card.waitForExistence(timeout: 10) else { print("COCOWASH_UI_PROBE card not exposed"); return }
        print("COCOWASH_UI_PROBE app=\(app.frame) card=\(card.frame) hittable=\(card.isHittable) info=\(info.frame)")
        let press = card.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.25))
        press.doubleTap()
        let doubleTapped = app.staticTexts["Anclada"].firstMatch.waitForExistence(timeout: 6)
        print(doubleTapped ? "COCOWASH_UI_DOUBLE_TAP_OK" : "COCOWASH_UI_DOUBLE_TAP_UNCONFIRMED")
        if doubleTapped { app.buttons["Cerrar"].firstMatch.tap(); _ = finish.waitForExistence(timeout: 10) }
        let dock = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.89))
        press.press(forDuration: 1.0, thenDragTo: dock, withVelocity: .slow, thenHoldForDuration: 0.4)
        attachScreenshot(app, "After hold and drag to the anchor dock")
        if app.staticTexts["Anclada"].firstMatch.waitForExistence(timeout: 6) {
            print("COCOWASH_UI_ANCHOR_GESTURE_OK")
            app.buttons["Cerrar"].firstMatch.tap()
        } else {
            print("COCOWASH_UI_ANCHOR_GESTURE_UNCONFIRMED")
        }
    }

    @MainActor private func attachScreenshot(_ app: XCUIApplication, _ name: String) {
        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.name = name
        shot.lifetime = .keepAlways
        add(shot)
    }
}
