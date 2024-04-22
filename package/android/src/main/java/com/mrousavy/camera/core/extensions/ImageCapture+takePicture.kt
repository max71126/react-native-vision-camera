package com.mrousavy.camera.core.extensions

import android.annotation.SuppressLint
import android.content.Context
import android.media.MediaActionSound
import android.util.Log
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCapture.OutputFileOptions
import androidx.camera.core.ImageCaptureException
import com.mrousavy.camera.core.CameraSession
import com.mrousavy.camera.core.MetadataProvider
import com.mrousavy.camera.core.types.ShutterType
import com.mrousavy.camera.core.utils.FileUtils
import java.net.URI
import java.util.concurrent.Executor
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.suspendCancellableCoroutine

data class PhotoFileInfo(val uri: URI, val metadata: ImageCapture.Metadata)

@SuppressLint("RestrictedApi")
suspend inline fun ImageCapture.takePicture(
  context: Context,
  enableShutterSound: Boolean,
  metadataProvider: MetadataProvider,
  callback: CameraSession.Callback,
  executor: Executor
): PhotoFileInfo =
  suspendCancellableCoroutine { continuation ->
    // Shutter sound
    val shutterSound = if (enableShutterSound) MediaActionSound() else null
    shutterSound?.load(MediaActionSound.SHUTTER_CLICK)

    val file = FileUtils.createTempFile(context, ".jpg")
    val outputFileOptionsBuilder = OutputFileOptions.Builder(file).also { options ->
      val metadata = ImageCapture.Metadata()
      metadataProvider.location?.let { location ->
        Log.i("ImageCapture", "Setting Photo Location to ${location.latitude}, ${location.longitude}...")
        metadata.location = metadataProvider.location
      }
      metadata.isReversedHorizontal = camera?.isFrontFacing == true
      options.setMetadata(metadata)
    }
    val outputFileOptions = outputFileOptionsBuilder.build()

    takePicture(
      outputFileOptions,
      executor,
      object : ImageCapture.OnImageSavedCallback {
        override fun onCaptureStarted() {
          super.onCaptureStarted()
          if (enableShutterSound) {
            shutterSound?.play(MediaActionSound.SHUTTER_CLICK)
          }

          callback.onShutter(ShutterType.PHOTO)
        }

        @SuppressLint("RestrictedApi")
        override fun onImageSaved(outputFileResults: ImageCapture.OutputFileResults) {
          if (continuation.isActive) {
            val info = PhotoFileInfo(file.toURI(), outputFileOptions.metadata)
            continuation.resume(info)
          }
        }

        override fun onError(exception: ImageCaptureException) {
          if (continuation.isActive) {
            continuation.resumeWithException(exception)
          }
        }
      }
    )
  }
