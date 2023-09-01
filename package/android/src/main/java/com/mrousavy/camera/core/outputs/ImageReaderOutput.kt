package com.mrousavy.camera.core.outputs

import android.media.ImageReader
import android.util.Log
import android.util.Size
import java.io.Closeable

class ImageReaderOutput(private val imageReader: ImageReader,
                        outputType: OutputType,
                        dynamicRangeProfile: Long? = null): Closeable, SurfaceOutput(imageReader.surface, Size(imageReader.width, imageReader.height), outputType, dynamicRangeProfile) {
  override fun close() {
    Log.i(TAG, "Closing ${imageReader.width}x${imageReader.height} $outputType ImageReader..")
    imageReader.close()
  }

  override fun toString(): String {
    return "$outputType (${imageReader.width} x ${imageReader.height} in format #${imageReader.imageFormat})"
  }
}
