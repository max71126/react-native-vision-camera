import type { CameraPosition } from './CameraPosition';
import { Orientation } from './Orientation';
import type { PixelFormat } from './PixelFormat';

/**
 * Indentifiers for a physical camera (one that actually exists on the back/front of the device)
 *
 * * `"ultra-wide-angle-camera"`: A built-in camera with a shorter focal length than that of a wide-angle camera. (focal length between below 24mm)
 * * `"wide-angle-camera"`: A built-in wide-angle camera. (focal length between 24mm and 35mm)
 * * `"telephoto-camera"`: A built-in camera device with a longer focal length than a wide-angle camera. (focal length between above 85mm)
 */
export type PhysicalCameraDeviceType = 'ultra-wide-angle-camera' | 'wide-angle-camera' | 'telephoto-camera';

/**
 * Indentifiers for a logical camera (Combinations of multiple physical cameras to create a single logical camera).
 *
 * * `"dual-camera"`: A combination of wide-angle and telephoto cameras that creates a capture device.
 * * `"dual-wide-camera"`: A device that consists of two cameras of fixed focal length, one ultrawide angle and one wide angle.
 * * `"triple-camera"`: A device that consists of three cameras of fixed focal length, one ultrawide angle, one wide angle, and one telephoto.
 */
export type LogicalCameraDeviceType = 'dual-camera' | 'dual-wide-camera' | 'triple-camera';

/**
 * Parses an array of physical device types into a single {@linkcode PhysicalCameraDeviceType} or {@linkcode LogicalCameraDeviceType}, depending what matches.
 * @method
 */
export const parsePhysicalDeviceTypes = (
  physicalDeviceTypes: PhysicalCameraDeviceType[],
): PhysicalCameraDeviceType | LogicalCameraDeviceType => {
  if (physicalDeviceTypes.length === 1) {
    // @ts-expect-error for very obvious reasons
    return physicalDeviceTypes[0];
  }

  const hasWide = physicalDeviceTypes.includes('wide-angle-camera');
  const hasUltra = physicalDeviceTypes.includes('ultra-wide-angle-camera');
  const hasTele = physicalDeviceTypes.includes('telephoto-camera');

  if (hasTele && hasWide && hasUltra) return 'triple-camera';
  if (hasWide && hasUltra) return 'dual-wide-camera';
  if (hasWide && hasTele) return 'dual-camera';

  throw new Error(`Invalid physical device type combination! ${physicalDeviceTypes.join(' + ')}`);
};

/**
 * Indicates a format's autofocus system.
 *
 * * `"none"`: Indicates that autofocus is not available
 * * `"contrast-detection"`: Indicates that autofocus is achieved by contrast detection. Contrast detection performs a focus scan to find the optimal position
 * * `"phase-detection"`: Indicates that autofocus is achieved by phase detection. Phase detection has the ability to achieve focus in many cases without a focus scan. Phase detection autofocus is typically less visually intrusive than contrast detection autofocus
 */
export type AutoFocusSystem = 'contrast-detection' | 'phase-detection' | 'none';

/**
 * Indicates a format's supported video stabilization mode. Enabling video stabilization may introduce additional latency into the video capture pipeline.
 *
 * * `"off"`: No video stabilization. Indicates that video should not be stabilized
 * * `"standard"`: Standard software-based video stabilization. Standard video stabilization reduces the field of view by about 10%.
 * * `"cinematic"`: Advanced software-based video stabilization. This applies more aggressive cropping or transformations than standard.
 * * `"cinematic-extended"`: Extended software- and hardware-based stabilization that aggressively crops and transforms the video to apply a smooth cinematic stabilization.
 * * `"auto"`: Indicates that the most appropriate video stabilization mode for the device and format should be chosen automatically
 */
export type VideoStabilizationMode = 'off' | 'standard' | 'cinematic' | 'cinematic-extended' | 'auto';

/**
 * A Camera Device's video format. Do not create instances of this type yourself, only use {@linkcode Camera.getAvailableCameraDevices | Camera.getAvailableCameraDevices()}.
 */
