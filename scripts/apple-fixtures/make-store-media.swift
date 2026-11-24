// Hosted-Mac only. Generates the store demo roll's synthetic media:
// two fictional screenshots (no real app, brand or person) and one long dark
// "recorded in the pocket" video whose size makes the freed space realistic.
// Usage: make-store-media <output-dir> <video-seconds>
import AVFoundation
import CoreGraphics
import CoreText
import Foundation
import ImageIO
import UniformTypeIdentifiers

func fail(_ message: String) -> Never { FileHandle.standardError.write((message + "\n").data(using: .utf8)!); exit(1) }
let args = CommandLine.arguments
guard args.count == 3, let seconds = Int(args[2]), seconds > 0 else { fail("usage: make-store-media <dir> <seconds>") }
let out = URL(fileURLWithPath: args[1], isDirectory: true)
try? FileManager.default.createDirectory(at: out, withIntermediateDirectories: true)
let space = CGColorSpaceCreateDeviceRGB()

func color(_ hex: UInt32, _ alpha: CGFloat = 1) -> CGColor {
    CGColor(colorSpace: space, components: [CGFloat((hex >> 16) & 255) / 255, CGFloat((hex >> 8) & 255) / 255, CGFloat(hex & 255) / 255, alpha])!
}

func text(_ ctx: CGContext, _ string: String, x: CGFloat, y: CGFloat, size: CGFloat, weight: String = "Helvetica-Bold", fill: UInt32) {
    let font = CTFontCreateWithName(weight as CFString, size, nil)
    let attributes: [NSAttributedString.Key: Any] = [NSAttributedString.Key(kCTFontAttributeName as String): font, NSAttributedString.Key(kCTForegroundColorAttributeName as String): color(fill)]
    let line = CTLineCreateWithAttributedString(NSAttributedString(string: string, attributes: attributes))
    ctx.textPosition = CGPoint(x: x, y: y)
    CTLineDraw(line, ctx)
}

/// iPhone screenshot size; EXIF UserComment «Screenshot» is how Photos recognizes screenshots.
func screenshot(_ name: String, draw: (CGContext, CGFloat, CGFloat) -> Void) {
    let width = 1179, height = 2556
    guard let ctx = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0, space: space, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue) else { fail("context") }
    draw(ctx, CGFloat(width), CGFloat(height))
    // Status bar, drawn like a phone screenshot (top-left origin flipped: CG origin is bottom-left).
    text(ctx, "9:41", x: 110, y: CGFloat(height) - 120, size: 50, fill: 0x111111)
    guard let image = ctx.makeImage(), let dest = CGImageDestinationCreateWithURL(out.appendingPathComponent(name) as CFURL, UTType.png.identifier as CFString, 1, nil) else { fail("png") }
    CGImageDestinationAddImage(dest, image, [kCGImagePropertyExifDictionary: [kCGImagePropertyExifUserComment: "Screenshot"]] as CFDictionary)
    guard CGImageDestinationFinalize(dest) else { fail("png write") }
}

