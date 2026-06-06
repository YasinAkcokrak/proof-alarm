import { useEffect, useRef } from 'react'
import { Stack, router } from 'expo-router'
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
  const isMounted = useRef(false)

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

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('[Notifications] response received')
      console.log('[Notifications] notification content:', JSON.stringify(response.notification.request.content))
      console.log('[Notifications] action identifier:', response.actionIdentifier)

      const alarmId = response.notification.request.content.data?.alarmId as string | undefined
      console.log('[Notifications] alarmId:', alarmId)

      console.log('[Navigation] scheduling router.push with 500ms delay')
      setTimeout(() => {
        console.log('[Navigation] attempting router.push("/alarm/verify")')
        if (alarmId) {
          router.push({ pathname: '/alarm/verify', params: { alarmId } })
        } else {
          router.push('/alarm/verify')
        }
        console.log('[Navigation] router.push called')
      }, 500)
    })
    return () => sub.remove()
  }, [])

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
