import Foundation
import CoreGraphics

/// Media Intelligence bounds use top-left origin on orientation-normalized
/// pixels. UIKit drawing uses that same origin; never apply Vision's Y flip.
enum PeopleGeometry {
    static func mask(_ bounds: [Double], width: Double, height: Double) -> CGRect? {
        guard bounds.count == 4, bounds.allSatisfy({ $0.isFinite }), width.isFinite, height.isFinite,
              width > 0, height > 0, bounds[0] >= 0, bounds[1] >= 0,
              bounds[2] >= 0.015, bounds[3] >= 0.015,
              bounds[0] + bounds[2] <= 1, bounds[1] + bounds[3] <= 1 else { return nil }
        let x = CGFloat(bounds[0] * width), y = CGFloat(bounds[1] * height)
        let w = CGFloat(bounds[2] * width), h = CGFloat(bounds[3] * height)
        let box = CGRect(x: x, y: y, width: w, height: h)
        let image = CGRect(x: 0, y: 0, width: CGFloat(width), height: CGFloat(height))
        return box.insetBy(dx: -max(12, w * 0.2), dy: -max(12, h * 0.25)).intersection(image)
    }
}
