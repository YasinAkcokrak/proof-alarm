# CLAUDE.md — Proof Alarm

## Project Summary
React Native / Expo mobile app. Alarm that won't dismiss until user walks to a specific home location and takes a photo. Claude Vision API verifies the photo matches the registered reference.

## Stack
- Expo SDK 54, Expo Router (file-based routing)
- React Native
- Zustand + AsyncStorage (persisted stores)
- Expo Camera, Expo Notifications, Expo FileSystem, Expo SecureStore
- Claude Vision API (claude-sonnet-4-20250514) for photo verification
- EAS Build for distribution (iOS + Android)
- TypeScript throughout

## Key Conventions
- Expo Router: screens in `app/` directory
- Components in `components/` — keep them dumb, logic in stores/services
- Zustand stores in `stores/` — always persist with AsyncStorage middleware
- Claude API calls only in `services/claude.ts` — nowhere else
- Reference photos stored at `FileSystem.documentDirectory + 'locations/'`
- No backend, no auth, fully local-first
- API key stored in SecureStore, never hardcoded

## Data Models

```ts
type Location = {
  id: string
  name: string
  referencePhotoUri: string
  createdAt: number
}

type Alarm = {
  id: string
  time: string        // "07:30"
  days: number[]      // 0=Sun, 1=Mon ... 6=Sat
  enabled: boolean
  createdAt: number
}

type VerificationResult = {
  match: boolean
  confidence: number
  reason: string
}
```

## Claude Vision — Verification Prompt
```
You are verifying if two photos show the same location in a home.
Compare the reference photo and the current photo.
Respond ONLY with valid JSON, no markdown, no explanation:
{ "match": true/false, "confidence": 0.0-1.0, "reason": "one sentence max" }
```

- Always resize images to 512x512 before sending (use expo-image-manipulator)
- Confidence threshold: 0.75 to pass
- Model: claude-sonnet-4-20250514
- Max tokens: 100 (response is tiny JSON)

## Notification Setup
- Use `expo-notifications` scheduleNotificationAsync
- On notification received → navigate to `/alarm/verify`
- iOS: request critical alert entitlement for alarm sound
- Android: create high-priority notification channel

## File Structure
```
app/
  (tabs)/
    index.tsx         # Alarm list (home tab)
    locations.tsx     # Manage locations tab
    settings.tsx      # Settings tab
  alarm/
    verify.tsx        # Active alarm verification screen
  onboarding/
    index.tsx         # First-time setup
  _layout.tsx

components/
  AlarmCard.tsx
  LocationCard.tsx
  CameraView.tsx
  VerificationFeedback.tsx

services/
  claude.ts           # Vision API + image resize logic

stores/
  alarmStore.ts
  locationStore.ts

assets/
```

## Dev Notes
- Development: Expo Go (camera + AI works, notifications limited)
- Production: EAS Build required for full notification support
- Apple Developer Account needed for iOS push notifications
- Test alarm verification in Expo Go first before EAS build
