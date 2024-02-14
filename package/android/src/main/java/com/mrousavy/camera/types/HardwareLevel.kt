package com.mrousavy.camera.types

import android.hardware.camera2.CameraCharacteristics

enum class HardwareLevel(override val unionValue: String) : JSUnionValue {
  LEGACY("legacy"),
  LIMITED("limited"),
  EXTERNAL("limited"),
  FULL("full"),
  LEVEL_3("full");

  private val rank: Int
    get() {
      return when (this) {
        LEGACY -> 0
        LIMITED -> 1
        EXTERNAL -> 1
        FULL -> 2
        LEVEL_3 -> 3
      }
    }

  fun isAtLeast(level: HardwareLevel): Boolean = this.rank >= level.rank

  companion object {
    fun fromCameraCharacteristics(cameraCharacteristics: CameraCharacteristics): HardwareLevel =
      when (cameraCharacteristics.get(CameraCharacteristics.INFO_SUPPORTED_HARDWARE_LEVEL)) {
        CameraCharacteristics.INFO_SUPPORTED_HARDWARE_LEVEL_LEGACY -> LEGACY
        CameraCharacteristics.INFO_SUPPORTED_HARDWARE_LEVEL_LIMITED -> LIMITED
        CameraCharacteristics.INFO_SUPPORTED_HARDWARE_LEVEL_EXTERNAL -> EXTERNAL
        CameraCharacteristics.INFO_SUPPORTED_HARDWARE_LEVEL_FULL -> FULL
        CameraCharacteristics.INFO_SUPPORTED_HARDWARE_LEVEL_3 -> LEVEL_3
        else -> LEGACY
      }
  }
}
