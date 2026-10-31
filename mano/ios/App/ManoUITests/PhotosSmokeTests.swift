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
        // Press on the real top card, not a fixed screen point: the 320×240 video
        // fixture yields a short landscape card whose top edge sits below y≈0.32
        // (run 41159459492). Its upper part avoids the select mark and centred Play.
        // No app.debugDescription on failure: a WebView dump can stall for minutes.
        let card = app.descendants(matching: .any).matching(NSPredicate(format:
            "label BEGINSWITH %@ OR label BEGINSWITH %@ OR label BEGINSWITH %@", "Foto 1 de", "Vídeo 1 de", "Live Photo 1 de")).firstMatch
        let press: XCUICoordinate
        if card.waitForExistence(timeout: 10), card.frame.height > 80 {
            press = card.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.2))
        } else {
            // The card is centred in its stack; 36 % of the stack height lies inside
            // even the landscape card and above its Play button.
            let stack = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Pila de recuerdos")).firstMatch
            XCTAssertTrue(stack.waitForExistence(timeout: 10), "The card stack must be on screen.")
            press = stack.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.36))
        }
        let dock = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.89))
        press.press(forDuration: 0.8, thenDragTo: dock)
        let afterAnchor = XCTAttachment(screenshot: app.screenshot())
        afterAnchor.name = "After hold and drag to the anchor dock"
        afterAnchor.lifetime = .keepAlways
        add(afterAnchor)
        guard app.staticTexts["Anclada"].firstMatch.waitForExistence(timeout: 15) else {
            XCTFail("Hold and drag to the dock must anchor the photo.")
            return
        }
        XCTAssertTrue(app.staticTexts["Modo Geek"].firstMatch.waitForExistence(timeout: 15))
        XCTAssertTrue(app.staticTexts["Ancho"].firstMatch.waitForExistence(timeout: 30))
        XCTAssertTrue(app.staticTexts["Alto"].firstMatch.exists)
        XCTAssertTrue(app.staticTexts["Solo datos disponibles localmente. Sin descargar originales."].firstMatch.exists)
        app.buttons["Cerrar"].firstMatch.tap()
        print("COCOWASH_UI_LOCAL_METADATA_OK")
    }
}
