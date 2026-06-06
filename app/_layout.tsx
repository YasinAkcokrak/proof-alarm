import { useEffect, useRef } from 'react'
import { Stack, router, useRootNavigationState } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as Notifications from 'expo-notifications'
import * as SplashScreen from 'expo-splash-screen'
import { Audio } from 'expo-av'
import { setupNotificationChannel, requestPermissions } from '../services/notifications'

SplashScreen.preventAutoHideAsync()

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export default function RootLayout() {
  const navigationState = useRootNavigationState()
  const isMounted = useRef(false)
  const pendingVerify = useRef(false)

  useEffect(() => {
    isMounted.current = true
    async function init() {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: true })
      await setupNotificationChannel()
      await requestPermissions()
      SplashScreen.hideAsync()
    }
    init()
    return () => {
      isMounted.current = false
    }
  }, [])

  // Listener only writes to a ref — never calls router directly.
  // This runs after mount so the listener itself is safe, but navigation
  // is deferred until the navigator state is confirmed ready below.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      pendingVerify.current = true
    })
    return () => sub.remove()
  }, [])

  // navigationState.key becomes defined once Expo Router's navigator has
  // finished mounting. Only then do we consume any pending navigation.
  useEffect(() => {
    if (!navigationState?.key) return
    if (!pendingVerify.current) return
    pendingVerify.current = false
    router.push('/alarm/verify')
  }, [navigationState?.key])

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="alarm/verify"
          options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
        />
        <Stack.Screen name="onboarding/index" />
      </Stack>
    </>
  )
}
