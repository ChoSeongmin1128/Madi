#!/usr/bin/env swift

import AppKit
import CoreGraphics
import Foundation

let width: CGFloat = 640
let height: CGFloat = 420
let scale: CGFloat = 2

let pixelWidth = Int(width * scale)
let pixelHeight = Int(height * scale)

let colorSpace = CGColorSpaceCreateDeviceRGB()
guard let context = CGContext(
  data: nil,
  width: pixelWidth,
  height: pixelHeight,
  bitsPerComponent: 8,
  bytesPerRow: 0,
  space: colorSpace,
  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
) else {
  FileHandle.standardError.write("CGContext 생성 실패\n".data(using: .utf8)!)
  exit(1)
}

context.scaleBy(x: scale, y: scale)

func color(_ red: CGFloat, _ green: CGFloat, _ blue: CGFloat, _ alpha: CGFloat = 1) -> CGColor {
  CGColor(red: red, green: green, blue: blue, alpha: alpha)
}

func drawRoundedRect(_ rect: CGRect, radius: CGFloat, fill: CGColor) {
  let path = CGPath(
    roundedRect: rect,
    cornerWidth: radius,
    cornerHeight: radius,
    transform: nil
  )
  context.addPath(path)
  context.setFillColor(fill)
  context.fillPath()
}

let backgroundGradient = CGGradient(
  colorsSpace: colorSpace,
  colors: [
    color(0.16, 0.14, 0.20),
    color(0.10, 0.12, 0.16),
  ] as CFArray,
  locations: [0, 1]
)!
context.drawLinearGradient(
  backgroundGradient,
  start: CGPoint(x: 0, y: 0),
  end: CGPoint(x: width, y: height),
  options: []
)

let glowGradient = CGGradient(
  colorsSpace: colorSpace,
  colors: [
    color(0.56, 0.43, 1.00, 0.38),
    color(0.36, 0.73, 1.00, 0.12),
    color(0.36, 0.73, 1.00, 0.00),
  ] as CFArray,
  locations: [0, 0.45, 1]
)!
context.drawRadialGradient(
  glowGradient,
  startCenter: CGPoint(x: 110, y: 70),
  startRadius: 0,
  endCenter: CGPoint(x: 110, y: 70),
  endRadius: 360,
  options: []
)

context.drawRadialGradient(
  glowGradient,
  startCenter: CGPoint(x: 560, y: 355),
  startRadius: 0,
  endCenter: CGPoint(x: 560, y: 355),
  endRadius: 310,
  options: []
)

drawRoundedRect(
  CGRect(x: 34, y: 30, width: width - 68, height: height - 60),
  radius: 28,
  fill: color(1, 1, 1, 0.065)
)

context.setStrokeColor(color(1, 1, 1, 0.12))
context.setLineWidth(1)
context.stroke(CGRect(x: 34.5, y: 30.5, width: width - 69, height: height - 61))

let title = "Madi"
let subtitle = "Drag to Applications to install"
let hint = "Apple Silicon macOS"

let titleAttributes: [NSAttributedString.Key: Any] = [
  .font: NSFont.systemFont(ofSize: 30, weight: .bold),
  .foregroundColor: NSColor(calibratedWhite: 0.96, alpha: 1),
]
let subtitleAttributes: [NSAttributedString.Key: Any] = [
  .font: NSFont.systemFont(ofSize: 13, weight: .medium),
  .foregroundColor: NSColor(calibratedWhite: 0.78, alpha: 1),
]
let hintAttributes: [NSAttributedString.Key: Any] = [
  .font: NSFont.monospacedSystemFont(ofSize: 11, weight: .medium),
  .foregroundColor: NSColor(calibratedRed: 0.72, green: 0.64, blue: 1.0, alpha: 0.95),
]

let graphicsContext = NSGraphicsContext(cgContext: context, flipped: false)
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = graphicsContext

NSAttributedString(string: title, attributes: titleAttributes).draw(at: CGPoint(x: 56, y: 58))
NSAttributedString(string: subtitle, attributes: subtitleAttributes).draw(at: CGPoint(x: 58, y: 98))
NSAttributedString(string: hint, attributes: hintAttributes).draw(at: CGPoint(x: 58, y: 330))

NSGraphicsContext.restoreGraphicsState()

let arrowY: CGFloat = 226
let arrowStartX: CGFloat = 280
let arrowEndX: CGFloat = 360
context.setStrokeColor(color(1, 1, 1, 0.60))
context.setLineWidth(4)
context.setLineCap(.round)
context.move(to: CGPoint(x: arrowStartX, y: arrowY))
context.addLine(to: CGPoint(x: arrowEndX, y: arrowY))
context.strokePath()
context.move(to: CGPoint(x: arrowEndX - 15, y: arrowY - 12))
context.addLine(to: CGPoint(x: arrowEndX, y: arrowY))
context.addLine(to: CGPoint(x: arrowEndX - 15, y: arrowY + 12))
context.strokePath()

context.setFillColor(color(1, 1, 1, 0.10))
context.fillEllipse(in: CGRect(x: 300, y: 206, width: 40, height: 40))

guard let image = context.makeImage() else {
  FileHandle.standardError.write("CGImage 생성 실패\n".data(using: .utf8)!)
  exit(1)
}

let representation = NSBitmapImageRep(cgImage: image)
representation.size = NSSize(width: width, height: height)

guard let data = representation.representation(using: .png, properties: [:]) else {
  FileHandle.standardError.write("PNG 인코딩 실패\n".data(using: .utf8)!)
  exit(1)
}

let outputPath = CommandLine.arguments.count >= 2
  ? CommandLine.arguments[1]
  : "scripts/dmg-assets/background.png"

do {
  try data.write(to: URL(fileURLWithPath: outputPath))
  print("생성됨: \(outputPath) (\(pixelWidth)x\(pixelHeight) @ \(scale)x)")
} catch {
  FileHandle.standardError.write("저장 실패: \(error.localizedDescription)\n".data(using: .utf8)!)
  exit(1)
}
