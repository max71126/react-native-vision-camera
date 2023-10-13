//
//  Video.swift
//  VisionCamera
//
//  Created by Marc Rousavy on 12.10.23.
//  Copyright © 2023 mrousavy. All rights reserved.
//

import AVFoundation
import Foundation

struct Video {
  /**
   Path to the temporary video file
   */
  var path: String
  /**
   Duration of the recorded video (in seconds)
   */
  var duration: Double

  func toJSValue() -> NSDictionary {
    return [
      "path": path,
      "duration": duration,
    ]
  }
}
