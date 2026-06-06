import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native'
import { router } from 'expo-router'
import { Colors } from '../../constants/colors'

const STEPS = [
  { icon: '📍', title: 'Pick a spot', desc: 'Choose a location in your home and snap a reference photo.' },
  { icon: '⏰', title: 'Set an alarm', desc: 'Schedule alarms like normal — time and days of the week.' },
  { icon: '🚶', title: 'Prove it', desc: 'When it rings, walk to your spot and take a matching photo.' },
  { icon: '✅', title: 'Verified & dismissed', desc: 'Claude Vision confirms your location. Alarm dismissed.' },
]

export default function OnboardingScreen() {
  const handleStart = () => {
    router.replace('/(tabs)/locations')
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>⏰</Text>
          <Text style={styles.heroTitle}>WEAKY</Text>
          <Text style={styles.heroTagline}>
            An alarm that won't stop until you prove you're where you need to be.
          </Text>
        </View>

        <View style={styles.steps}>
          {STEPS.map((step, i) => (
            <View key={i} style={styles.step}>
              <View style={styles.stepIconBox}>
                <Text style={styles.stepIcon}>{step.icon}</Text>
              </View>
              <View style={styles.stepText}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerNote}>
            Start by adding at least 2 locations — the alarm picks one randomly each morning.
          </Text>
          <TouchableOpacity style={styles.cta} onPress={handleStart}>
            <Text style={styles.ctaText}>Add my first location →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  hero: {
    alignItems: 'center',
    gap: 12,
    paddingBottom: 8,
  },
  heroIcon: {
    fontSize: 56,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -1,
  },
  heroTagline: {
    fontSize: 16,
    color: Colors.subtext,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  steps: {
    gap: 20,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  stepIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    flexShrink: 0,
  },
  stepIcon: {
    fontSize: 22,
  },
  stepText: {
    flex: 1,
    gap: 2,
    paddingTop: 4,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  stepDesc: {
    fontSize: 14,
    color: Colors.subtext,
    lineHeight: 19,
  },
  footer: {
    gap: 16,
  },
  footerNote: {
    fontSize: 13,
    color: Colors.subtext,
    textAlign: 'center',
    lineHeight: 18,
  },
  cta: {
    backgroundColor: Colors.accent,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaText: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
})
