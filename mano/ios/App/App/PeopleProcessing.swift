import Foundation
import UIKit
import Vision
import CoreImage
import Photos

/// Only lock-protected completion state crosses PhotoKit callback queues.
/// Timeout/cancellation/late callbacks can resume the continuation only once.
final class PeopleImageDelivery: @unchecked Sendable {
    private let lock = NSLock()
    private var continuation: CheckedContinuation<UIImage?,Never>?
    private var expiration: DispatchWorkItem?
    init(_ continuation: CheckedContinuation<UIImage?,Never>) { self.continuation = continuation }
    @discardableResult func finish(_ image: UIImage?) -> Bool {
        lock.lock(); let pending = continuation; continuation = nil; expiration?.cancel(); expiration = nil; lock.unlock()
        pending?.resume(returning:image); return pending != nil
    }
    func limit(manager: PHImageManager, request: PHImageRequestID) {
        let item = DispatchWorkItem { [weak self] in if self?.finish(nil) == true { manager.cancelImageRequest(request) } }
        lock.lock(); if continuation == nil { lock.unlock(); return }; expiration = item; lock.unlock()
        DispatchQueue.global(qos:.utility).asyncAfter(deadline:.now()+15,execute:item)
    }
}

/// Geometry-only second pass. It never assigns an identity or uses an image
/// similarity print as a facial embedding. Results are normalized and reusable.
enum PeopleProcessing {
    static func upright(_ source: UIImage) -> UIImage {
        let format = UIGraphicsImageRendererFormat(); format.scale = 1; format.opaque = true
        return UIGraphicsImageRenderer(size:source.size,format:format).image { _ in source.draw(in:CGRect(origin:.zero,size:source.size)) }
    }
    static func refinement(_ face: PeopleFace, image: UIImage) -> PeopleRefinement? {
        guard let cg = image.cgImage,
              let crop = PeopleGeometry.crop(face.box,width:Double(cg.width),height:Double(cg.height)),
              let pixels = cg.cropping(to:crop),
              let expected = PeopleGeometry.rect(face.box,width:Double(cg.width),height:Double(cg.height)) else { return nil }
        let request = VNDetectFaceLandmarksRequest()
        do { try VNImageRequestHandler(cgImage:pixels,orientation:.up).perform([request]) } catch { return nil }
        func globalBox(_ observation: VNFaceObservation) -> CGRect {
            let b = observation.boundingBox
            return CGRect(x:crop.minX+b.minX*crop.width,y:crop.minY+(1-b.maxY)*crop.height,width:b.width*crop.width,height:b.height*crop.height)
        }
        let matches = (request.results ?? []).map { ($0,PeopleGeometry.iou(globalBox($0),expected)) }.sorted { $0.1 > $1.1 }
        guard let match = matches.first, match.1 >= 0.4, match.0.confidence >= 0.6,
              matches.count == 1 || match.1-matches[1].1 >= 0.15 else { return nil }
        let observed = match.0, b = observed.boundingBox, full = globalBox(observed)
        let box = [Double(full.minX)/Double(cg.width),Double(full.minY)/Double(cg.height),Double(full.width)/Double(cg.width),Double(full.height)/Double(cg.height)]
        func eye(_ region: VNFaceLandmarkRegion2D?) -> [Double]? {
            guard let points = region?.normalizedPoints, points.count >= 3 else { return nil }
            let x = points.reduce(CGFloat.zero) { $0+$1.x } / CGFloat(points.count)
            let y = points.reduce(CGFloat.zero) { $0+$1.y } / CGFloat(points.count)
            return PeopleGeometry.landmark(CGPoint(x:x,y:y),face:b,crop:crop,image:CGSize(width:CGFloat(cg.width),height:CGFloat(cg.height)))
        }
        let eyes = [eye(observed.landmarks?.leftEye),eye(observed.landmarks?.rightEye)].compactMap { $0 }.sorted { $0[0] < $1[0] }
        let angle = eyes.count == 2 ? atan2((eyes[1][1]-eyes[0][1])*Double(cg.height),(eyes[1][0]-eyes[0][0])*Double(cg.width)) : 0
        guard PeopleGeometry.valid(box) else { return nil }
        return PeopleRefinement(version:PeoplePolicy.geometryVersion,box:box,eyes:eyes.count == 2 ? eyes : nil,angle:angle,sourcePixels:max(cg.width,cg.height))
    }
    static func crop(_ face: PeopleFace, image: UIImage, maxSize: CGFloat) -> UIImage? {
        guard let cg = image.cgImage,
              let box = PeopleGeometry.crop(face.refinement?.box ?? face.box,width:Double(cg.width),height:Double(cg.height)),
              let cut = cg.cropping(to:box) else { return nil }
        let size = CGSize(width:CGFloat(cut.width),height:CGFloat(cut.height)), k = min(1,maxSize/max(size.width,size.height))
        let target = CGSize(width:size.width*k,height:size.height*k)
        let format = UIGraphicsImageRendererFormat(); format.scale = 1; format.opaque = true
        return UIGraphicsImageRenderer(size:target,format:format).image { _ in UIImage(cgImage:cut).draw(in:CGRect(origin:.zero,size:target)) }
    }
    static func censor(_ image: UIImage, faces: [PeopleFace], style: String, context: CIContext) -> UIImage? {
        guard let cg = image.cgImage, !faces.isEmpty else { return nil }
        let w = Double(cg.width), h = Double(cg.height), full = CGRect(origin:.zero,size:image.size)
        let format = UIGraphicsImageRendererFormat(); format.scale = 1; format.opaque = true
        var ovals: [PeopleGeometry.Oval] = [], bars: [PeopleGeometry.Bar] = []
        for face in faces {
            if style == "eyes", let geometry = face.refinement,
               let bar = PeopleGeometry.eyeBar(geometry.eyes,bounds:geometry.box,width:w,height:h) { bars.append(bar) }
            else {
                // Union of original and refined detection protects against a
                // refinement that trims the forehead/chin too aggressively.
                guard let original = PeopleGeometry.rect(face.box,width:w,height:h) else { return nil }
                let safe = face.refinement.flatMap { PeopleGeometry.rect($0.box,width:w,height:h) }.map { original.union($0) } ?? original
                let b = [Double(safe.minX)/w,Double(safe.minY)/h,Double(safe.width)/w,Double(safe.height)/h]
                guard let oval = PeopleGeometry.oval(b,width:w,height:h,angle:face.refinement?.angle ?? 0) else { return nil }
                ovals.append(oval)
            }
        }
        var base = image
        if !ovals.isEmpty {
            let mask = UIGraphicsImageRenderer(size:image.size,format:format).image { ctx in
                UIColor.black.setFill(); ctx.fill(full); UIColor.white.setFill()
                for oval in ovals {
                    ctx.cgContext.saveGState(); ctx.cgContext.translateBy(x:oval.center.x,y:oval.center.y); ctx.cgContext.rotate(by:oval.angle)
                    ctx.cgContext.fillEllipse(in:CGRect(x:-oval.radii.width,y:-oval.radii.height,width:oval.radii.width*2,height:oval.radii.height*2)); ctx.cgContext.restoreGState()
                }
            }
            guard let maskCG = mask.cgImage else { return nil }
            let original = CIImage(cgImage:cg)
            let blur = original.clampedToExtent().applyingFilter("CIGaussianBlur",parameters:[kCIInputRadiusKey:max(24,max(w,h)*0.045)])
            let feather = CIImage(cgImage:maskCG).clampedToExtent().applyingFilter("CIGaussianBlur",parameters:[kCIInputRadiusKey:max(2,min(w,h)*0.004)])
            let output = blur.applyingFilter("CIBlendWithMask",parameters:[kCIInputBackgroundImageKey:original,kCIInputMaskImageKey:feather])
            guard let result = context.createCGImage(output,from:original.extent) else { return nil }; base = UIImage(cgImage:result)
        }
        if bars.isEmpty { return base }
        return UIGraphicsImageRenderer(size:image.size,format:format).image { ctx in
            base.draw(in:full); UIColor.black.setFill()
            for bar in bars {
                ctx.cgContext.saveGState(); ctx.cgContext.translateBy(x:bar.center.x,y:bar.center.y); ctx.cgContext.rotate(by:bar.angle)
                ctx.cgContext.fill(CGRect(x:-bar.width/2,y:-bar.height/2,width:bar.width,height:bar.height)); ctx.cgContext.restoreGState()
            }
        }
    }
}
