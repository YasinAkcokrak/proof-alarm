import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
  Dimensions,
  Vibration,
} from 'react-native'
import { useState, useEffect, useRef, useCallback } from 'react'
import { router } from 'expo-router'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { Audio } from 'expo-av'
import { useLocationStore, type Location } from '../../stores/locationStore'
import { verifyLocation, type VerificationResult } from '../../services/claude'
import { Colors } from '../../constants/colors'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')
const MAX_ATTEMPTS = 3

type Phase = 'camera' | 'processing' | 'result'

export default function VerifyScreen() {
  const { getRandomLocation } = useLocationStore()

  const [permission, requestPermission] = useCameraPermissions()
  const [target, setTarget] = useState<Location | null>(null)
  const [phase, setPhase] = useState<Phase>('camera')
  const [attempts, setAttempts] = useState(0)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [showHint, setShowHint] = useState(false)
  const cameraRef = useRef<CameraView>(null)
  const soundRef = useRef<Audio.Sound | null>(null)

  const stopAndUnload = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync().catch(() => {})
      await soundRef.current.unloadAsync().catch(() => {})
      soundRef.current = null
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadAndPlay() {
      console.log('[Audio] loadAndPlay start')
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/alarm.wav'),
          { isLooping: true, shouldPlay: true }
        )
        console.log('[Audio] createAsync succeeded')
        if (cancelled) {
          console.log('[Audio] cancelled after load, unloading')
          await sound.unloadAsync().catch(() => {})
          return
        }
        soundRef.current = sound
        const status = await sound.getStatusAsync()
        console.log('[Audio] status after createAsync:', JSON.stringify(status))
      } catch (e) {
        console.error('[Audio] loadAndPlay error:', e)
      }
    }
    loadAndPlay()
    return () => {
      cancelled = true
      stopAndUnload()
    }
  }, [stopAndUnload])

  useEffect(() => {
    const loc = getRandomLocation()
    if (!loc) {
      Alert.alert(
        'No locations',
        'Add at least one location before using alarms.',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)/locations') }]
      )
      return
    }
    setTarget(loc)
  }, [getRandomLocation])

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission()
    }
  }, [permission, requestPermission])

  const handleCapture = useCallback(async () => {
    if (phase !== 'camera' || !target) return

    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.85 })
    if (!photo) return

    setPhase('processing')

    try {
      const res = await verifyLocation(target.referencePhotoUri, photo.uri)
      setResult(res)
      setPhase('result')

      if (res.match) {
        await stopAndUnload()
        Vibration.vibrate([0, 100, 50, 100])
      } else {
        Vibration.vibrate(400)
        const newAttempts = attempts + 1
        setAttempts(newAttempts)
        if (newAttempts >= MAX_ATTEMPTS - 1) {
          setShowHint(true)
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification failed.'
      Alert.alert('Error', msg, [{ text: 'Retry', onPress: () => setPhase('camera') }])
    }
  }, [phase, target, attempts])

  const handleRetry = () => {
    setResult(null)
    setPhase('camera')
  }

  const handleDismiss = () => {
    stopAndUnload()
    router.replace('/(tabs)')
  }

  if (!permission?.granted) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.permissionText}>Camera access required to verify your location.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryBtnText}>Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (!target) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Camera fills the screen */}
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />

      {/* Top overlay — target location */}
      <View style={styles.topOverlay}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => { stopAndUnload(); router.back() }}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.goToLabel}>Go to</Text>
        <Text style={styles.locationName}>{target.name}</Text>
        <Text style={styles.attemptsLabel}>
          {attempts > 0 ? `${attempts} failed attempt${attempts > 1 ? 's' : ''}` : 'Take a photo to verify'}
        </Text>
      </View>

      {/* Hint — reference photo, revealed after MAX_ATTEMPTS - 1 fails */}
      {showHint && (
        <View style={styles.hintContainer}>
          <Text style={styles.hintLabel}>Reference photo</Text>
          <Image
            source={{ uri: target.referencePhotoUri }}
            style={styles.hintImage}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Bottom — capture button */}
      {phase === 'camera' && (
        <View style={styles.bottomOverlay}>
          <TouchableOpacity style={styles.captureBtn} onPress={handleCapture} activeOpacity={0.8}>
            <View style={styles.captureBtnInner} />
          </TouchableOpacity>
        </View>
      )}

      {/* Processing overlay */}
      {phase === 'processing' && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator color={Colors.text} size="large" />
          <Text style={styles.processingText}>Verifying with Claude…</Text>
        </View>
      )}

      {/* Result overlay */}
      {phase === 'result' && result && (
        <View style={[styles.resultOverlay, result.match ? styles.resultPass : styles.resultFail]}>
          <Text style={styles.resultIcon}>{result.match ? '✓' : '✗'}</Text>
          <Text style={styles.resultTitle}>{result.match ? 'Verified!' : 'No match'}</Text>
          <Text style={styles.resultReason}>{result.reason}</Text>
          <Text style={styles.resultConfidence}>
            {Math.round(result.confidence * 100)}% confidence
          </Text>

          {result.match ? (
            <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss}>
              <Text style={styles.dismissBtnText}>Dismiss Alarm</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.retryRow}>
              {!showHint && (
                <TouchableOpacity style={styles.hintBtn} onPress={() => setShowHint(true)}>
                  <Text style={styles.hintBtnText}>Show hint</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
                <Text style={styles.retryBtnText}>Try again</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 20,
  },
  permissionText: {
    color: Colors.subtext,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  primaryBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  primaryBtnText: {
    color: Colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  // Top overlay
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    gap: 4,
  },
  closeBtn: {
    position: 'absolute',
    top: 56,
    left: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  goToLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  locationName: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  attemptsLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  // Hint
  hintContainer: {
    position: 'absolute',
    top: 180,
    right: 16,
    width: 100,
    gap: 4,
    alignItems: 'center',
  },
  hintLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hintImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  // Bottom capture
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 60,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingTop: 20,
  },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: Colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.text,
  },
  // Processing overlay
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  processingText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  // Result overlay
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  resultPass: {
    backgroundColor: 'rgba(5, 30, 15, 0.92)',
  },
  resultFail: {
    backgroundColor: 'rgba(30, 5, 5, 0.92)',
  },
  resultIcon: {
    fontSize: 72,
    color: Colors.text,
    marginBottom: 4,
  },
  resultTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  resultReason: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: SCREEN_W - 80,
  },
  resultConfidence: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 8,
  },
  dismissBtn: {
    backgroundColor: Colors.success,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 48,
    marginTop: 8,
  },
  dismissBtnText: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  retryRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  hintBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  hintBtnText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    fontWeight: '600',
  },
  retryBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  retryBtnText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
})
