import { NavigationContainer } from '@react-navigation/native'
import React, { useEffect, useState } from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { PermissionsPage } from './PermissionsPage'
import { MediaPage } from './MediaPage'
import { CameraPage } from './CameraPage'
import type { Routes } from './Routes'
import { Camera, CameraPermissionStatus } from 'react-native-vision-camera'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StyleSheet } from 'react-native'
import { DevicesPage } from './DevicesPage'

const Stack = createNativeStackNavigator<Routes>()

export function App(): React.ReactElement | null {
  const [cameraPermission, setCameraPermission] = useState<CameraPermissionStatus>()
  const [microphonePermission, setMicrophonePermission] = useState<CameraPermissionStatus>()

  useEffect(() => {
    Camera.getCameraPermissionStatus().then(setCameraPermission)
    Camera.getMicrophonePermissionStatus().then(setMicrophonePermission)
  }, [])

  console.log(`Re-rendering Navigator. Camera: ${cameraPermission} | Microphone: ${microphonePermission}`)

  if (cameraPermission == null || microphonePermission == null) {
    // still loading
    return null
  }

  const showPermissionsPage = cameraPermission !== 'granted' || microphonePermission === 'not-determined'
  return (
    <NavigationContainer>
      <GestureHandlerRootView style={styles.root}>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            statusBarStyle: 'dark',
            animationTypeForReplace: 'push',
          }}
          initialRouteName={showPermissionsPage ? 'PermissionsPage' : 'CameraPage'}>
          <Stack.Screen name="PermissionsPage" component={PermissionsPage} />
          <Stack.Screen name="CameraPage" component={CameraPage} />
          <Stack.Screen
            name="MediaPage"
            component={MediaPage}
            options={{
              animation: 'none',
              presentation: 'transparentModal',
            }}
          />
          <Stack.Screen name="Devices" component={DevicesPage} />
        </Stack.Navigator>
      </GestureHandlerRootView>
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
})
