//
//  CameraSession.swift
//  VisionCamera
//
//  Created by Marc Rousavy on 11.10.23.
//  Copyright © 2023 mrousavy. All rights reserved.
//

import AVFoundation
import Foundation

/**
 A fully-featured Camera Session supporting preview, video, photo, frame processing, and code scanning outputs.
 All changes to the session have to be controlled via the `configure` function.
 */
class CameraSession: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate, AVCaptureAudioDataOutputSampleBufferDelegate {
  // Configuration
  var configuration: CameraConfiguration?
  // Capture Session
  let captureSession = AVCaptureSession()
  let audioCaptureSession = AVCaptureSession()
  // Inputs & Outputs
  var videoDeviceInput: AVCaptureDeviceInput?
  var audioDeviceInput: AVCaptureDeviceInput?
  var photoOutput: AVCapturePhotoOutput?
  var videoOutput: AVCaptureVideoDataOutput?
  var audioOutput: AVCaptureAudioDataOutput?
  var codeScannerOutput: AVCaptureMetadataOutput?
  // State
  var recordingSession: RecordingSession?
  var isRecording = false

  // Callbacks
  weak var delegate: CameraSessionDelegate?

  // Public accessors
  var maxZoom: Double {
    if let device = videoDeviceInput?.device {
      return device.maxAvailableVideoZoomFactor
    }
    return 1.0
  }

  /**
   Create a new instance of the `CameraSession`.
   The `onError` callback is used for any runtime errors.
   */
  override init() {
    super.init()

    NotificationCenter.default.addObserver(self,
                                           selector: #selector(sessionRuntimeError),
                                           name: .AVCaptureSessionRuntimeError,
                                           object: captureSession)
    NotificationCenter.default.addObserver(self,
                                           selector: #selector(sessionRuntimeError),
                                           name: .AVCaptureSessionRuntimeError,
                                           object: audioCaptureSession)
    NotificationCenter.default.addObserver(self,
                                           selector: #selector(audioSessionInterrupted),
                                           name: AVAudioSession.interruptionNotification,
                                           object: AVAudioSession.sharedInstance)
  }

  deinit {
    NotificationCenter.default.removeObserver(self,
                                              name: .AVCaptureSessionRuntimeError,
                                              object: captureSession)
    NotificationCenter.default.removeObserver(self,
                                              name: .AVCaptureSessionRuntimeError,
                                              object: audioCaptureSession)
    NotificationCenter.default.removeObserver(self,
                                              name: AVAudioSession.interruptionNotification,
                                              object: AVAudioSession.sharedInstance)
  }

  /**
   Creates a PreviewView for the current Capture Session
   */
  func createPreviewView(frame: CGRect) -> PreviewView {
    return PreviewView(frame: frame, session: captureSession)
  }

  func onConfigureError(_ error: Error) {
    if let error = error as? CameraError {
      // It's a typed Error
      delegate?.onError(error)
    } else {
      // It's any kind of unknown error
      let cameraError = CameraError.unknown(message: error.localizedDescription)
      delegate?.onError(cameraError)
    }
  }

  /**
   Update the session configuration.
   Any changes in here will be re-configured only if required, and under a lock.
   The `configuration` object is a copy of the currently active configuration that can be modified by the caller in the lambda.
   */
  func configure(_ lambda: (_ configuration: CameraConfiguration) throws -> Void) {
    ReactLogger.log(level: .info, message: "Updating Session Configuration...")

    // Let caller configure a new configuration for the Camera.
    let config = CameraConfiguration(copyOf: configuration)
    do {
      try lambda(config)
    } catch {
      onConfigureError(error)
    }
    let difference = CameraConfiguration.Difference(between: configuration, and: config)

    // Set up Camera (Video) Capture Session (on camera queue)
    CameraQueues.cameraQueue.async {
      do {
        // If needed, configure the AVCaptureSession (inputs, outputs)
        if difference.isSessionConfigurationDirty {
          try self.withSessionLock {
            // 1. Update input device
            if difference.inputChanged {
              try self.configureDevice(configuration: config)
            }
            // 2. Update outputs
            if difference.outputsChanged {
              try self.configureOutputs(configuration: config)
            }
            // 3. Update Video Stabilization
            if difference.videoStabilizationChanged {
              self.configureVideoStabilization(configuration: config)
            }
            // 4. Update output orientation
            if difference.orientationChanged {
              self.configureOrientation(configuration: config)
            }
          }
        }

        // If needed, configure the AVCaptureDevice (format, zoom, low-light-boost, ..)
        if difference.isDeviceConfigurationDirty {
          try self.withDeviceLock { device in
            // 4. Configure format
            if difference.formatChanged {
              try self.configureFormat(configuration: config, device: device)
            }
            // 5. After step 2. and 4., we also need to configure the PixelFormat.
            //    This needs to be done AFTER we updated the `format`, as this controls the supported PixelFormats.
            if difference.outputsChanged || difference.formatChanged {
              try self.configurePixelFormat(configuration: config)
            }
            // 6. Configure side-props (fps, lowLightBoost)
            if difference.sidePropsChanged {
              try self.configureSideProps(configuration: config, device: device)
            }
            // 7. Configure zoom
            if difference.zoomChanged {
              self.configureZoom(configuration: config, device: device)
            }
            // 8. Configure exposure bias
            if difference.exposureChanged {
              self.configureExposure(configuration: config, device: device)
            }
          }
        }

        // 9. Start or stop the session if needed
        self.checkIsActive(configuration: config)

        // 10. Enable or disable the Torch if needed (requires session to be running)
        if difference.torchChanged {
          try self.withDeviceLock { device in
            try self.configureTorch(configuration: config, device: device)
          }
        }

        // Notify about Camera initialization
        if difference.inputChanged {
          self.delegate?.onSessionInitialized()
        }
      } catch {
        self.onConfigureError(error)
      }
    }

    // Set up Audio Capture Session (on audio queue)
    if difference.audioSessionChanged {
      CameraQueues.audioQueue.async {
        do {
          // Lock Capture Session for configuration
          ReactLogger.log(level: .info, message: "Beginning AudioSession configuration...")
          self.audioCaptureSession.beginConfiguration()

          try self.configureAudioSession(configuration: config)

          // Unlock Capture Session again and submit configuration to Hardware
          self.audioCaptureSession.commitConfiguration()
          ReactLogger.log(level: .info, message: "Committed AudioSession configuration!")
        } catch {
          self.onConfigureError(error)
        }
      }
    }

    // After configuring, set this to the new configuration.
    configuration = config
  }

