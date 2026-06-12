# Notification Sounds

Place two audio files here:

| File | Used for |
|------|----------|
| `notify.mp3` | Low / medium / high priority reminders |
| `critical.mp3` | Critical priority reminders (also repeats if repeatAlerts is on) |

If the files are missing the app falls back to Web Audio API synthesis automatically —
no silence, no crashes.

## Recommended specs
- Format: MP3, ≤ 200 KB
- Duration: 1–3 seconds
- Level: -12 dBFS or lower (the app scales volume per priority)
