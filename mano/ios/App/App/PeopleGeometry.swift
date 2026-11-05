import Foundation
import CoreGraphics

/// Media Intelligence bounds use top-left origin on orientation-normalized
/// pixels. UIKit drawing uses that same origin; never apply Vision's Y flip.
enum PeopleGeometry {
    struct Oval { var center: CGPoint; var radii: CGSize; var angle: CGFloat }
    struct Bar { var center: CGPoint; var width: CGFloat; var height: CGFloat; var angle: CGFloat }
    static func valid(_ b: [Double]) -> Bool {
        b.count == 4 && b.allSatisfy { $0.isFinite } && b[0] >= 0 && b[1] >= 0 && b[2] > 0 && b[3] > 0 && b[0]+b[2] <= 1.000001 && b[1]+b[3] <= 1.000001
    }
    static func rect(_ b: [Double], width: Double, height: Double) -> CGRect? {
        guard valid(b), width > 0, height > 0, width.isFinite, height.isFinite else { return nil }
        let x = CGFloat(b[0]*width), y = CGFloat(b[1]*height), w = CGFloat(b[2]*width), h = CGFloat(b[3]*height)
        return CGRect(x:x,y:y,width:w,height:h)
    }
    static func crop(_ b: [Double], width: Double, height: Double) -> CGRect? {
        guard let box = rect(b,width:width,height:height), min(box.width,box.height) >= 12 else { return nil }
        let full = CGRect(x:0,y:0,width:CGFloat(width),height:CGFloat(height))
        return box.insetBy(dx:-box.width*0.4,dy:-box.height*0.35).integral.intersection(full)
    }
    static func iou(_ a: CGRect, _ b: CGRect) -> Double {
        let overlap = a.intersection(b)
        guard !overlap.isNull else { return 0 }
        return Double(overlap.width*overlap.height / max(0.000001,a.width*a.height+b.width*b.height-overlap.width*overlap.height))
    }
    /// Project the safety rectangle into the oval's rotated axes. sqrt(2)
    /// expansion covers its corners; feathering happens outside that core.
    static func oval(_ bounds: [Double], width: Double, height: Double, angle: Double) -> Oval? {
        guard let box = mask(bounds,width:width,height:height), angle.isFinite else { return nil }
        let a = CGFloat(angle), cosine = abs(cos(a)), sine = abs(sin(a))
        let rx = (box.width*cosine+box.height*sine)*0.76
        let ry = (box.width*sine+box.height*cosine)*0.76
        return Oval(center:CGPoint(x:box.midX,y:box.midY),radii:CGSize(width:rx,height:ry),angle:a)
    }
    static func eyeBar(_ eyes: [[Double]]?, bounds: [Double], width: Double, height: Double) -> Bar? {
        guard let eyes, eyes.count == 2, eyes.allSatisfy({$0.count == 2 && $0.allSatisfy({$0.isFinite && $0 >= 0 && $0 <= 1})}),
              let face = rect(bounds,width:width,height:height) else { return nil }
        let points = eyes.map { CGPoint(x:CGFloat($0[0]*width),y:CGFloat($0[1]*height)) }.sorted { $0.x < $1.x }
        guard points.allSatisfy({face.insetBy(dx:-face.width*0.1,dy:-face.height*0.1).contains($0)}) else { return nil }
        let dx = points[1].x-points[0].x, dy = points[1].y-points[0].y, distance = hypot(dx,dy)
        guard distance >= face.width*0.15, distance <= face.width*0.95 else { return nil }
        return Bar(center:CGPoint(x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2),width:max(distance*1.9,face.width*0.95),height:max(distance*0.55,face.height*0.18),angle:atan2(dy,dx))
    }
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
