# Architecture

## Overview

Proof Alarm is fully local-first. No backend, no server, no database. Everything lives on the device except the AI verification call.

```
Device (AsyncStorage)
  ├── Alarms []
  └── Locations [] + reference photos (FileSystem)

Runtime
  ├── Zustand stores (in-memory)
  └── Expo Notifications (scheduled)

External
  └── Claude Vision API (verification only)
```

---

## Data Models

### Location
```ts
type Location = {
  id: string
  name: string          // "Kitchen", "Balcony", etc.
  referencePhotoUri: string  // local file path
  createdAt: number
}
```

### Alarm
```ts
type Alarm = {
  id: string
  time: string          // "07:30"
  days: number[]        // [1,2,3,4,5] = Mon-Fri
  enabled: boolean
  createdAt: number
}
```

### VerificationResult
```ts
type VerificationResult = {
  match: boolean
  confidence: number    // 0-1
  reason: string        // short explanation from Claude
}
```

---

## AI Verification Flow

Token usage is kept minimal by design.

1. Resize both images to **512x512** before sending
2. Convert to base64
3. Single API call with both images
4. Prompt returns only JSON: `{ match: boolean, confidence: number, reason: string }`
5. If confidence < 0.75 → reject, let user retry

**Prompt template:**
```
You are verifying if two photos show the same location in a home.
Reference photo: [image]
Current photo: [image]

Respond ONLY with JSON: { "match": true/false, "confidence": 0.0-1.0, "reason": "one sentence" }
```

---

## Notification Strategy

- Alarms are scheduled via `expo-notifications` using `scheduleNotificationAsync`
- On notification tap → app opens → navigate to `alarm/verify` screen
- Background notification handling wakes the app even if closed
- Alarm sound plays via notification channel (Android) / critical alert (iOS)

---

## State Management

Two Zustand stores, both persisted with AsyncStorage via `zustand/middleware`:

- **alarmStore** — CRUD for alarms, next alarm calculation
- **locationStore** — CRUD for locations, reference photo management

---

## Folder Decisions

- Reference photos saved to `FileSystem.documentDirectory/locations/` — survives app updates
- No cloud sync in MVP — photos stay local
- No auth — single user app
