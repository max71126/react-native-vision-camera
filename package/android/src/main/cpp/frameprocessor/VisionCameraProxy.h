//
// Created by Marc Rousavy on 21.07.23.
//

#pragma once

#include <jsi/jsi.h>

#include "JVisionCameraProxy.h"
#include "JVisionCameraScheduler.h"

#include <string>
#include <vector>

namespace vision {

using namespace facebook;

class VisionCameraProxy : public jsi::HostObject {
public:
  explicit VisionCameraProxy(const jni::alias_ref<JVisionCameraProxy::javaobject>& javaProxy);
  ~VisionCameraProxy();

public:
  std::vector<jsi::PropNameID> getPropertyNames(jsi::Runtime& runtime) override;
  jsi::Value get(jsi::Runtime& runtime, const jsi::PropNameID& name) override;

private:
  void setFrameProcessor(int viewTag, jsi::Runtime& runtime, const jsi::Object& frameProcessor);
  void removeFrameProcessor(int viewTag);
  jsi::Value initFrameProcessorPlugin(jsi::Runtime& runtime, const std::string& name, const jsi::Object& options);

private:
  jni::global_ref<JVisionCameraProxy::javaobject> _javaProxy;
  static constexpr const char* TAG = "VisionCameraProxy";
};

class VisionCameraInstaller : public jni::JavaClass<VisionCameraInstaller> {
public:
  static auto constexpr kJavaDescriptor = "Lcom/mrousavy/camera/frameprocessor/VisionCameraInstaller;";
  static void registerNatives() {
    javaClassStatic()->registerNatives({makeNativeMethod("install", VisionCameraInstaller::install)});
  }
  static void install(jni::alias_ref<jni::JClass> clazz, jni::alias_ref<JVisionCameraProxy::javaobject> proxy);
};

} // namespace vision
