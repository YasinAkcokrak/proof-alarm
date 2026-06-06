import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Switch,
  Modal,
  StyleSheet,
  Alert,
  SafeAreaView,
} from 'react-native'
import { useState, useCallback } from 'react'
import { Redirect, router } from 'expo-router'
import { useAlarmStore, type Alarm } from '../../stores/alarmStore'
import { useLocationStore } from '../../stores/locationStore'
import { scheduleAlarm, cancelAlarm } from '../../services/notifications'
import { Colors } from '../../constants/colors'

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DAY_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function formatTime12h(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h < 12 ? 'AM' : 'PM'
  const displayH = h % 12 === 0 ? 12 : h % 12
  return `${displayH}:${pad(m)} ${period}`
}

function formatNextTrigger(date: Date | null): string {
  if (!date) return 'Off'
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffH = Math.floor(diffMs / (1000 * 60 * 60))
  const diffM = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  if (diffH < 24) return `in ${diffH}h ${diffM}m`
  const h = date.getHours()
  const period = h < 12 ? 'AM' : 'PM'
  const displayH = h % 12 === 0 ? 12 : h % 12
  return `${DAY_FULL[date.getDay()]} at ${displayH}:${pad(date.getMinutes())} ${period}`
}

type AlarmCardProps = {
  alarm: Alarm
  onToggle: (id: string) => void
  onDelete: (alarm: Alarm) => void
  nextTrigger: Date | null
}

function AlarmCard({ alarm, onToggle, onDelete, nextTrigger }: AlarmCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <Text style={[styles.alarmTime, !alarm.enabled && styles.dimmed]}>
          {formatTime12h(alarm.time)}
        </Text>
        <View style={styles.daysRow}>
          {DAY_LABELS.map((label, i) => (
            <View
              key={i}
              style={[styles.dayDot, alarm.days.includes(i) && styles.dayDotActive]}
            >
              <Text
                style={[styles.dayLabel, alarm.days.includes(i) && styles.dayLabelActive]}
              >
                {label}
              </Text>
            </View>
          ))}
        </View>
        {alarm.enabled && (
          <Text style={styles.nextTrigger}>{formatNextTrigger(nextTrigger)}</Text>
        )}
        <TouchableOpacity
          style={styles.testBtn}
          onPress={() => router.push('/alarm/verify')}
        >
          <Text style={styles.testBtnText}>Test Verify</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.cardRight}>
        <Switch
          value={alarm.enabled}
          onValueChange={() => onToggle(alarm.id)}
          trackColor={{ false: '#333', true: Colors.accentDim }}
          thumbColor={alarm.enabled ? Colors.accent : '#666'}
        />
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => onDelete(alarm)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.deleteIcon}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

type AddAlarmModalProps = {
  visible: boolean
  onClose: () => void
  onSave: (time: string, days: number[]) => void
}

