//
//  CameraSession+Configuration.swift
//  VisionCamera
//
//  Created by Marc Rousavy on 12.10.23.
//  Copyright © 2023 mrousavy. All rights reserved.
//

import AVFoundation
import Foundation

extension CameraSession {
  // pragma MARK: Input Device

  /**
   Configures the Input Device (`cameraId`)
   */
  func configureDevice(configuration: CameraConfiguration) throws {
    ReactLogger.log(level: .info, message: "Configuring Input Device...")

    // Remove all inputs
    captureSession.inputs.forEach { input in
      captureSession.removeInput(input)
    }
    videoDeviceInput = nil

    #if targetEnvironment(simulator)
      // iOS Simulators don't have Cameras
      throw CameraError.device(.notAvailableOnSimulator)
    #endif

    guard let cameraId = configuration.cameraId else {
      throw CameraError.device(.noDevice)
    }

    ReactLogger.log(level: .info, message: "Configuring Camera \(cameraId)...")
    // Video Input (Camera Device/Sensor)
    guard let videoDevice = AVCaptureDevice(uniqueID: cameraId) else {
      throw CameraError.device(.invalid)
    }
    let input = try AVCaptureDeviceInput(device: videoDevice)
    guard captureSession.canAddInput(input) else {
      throw CameraError.parameter(.unsupportedInput(inputDescriptor: "video-input"))
    }
    captureSession.addInput(input)
    videoDeviceInput = input

    ReactLogger.log(level: .info, message: "Successfully configured Input Device!")
  }

  // pragma MARK: Outputs

  /**
   Configures all outputs (`photo` + `video` + `codeScanner`)
   */
  func configureOutputs(configuration: CameraConfiguration) throws {
    ReactLogger.log(level: .info, message: "Configuring Outputs...")

    // Remove all outputs
    captureSession.outputs.forEach { output in
      captureSession.removeOutput(output)
    }
    photoOutput = nil
    videoOutput = nil
    codeScannerOutput = nil

    // Photo Output
    if case let .enabled(photo) = configuration.photo {
      ReactLogger.log(level: .info, message: "Adding Photo output...")

      // 1. Add
      let photoOutput = AVCapturePhotoOutput()
      guard captureSession.canAddOutput(photoOutput) else {
        throw CameraError.parameter(.unsupportedOutput(outputDescriptor: "photo-output"))
      }
      captureSession.addOutput(photoOutput)

      // 2. Configure
      if photo.enableHighQualityPhotos {
        // TODO: In iOS 16 this will be removed in favor of maxPhotoDimensions.
        photoOutput.isHighResolutionCaptureEnabled = true
        if #available(iOS 13.0, *) {
          // TODO: Test if this actually does any fusion or if this just calls the captureOutput twice. If the latter, remove it.
          photoOutput.isVirtualDeviceConstituentPhotoDeliveryEnabled = photoOutput.isVirtualDeviceConstituentPhotoDeliverySupported
          photoOutput.maxPhotoQualityPrioritization = .quality
        } else {
          photoOutput.isDualCameraDualPhotoDeliveryEnabled = photoOutput.isDualCameraDualPhotoDeliverySupported
        }
      }
      // TODO: Enable isResponsiveCaptureEnabled? (iOS 17+)
      // TODO: Enable isFastCapturePrioritizationEnabled? (iOS 17+)
      if photo.enableDepthData {
        photoOutput.isDepthDataDeliveryEnabled = photoOutput.isDepthDataDeliverySupported
      }
      if #available(iOS 12.0, *), photo.enablePortraitEffectsMatte {
        photoOutput.isPortraitEffectsMatteDeliveryEnabled = photoOutput.isPortraitEffectsMatteDeliverySupported
      }

