import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Alert,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native'
import { useState, useRef, useCallback } from 'react'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useLocationStore, type Location } from '../../stores/locationStore'
import { Colors } from '../../constants/colors'

const { width: SCREEN_W } = Dimensions.get('window')

type LocationCardProps = {
  location: Location
  onDelete: (location: Location) => void
}

function LocationCard({ location, onDelete }: LocationCardProps) {
  return (
    <View style={styles.card}>
      <Image source={{ uri: location.referencePhotoUri }} style={styles.thumbnail} />
      <View style={styles.cardInfo}>
        <Text style={styles.locationName} numberOfLines={1}>
          {location.name}
        </Text>
        <Text style={styles.locationMeta}>
          {new Date(location.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => onDelete(location)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.deleteIcon}>✕</Text>
      </TouchableOpacity>
    </View>
  )
}

type Step = 'form' | 'camera' | 'preview'

type AddLocationModalProps = {
  visible: boolean
  onClose: () => void
  onSave: (name: string, photoUri: string) => Promise<void>
}

function AddLocationModal({ visible, onClose, onSave }: AddLocationModalProps) {
  const [step, setStep] = useState<Step>('form')
  const [name, setName] = useState('')
  const [capturedUri, setCapturedUri] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [permission, requestPermission] = useCameraPermissions()
  const cameraRef = useRef<CameraView>(null)

  const reset = () => {
    setStep('form')
    setName('')
    setCapturedUri(null)
    setSaving(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const openCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission()
      if (!result.granted) {
        Alert.alert('Camera required', 'Enable camera access in Settings to take reference photos.')
        return
      }
    }
    setStep('camera')
  }

  const takePicture = async () => {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.85 })
    if (photo) {
      setCapturedUri(photo.uri)
      setStep('preview')
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Give this location a name (e.g. "Kitchen").')
      return
    }
    if (!capturedUri) return
    setSaving(true)
    try {
      await onSave(name.trim(), capturedUri)
      reset()
    } catch (e) {
      Alert.alert('Error', 'Failed to save location. Try again.')
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        {step === 'form' && (
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Location</Text>
              <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Location name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Kitchen, Balcony…"
                placeholderTextColor={Colors.subtext}
                value={name}
                onChangeText={setName}
                maxLength={40}
                returnKeyType="done"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Reference photo</Text>
              {capturedUri ? (
                <View style={styles.previewSmall}>
                  <Image source={{ uri: capturedUri }} style={styles.previewSmallImg} />
                  <TouchableOpacity style={styles.retakeBtn} onPress={openCamera}>
                    <Text style={styles.retakeBtnText}>Retake</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.photoBtn} onPress={openCamera}>
                  <Text style={styles.photoBtnIcon}>📷</Text>
                  <Text style={styles.photoBtnText}>Take photo</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, (!name.trim() || !capturedUri || saving) && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!name.trim() || !capturedUri || saving}
            >
              {saving ? (
                <ActivityIndicator color={Colors.text} />
              ) : (
                <Text style={styles.saveBtnText}>Save Location</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {step === 'camera' && (
          <View style={styles.cameraContainer}>
            <CameraView ref={cameraRef} style={styles.camera} facing="back" />
            <View style={styles.cameraControls}>
              <TouchableOpacity
                style={styles.cameraBackBtn}
                onPress={() => setStep('form')}
              >
                <Text style={styles.cameraBackText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
                <View style={styles.captureBtnInner} />
              </TouchableOpacity>
              <View style={{ width: 64 }} />
            </View>
          </View>
        )}

        {step === 'preview' && capturedUri && (
          <View style={styles.previewContainer}>
            <Image source={{ uri: capturedUri }} style={styles.previewFull} resizeMode="cover" />
            <View style={styles.previewActions}>
              <TouchableOpacity style={styles.previewRetake} onPress={() => setStep('camera')}>
                <Text style={styles.previewRetakeText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.previewUse} onPress={() => setStep('form')}>
                <Text style={styles.previewUseText}>Use photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  )
}

export default function LocationsScreen() {
  const { locations, addLocation, deleteLocation } = useLocationStore()
  const [showModal, setShowModal] = useState(false)

  const handleDelete = useCallback(
    (location: Location) => {
      Alert.alert('Delete Location', `Delete "${location.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteLocation(location.id),
        },
      ])
    },
    [deleteLocation]
  )

  const handleSave = useCallback(
    async (name: string, photoUri: string) => {
      await addLocation(name, photoUri)
      setShowModal(false)
    },
    [addLocation]
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Locations</Text>
          {locations.length < 2 && (
            <Text style={styles.headerSubtext}>Add at least 2 to use alarms</Text>
          )}
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {locations.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📍</Text>
          <Text style={styles.emptyTitle}>No locations</Text>
          <Text style={styles.emptySubtext}>Add a spot in your home to verify against</Text>
        </View>
      ) : (
        <FlatList
          data={locations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <LocationCard location={item} onDelete={handleDelete} />
          )}
        />
      )}

      <AddLocationModal
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
    alignItems: 'flex-start',
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
  headerSubtext: {
    fontSize: 12,
    color: Colors.accent,
    marginTop: 2,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
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
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  thumbnail: {
    width: 70,
    height: 70,
    backgroundColor: '#222',
  },
  cardInfo: {
    flex: 1,
    paddingHorizontal: 14,
    gap: 4,
  },
  locationName: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  locationMeta: {
    fontSize: 12,
    color: Colors.subtext,
  },
  deleteBtn: {
    padding: 16,
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
    textAlign: 'center',
    paddingHorizontal: 40,
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
    gap: 20,
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
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.inputBg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  photoBtn: {
    backgroundColor: Colors.inputBg,
    borderRadius: 10,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderStyle: 'dashed',
  },
  photoBtnIcon: {
    fontSize: 28,
  },
  photoBtnText: {
    fontSize: 15,
    color: Colors.subtext,
  },
  previewSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.inputBg,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  previewSmallImg: {
    width: 56,
    height: 56,
    borderRadius: 6,
    backgroundColor: '#222',
  },
  retakeBtn: {
    flex: 1,
  },
  retakeBtnText: {
    color: Colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  // Camera step
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 60,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cameraBackBtn: {
    width: 64,
  },
  cameraBackText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: Colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.text,
  },
  // Preview step
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewFull: {
    flex: 1,
    width: SCREEN_W,
  },
  previewActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingBottom: 60,
    paddingHorizontal: 32,
    gap: 16,
  },
  previewRetake: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.text,
  },
  previewRetakeText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  previewUse: {
    flex: 1,
    backgroundColor: Colors.accent,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  previewUseText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
})
