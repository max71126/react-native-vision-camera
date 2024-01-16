//
//  Frame.h
//  VisionCamera
//
//  Created by Marc Rousavy on 15.03.21.
//  Copyright © 2021 mrousavy. All rights reserved.
//

#pragma once

#import <CoreMedia/CMSampleBuffer.h>
#import <Foundation/Foundation.h>
#import <UIKit/UIImage.h>

NS_ASSUME_NONNULL_BEGIN

@interface Frame : NSObject

- (instancetype)initWithBuffer:(CMSampleBufferRef)buffer orientation:(UIImageOrientation)orientation;
- (instancetype)init NS_UNAVAILABLE;

@property(nonatomic, readonly) CMSampleBufferRef buffer;
@property(nonatomic, readonly) UIImageOrientation orientation;

@property(nonatomic, readonly) NSString* pixelFormat;
@property(nonatomic, readonly) BOOL isMirrored;
@property(nonatomic, readonly) BOOL isValid;
@property(nonatomic, readonly) size_t width;
@property(nonatomic, readonly) size_t height;
@property(nonatomic, readonly) double timestamp;
@property(nonatomic, readonly) size_t bytesPerRow;
@property(nonatomic, readonly) size_t planesCount;

@end

NS_ASSUME_NONNULL_END
