import type { ViewProps } from 'react-native';
import type { CameraDevice, CameraDeviceFormat, ColorSpace, VideoStabilizationMode } from './CameraDevice';
import type { CameraRuntimeError } from './CameraError';
import type { CameraPreset } from './CameraPreset';
import type { Frame } from './Frame';

export interface FrameProcessorPerformanceSuggestion {
  type: 'can-use-higher-fps' | 'should-use-lower-fps';
  suggestedFrameProcessorFps: number;
}

export interface CameraProps extends ViewProps {
  /**
   * The Camera Device to use.
   *
   * See the [Camera Devices](https://react-native-vision-camera.com/docs/guides/devices) section in the documentation for more information about Camera Devices.
   *
   * @example
   * ```tsx
   * const devices = useCameraDevices('wide-angle-camera')
   * const device = devices.back
   *
   * return (
   *   <Camera
   *     device={device}
   *     isActive={true}
   *     style={StyleSheet.absoluteFill}
   *   />
   * )
   * ```
   */
  device: CameraDevice;
  /**
   * Whether the Camera should actively stream video frames, or not. See the [documentation about the `isActive` prop](https://react-native-vision-camera.com/docs/guides/lifecycle#the-isactive-prop) for more information.
   *
   * This can be compared to a Video component, where `isActive` specifies whether the video is paused or not.
   *
   * > Note: If you fully unmount the `<Camera>` component instead of using `isActive={false}`, the Camera will take a bit longer to start again. In return, it will use less resources since the Camera will be completely destroyed when unmounted.
   */
  isActive: boolean;

  //#region Use-cases
  /**
   * Enables **photo capture** with the `takePhoto` function (see ["Taking Photos"](https://react-native-vision-camera.com/docs/guides/capturing#taking-photos))
   */
  photo?: boolean;
  /**
   * Enables **video capture** with the `startRecording` function (see ["Recording Videos"](https://react-native-vision-camera.com/docs/guides/capturing/#recording-videos))
   *
   * Note: If you want to use `video` and `frameProcessor` simultaneously, make sure [`supportsParallelVideoProcessing`](https://react-native-vision-camera.com/docs/guides/devices#the-supportsparallelvideoprocessing-prop) is `true`.
   */
  video?: boolean;
  /**
   * Enables **audio capture** for video recordings (see ["Recording Videos"](https://react-native-vision-camera.com/docs/guides/capturing/#recording-videos))
   */
  audio?: boolean;
  //#endregion

  //#region Common Props (torch, zoom)
  /**
   * Set the current torch mode.
   *
   * Note: The torch is only available on `"back"` cameras, and isn't supported by every phone.
   *
   * @default "off"
   */
  torch?: 'off' | 'on';
  /**
   * Specifies the zoom factor of the current camera, in "factor"/scale.
   *
   * This value ranges from `minZoom` (e.g. `1`) to `maxZoom` (e.g. `128`). It is recommended to set this value
   * to the CameraDevice's `neutralZoom` per default and let the user zoom out to the fish-eye (ultra-wide) camera
   * on demand (if available)
   *
   * **Note:** Linearly increasing this value always appears logarithmic to the user.
   *
   * @default 1.0
   */
  zoom?: number;
  /**
   * Enables or disables the native pinch to zoom gesture.
   *
   * If you want to implement a custom zoom gesture, see [the Zooming with Reanimated documentation](https://react-native-vision-camera.com/docs/guides/animated).
   *
   * @default false
   */
  enableZoomGesture?: boolean;
  //#endregion

  //#region Format/Preset selection
  /**
   * Automatically selects a camera format which best matches the given preset. Must be `undefined` when `format` is set!
   */
  preset?: CameraPreset;
  /**
   * Selects a given format. Must be `undefined` when `preset` is set!
   */
  format?: CameraDeviceFormat;
  /**
   * Specify the frames per second this camera should use. Make sure the given `format` includes a frame rate range with the given `fps`.
   *
   * Requires `format` to be set.
   */
  fps?: number;
  /**
   * Enables or disables HDR on this camera device. Make sure the given `format` supports HDR mode.
   *
   * Requires `format` to be set.
   */
  hdr?: boolean;
  /**
   * Enables or disables low-light boost on this camera device. Make sure the given `format` supports low-light boost.
   *
   * Requires `format` to be set.
   */
  lowLightBoost?: boolean;
  /**
   * Specifies the color space to use for this camera device. Make sure the given `format` contains the given `colorSpace`.
   *
   * Requires `format` to be set.
   */
  colorSpace?: ColorSpace;
  /**
   * Specifies the video stabilization mode to use for this camera device. Make sure the given `format` contains the given `videoStabilizationMode`.
   *
   * Requires `format` to be set.
   * @platform iOS
   */
  videoStabilizationMode?: VideoStabilizationMode;
  //#endregion

