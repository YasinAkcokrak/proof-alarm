# Proof Alarm

A mobile alarm app that forces you out of bed by requiring a photo proof from a specific location in your home.

## How It Works

1. **Setup** — Walk around your home and register locations (kitchen, balcony, front door, etc.) with a reference photo
2. **Set Alarm** — Choose time and days
3. **Wake Up** — Alarm fires, app randomly picks one of your registered locations
4. **Prove It** — Walk there, take a photo, AI verifies you're in the right spot
5. **Done** — Alarm dismissed. No snooze. No shortcuts.

## Tech Stack

- React Native / Expo (SDK 54)
- Expo Camera
- Expo Notifications
- Zustand (local state)
- AsyncStorage (persistence)
- Claude Vision API (location verification)
- EAS Build (distribution)

## Getting Started

```bash
git clone https://github.com/yourusername/proof-alarm
cd proof-alarm
npm install
npx expo start
```

## Project Structure

```
proof-alarm/
├── app/                  # Expo Router screens
│   ├── (tabs)/
│   │   ├── index.tsx     # Alarm list
│   │   ├── locations.tsx # Manage home locations
│   │   └── settings.tsx  # App settings
│   ├── alarm/
│   │   └── verify.tsx    # Active alarm + camera screen
│   └── onboarding/
│       └── index.tsx     # First-time setup
├── components/           # Reusable UI components
├── services/
│   └── claude.ts         # Claude Vision API integration
├── stores/
│   ├── alarmStore.ts     # Alarm state (Zustand)
│   └── locationStore.ts  # Saved locations (Zustand)
└── assets/
    └── locations/        # Reference photos (local filesystem)
```
