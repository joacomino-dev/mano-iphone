// CI-only generated media. No personal asset and no code linked into CocoWash.
import AppKit
import AVFoundation
import CoreMedia
import CoreVideo
import ImageIO

func fail(_ text: String) -> Never { fputs("FIXTURE_FAIL: \(text)\n", stderr); exit(1) }
guard CommandLine.arguments.count == 3 else { fail("usage: source.png output-folder") }
let source = URL(fileURLWithPath: CommandLine.arguments[1])
let folder = URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true)
try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
guard let inputImage = CGImageSourceCreateWithURL(source as CFURL, nil),
      let image = CGImageSourceCreateImageAtIndex(inputImage, 0, nil) else { fail("public PNG not readable") }
// Same portrait geometry in the key photo and the movie, without stretching.
let width = 320, height = 480
let imageContext = CGContext(data:nil,width:width,height:height,bitsPerComponent:8,bytesPerRow:width*4,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.noneSkipLast.rawValue)!
imageContext.draw(image,in:CGRect(x:0,y:0,width:CGFloat(width),height:CGFloat(height)))
guard let keyImage=imageContext.makeImage() else { fail("key photo raster") }
let identifier = UUID().uuidString
let photo = folder.appendingPathComponent("key-photo.jpg")
let movie = folder.appendingPathComponent("paired-motion.mov")
guard !FileManager.default.fileExists(atPath: photo.path), !FileManager.default.fileExists(atPath: movie.path) else {
    fail("output exists; preserve prior fixture evidence")
}
guard let destination = CGImageDestinationCreateWithURL(photo as CFURL, "public.jpeg" as CFString, 1, nil) else { fail("JPEG destination") }
// MakerApple17 is the Live Photo resource-pair file tag, not a private selector.
// It is confined to this synthetic fixture generator, never the shipping app.
CGImageDestinationAddImage(destination, keyImage, [kCGImagePropertyMakerAppleDictionary as String: ["17": identifier]] as CFDictionary)
guard CGImageDestinationFinalize(destination) else { fail("JPEG write") }

let writer = try AVAssetWriter(outputURL: movie, fileType: .mov)
let identity = AVMutableMetadataItem()
identity.identifier = .quickTimeMetadataContentIdentifier
identity.value = identifier as NSString
identity.dataType = "com.apple.metadata.datatype.UTF-8"
writer.metadata = [identity]
let video = AVAssetWriterInput(mediaType: .video, outputSettings: [AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: width, AVVideoHeightKey: height])
let pixels = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: video, sourcePixelBufferAttributes: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB, kCVPixelBufferWidthKey as String: width, kCVPixelBufferHeightKey as String: height])
let specification: [String: Any] = [kCMMetadataFormatDescriptionMetadataSpecificationKey_Identifier as String: "mdta/com.apple.quicktime.still-image-time", kCMMetadataFormatDescriptionMetadataSpecificationKey_DataType as String: "com.apple.metadata.datatype.int8"]
var description: CMFormatDescription?
guard CMMetadataFormatDescriptionCreateWithMetadataSpecifications(allocator: kCFAllocatorDefault, metadataType: kCMMetadataFormatType_Boxed, metadataSpecifications: [specification] as CFArray, formatDescriptionOut: &description) == noErr,
      let description else { fail("timed-metadata format") }