      self.photoOutput = photoOutput
    }

    // Video Output + Frame Processor
    if case .enabled = configuration.video {
      ReactLogger.log(level: .info, message: "Adding Video Data output...")

      // 1. Add
      let videoOutput = AVCaptureVideoDataOutput()
      guard captureSession.canAddOutput(videoOutput) else {
        throw CameraError.parameter(.unsupportedOutput(outputDescriptor: "video-output"))
      }
      captureSession.addOutput(videoOutput)

      // 2. Configure
      videoOutput.setSampleBufferDelegate(self, queue: CameraQueues.videoQueue)
      videoOutput.alwaysDiscardsLateVideoFrames = true
      self.videoOutput = videoOutput
    }

    // Code Scanner
    if case let .enabled(codeScanner) = configuration.codeScanner {
      ReactLogger.log(level: .info, message: "Adding Code Scanner output...")
      let codeScannerOutput = AVCaptureMetadataOutput()

      // 1. Add
      guard captureSession.canAddOutput(codeScannerOutput) else {
        throw CameraError.codeScanner(.notCompatibleWithOutputs)
      }
      captureSession.addOutput(codeScannerOutput)

      // 2. Configure
      let options = codeScanner.options
      codeScannerOutput.setMetadataObjectsDelegate(self, queue: CameraQueues.codeScannerQueue)
      try codeScanner.options.codeTypes.forEach { type in
        // CodeScanner::availableMetadataObjectTypes depends on the connection to the
        // AVCaptureSession, so this list is only available after we add the output to the session.
        if !codeScannerOutput.availableMetadataObjectTypes.contains(type) {
          throw CameraError.codeScanner(.codeTypeNotSupported(codeType: type.descriptor))
        }
      }
      codeScannerOutput.metadataObjectTypes = options.codeTypes
      if let rectOfInterest = options.regionOfInterest {
        codeScannerOutput.rectOfInterest = rectOfInterest
      }

      self.codeScannerOutput = codeScannerOutput
    }

    // Done!
    ReactLogger.log(level: .info, message: "Successfully configured all outputs!")
  }

  // pragma MARK: Video Stabilization
  func configureVideoStabilization(configuration: CameraConfiguration) {
    captureSession.outputs.forEach { output in
      output.connections.forEach { connection in
        if connection.isVideoStabilizationSupported {
          connection.preferredVideoStabilizationMode = configuration.videoStabilizationMode.toAVCaptureVideoStabilizationMode()
        }
      }
    }
  }

  // pragma MARK: Orientation

  func configureOrientation(configuration: CameraConfiguration) {
    // Set up orientation and mirroring for all outputs.
    // Note: Photos are only rotated through EXIF tags, and Preview through view transforms
    let isMirrored = videoDeviceInput?.device.position == .front
    captureSession.outputs.forEach { output in
      if isMirrored {
        output.mirror()
      }
      output.setOrientation(configuration.orientation)
    }
  }

  // pragma MARK: Format

  /**
   Configures the active format (`format`)
   */
  func configureFormat(configuration: CameraConfiguration, device: AVCaptureDevice) throws {
    guard let targetFormat = configuration.format else {
      // No format was set, just use the default.
      return
    }

    ReactLogger.log(level: .info, message: "Configuring Format (\(targetFormat))...")

    let currentFormat = CameraDeviceFormat(fromFormat: device.activeFormat)
    if currentFormat == targetFormat {
      ReactLogger.log(level: .info, message: "Already selected active format, no need to configure.")
      return
    }

    // Find matching format (JS Dictionary -> strongly typed Swift class)
    let format = device.formats.first { targetFormat.isEqualTo(format: $0) }
    guard let format else {
      throw CameraError.format(.invalidFormat)
    }

    // Set new device Format
    device.activeFormat = format

    ReactLogger.log(level: .info, message: "Successfully configured Format!")
  }

  func configurePixelFormat(configuration: CameraConfiguration) throws {
    guard case let .enabled(video) = configuration.video,
          let videoOutput else {
      // Video is not enabled
      return
    }

    // Configure the VideoOutput Settings to use the given Pixel Format.
    // We need to run this after device.activeFormat has been set, otherwise the VideoOutput can't stream the given Pixel Format.
    let pixelFormatType = try video.getPixelFormat(for: videoOutput)
    videoOutput.videoSettings = [
      String(kCVPixelBufferPixelFormatTypeKey): pixelFormatType,
    ]
  }

  // pragma MARK: Side-Props

  /**
   Configures format-dependant "side-props" (`fps`, `lowLightBoost`)
   */
  func configureSideProps(configuration: CameraConfiguration, device: AVCaptureDevice) throws {
    // Configure FPS
    if let fps = configuration.fps {
      let supportsGivenFps = device.activeFormat.videoSupportedFrameRateRanges.contains { range in
        return range.includes(fps: Double(fps))
      }
      if !supportsGivenFps {
        throw CameraError.format(.invalidFps(fps: Int(fps)))
      }

      let duration = CMTimeMake(value: 1, timescale: fps)
      device.activeVideoMinFrameDuration = duration
      device.activeVideoMaxFrameDuration = duration
    } else {
      device.activeVideoMinFrameDuration = CMTime.invalid
      device.activeVideoMaxFrameDuration = CMTime.invalid
    }

    // Configure Low-Light-Boost
    if device.automaticallyEnablesLowLightBoostWhenAvailable != configuration.enableLowLightBoost {
      guard device.isLowLightBoostSupported else {
        throw CameraError.device(.lowLightBoostNotSupported)
      }
      device.automaticallyEnablesLowLightBoostWhenAvailable = configuration.enableLowLightBoost
    }
  }

  /**
   Configures the torch.
   The CaptureSession has to be running for the Torch to work.
   */
  func configureTorch(configuration: CameraConfiguration, device: AVCaptureDevice) throws {
    // Configure Torch
    let torchMode = configuration.torch.toTorchMode()
    if device.torchMode != torchMode {
      guard device.hasTorch else {
        throw CameraError.device(.flashUnavailable)
      }

      device.torchMode = torchMode
      if torchMode == .on {
        try device.setTorchModeOn(level: 1.0)
      }
    }
  }

  // pragma MARK: Zoom

  /**
   Configures zoom (`zoom`)
   */
  func configureZoom(configuration: CameraConfiguration, device: AVCaptureDevice) {
    guard let zoom = configuration.zoom else {
      return
    }

    let clamped = max(min(zoom, device.activeFormat.videoMaxZoomFactor), device.minAvailableVideoZoomFactor)
    device.videoZoomFactor = clamped
  }

  // pragma MARK: Exposure

  /**
   Configures exposure (`exposure`) as a bias that adjusts exposureTime and ISO.
   */
  func configureExposure(configuration: CameraConfiguration, device: AVCaptureDevice) {
    guard let exposure = configuration.exposure else {
      return
    }

    let clamped = min(max(exposure, device.minExposureTargetBias), device.maxExposureTargetBias)
    device.setExposureTargetBias(clamped)
  }

  // pragma MARK: Audio

  /**
   Configures the Audio Capture Session with an audio input and audio data output.
   */
  func configureAudioSession(configuration: CameraConfiguration) throws {
    ReactLogger.log(level: .info, message: "Configuring Audio Session...")

    // Prevent iOS from automatically configuring the Audio Session for us
    audioCaptureSession.automaticallyConfiguresApplicationAudioSession = false
    let enableAudio = configuration.audio != .disabled

    // Check microphone permission
    if enableAudio {
      let audioPermissionStatus = AVCaptureDevice.authorizationStatus(for: .audio)
      if audioPermissionStatus != .authorized {
        throw CameraError.permission(.microphone)
      }
    }

    // Remove all current inputs
    audioCaptureSession.inputs.forEach { input in
      audioCaptureSession.removeInput(input)
    }
    audioDeviceInput = nil

    // Audio Input (Microphone)
    if enableAudio {
      ReactLogger.log(level: .info, message: "Adding Audio input...")
      guard let microphone = AVCaptureDevice.default(for: .audio) else {
        throw CameraError.device(.microphoneUnavailable)
      }
      let input = try AVCaptureDeviceInput(device: microphone)
      guard audioCaptureSession.canAddInput(input) else {
        throw CameraError.parameter(.unsupportedInput(inputDescriptor: "audio-input"))
      }
      audioCaptureSession.addInput(input)
      audioDeviceInput = input
    }

    // Remove all current outputs
    audioCaptureSession.outputs.forEach { output in
      audioCaptureSession.removeOutput(output)
    }
    audioOutput = nil

    // Audio Output
    if enableAudio {
      ReactLogger.log(level: .info, message: "Adding Audio Data output...")
      let output = AVCaptureAudioDataOutput()
      guard audioCaptureSession.canAddOutput(output) else {
        throw CameraError.parameter(.unsupportedOutput(outputDescriptor: "audio-output"))
      }
      output.setSampleBufferDelegate(self, queue: CameraQueues.audioQueue)
      audioCaptureSession.addOutput(output)
      audioOutput = output
    }
  }
}
