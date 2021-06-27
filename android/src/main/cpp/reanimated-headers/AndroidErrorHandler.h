// copied from https://github.com/software-mansion/react-native-reanimated/blob/master/android/src/main/cpp/headers/AndroidErrorHandler.h

#pragma once

#include "ErrorHandler.h"
#include "AndroidScheduler.h"
#include "Scheduler.h"
#include <jni.h>
#include <memory>
#include <fbjni/fbjni.h>
#include "Logger.h"

namespace reanimated
{

  class AndroidErrorHandler : public JavaClass<AndroidErrorHandler>, public ErrorHandler {
    std::shared_ptr<ErrorWrapper> error;
    std::shared_ptr<Scheduler> scheduler;
    void raiseSpec() override;
  public:
    static auto constexpr kJavaDescriptor = "Lcom/swmansion/reanimated/AndroidErrorHandler;";
    AndroidErrorHandler(
        std::shared_ptr<Scheduler> scheduler);
    std::shared_ptr<Scheduler> getScheduler() override;
    std::shared_ptr<ErrorWrapper> getError() override;
    void setError(std::string message) override;
    virtual ~AndroidErrorHandler() {}
  };

}
