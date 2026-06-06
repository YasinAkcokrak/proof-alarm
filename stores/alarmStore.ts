import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type Alarm = {
  id: string
  time: string
  days: number[]
  enabled: boolean
  createdAt: number
}

type AlarmStore = {
  alarms: Alarm[]
  addAlarm: (alarm: Omit<Alarm, 'id' | 'createdAt'>) => Alarm
  updateAlarm: (id: string, updates: Partial<Omit<Alarm, 'id' | 'createdAt'>>) => void
  deleteAlarm: (id: string) => void
  toggleAlarm: (id: string) => void
  getNextTriggerTime: (alarm: Alarm) => Date | null
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export const useAlarmStore = create<AlarmStore>()(
  persist(
    (set, get) => ({
      alarms: [],

      addAlarm: (alarm) => {
        const newAlarm: Alarm = {
          ...alarm,
          id: generateId(),
          createdAt: Date.now(),
        }
        set((state) => ({ alarms: [...state.alarms, newAlarm] }))
        return newAlarm
      },

      updateAlarm: (id, updates) => {
        set((state) => ({
          alarms: state.alarms.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
        }))
      },

      deleteAlarm: (id) => {
        set((state) => ({
          alarms: state.alarms.filter((a) => a.id !== id),
        }))
      },

      toggleAlarm: (id) => {
        set((state) => ({
          alarms: state.alarms.map((a) =>
            a.id === id ? { ...a, enabled: !a.enabled } : a
          ),
        }))
      },

      getNextTriggerTime: (alarm) => {
        if (!alarm.enabled || alarm.days.length === 0) return null

        const [hours, minutes] = alarm.time.split(':').map(Number)
        const now = new Date()
        const today = now.getDay()

        for (let offset = 0; offset <= 7; offset++) {
          const dayIndex = (today + offset) % 7
          if (!alarm.days.includes(dayIndex)) continue

          const candidate = new Date(now)
          candidate.setDate(now.getDate() + offset)
          candidate.setHours(hours, minutes, 0, 0)

          if (candidate > now) return candidate
        }

        return null
      },
    }),
    {
      name: 'alarm-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
