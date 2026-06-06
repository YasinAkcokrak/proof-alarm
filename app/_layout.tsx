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
  // Navigation is deferred until the navigator state is confirmed ready below.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('[Notifications] response received')
      console.log('[Notifications] notification content:', JSON.stringify(response.notification.request.content))
      console.log('[Notifications] action identifier:', response.actionIdentifier)
      pendingVerify.current = true
      console.log('[Notifications] pendingVerify set to true, navigationState.key:', navigationState?.key)
    })
    return () => sub.remove()
  }, [navigationState?.key])

  // navigationState.key becomes defined once Expo Router's navigator has
  // finished mounting. Only then do we consume any pending navigation.
  useEffect(() => {
    if (!navigationState?.key) return
    if (!pendingVerify.current) return
    console.log('[Navigation] navigationState.key ready:', navigationState.key)
    console.log('[Navigation] attempting router.push("/alarm/verify")')
    pendingVerify.current = false
    router.push('/alarm/verify')
    console.log('[Navigation] router.push called')
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
