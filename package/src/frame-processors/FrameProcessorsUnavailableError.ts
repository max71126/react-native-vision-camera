import { CameraRuntimeError } from '../CameraError'

export class FrameProcessorsUnavailableError extends CameraRuntimeError {
  constructor(reason: unknown) {
    super(
      'system/frame-processors-unavailable',
      'Frame Processors are not available, react-native-worklets-core is not installed! ' +
        `Error: ${reason instanceof Error ? reason.message : reason}`,
    )
  }
}