export interface CameraDeviceFormat {
  /**
   * The height of the highest resolution a still image (photo) can be produced in
   */
  photoHeight: number;
  /**
   * The width of the highest resolution a still image (photo) can be produced in
   */
  photoWidth: number;
  /**
   * The video resolutions's height
   */
  videoHeight: number;
  /**
   * The video resolution's width
   */
  videoWidth: number;
  /**
   * Maximum supported ISO value
   */
  maxISO: number;
  /**
   * Minimum supported ISO value
   */
  minISO: number;
  /**
   * The video field of view in degrees
   */
  fieldOfView: number;
  /**
   * The maximum zoom factor (e.g. `128`)
   */
  maxZoom: number;
  /**
   * Specifies whether this format supports HDR mode for video capture
   */
  supportsVideoHDR: boolean;
  /**
   * Specifies whether this format supports HDR mode for photo capture
   */
  supportsPhotoHDR: boolean;
  /**
   * The minum frame rate this Format needs to run at. High resolution formats often run at lower frame rates.
   */
  minFps: number;
  /**
   * The maximum frame rate this Format is able to run at. High resolution formats often run at lower frame rates.
   */
  maxFps: number;
  /**
   * Specifies this format's auto focus system.
   */
  autoFocusSystem: AutoFocusSystem;
  /**
   * All supported video stabilization modes
   */
  videoStabilizationModes: VideoStabilizationMode[];
  /**
   * Specifies this format's supported pixel-formats.
   * In most cases, this is `['native', 'yuv']`.
   */
  pixelFormats: PixelFormat[];
}

/**
 * Represents a camera device discovered by the {@linkcode Camera.getAvailableCameraDevices | Camera.getAvailableCameraDevices()} function
 */
export interface CameraDevice {
  /**
   * The native ID of the camera device instance.
   */
  id: string;
  /**
   * The physical devices this `CameraDevice` contains.
   *
   * * If this camera device is a **logical camera** (combination of multiple physical cameras), there are multiple cameras in this array.
   * * If this camera device is a **physical camera**, there is only a single element in this array.
   *
   * You can check if the camera is a logical multi-camera by using the `isMultiCam` property.
   */
  devices: PhysicalCameraDeviceType[];
  /**
   * Specifies the physical position of this camera. (back or front)
   */
  position: CameraPosition;
  /**
   * A friendly localized name describing the camera.
   */
  name: string;
  /**
   * Specifies whether this camera supports enabling flash for photo capture.
   */
  hasFlash: boolean;
  /**
   * Specifies whether this camera supports continuously enabling the flash to act like a torch (flash with video capture)
   */
  hasTorch: boolean;
  /**
   * A property indicating whether the device is a virtual multi-camera consisting of multiple combined physical cameras.
   *
   * Examples:
   * * The Dual Camera, which supports seamlessly switching between a wide and telephoto camera while zooming and generating depth data from the disparities between the different points of view of the physical cameras.
   * * The TrueDepth Camera, which generates depth data from disparities between a YUV camera and an Infrared camera pointed in the same direction.
   */
  isMultiCam: boolean;
  /**
   * Minimum available zoom factor (e.g. `1`)
   */
  minZoom: number;
  /**
   * Maximum available zoom factor (e.g. `128`)
   */
  maxZoom: number;
  /**
   * The zoom factor where the camera is "neutral".
   *
   * * For single-physical cameras this property is always `1.0`.
   * * For multi cameras this property is a value between `minZoom` and `maxZoom`, where the camera is in _wide-angle_ mode and hasn't switched to the _ultra-wide-angle_ ("fish-eye") or telephoto camera yet.
   *
   * Use this value as an initial value for the zoom property if you implement custom zoom. (e.g. reanimated shared value should be initially set to this value)
   * @example
   * const device = ...
   *
   * const zoom = useSharedValue(device.neutralZoom) // <-- initial value so it doesn't start at ultra-wide
   * const cameraProps = useAnimatedProps(() => ({
   *   zoom: zoom.value
   * }))
   */
  neutralZoom: number;
  /**
   * All available formats for this camera device. Use this to find the best format for your use case and set it to the Camera's {@linkcode CameraProps.format | Camera's .format} property.
   *
   * See [the Camera Formats documentation](https://react-native-vision-camera.com/docs/guides/formats) for more information about Camera Formats.
   */
  formats: CameraDeviceFormat[];
  /**
   * Whether this camera device supports low light boost.
   */
  supportsLowLightBoost: boolean;
  /**
   * Whether this camera supports taking photos with depth data.
   *
   * **! Work in Progress !**
   */
  supportsDepthCapture: boolean;
  /**
   * Whether this camera supports taking photos in RAW format
   *
   * **! Work in Progress !**
   */
  supportsRawCapture: boolean;
  /**
   * Specifies whether this device supports focusing ({@linkcode Camera.focus | Camera.focus(...)})
   */
  supportsFocus: boolean;
  /**
   * The hardware level of the Camera.
   * - On Android, some older devices are running at a `legacy` or `limited` level which means they are running in a backwards compatible mode.
   * - On iOS, all devices are `full`.
   */
  hardwareLevel: 'legacy' | 'limited' | 'full';
  /**
   * Represents the sensor's orientation relative to the phone.
   * For most phones this will be landscape, as Camera sensors are usually always rotated by 90 degrees (i.e. width and height are flipped).
   */
  sensorOrientation: Orientation;
}