// A fictional boarding pass.
screenshot("s1-boarding-pass.png") { ctx, w, h in
    ctx.setFillColor(color(0xF2F2F4)); ctx.fill(CGRect(x: 0, y: 0, width: w, height: h))
    let card = CGRect(x: 70, y: 420, width: w - 140, height: h - 760)
    ctx.addPath(CGPath(roundedRect: card, cornerWidth: 48, cornerHeight: 48, transform: nil)); ctx.setFillColor(color(0xFFFFFF)); ctx.fillPath()
    ctx.saveGState(); ctx.addPath(CGPath(roundedRect: card, cornerWidth: 48, cornerHeight: 48, transform: nil)); ctx.clip()
    ctx.setFillColor(color(0x2B6CB0)); ctx.fill(CGRect(x: card.minX, y: card.maxY - 300, width: card.width, height: 300)); ctx.restoreGState()
    text(ctx, "COCO AIR", x: 130, y: card.maxY - 140, size: 64, fill: 0xFFFFFF)
    text(ctx, "Boarding pass", x: 130, y: card.maxY - 220, size: 44, weight: "Helvetica", fill: 0xDCE8F5)
    text(ctx, "MEX", x: 130, y: card.maxY - 520, size: 150, fill: 0x1A202C)
    text(ctx, "MAD", x: w - 470, y: card.maxY - 520, size: 150, fill: 0x1A202C)
    text(ctx, "→", x: w / 2 - 50, y: card.maxY - 510, size: 110, weight: "Helvetica", fill: 0x2B6CB0)
    let rows = [("Flight", "CA 214"), ("Gate", "24"), ("Seat", "17A"), ("Boarding", "21:35")]
    for (index, row) in rows.enumerated() {
        let x = 130 + CGFloat(index % 2) * 470, y = card.maxY - 760 - CGFloat(index / 2) * 220
        text(ctx, row.0, x: x, y: y, size: 42, weight: "Helvetica", fill: 0x718096)
        text(ctx, row.1, x: x, y: y - 80, size: 72, fill: 0x1A202C)
    }
    var seed: UInt64 = 214
    let cell: CGFloat = 26, side = 25, origin = CGPoint(x: w / 2 - CGFloat(side) * cell / 2, y: card.minY + 140)
    ctx.setFillColor(color(0x111111))
    for row in 0..<side { for column in 0..<side {
        seed = seed &* 6364136223846793005 &+ 1442695040888963407
        let finder = (row < 7 || row >= side - 7) && (column < 7) || (row < 7 && column >= side - 7)
        if finder ? (row % 6 == 0 || column % 6 == 0 || (row % 7 > 1 && row % 7 < 5 && column % 7 > 1 && column % 7 < 5)) : (seed >> 33) & 1 == 1 {
            ctx.fill(CGRect(x: origin.x + CGFloat(column) * cell, y: origin.y + CGFloat(row) * cell, width: cell, height: cell))
        }
    } }
}

// A fictional walking route on a plain map.
screenshot("s2-route.png") { ctx, w, h in
    ctx.setFillColor(color(0xEDE9E0)); ctx.fill(CGRect(x: 0, y: 0, width: w, height: h))
    ctx.setFillColor(color(0xCFE3C4)); ctx.fill(CGRect(x: 640, y: 1500, width: 420, height: 560))
    ctx.setFillColor(color(0xB9D7EA)); ctx.fill(CGRect(x: 0, y: 700, width: w, height: 160))
    ctx.setStrokeColor(color(0xFFFFFF)); ctx.setLineWidth(46)
    for x in stride(from: CGFloat(120), to: w, by: 330) { ctx.move(to: CGPoint(x: x, y: 0)); ctx.addLine(to: CGPoint(x: x + 90, y: h)) }
    for y in stride(from: CGFloat(300), to: h, by: 420) { ctx.move(to: CGPoint(x: 0, y: y)); ctx.addLine(to: CGPoint(x: w, y: y + 60)) }
    ctx.strokePath()
    ctx.setStrokeColor(color(0x2F7DF6)); ctx.setLineWidth(22); ctx.setLineCap(.round); ctx.setLineJoin(.round)
    ctx.move(to: CGPoint(x: 290, y: 980)); ctx.addLine(to: CGPoint(x: 330, y: 1400)); ctx.addLine(to: CGPoint(x: 700, y: 1450)); ctx.addLine(to: CGPoint(x: 760, y: 2050)); ctx.addLine(to: CGPoint(x: 900, y: 2140))
    ctx.strokePath()
    ctx.setFillColor(color(0xE53E3E)); ctx.fillEllipse(in: CGRect(x: 865, y: 2105, width: 70, height: 70))
    ctx.setFillColor(color(0x2F7DF6)); ctx.fillEllipse(in: CGRect(x: 260, y: 950, width: 60, height: 60))
    let sheet = CGRect(x: 0, y: 0, width: w, height: 640)
    ctx.addPath(CGPath(roundedRect: sheet.insetBy(dx: 0, dy: -60), cornerWidth: 60, cornerHeight: 60, transform: nil)); ctx.setFillColor(color(0xFFFFFF)); ctx.fillPath()
    text(ctx, "18 min", x: 90, y: 440, size: 96, fill: 0x1A202C)
    text(ctx, "1.4 km · Walking", x: 90, y: 350, size: 50, weight: "Helvetica", fill: 0x718096)
    ctx.addPath(CGPath(roundedRect: CGRect(x: 90, y: 110, width: w - 180, height: 150), cornerWidth: 75, cornerHeight: 75, transform: nil)); ctx.setFillColor(color(0x2F7DF6)); ctx.fillPath()
    text(ctx, "Go", x: w / 2 - 40, y: 160, size: 60, fill: 0xFFFFFF)
}

