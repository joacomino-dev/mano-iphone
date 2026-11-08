// Lossless color encoding only: keep every pixel and dimension; no UI editing.
import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers
for path in CommandLine.arguments.dropFirst() {
    let url=URL(fileURLWithPath:path)
    guard let source=CGImageSourceCreateWithURL(url as CFURL,nil),let image=CGImageSourceCreateImageAtIndex(source,0,nil),
          let context=CGContext(data:nil,width:image.width,height:image.height,bitsPerComponent:8,bytesPerRow:0,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.noneSkipLast.rawValue) else { fatalError("Cannot decode actual native screenshot") }
    context.draw(image,in:CGRect(x:0,y:0,width:image.width,height:image.height))
    guard let rgb=context.makeImage(),let destination=CGImageDestinationCreateWithURL(url as CFURL,UTType.png.identifier as CFString,1,nil) else { fatalError("Cannot encode screenshot") }
    CGImageDestinationAddImage(destination,rgb,nil)
    guard CGImageDestinationFinalize(destination) else { fatalError("Cannot save screenshot") }
}
