package com.mrousavy.camera.core.outputs

import android.graphics.ImageFormat
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.media.Image
import android.media.ImageReader
import android.util.Log
import android.util.Size
import android.view.Surface
import com.google.mlkit.vision.barcode.common.Barcode
import com.mrousavy.camera.core.CameraQueues
import com.mrousavy.camera.core.CodeScannerPipeline
import com.mrousavy.camera.core.VideoPipeline
import com.mrousavy.camera.extensions.bigger
import com.mrousavy.camera.extensions.closestToOrMax
import com.mrousavy.camera.extensions.getPhotoSizes
import com.mrousavy.camera.extensions.getPreviewTargetSize
import com.mrousavy.camera.extensions.getVideoSizes
import com.mrousavy.camera.extensions.smaller
import com.mrousavy.camera.parsers.CodeScanner
import com.mrousavy.camera.parsers.PixelFormat
import java.io.Closeable

class CameraOutputs(
  val cameraId: String,
  cameraManager: CameraManager,
  val preview: PreviewOutput? = null,
  val photo: PhotoOutput? = null,
  val video: VideoOutput? = null,
  val codeScanner: CodeScannerOutput? = null,
  val enableHdr: Boolean? = false,
  val callback: Callback
) : Closeable {
  companion object {
    private const val TAG = "CameraOutputs"
    const val PHOTO_OUTPUT_BUFFER_SIZE = 3
  }

  data class PreviewOutput(val surface: Surface, val targetSize: Size? = null)
  data class PhotoOutput(val targetSize: Size? = null, val format: Int = ImageFormat.JPEG)
  data class VideoOutput(
    val targetSize: Size? = null,
    val enableRecording: Boolean = false,
    val enableFrameProcessor: Boolean? = false,
    val format: PixelFormat = PixelFormat.NATIVE
  )
  data class CodeScannerOutput(
    val codeScanner: CodeScanner,
    val onCodeScanned: (codes: List<Barcode>) -> Unit,
    val onError: (error: Throwable) -> Unit
  )

  interface Callback {
    fun onPhotoCaptured(image: Image)
  }

  var previewOutput: SurfaceOutput? = null
    private set
  var photoOutput: ImageReaderOutput? = null
    private set
  var videoOutput: VideoPipelineOutput? = null
    private set
  var codeScannerOutput: BarcodeScannerOutput? = null
    private set

  val size: Int
    get() {
      var size = 0
      if (previewOutput != null) size++
      if (photoOutput != null) size++
      if (videoOutput != null) size++
      if (codeScannerOutput != null) size++
      return size
    }

  override fun equals(other: Any?): Boolean {
    if (other !is CameraOutputs) return false
    return this.cameraId == other.cameraId &&
      this.preview?.surface == other.preview?.surface &&
      this.preview?.targetSize == other.preview?.targetSize &&
      this.photo?.targetSize == other.photo?.targetSize &&
      this.photo?.format == other.photo?.format &&
      this.video?.enableRecording == other.video?.enableRecording &&
      this.video?.targetSize == other.video?.targetSize &&
      this.video?.format == other.video?.format &&
      this.codeScanner?.codeScanner == other.codeScanner?.codeScanner &&
      this.enableHdr == other.enableHdr
  }

  override fun hashCode(): Int {
    var result = cameraId.hashCode()
    result += (preview?.hashCode() ?: 0)
    result += (photo?.hashCode() ?: 0)
    result += (video?.hashCode() ?: 0)
    result += (codeScanner?.hashCode() ?: 0)
    return result
  }

  override fun close() {
    previewOutput?.close()
    photoOutput?.close()
    videoOutput?.close()
    codeScannerOutput?.close()
  }

  override fun toString(): String {
    val strings = arrayListOf<String>()
    previewOutput?.let { strings.add(it.toString()) }
    photoOutput?.let { strings.add(it.toString()) }
    videoOutput?.let { strings.add(it.toString()) }
    codeScannerOutput?.let { strings.add(it.toString()) }
    return strings.joinToString(", ", "[", "]")
  }

  init {
    val characteristics = cameraManager.getCameraCharacteristics(cameraId)
    val isMirrored = characteristics.get(CameraCharacteristics.LENS_FACING) == CameraCharacteristics.LENS_FACING_FRONT

    Log.i(TAG, "Preparing Outputs for Camera $cameraId...")

    // Preview output: Low resolution repeating images (SurfaceView)
    if (preview != null) {
      Log.i(TAG, "Adding native preview view output.")
      val previewSizeAspectRatio = if (preview.targetSize !=
        null
      ) {
        preview.targetSize.bigger.toDouble() / preview.targetSize.smaller
      } else {
        null
      }
      previewOutput = SurfaceOutput(
        preview.surface,
        characteristics.getPreviewTargetSize(previewSizeAspectRatio),
        SurfaceOutput.OutputType.PREVIEW
      )
    }

    // Photo output: High quality still images (takePhoto())
    if (photo != null) {
      val size = characteristics.getPhotoSizes(photo.format).closestToOrMax(photo.targetSize)

      val imageReader = ImageReader.newInstance(size.width, size.height, photo.format, PHOTO_OUTPUT_BUFFER_SIZE)
      imageReader.setOnImageAvailableListener({ reader ->
        val image = reader.acquireLatestImage() ?: return@setOnImageAvailableListener
        callback.onPhotoCaptured(image)
      }, CameraQueues.cameraQueue.handler)

      Log.i(TAG, "Adding ${size.width}x${size.height} photo output. (Format: ${photo.format})")
      photoOutput = ImageReaderOutput(imageReader, SurfaceOutput.OutputType.PHOTO)
    }

    // Video output: High resolution repeating images (startRecording() or useFrameProcessor())
    if (video != null) {
      val format = video.format.toImageFormat()
      val size = characteristics.getVideoSizes(cameraId, format).closestToOrMax(video.targetSize)
      val enableFrameProcessor = video.enableFrameProcessor ?: false
      val videoPipeline = VideoPipeline(size.width, size.height, video.format, isMirrored, enableFrameProcessor)

      Log.i(TAG, "Adding ${size.width}x${size.height} video output. (Format: ${video.format})")
      videoOutput = VideoPipelineOutput(videoPipeline, SurfaceOutput.OutputType.VIDEO)
    }

    // Code Scanner
    if (codeScanner != null) {
      val format = ImageFormat.YUV_420_888
      val targetSize = Size(1280, 720)
      val size = characteristics.getVideoSizes(cameraId, format).closestToOrMax(targetSize)
      val pipeline = CodeScannerPipeline(size, format, codeScanner)

      Log.i(TAG, "Adding ${size.width}x${size.height} code scanner output. (Code Types: ${codeScanner.codeScanner.codeTypes})")
      codeScannerOutput = BarcodeScannerOutput(pipeline)
    }

    Log.i(TAG, "Prepared $size Outputs for Camera $cameraId!")
  }
}
