//
// Created by Marc Rousavy on 21.07.23.
//

#include "FrameProcessorPluginHostObject.h"
#include "FrameHostObject.h"
#include "JSIJNIConversion.h"
#include <string>
#include <vector>

namespace vision {

using namespace facebook;

std::vector<jsi::PropNameID> FrameProcessorPluginHostObject::getPropertyNames(jsi::Runtime& runtime) {
  std::vector<jsi::PropNameID> result;
  result.push_back(jsi::PropNameID::forUtf8(runtime, std::string("call")));
  return result;
}

jsi::Value FrameProcessorPluginHostObject::get(jsi::Runtime& runtime, const jsi::PropNameID& propName) {
  auto name = propName.utf8(runtime);

  if (name == "call") {
    return jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forUtf8(runtime, "call"), 2,
        [=](jsi::Runtime& runtime, const jsi::Value& thisValue, const jsi::Value* arguments, size_t count) -> jsi::Value {
          // Frame is first argument
          auto frameHostObject = arguments[0].asObject(runtime).asHostObject<FrameHostObject>(runtime);
          auto frame = frameHostObject->frame;

          // Options are second argument (possibly undefined)
          local_ref<JMap<jstring, jobject>> options = nullptr;
          if (count > 1) {
            options = JSIJNIConversion::convertJSIObjectToJNIMap(runtime, arguments[1].asObject(runtime));
          }

          // Call actual plugin
          auto result = _plugin->callback(frame, options);

          // Convert result value to jsi::Value (possibly undefined)
          return JSIJNIConversion::convertJNIObjectToJSIValue(runtime, result);
        });
  }

  return jsi::Value::undefined();
}

} // namespace vision
