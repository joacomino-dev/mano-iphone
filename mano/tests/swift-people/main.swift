import Foundation
import CoreGraphics

func require(_ value: Bool, _ message: String) { if !value { fatalError(message) } }
for size in [(300.0, 1000.0), (1000.0, 300.0), (1400.0, 1400.0)] {
    let (w, h) = size
    for i in 0..<100 {
        let x = Double(i % 10) / 12, y = Double(i / 10) / 12
        let mask = PeopleGeometry.mask([x, y, 0.1, 0.1], width: w, height: h)!
        let face = CGRect(x: x*w, y: y*h, width: w*0.1, height: h*0.1)
        require(mask.contains(face), "Every face must be fully covered")
        require(mask.minX >= 0 && mask.minY >= 0 && mask.maxX <= w && mask.maxY <= h, "Clamp to image")
    }
}
let top = PeopleGeometry.mask([0.2, 0.1, 0.2, 0.1], width: 1000, height: 1000)!
require(top.midY < 250, "Do not invert Media Intelligence top-left coordinates")
for bad in [[Double.nan,0,0.2,0.2], [0,0,-1,0.2], [0.95,0,0.2,0.2], [0,0,0.001,0.2], [0,0,0.2], [0,Double.infinity,0.2,0.2]] {
    require(PeopleGeometry.mask(bad, width: 1000, height: 1000) == nil, "Unknown geometry must hide the whole image")
}
print("PEOPLE_GEOMETRY_OK 300 masks, orientation and invalid/small faces")
