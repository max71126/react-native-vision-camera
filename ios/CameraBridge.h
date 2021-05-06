//
//  CameraBridge.h
//  Cuvent
//
//  Created by Marc Rousavy on 09.11.20.
//  Copyright © 2020 Facebook. All rights reserved.
//

#pragma once

#import <Foundation/Foundation.h>

#import <React/RCTViewManager.h>
#import <React/RCTUIManager.h>

#import "FrameProcessorCallback.h"
#import "FrameProcessorRuntimeManager.h"
#import "RCTBridge+runOnJS.h"

#ifdef VISION_CAMERA_DISABLE_FRAME_PROCESSORS
static bool enableFrameProcessors = false;
#else
static bool enableFrameProcessors = true;
#endif

@interface CameraBridge: RCTViewManager

@end
