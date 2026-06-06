import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  ScrollView,
} from 'react-native'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Audio } from 'expo-av'
import { File, Paths } from 'expo-file-system'
import { useAlarmStore } from '../../stores/alarmStore'
import { useLocationStore } from '../../stores/locationStore'
import { cancelAlarm } from '../../services/notifications'
import { Colors } from '../../constants/colors'

const CUSTOM_SOUND_FILENAME = 'custom-alarm.wav'

function customSoundFile() {
  return new File(Paths.document, CUSTOM_SOUND_FILENAME)
}

type SoundState = 'idle' | 'recording' | 'playing'

export default function SettingsScreen() {
  const alarms = useAlarmStore((s) => s.alarms)
  const deleteAllAlarms = useAlarmStore((s) => s.deleteAlarm)
  const locations = useLocationStore((s) => s.locations)
  const deleteLocation = useLocationStore((s) => s.deleteLocation)

  const [soundState, setSoundState] = useState<SoundState>('idle')
  const [hasCustomSound, setHasCustomSound] = useState(false)
  const [countdown, setCountdown] = useState(5)
  const recordingRef = useRef<Audio.Recording | null>(null)
  const playbackRef = useRef<Audio.Sound | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setHasCustomSound(customSoundFile().exists)
  }, [])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      recordingRef.current?.stopAndUnloadAsync().catch(() => {})
      playbackRef.current?.unloadAsync().catch(() => {})
    }
  }, [])

  const doStopRecording = useCallback(async (recording: Audio.Recording) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    recordingRef.current = null
    setSoundState('idle')

    try {
      await recording.stopAndUnloadAsync()
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true })
      const uri = recording.getURI()
      if (uri) {
        const dest = customSoundFile()
        if (dest.exists) dest.delete()
        new File(uri).copy(dest)
        setHasCustomSound(true)
      }
    } catch {
      Alert.alert('Error', 'Failed to save recording.')
    }
  }, [])

  const handleStartRecording = async () => {
    const { granted } = await Audio.requestPermissionsAsync()
    if (!granted) {
      Alert.alert('Permission required', 'Microphone access is needed to record your alarm sound.')
      return
    }

    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })
      const recording = new Audio.Recording()
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY)
      await recording.startAsync()
      recordingRef.current = recording
      setSoundState('recording')
      setCountdown(5)

      let remaining = 5
      intervalRef.current = setInterval(() => {
        remaining -= 1
        setCountdown(remaining)
        if (remaining <= 0) doStopRecording(recording)
      }, 1000)
    } catch {
      Alert.alert('Error', 'Could not start recording.')
      setSoundState('idle')
    }
  }

  const handleStopRecording = () => {
    const recording = recordingRef.current
    if (recording) doStopRecording(recording)
  }

  const handlePlay = async () => {
    if (soundState === 'playing') {
      await playbackRef.current?.stopAsync()
      await playbackRef.current?.unloadAsync()
      playbackRef.current = null
      setSoundState('idle')
      return
    }

    const file = customSoundFile()
    if (!file.exists) return

    try {
      setSoundState('playing')
      const { sound } = await Audio.Sound.createAsync(
        { uri: file.uri },
        { shouldPlay: true }
      )
      playbackRef.current = sound
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync()
          playbackRef.current = null
          setSoundState('idle')
        }
      })
    } catch {
      setSoundState('idle')
      Alert.alert('Error', 'Could not play recording.')
    }
  }

  const handleDeleteSound = () => {
    Alert.alert('Delete custom sound', 'Revert to the default alarm sound?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const file = customSoundFile()
          if (file.exists) file.delete()
          setHasCustomSound(false)
        },
      },
    ])
  }

  const handleClearData = () => {
    Alert.alert(
      'Clear all data',
      'This will delete all alarms and locations. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            for (const alarm of alarms) {
              await cancelAlarm(alarm)
              deleteAllAlarms(alarm.id)
            }
            for (const loc of locations) {
              await deleteLocation(loc.id)
            }
            Alert.alert('Cleared', 'All data has been deleted.')
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.screenTitle}>Settings</Text>

        {/* Custom alarm sound */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Alarm Sound</Text>
          <Text style={styles.sectionSubtext}>
            {hasCustomSound
              ? 'Using your custom recording.'
              : 'Record up to 5 seconds — plays when your alarm fires.'}
          </Text>

          <View style={styles.soundCard}>
            {soundState === 'recording' ? (
              <View style={styles.recordingRow}>
                <View style={styles.recordingIndicator} />
                <Text style={styles.countdownText}>{countdown}s</Text>
                <TouchableOpacity style={styles.stopBtn} onPress={handleStopRecording}>
                  <Text style={styles.stopBtnText}>Stop</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.soundBtnRow}>
                <TouchableOpacity
                  style={styles.recordBtn}
                  onPress={handleStartRecording}
                  disabled={soundState === 'playing'}
                >
                  <Text style={styles.recordBtnText}>
                    {hasCustomSound ? '⏺ Re-record' : '⏺ Record'}
                  </Text>
                </TouchableOpacity>

                {hasCustomSound && (
                  <>
                    <TouchableOpacity style={styles.playBtn} onPress={handlePlay}>
                      <Text style={styles.playBtnText}>
                        {soundState === 'playing' ? '⏹ Stop' : '▶ Play'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteAudioBtn} onPress={handleDeleteSound}>
                      <Text style={styles.deleteAudioBtnText}>✕</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{alarms.length}</Text>
              <Text style={styles.statLabel}>Alarms</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{locations.length}</Text>
              <Text style={styles.statLabel}>Locations</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.dangerBtn} onPress={handleClearData}>
            <Text style={styles.dangerBtnText}>Clear all data</Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.aboutCard}>
            <Text style={styles.aboutName}>WEAKY</Text>
            <Text style={styles.aboutDesc}>
              An alarm that won&apos;t dismiss until you walk to a specific spot and take a photo.
              Photos are verified using Claude Vision AI.
            </Text>
            <Text style={styles.aboutNote}>All data is stored on-device. No backend, no sync.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    gap: 28,
    paddingBottom: 48,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionSubtext: {
    fontSize: 13,
    color: Colors.subtext,
    lineHeight: 18,
  },
  // Sound recorder
  soundCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  soundBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recordBtn: {
    flex: 1,
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  recordBtnText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  playBtn: {
    backgroundColor: Colors.inputBg,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  playBtnText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  deleteAudioBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: Colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  deleteAudioBtnText: {
    color: Colors.subtext,
    fontSize: 14,
  },
  recordingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recordingIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.accent,
  },
  countdownText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  stopBtn: {
    backgroundColor: Colors.inputBg,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  stopBtnText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  // Data
  statsRow: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 20,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.cardBorder,
    marginVertical: 4,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 13,
    color: Colors.subtext,
  },
  dangerBtn: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  dangerBtnText: {
    color: Colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
  // About
  aboutCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  aboutName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  aboutDesc: {
    fontSize: 14,
    color: Colors.subtext,
    lineHeight: 20,
  },
  aboutNote: {
    fontSize: 12,
    color: Colors.subtext,
    opacity: 0.7,
    marginTop: 4,
  },
})
