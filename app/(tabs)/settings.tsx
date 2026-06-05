import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  ScrollView,
} from 'react-native'
import { useAlarmStore } from '../../stores/alarmStore'
import { useLocationStore } from '../../stores/locationStore'
import { cancelAlarm } from '../../services/notifications'
import { Colors } from '../../constants/colors'

export default function SettingsScreen() {
  const alarms = useAlarmStore((s) => s.alarms)
  const deleteAllAlarms = useAlarmStore((s) => s.deleteAlarm)
  const locations = useLocationStore((s) => s.locations)
  const deleteLocation = useLocationStore((s) => s.deleteLocation)

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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.aboutCard}>
            <Text style={styles.aboutName}>Proof Alarm</Text>
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
