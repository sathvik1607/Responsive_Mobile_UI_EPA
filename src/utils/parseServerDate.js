// Backend timestamps are stored as UTC but returned without timezone info
// (e.g. "2026-06-16 14:40:00" or "2026-06-16T14:40:00").
// new Date() in Chrome/V8 parses these as LOCAL time, causing a 5h30m offset in IST.
// Always treat backend timestamps as UTC by appending Z.
export function parseServerDate(str) {
  if (!str) return new Date(NaN)
  const s = String(str).trim()
  // Already has explicit timezone — leave as-is
  if (s.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(s)) return new Date(s)
  // Convert "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DDTHH:MM:SS" → UTC
  return new Date(s.replace(' ', 'T') + 'Z')
}