function AddAlarmModal({ visible, onClose, onSave }: AddAlarmModalProps) {
  const [hours, setHours] = useState(7)   // 1–12
  const [minutes, setMinutes] = useState(0)
  const [isPM, setIsPM] = useState(false)
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5])

  // Wraps 1–12
  const adjustHours = (delta: number) =>
    setHours((h) => ((h - 1 + delta + 12) % 12) + 1)
  const incMinutes = () => setMinutes((m) => (m + 1) % 60)
  const decMinutes = () => setMinutes((m) => (m - 1 + 60) % 60)

  const toggleDay = (day: number) =>
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )

  const handleSave = () => {
    if (selectedDays.length === 0) {
      Alert.alert('No days selected', 'Select at least one day for the alarm.')
      return
    }
    // Convert 12h → 24h for storage
    let h24 = hours
    if (isPM && hours !== 12) h24 = hours + 12
    if (!isPM && hours === 12) h24 = 0
    onSave(`${pad(h24)}:${pad(minutes)}`, selectedDays.sort((a, b) => a - b))
    setHours(7)
    setMinutes(0)
    setIsPM(false)
    setSelectedDays([1, 2, 3, 4, 5])
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Alarm</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.timePicker}>
            <View style={styles.timeColumn}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => adjustHours(1)}>
                <Text style={styles.stepBtnText}>▲</Text>
              </TouchableOpacity>
              <Text style={styles.timeDigit}>{String(hours)}</Text>
              <TouchableOpacity style={styles.stepBtn} onPress={() => adjustHours(-1)}>
                <Text style={styles.stepBtnText}>▼</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.timeSep}>:</Text>

            <View style={styles.timeColumn}>
              <TouchableOpacity style={styles.stepBtn} onPress={incMinutes}>
                <Text style={styles.stepBtnText}>▲</Text>
              </TouchableOpacity>
              <Text style={styles.timeDigit}>{pad(minutes)}</Text>
              <TouchableOpacity style={styles.stepBtn} onPress={decMinutes}>
                <Text style={styles.stepBtnText}>▼</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.ampmColumn}>
              <TouchableOpacity
                style={[styles.ampmBtn, !isPM && styles.ampmBtnActive]}
                onPress={() => setIsPM(false)}
              >
                <Text style={[styles.ampmBtnText, !isPM && styles.ampmBtnTextActive]}>AM</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ampmBtn, isPM && styles.ampmBtnActive]}
                onPress={() => setIsPM(true)}
              >
                <Text style={[styles.ampmBtnText, isPM && styles.ampmBtnTextActive]}>PM</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.dayPicker}>
            {DAY_LABELS.map((label, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.dayBtn, selectedDays.includes(i) && styles.dayBtnActive]}
                onPress={() => toggleDay(i)}
              >
                <Text
                  style={[styles.dayBtnText, selectedDays.includes(i) && styles.dayBtnTextActive]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Add Alarm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

export default function AlarmsScreen() {
  const { alarms, addAlarm, toggleAlarm, deleteAlarm, getNextTriggerTime } = useAlarmStore()
  const locations = useLocationStore((s) => s.locations)
  const [showModal, setShowModal] = useState(false)

  if (locations.length === 0) {
    return <Redirect href="/onboarding" />
  }

  const handleToggle = useCallback(
    async (id: string) => {
      const alarm = alarms.find((a) => a.id === id)
      if (!alarm) return
      toggleAlarm(id)
      const updated = { ...alarm, enabled: !alarm.enabled }
      if (updated.enabled) {
        await scheduleAlarm(updated)
      } else {
        await cancelAlarm(alarm)
      }
    },
    [alarms, toggleAlarm]
  )

  const handleDelete = useCallback(
    (alarm: Alarm) => {
      Alert.alert('Delete Alarm', `Delete alarm at ${alarm.time}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await cancelAlarm(alarm)
            deleteAlarm(alarm.id)
          },
        },
      ])
    },
    [deleteAlarm]
  )

  const handleSave = useCallback(
    async (time: string, days: number[]) => {
      const alarm = addAlarm({ time, days, enabled: true })
      await scheduleAlarm(alarm)
      setShowModal(false)
    },
    [addAlarm]
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Alarms</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {alarms.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>⏰</Text>
          <Text style={styles.emptyTitle}>No alarms</Text>
          <Text style={styles.emptySubtext}>Tap + to add your first alarm</Text>
        </View>
      ) : (
        <FlatList
          data={alarms}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <AlarmCard
              alarm={item}
              onToggle={handleToggle}
              onDelete={handleDelete}
              nextTrigger={getNextTriggerTime(item)}
            />
          )}
        />
      )}

      <AddAlarmModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: Colors.text,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '400',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  cardLeft: {
    flex: 1,
    gap: 6,
  },
  cardRight: {
    alignItems: 'center',
    gap: 12,
    paddingLeft: 12,
  },
  alarmTime: {
    fontSize: 36,
    fontWeight: '300',
    color: Colors.text,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  dimmed: {
    opacity: 0.35,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dayDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  dayDotActive: {
    backgroundColor: Colors.accentDim,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.subtext,
  },
  dayLabelActive: {
    color: Colors.accent,
  },
  nextTrigger: {
    fontSize: 12,
    color: Colors.subtext,
  },
  testBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginTop: 2,
  },
  testBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.subtext,
  },
  deleteBtn: {
    padding: 4,
  },
  deleteIcon: {
    fontSize: 14,
    color: Colors.subtext,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.subtext,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  modalClose: {
    fontSize: 18,
    color: Colors.subtext,
  },
  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  timeColumn: {
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    width: 72,
    height: 40,
    backgroundColor: Colors.inputBg,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    color: Colors.text,
    fontSize: 18,
  },
  timeDigit: {
    fontSize: 52,
    fontWeight: '200',
    color: Colors.text,
    width: 72,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  timeSep: {
    fontSize: 48,
    fontWeight: '200',
    color: Colors.subtext,
    marginTop: -12,
  },
  ampmColumn: {
    marginLeft: 8,
    gap: 6,
    justifyContent: 'center',
  },
  ampmBtn: {
    width: 48,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  ampmBtnActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  ampmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.subtext,
  },
  ampmBtnTextActive: {
    color: Colors.text,
  },
  dayPicker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.inputBg,
  },
  dayBtnActive: {
    backgroundColor: Colors.accent,
  },
  dayBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.subtext,
  },
  dayBtnTextActive: {
    color: Colors.text,
  },
  saveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
})
