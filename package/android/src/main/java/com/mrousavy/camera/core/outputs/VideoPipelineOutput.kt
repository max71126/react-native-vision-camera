package com.mrousavy.camera.core.outputs

import android.util.Log
import android.util.Size
import com.mrousavy.camera.core.VideoPipeline
import java.io.Closeable

class VideoPipelineOutput(val videoPipeline: VideoPipeline,
                          outputType: OutputType,
                          dynamicRangeProfile: Long? = null): Closeable, SurfaceOutput(videoPipeline.surface, Size(videoPipeline.width, videoPipeline.height), outputType, dynamicRangeProfile) {
  override fun close() {
    Log.i(TAG, "Closing ${videoPipeline.width}x${videoPipeline.height} Video Pipeline..")
    videoPipeline.close()
  }

  override fun toString(): String {
    return "$outputType (${videoPipeline.width} x ${videoPipeline.height} in format #${videoPipeline.format})"
  }
}
