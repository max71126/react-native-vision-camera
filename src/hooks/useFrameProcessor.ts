import { DependencyList, useCallback } from 'react';
import type { Frame } from '../Frame';
// Install RN Worklets by importing it
import 'react-native-worklets/src';

type FrameProcessor = (frame: Frame) => void;

/**
 * Returns a memoized Frame Processor function wich you can pass to the `<Camera>`. (See ["Frame Processors"](https://mrousavy.github.io/react-native-vision-camera/docs/guides/frame-processors))
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
export function useFrameProcessor(frameProcessor: FrameProcessor, dependencies: DependencyList): FrameProcessor {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(frameProcessor, dependencies);
}
