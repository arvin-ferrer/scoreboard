// Defaults for shared/settings.json. The server sends the file; anything missing falls back here.
export const DEFAULT_SETTINGS = {
  timerPresetsMinutes: [1, 5, 10, 15, 20, 30],
  recentEntries: 3,
  undoToastSeconds: 6,
  cardColumns: 4,
  buttonHeightPx: 56,
  customPadMaxPoints: 1000,
  customLabel: 'Custom',
  ackTimeoutMs: 4000,
  musicHoldSeconds: 10,
  musicCrossfadeSeconds: 2,
  texts: {
    offline: 'Offline. Your entries are saved and will send when the connection returns.',
    sending: 'Sending…',
    pickChamber: 'Tap a chamber first',
    noScoring: 'No scoring this round',
    unsent: 'not sent yet',
  },
};

export function withDefaults(settings = {}) {
  return { ...DEFAULT_SETTINGS, ...settings, texts: { ...DEFAULT_SETTINGS.texts, ...(settings.texts ?? {}) } };
}

export const fmtPoints = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');