// A long, dark, shaky pocket recording: noise keeps the encoder near its bitrate,
// so the file is as large as a real accidental video of this length.
let videoURL = out.appendingPathComponent("v1-pocket.mp4")
try? FileManager.default.removeItem(at: videoURL)
let width = 1080, height = 1920, fps: Int32 = 30
guard let writer = try? AVAssetWriter(outputURL: videoURL, fileType: .mp4) else { fail("writer") }
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: width, AVVideoHeightKey: height,
    AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 40_000_000, AVVideoMaxKeyFrameIntervalKey: 30, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel]])
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA, kCVPixelBufferWidthKey as String: width, kCVPixelBufferHeightKey as String: height])
writer.add(input)
guard writer.startWriting() else { fail(writer.error?.localizedDescription ?? "start") }
writer.startSession(atSourceTime: .zero)
var state: UInt64 = 0x9E3779B97F4A7C15
var columns = [Float](repeating: 0, count: width)
for frame in 0..<(seconds * Int(fps)) {
    while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval: 0.005) }
    guard let pool = adaptor.pixelBufferPool else { fail("pool") }
    var buffer: CVPixelBuffer?
    CVPixelBufferPoolCreatePixelBuffer(nil, pool, &buffer)
    guard let pixels = buffer else { fail("buffer") }
    CVPixelBufferLockBaseAddress(pixels, [])
    let base = CVPixelBufferGetBaseAddress(pixels)!.assumingMemoryBound(to: UInt8.self)
    let stride = CVPixelBufferGetBytesPerRow(pixels)
    // A faint warm glow drifts as the phone moves inside the pocket.
    let glowY = Double(height) * (0.5 + 0.35 * sin(Double(frame) / 37)), glowX = Double(width) * (0.5 + 0.3 * cos(Double(frame) / 53))
    // The glow is separable (exp(-dx²)·exp(-dy²)): one column table per frame keeps this fast.
    for x in 0..<width { let dx = (Double(x) - glowX) / 500; columns[x] = Float(60 * exp(-dx * dx)) }
    for y in 0..<height {
        let row = base + y * stride, dy = (Double(y) - glowY) / 700, rowGlow = Float(exp(-dy * dy))
        for x in 0..<width {
            state ^= state << 13; state ^= state >> 7; state ^= state << 17
            let value = 14 + columns[x] * rowGlow + Float(state & 31)
            row[x * 4] = UInt8(min(255, value * 0.7))
            row[x * 4 + 1] = UInt8(min(255, value * 0.85))
            row[x * 4 + 2] = UInt8(min(255, value))
            row[x * 4 + 3] = 255
        }
    }
    CVPixelBufferUnlockBaseAddress(pixels, [])
    guard adaptor.append(pixels, withPresentationTime: CMTime(value: Int64(frame), timescale: fps)) else { fail(writer.error?.localizedDescription ?? "append") }
}
input.markAsFinished()
let done = DispatchSemaphore(value: 0)
writer.finishWriting { done.signal() }
done.wait()
guard writer.status == .completed else { fail(writer.error?.localizedDescription ?? "finish") }
let bytes = (try? FileManager.default.attributesOfItem(atPath: videoURL.path)[.size] as? NSNumber)?.int64Value ?? 0
print("STORE_MEDIA screenshots=2 videoBytes=\(bytes)")
