import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import type { Alarm } from '../stores/alarmStore'

export const ALARM_CHANNEL_ID = 'alarm'

export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
    name: 'Alarm',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF3B30',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
    enableVibrate: true,
  })
}

export async function requestPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
      allowCriticalAlerts: true,
    },
  })
  return status === 'granted'
}

function notifId(alarmId: string, day: number): string {
  return `alarm_${alarmId}_day_${day}`
}

export async function scheduleAlarm(alarm: Alarm): Promise<void> {
  const [hours, minutes] = alarm.time.split(':').map(Number)

  await Promise.all(
    alarm.days.map((day) =>
      Notifications.scheduleNotificationAsync({
        identifier: notifId(alarm.id, day),
        content: {
          title: '⏰ Wake up!',
          body: 'Walk to your proof location to dismiss this alarm.',
          sound: 'alarm.wav',
          priority: Notifications.AndroidNotificationPriority.MAX,
          ios: {
            critical: true,
            sound: 'alarm.wav',
            volume: 1.0,
          },
          data: { alarmId: alarm.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          channelId: ALARM_CHANNEL_ID,
          weekday: day + 1,
          hour: hours,
          minute: minutes,
        },
      })
    )
  )
}

export async function cancelAlarm(alarm: Alarm): Promise<void> {
  await Promise.all(
    alarm.days.map((day) =>
      Notifications.cancelScheduledNotificationAsync(notifId(alarm.id, day))
    )
  )
}