  /**
   Runs the given [lambda] under an AVCaptureSession configuration lock (`beginConfiguration()`)
   */
  private func withSessionLock(_ lambda: () throws -> Void) throws {
    // Lock Capture Session for configuration
    ReactLogger.log(level: .info, message: "Beginning CameraSession configuration...")
    captureSession.beginConfiguration()
    defer {
      // Unlock Capture Session again and submit configuration to Hardware
      self.captureSession.commitConfiguration()
      ReactLogger.log(level: .info, message: "Committed CameraSession configuration!")
    }

    // Call lambda
    try lambda()
  }

  /**
   Runs the given [lambda] under an AVCaptureDevice configuration lock (`lockForConfiguration()`)
   */
  private func withDeviceLock(_ lambda: (_ device: AVCaptureDevice) throws -> Void) throws {
    guard let device = videoDeviceInput?.device else {
      throw CameraError.session(.cameraNotReady)
    }
    ReactLogger.log(level: .info, message: "Beginning CaptureDevice configuration...")
    try device.lockForConfiguration()
    defer {
      device.unlockForConfiguration()
      ReactLogger.log(level: .info, message: "Committed CaptureDevice configuration!")
    }

    // Call lambda with Device
    try lambda(device)
  }

  /**
   Starts or stops the CaptureSession if needed (`isActive`)
   */
  private func checkIsActive(configuration: CameraConfiguration) {
    if configuration.isActive == captureSession.isRunning {
      return
    }

    // Start/Stop session
    if configuration.isActive {
      captureSession.startRunning()
    } else {
      captureSession.stopRunning()
    }
  }

  /**
   Called for every new Frame in the Video output
   */
  public final func captureOutput(_ captureOutput: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from _: AVCaptureConnection) {
    // Call Frame Processor (delegate) for every Video Frame
    if captureOutput is AVCaptureVideoDataOutput {
      delegate?.onFrame(sampleBuffer: sampleBuffer)
    }

    // Record Video Frame/Audio Sample to File in custom `RecordingSession` (AVAssetWriter)
    if isRecording {
      guard let recordingSession = recordingSession else {
        delegate?.onError(.capture(.unknown(message: "isRecording was true but the RecordingSession was null!")))
        return
      }

      switch captureOutput {
      case is AVCaptureVideoDataOutput:
        // Write the Video Buffer to the .mov/.mp4 file, this is the first timestamp if nothing has been recorded yet
        recordingSession.appendBuffer(sampleBuffer, clock: captureSession.clock, type: .video)
      case is AVCaptureAudioDataOutput:
        // Synchronize the Audio Buffer with the Video Session's time because it's two separate AVCaptureSessions
        audioCaptureSession.synchronizeBuffer(sampleBuffer, toSession: captureSession)
        recordingSession.appendBuffer(sampleBuffer, clock: audioCaptureSession.clock, type: .audio)
      default:
        break
      }
    }
  }

  // pragma MARK: Notifications

  @objc
  func sessionRuntimeError(notification: Notification) {
    ReactLogger.log(level: .error, message: "Unexpected Camera Runtime Error occured!")
    guard let error = notification.userInfo?[AVCaptureSessionErrorKey] as? AVError else {
      return
    }

    // Notify consumer about runtime error
    delegate?.onError(.unknown(message: error._nsError.description, cause: error._nsError))

    let shouldRestart = configuration?.isActive == true
    if shouldRestart {
      // restart capture session after an error occured
      CameraQueues.cameraQueue.async {
        self.captureSession.startRunning()
      }
    }
  }
}
