package com.mrousavy.camera.frameprocessor

import android.util.Log
import androidx.annotation.Keep
import androidx.annotation.UiThread
import com.facebook.jni.HybridData
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl
import com.facebook.react.uimanager.UIManagerHelper
import com.mrousavy.camera.CameraView
import com.mrousavy.camera.core.ViewNotFoundError
import java.lang.ref.WeakReference

@Suppress("KotlinJniMissingFunction") // we use fbjni.
class VisionCameraProxy(context: ReactApplicationContext) {
  companion object {
    const val TAG = "VisionCameraProxy"
    init {
      try {
        System.loadLibrary("VisionCamera")
      } catch (e: UnsatisfiedLinkError) {
        Log.e(TAG, "Failed to load VisionCamera C++ library!", e)
        throw e
      }
    }
  }

  @DoNotStrip
  @Keep
  private var mHybridData: HybridData
  private var mContext: WeakReference<ReactApplicationContext>
  private var mScheduler: VisionCameraScheduler

  init {
    val jsCallInvokerHolder = context.catalystInstance.jsCallInvokerHolder as CallInvokerHolderImpl
    val jsRuntimeHolder = context.javaScriptContextHolder.get()
    mScheduler = VisionCameraScheduler()
    mContext = WeakReference(context)
    mHybridData = initHybrid(jsRuntimeHolder, jsCallInvokerHolder, mScheduler)
  }

  @UiThread
  private fun findCameraViewById(viewId: Int): CameraView {
    Log.d(TAG, "Finding view $viewId...")
    val ctx = mContext.get()
    val view = if (ctx != null) UIManagerHelper.getUIManager(ctx, viewId)?.resolveView(viewId) as CameraView? else null
    Log.d(TAG, if (view != null) "Found view $viewId!" else "Couldn't find view $viewId!")
    return view ?: throw ViewNotFoundError(viewId)
  }

  @DoNotStrip
  @Keep
  fun setFrameProcessor(viewId: Int, frameProcessor: FrameProcessor) {
    UiThreadUtil.runOnUiThread {
      val view = findCameraViewById(viewId)
      view.frameProcessor = frameProcessor
    }
  }

  @DoNotStrip
  @Keep
  fun removeFrameProcessor(viewId: Int) {
    UiThreadUtil.runOnUiThread {
      val view = findCameraViewById(viewId)
      view.frameProcessor = null
    }
  }

  @DoNotStrip
  @Keep
  fun initFrameProcessorPlugin(name: String, options: Map<String, Any>): FrameProcessorPlugin =
    FrameProcessorPluginRegistry.getPlugin(name, options)

  // private C++ funcs
  private external fun initHybrid(jsContext: Long, jsCallInvokerHolder: CallInvokerHolderImpl, scheduler: VisionCameraScheduler): HybridData
}
