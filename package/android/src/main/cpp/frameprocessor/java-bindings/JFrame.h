//
// Created by Marc on 21.07.2023.
//

#pragma once

#include <fbjni/ByteBuffer.h>
#include <fbjni/fbjni.h>
#include <jni.h>

namespace vision {

using namespace facebook;
using namespace jni;

struct JFrame : public JavaClass<JFrame> {
  static constexpr auto kJavaDescriptor = "Lcom/mrousavy/camera/frameprocessor/Frame;";

public:
  int getWidth() const;
  int getHeight() const;
  bool getIsValid() const;
  bool getIsMirrored() const;
  int getPlanesCount() const;
  int getBytesPerRow() const;
  jlong getTimestamp() const;
  local_ref<JString> getOrientation() const;
  local_ref<JString> getPixelFormat() const;
  local_ref<JByteBuffer> toByteBuffer() const;
  void incrementRefCount();
  void decrementRefCount();
  void close();
};

} // namespace vision
