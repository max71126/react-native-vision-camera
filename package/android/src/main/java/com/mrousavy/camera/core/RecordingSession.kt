package com.mrousavy.camera.core

import android.content.Context
import android.media.ImageWriter
import android.media.MediaCodec
import android.media.MediaRecorder
import android.os.Build
import android.util.Log
import android.util.Size
import android.view.Surface
import com.mrousavy.camera.RecorderError
import com.mrousavy.camera.parsers.Orientation
import com.mrousavy.camera.parsers.VideoCodec
import com.mrousavy.camera.parsers.VideoFileType
import java.io.File

class RecordingSession(context: Context,
                       val size: Size,
                       private val enableAudio: Boolean,
                       private val fps: Int? = null,
                       private val codec: VideoCodec = VideoCodec.H264,
                       private val orientation: Orientation,
                       private val fileType: VideoFileType = VideoFileType.MP4,
                       private val callback: (video: Video) -> Unit,
                       private val onError: (error: RecorderError) -> Unit) {
  companion object {
    private const val TAG = "RecordingSession"
    // bits per second
    private const val VIDEO_BIT_RATE = 10_000_000
    private const val AUDIO_SAMPLING_RATE = 44_100
    private const val AUDIO_BIT_RATE = 16 * AUDIO_SAMPLING_RATE
    private const val AUDIO_CHANNELS = 1
  }

  data class Video(val path: String, val durationMs: Long)

  private val recorder: MediaRecorder
  private val outputFile: File
  private var startTime: Long? = null
  private var imageWriter: ImageWriter? = null
  val surface: Surface = MediaCodec.createPersistentInputSurface()

  init {

    outputFile = File.createTempFile("mrousavy", fileType.toExtension(), context.cacheDir)

    Log.i(TAG, "Creating RecordingSession for ${outputFile.absolutePath}")

    recorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) MediaRecorder(context) else MediaRecorder()

    if (enableAudio) recorder.setAudioSource(MediaRecorder.AudioSource.CAMCORDER)
    recorder.setVideoSource(MediaRecorder.VideoSource.SURFACE)

    recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
    recorder.setOutputFile(outputFile.absolutePath)
    recorder.setVideoEncodingBitRate(VIDEO_BIT_RATE)
    recorder.setVideoSize(size.height, size.width)
    if (fps != null) recorder.setVideoFrameRate(fps)

    Log.i(TAG, "Using $codec Video Codec..")
    recorder.setVideoEncoder(codec.toVideoCodec())
    if (enableAudio) {
      Log.i(TAG, "Adding Audio Channel..")
      recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
      recorder.setAudioEncodingBitRate(AUDIO_BIT_RATE)
      recorder.setAudioSamplingRate(AUDIO_SAMPLING_RATE)
      recorder.setAudioChannels(AUDIO_CHANNELS)
    }
    recorder.setInputSurface(surface)
    //recorder.setOrientationHint(orientation.toDegrees())

    recorder.setOnErrorListener { _, what, extra ->
      Log.e(TAG, "MediaRecorder Error: $what ($extra)")
      stop()
      val name = when (what) {
        MediaRecorder.MEDIA_RECORDER_ERROR_UNKNOWN -> "unknown"
        MediaRecorder.MEDIA_ERROR_SERVER_DIED -> "server-died"
        else -> "unknown"
      }
      onError(RecorderError(name, extra))
    }
    recorder.setOnInfoListener { _, what, extra ->
      Log.i(TAG, "MediaRecorder Info: $what ($extra)")
    }

    Log.i(TAG, "Created $this!")
  }

  fun start() {
    synchronized(this) {
      Log.i(TAG, "Starting RecordingSession..")
      recorder.prepare()
      recorder.start()
      startTime = System.currentTimeMillis()
    }
  }

  fun stop() {
    synchronized(this) {
      Log.i(TAG, "Stopping RecordingSession..")
      try {
        recorder.stop()
        recorder.release()

        imageWriter?.close()
        imageWriter = null
      } catch (e: Error) {
        Log.e(TAG, "Failed to stop MediaRecorder!", e)
      }

      val stopTime = System.currentTimeMillis()
      val durationMs = stopTime - (startTime ?: stopTime)
      callback(Video(outputFile.absolutePath, durationMs))
    }
  }

  fun pause() {
    synchronized(this) {
      Log.i(TAG, "Pausing Recording Session..")
      recorder.pause()
    }
  }

  fun resume() {
    synchronized(this) {
      Log.i(TAG, "Resuming Recording Session..")
      recorder.resume()
    }
  }

  override fun toString(): String {
    val audio = if (enableAudio) "with audio" else "without audio"
    return "${size.width} x ${size.height} @ $fps FPS $codec $fileType $orientation RecordingSession ($audio)"
  }
}
