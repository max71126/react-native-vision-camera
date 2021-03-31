//
//  VideoCaptureDelegate.swift
//  Cuvent
//
//  Created by Marc Rousavy on 14.01.21.
//  Copyright © 2021 Facebook. All rights reserved.
//

import AVFoundation

// Functions like `startRecording(delegate: ...)` only maintain a weak reference on the delegates to prevent memory leaks.
// In our use case, we exit from the function which will deinit our recording delegate since no other references are being held.
// That's why we're keeping a strong reference to the delegate by appending it to the `delegateReferences` list and removing it
// once the delegate has been triggered once.
private var delegateReferences: [NSObject] = []

// MARK: - RecordingDelegateWithCallback

class RecordingDelegateWithCallback: NSObject, AVCaptureFileOutputRecordingDelegate {
  init(callback: @escaping RCTResponseSenderBlock, resetTorchMode: @escaping () -> Void) {
    self.callback = callback
    self.resetTorchMode = resetTorchMode
    super.init()
    delegateReferences.append(self)
  }

  func fileOutput(_ output: AVCaptureFileOutput, didFinishRecordingTo outputFileURL: URL, from _: [AVCaptureConnection], error: Error?) {
    defer {
      self.resetTorchMode()
      delegateReferences.removeAll(where: { $0 == self })
    }
    if let error = error as NSError? {
      return callback([NSNull(), makeReactError(.capture(.unknown(message: error.description)), cause: error)])
    }

    let seconds = CMTimeGetSeconds(output.recordedDuration)
    return callback([["path": outputFileURL.absoluteString, "duration": seconds, "size": output.recordedFileSize], NSNull()])
  }

  // MARK: Private

  private let callback: RCTResponseSenderBlock // (video?, error?) => void
  private let resetTorchMode: () -> Void
}
