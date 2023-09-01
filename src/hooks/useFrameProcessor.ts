import { DependencyList, useMemo } from 'react';
import type { Frame, FrameInternal } from '../Frame';
import { FrameProcessor } from '../CameraProps';

/**
 * Create a new Frame Processor function which you can pass to the `<Camera>`.
 * (See ["Frame Processors"](https://mrousavy.github.io/react-native-vision-camera/docs/guides/frame-processors))
 *
 * Make sure to add the `'worklet'` directive to the top of the Frame Processor function, otherwise it will not get compiled into a worklet.
 *
 * Also make sure to memoize the returned object, so that the Camera doesn't reset the Frame Processor Context each time.
 */
export function createFrameProcessor(frameProcessor: FrameProcessor['frameProcessor'], type: FrameProcessor['type']): FrameProcessor {
  return {
    frameProcessor: (frame: Frame) => {
      'worklet';
      // Increment ref-count by one
      (frame as FrameInternal).incrementRefCount();
      try {
        // Call sync frame processor
        frameProcessor(frame);
      } finally {
        // Potentially delete Frame if we were the last ref (no runAsync)
        (frame as FrameInternal).decrementRefCount();
      }
    },
    type: type,
  };
}

/**
 * Returns a memoized Frame Processor function wich you can pass to the `<Camera>`.
 * (See ["Frame Processors"](https://mrousavy.github.io/react-native-vision-camera/docs/guides/frame-processors))
 *
 * Make sure to add the `'worklet'` directive to the top of the Frame Processor function, otherwise it will not get compiled into a worklet.
 *
 * @param frameProcessor The Frame Processor
 * @param dependencies The React dependencies which will be copied into the VisionCamera JS-Runtime.
 * @returns The memoized Frame Processor.
 * @example
 * ```ts
 * const frameProcessor = useFrameProcessor((frame) => {
 *   'worklet'
 *   const qrCodes = scanQRCodes(frame)
 *   console.log(`QR Codes: ${qrCodes}`)
 * }, [])
 * ```
 */
export function useFrameProcessor(frameProcessor: (frame: Frame) => void, dependencies: DependencyList): FrameProcessor {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => createFrameProcessor(frameProcessor, 'frame-processor'), dependencies);
}
