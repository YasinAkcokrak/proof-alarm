# Features

## MVP Scope

### 1. Onboarding
- First launch detects no locations saved → triggers onboarding
- User adds minimum 2 locations to proceed
- Each location: name + reference photo via camera or gallery
- Reference photo saved locally

### 2. Location Management
- Add location (name + photo)
- View all locations with thumbnail
- Delete location
- Edit location name or re-take reference photo
- Minimum 2 locations enforced (need randomness)

### 3. Alarm Management
- Create alarm (time picker + day selector)
- Toggle alarm on/off
- Delete alarm
- List view with next trigger time shown
- Multiple alarms supported

### 4. Alarm Trigger Flow
```
Notification fires
  → App opens to verify screen
  → Random location selected from saved list
  → Location name shown: "Go to: Kitchen"
  → Camera opens
  → User takes photo
  → AI verifies (Claude Vision)
    → match + confidence ≥ 0.75 → PASS → alarm dismissed
    → no match or low confidence → FAIL → try again (max 3 attempts)
    → 3 fails → show hint (reference photo thumbnail)
```

### 5. Verification Screen
- Shows target location name (large, clear)
- Shows reference photo thumbnail as hint (hidden by default, revealed after 2 fails)
- Camera viewfinder
- Capture button
- Loading state while AI processes
- Pass/fail feedback with reason from Claude

### 6. Settings
- API key input (Claude) — stored in SecureStore
- Default attempts count (1-5)
- Show/hide hint toggle
- Clear all data

---

## Post-MVP Ideas

- Streak tracking ("7 days in a row")
- Multiple location modes: single fixed, random daily, rotating schedule
- Difficulty levels (easy = kitchen, hard = outside front door)
- Widget for home screen showing streak
- Haptic feedback on pass/fail
- Dark mode (default) / light mode toggle
- iCloud backup for locations
- Share streak to social
