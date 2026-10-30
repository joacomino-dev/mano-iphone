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

        // Welcome requests Photos immediately. Grant the real OS prompt BEFORE
        // touching Empezar a revisar; a covered/disabled start button is not a failure.
        // This prompt is an expected step: address SpringBoard directly rather
        // than an interruption monitor or simulated permission response.
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

        // Fresh simulator state: no saved session, so the CTA is not «Continuar revisión».
        let start = app.buttons["Empezar a revisar"].firstMatch
        guard start.waitForExistence(timeout: 120) else {
            XCTFail("The authorized welcome screen did not expose Empezar a revisar.\n\(app.debugDescription)")
            return
        }
        XCTAssertTrue(start.isHittable, "Authorized welcome must permit starting a session.")
        start.tap()

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

        // Enable Geek through ordinary draft filters, then open the explicit
        // inspection button. Nonempty metadata rendering proves the native read.
        app.buttons["Filtros"].firstMatch.tap()
        let geek = app.switches.matching(NSPredicate(format: "label CONTAINS %@", "Modo Geek")).firstMatch
        XCTAssertTrue(geek.waitForExistence(timeout: 15))
        for _ in 0..<4 {
            if geek.isHittable { break }
            app.swipeUp()
        }
        XCTAssertTrue(geek.isHittable, "Geek switch must be reachable in filters.")
        geek.tap()
        let apply = app.buttons["Aplicar filtros"].firstMatch
        for _ in 0..<3 {
            if apply.isHittable { break }
            app.swipeUp()
        }
        XCTAssertTrue(apply.isHittable)
        apply.tap()
        let inspect = app.buttons["Ampliar y anclar"].firstMatch
        XCTAssertTrue(inspect.waitForExistence(timeout: 30))
        inspect.tap()
        XCTAssertTrue(app.staticTexts["Modo Geek"].firstMatch.waitForExistence(timeout: 15))
        XCTAssertTrue(app.staticTexts["Ancho"].firstMatch.waitForExistence(timeout: 30))
        XCTAssertTrue(app.staticTexts["Alto"].firstMatch.exists)
        XCTAssertTrue(app.staticTexts["Solo datos disponibles localmente. Sin descargar originales."].firstMatch.exists)
        app.buttons["Cerrar"].firstMatch.tap()
        print("COCOWASH_UI_LOCAL_METADATA_OK")
    }
}
