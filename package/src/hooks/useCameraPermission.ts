import { useCallback, useEffect, useState } from 'react'
import { Camera, CameraPermissionRequestResult, CameraPermissionStatus } from '../Camera'
import { AppState } from 'react-native'

interface PermissionState {
  /**
   * Whether the specified permission has explicitly been granted.
   * By default, this will be `false`. To request permission, call `requestPermission()`.
   */
  hasPermission: boolean
  /**
   * Requests the specified permission from the user.
   * @returns Whether the specified permission has now been granted, or not.
   */
  requestPermission: () => Promise<boolean>
}

function usePermission(get: () => CameraPermissionStatus, request: () => Promise<CameraPermissionRequestResult>): PermissionState {
  const [hasPermission, setHasPermission] = useState(() => get() === 'granted')

  const requestPermission = useCallback(async () => {
    const result = await request()
    const hasPermissionNow = result === 'granted'
    setHasPermission(hasPermissionNow)
    return hasPermissionNow
  }, [request])

  useEffect(() => {
    // Refresh permission when app state changes, as user might have allowed it in Settings
    const listener = AppState.addEventListener('change', () => {
      setHasPermission(get() === 'granted')
    })
    return () => listener.remove()
  }, [get])

  return {
    hasPermission,
    requestPermission,
  }
}

/**
 * Returns whether the user has granted permission to use the Camera, or not.
 *
 * If the user doesn't grant Camera Permission, you cannot use the `<Camera>`.
 *
 * @example
 * ```tsx
 * const { hasPermission, requestPermission } = useCameraPermission()
 *
 * if (!hasPermission) {
 *   return <PermissionScreen onPress={requestPermission} />
 * } else {
 *   return <Camera ... />
 * }
 * ```
 */
export function useCameraPermission(): PermissionState {
  return usePermission(Camera.getCameraPermissionStatus, Camera.requestCameraPermission)
}

/**
 * Returns whether the user has granted permission to use the Microphone, or not.
 *
 * If the user doesn't grant Audio Permission, you can use the `<Camera>` but you cannot
 * record videos with audio (the `audio={..}` prop).
 *
 * @example
 * ```tsx
 * const { hasPermission, requestPermission } = useMicrophonePermission()
 * const canRecordAudio = hasPermission
 *
 * return <Camera video={true} audio={canRecordAudio} />
 * ```
 */
export function useMicrophonePermission(): PermissionState {
  return usePermission(Camera.getMicrophonePermissionStatus, Camera.requestMicrophonePermission)
}
