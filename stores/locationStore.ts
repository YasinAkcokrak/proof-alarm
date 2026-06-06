import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { File, Directory, Paths } from 'expo-file-system'

export type Location = {
  id: string
  name: string
  referencePhotoUri: string
  createdAt: number
}

type LocationStore = {
  locations: Location[]
  addLocation: (name: string, photoUri: string) => Promise<Location>
  updateLocation: (id: string, updates: Partial<Pick<Location, 'name' | 'referencePhotoUri'>>) => Promise<void>
  deleteLocation: (id: string) => Promise<void>
  getRandomLocation: () => Location | null
  getLocationById: (id: string) => Location | undefined
}

function locationsDir(): Directory {
  return new Directory(Paths.document, 'locations')
}

function locationFile(id: string): File {
  return new File(locationsDir(), id + '.jpg')
}

function ensureLocationsDir(): void {
  const dir = locationsDir()
  if (!dir.exists) {
    dir.create({ intermediates: true })
  }
}

function savePhotoLocally(sourceUri: string, id: string): string {
  ensureLocationsDir()
  const dest = locationFile(id)
  const source = new File(sourceUri)
  source.copy(dest)
  return dest.uri
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export const useLocationStore = create<LocationStore>()(
  persist(
    (set, get) => ({
      locations: [],

      addLocation: async (name, photoUri) => {
        const id = generateId()
        const storedUri = savePhotoLocally(photoUri, id)
        const newLocation: Location = {
          id,
          name,
          referencePhotoUri: storedUri,
          createdAt: Date.now(),
        }
        set((state) => ({ locations: [...state.locations, newLocation] }))
        return newLocation
      },

      updateLocation: async (id, updates) => {
        const { locations } = get()
        const existing = locations.find((l) => l.id === id)
        if (!existing) return

        let storedUri = existing.referencePhotoUri
        if (updates.referencePhotoUri && updates.referencePhotoUri !== existing.referencePhotoUri) {
          try {
            const oldFile = new File(existing.referencePhotoUri)
            if (oldFile.exists) oldFile.delete()
          } catch {}
          storedUri = savePhotoLocally(updates.referencePhotoUri, id)
        }

        set((state) => ({
          locations: state.locations.map((l) =>
            l.id === id
              ? { ...l, ...updates, referencePhotoUri: storedUri }
              : l
          ),
        }))
      },

      deleteLocation: async (id) => {
        const { locations } = get()
        const location = locations.find((l) => l.id === id)
        if (location) {
          try {
            const file = new File(location.referencePhotoUri)
            if (file.exists) file.delete()
          } catch {}
        }
        set((state) => ({
          locations: state.locations.filter((l) => l.id !== id),
        }))
      },

      getRandomLocation: () => {
        const { locations } = get()
        if (locations.length === 0) return null
        return locations[Math.floor(Math.random() * locations.length)]
      },

      getLocationById: (id) => {
        return get().locations.find((l) => l.id === id)
      },
    }),
    {
      name: 'location-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
