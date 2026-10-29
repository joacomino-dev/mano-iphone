import XCTest

final class PhotosSmokeTests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
        executionTimeAllowance = 300
    }

    @MainActor
    func testFullPhotosAuthorizationStartsSession() throws {
        // Only runs on the disposable CI simulator seeded with one generated image.
        let app = XCUIApplication()
        app.resetAuthorizationStatus(for: .photos)
        app.launch()
        defer {
            let screenshot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
            screenshot.name = "Photos authorization session"
            screenshot.lifetime = .keepAlways
            add(screenshot)
        }

        let start = app.buttons["Iniciar sesión"].firstMatch
        guard start.waitForExistence(timeout: 120) else {
            XCTFail("The real welcome screen did not expose Iniciar sesión.\n\(app.debugDescription)")
            return
        }
        start.tap()

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
        guard fullAccess.waitForExistence(timeout: 90) else {
            XCTFail("A FULL Photos authorization button was not offered.\n\(springboard.debugDescription)")
            return
        }
        fullAccess.tap()

        let finish = app.buttons["Terminar sesión"].firstMatch
        guard finish.waitForExistence(timeout: 90) else {
            XCTFail("Full Photos authorization did not open the real review session.\n\(app.debugDescription)")
            return
        }
        print("MEMSWIPE_UI_AUTHORIZED_SESSION_OK")
    }
}