  /**
   * Also captures data from depth-perception sensors. (e.g. disparity maps)
   *
   * @default false
   */
  enableDepthData?: boolean;
  /**
   * A boolean specifying whether the photo render pipeline is prepared for portrait effects matte delivery.
   *
   * When enabling this, you must also set `enableDepthData` to `true`.
   *
   * @platform iOS 12.0+
   * @default false
   */
  enablePortraitEffectsMatteDelivery?: boolean;
  /**
   * Indicates whether the Camera should prepare the photo pipeline to provide maximum quality photos.
   *
   * This enables:
   * * High Resolution Capture ([`isHighResolutionCaptureEnabled`](https://developer.apple.com/documentation/avfoundation/avcapturephotooutput/1648721-ishighresolutioncaptureenabled))
   * * Virtual Device fusion for greater detail ([`isVirtualDeviceConstituentPhotoDeliveryEnabled`](https://developer.apple.com/documentation/avfoundation/avcapturephotooutput/3192189-isvirtualdeviceconstituentphotod))
   * * Dual Device fusion for greater detail ([`isDualCameraDualPhotoDeliveryEnabled`](https://developer.apple.com/documentation/avfoundation/avcapturephotosettings/2873917-isdualcameradualphotodeliveryena))
   * * Sets the maximum quality prioritization to `.quality` ([`maxPhotoQualityPrioritization`](https://developer.apple.com/documentation/avfoundation/avcapturephotooutput/3182995-maxphotoqualityprioritization))
   *
   * @default false
   */
  enableHighQualityPhotos?: boolean;
  /**
   * Represents the orientation of all Camera Outputs (Photo, Video, and Frame Processor). If this value is not set, the device orientation is used.
   */
  orientation?: 'portrait' | 'portraitUpsideDown' | 'landscapeLeft' | 'landscapeRight';

  //#region Events
  /**
   * Called when any kind of runtime error occured.
   */
  onError?: (error: CameraRuntimeError) => void;
  /**
   * Called when the camera was successfully initialized.
   */
  onInitialized?: () => void;
  /**
   * Called when a new performance suggestion for a Frame Processor is available - either if your Frame Processor is running too fast and frames are being dropped, or because it is able to run faster. Optionally, you can adjust your `frameProcessorFps` accordingly.
   */
  onFrameProcessorPerformanceSuggestionAvailable?: (suggestion: FrameProcessorPerformanceSuggestion) => void;
  /**
   * A worklet which will be called for every frame the Camera "sees". Throttle the Frame Processor's frame rate with {@linkcode frameProcessorFps}.
   *
   * > See [the Frame Processors documentation](https://react-native-vision-camera.com/docs/guides/frame-processors) for more information
   *
   * Note: If you want to use `video` and `frameProcessor` simultaneously, make sure [`supportsParallelVideoProcessing`](https://react-native-vision-camera.com/docs/guides/devices#the-supportsparallelvideoprocessing-prop) is `true`.
   *
   * @example
   * ```tsx
   * const frameProcessor = useFrameProcessor((frame) => {
   *   'worklet'
   *   const qrCodes = scanQRCodes(frame)
   *   console.log(`Detected QR Codes: ${qrCodes}`)
   * }, [])
   *
   * return <Camera {...cameraProps} frameProcessor={frameProcessor} />
   * ```
   */
  frameProcessor?: (frame: Frame) => void;
  /**
   * Specifies the maximum frame rate the frame processor can use, independent of the Camera's frame rate (`fps` property).
   *
   * * A value of `'auto'` (default) indicates that the frame processor should execute as fast as it can, without dropping frames. This is achieved by collecting historical data for previous frame processor calls and adjusting frame rate accordingly.
   * * A value of `1` indicates that the frame processor gets executed once per second, perfect for code scanning.
   * * A value of `10` indicates that the frame processor gets executed 10 times per second, perfect for more realtime use-cases.
   * * A value of `25` indicates that the frame processor gets executed 25 times per second, perfect for high-speed realtime use-cases.
   * * ...and so on
   *
   * If you're using higher values, always check your Xcode/Android Studio Logs to make sure your frame processors are executing fast enough
   * without blocking the video recording queue.
   *
   * @default 'auto'
   */
  frameProcessorFps?: number | 'auto';
  //#endregion
}
