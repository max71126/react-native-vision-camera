//
//  FrameProcessorContext.h
//  VisionCamera
//
//  Created by Marc Rousavy on 13.07.23.
//  Copyright © 2023 mrousavy. All rights reserved.
//

#pragma once

#import "Frame.h"
#import <AVFoundation/AVFoundation.h>
#import <Foundation/Foundation.h>

#ifdef __cplusplus
#import "FrameHostObject.h"
#import "WKTJsiWorklet.h"
#import <jsi/jsi.h>
#import <memory.h>
#endif

@interface FrameProcessor : NSObject

#ifdef __cplusplus
- (instancetype _Nonnull)initWithWorklet:(std::shared_ptr<RNWorklet::JsiWorklet>)worklet
                                 context:(std::shared_ptr<RNWorklet::JsiWorkletContext>)context;

- (void)callWithFrameHostObject:(std::shared_ptr<FrameHostObject>)frameHostObject;
#endif

- (void)call:(Frame* _Nonnull)frame;

@end
