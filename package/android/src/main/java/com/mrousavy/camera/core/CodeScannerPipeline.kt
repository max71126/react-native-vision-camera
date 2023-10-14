package com.mrousavy.camera.core

import android.media.ImageReader
import android.util.Size
import android.view.Surface
import com.google.mlkit.vision.barcode.BarcodeScanner
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.common.InputImage
import com.mrousavy.camera.core.outputs.CameraOutputs
import com.mrousavy.camera.parsers.Orientation
import java.io.Closeable

class CodeScannerPipeline(val size: Size, val format: Int, val output: CameraOutputs.CodeScannerOutput) : Closeable {
  companion object {
    // We want to have a buffer of 3 images, but we always only acquire one.
    // That way the pipeline is free to stream up to two frames into the unused buffer,
    // while the other buffer is being used for code scanning.
    private const val MAX_IMAGES = 3
  }

  private val imageReader: ImageReader
  private val scanner: BarcodeScanner

  val surface: Surface
    get() = imageReader.surface

  init {
    val types = output.codeScanner.codeTypes.map { it.toBarcodeType() }
    val barcodeScannerOptions = BarcodeScannerOptions.Builder()
      .setBarcodeFormats(types[0], *types.toIntArray())
      .build()
    scanner = BarcodeScanning.getClient(barcodeScannerOptions)

    var isBusy = false
    imageReader = ImageReader.newInstance(size.width, size.height, format, MAX_IMAGES)
    imageReader.setOnImageAvailableListener({ reader ->
      if (isBusy) {
        // We're currently executing on a previous Frame, so we skip this one.
        // We don't try to acquire a new one, so that the Camera is not blocked/stalling.
        return@setOnImageAvailableListener
      }
      val image = reader.acquireNextImage() ?: return@setOnImageAvailableListener

      isBusy = true
      // TODO: Get correct orientation
      val inputImage = InputImage.fromMediaImage(image, Orientation.PORTRAIT.toDegrees())
      scanner.process(inputImage)
        .addOnSuccessListener { barcodes ->
          image.close()
          isBusy = false
          if (barcodes.isNotEmpty()) {
            output.onCodeScanned(barcodes)
          }
        }
        .addOnFailureListener { error ->
          image.close()
          isBusy = false
          output.onError(error)
        }
    }, CameraQueues.videoQueue.handler)
  }

  override fun close() {
    imageReader.close()
    scanner.close()
  }

  override fun toString(): String {
    val codeTypes = output.codeScanner.codeTypes.joinToString(", ")
    return "${size.width} x ${size.height} CodeScanner for [$codeTypes] ($format)"
  }
}