let metadata = AVAssetWriterInput(mediaType: .metadata, outputSettings: nil, sourceFormatHint: description)
let metadataAdaptor = AVAssetWriterInputMetadataAdaptor(assetWriterInput: metadata)
guard writer.canAdd(video), writer.canAdd(metadata) else { fail("writer inputs") }
writer.add(video); writer.add(metadata)
guard writer.startWriting() else { fail("writer start: \(String(describing:writer.error))") }
writer.startSession(atSourceTime: .zero)
let stillTime = AVMutableMetadataItem()
stillTime.identifier = AVMetadataIdentifier(rawValue: "mdta/com.apple.quicktime.still-image-time")
stillTime.dataType = "com.apple.metadata.datatype.int8"
stillTime.value = NSNumber(value: Int8(0))
let deadline = Date().addingTimeInterval(60)
while !metadata.isReadyForMoreMediaData { guard Date() < deadline else { fail("metadata stalled") }; Thread.sleep(forTimeInterval: 0.01) }
guard metadataAdaptor.append(AVTimedMetadataGroup(items: [stillTime], timeRange: CMTimeRange(start: .zero, duration: CMTime(value: 1, timescale: 30)))) else { fail("still-image-time append") }
metadata.markAsFinished()
for frame in 0..<90 {
    while !video.isReadyForMoreMediaData { guard Date() < deadline else { fail("video stalled") }; Thread.sleep(forTimeInterval: 0.01) }
    var buffer: CVPixelBuffer?
    guard CVPixelBufferCreate(kCFAllocatorDefault, width, height, kCVPixelFormatType_32ARGB, [kCVPixelBufferCGImageCompatibilityKey as String:true,kCVPixelBufferCGBitmapContextCompatibilityKey as String:true] as CFDictionary, &buffer) == kCVReturnSuccess, let buffer else { fail("pixel buffer") }
    CVPixelBufferLockBaseAddress(buffer, [])
    guard let context = CGContext(data:CVPixelBufferGetBaseAddress(buffer),width:width,height:height,bitsPerComponent:8,bytesPerRow:CVPixelBufferGetBytesPerRow(buffer),space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.noneSkipFirst.rawValue) else { fail("drawing context") }
    context.draw(image, in: CGRect(x:0,y:0,width:CGFloat(width),height:CGFloat(height)))
    if frame > 0 { context.setFillColor(CGColor(red:CGFloat(frame%30)/30,green:0.7,blue:0.5,alpha:1));context.fill(CGRect(x:CGFloat(frame*2%280),y:30,width:40,height:40)) }
    CVPixelBufferUnlockBaseAddress(buffer, [])
    guard pixels.append(buffer,withPresentationTime:CMTime(value:Int64(frame),timescale:30)) else { fail("video frame append") }
}
video.markAsFinished()
let finished = DispatchSemaphore(value:0)
writer.finishWriting { finished.signal() }
guard finished.wait(timeout:.now()+60) == .success, writer.status == .completed else { fail("finish: \(String(describing:writer.error))") }
guard let jpeg = CGImageSourceCreateWithURL(photo as CFURL,nil),
      let properties = CGImageSourceCopyPropertiesAtIndex(jpeg,0,nil) as? [String:Any],
      let maker = properties[kCGImagePropertyMakerAppleDictionary as String] as? [String:Any],
      maker["17"] as? String == identifier else { fail("JPEG content identifier mismatch") }
let saved = AVURLAsset(url:movie)
guard saved.metadata.contains(where:{$0.identifier == .quickTimeMetadataContentIdentifier && $0.stringValue == identifier}),
      saved.tracks(withMediaType:.metadata).count == 1,
      saved.tracks(withMediaType:.video).count == 1 else { fail("MOV identity/metadata/video mismatch") }
let report: [String:Any] = ["status":"PASS","boundary":"Synthetic file pair only; PhotoKit Live recognition still requires import on simulator","matchingContentIdentifier":true,"timedMetadataTracks":1,"frames":90,"durationSeconds":3,"photoBytes":try Data(contentsOf:photo).count,"videoBytes":try Data(contentsOf:movie).count]
try JSONSerialization.data(withJSONObject:report,options:[.prettyPrinted,.sortedKeys]).write(to:folder.appendingPathComponent("pair-report.json"))
print("FIXTURE_PAIR_PASS: JPEG/MOV matching identity, timed metadata and animated 3s video; NOT PhotoKit import evidence")
