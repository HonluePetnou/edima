// User preferences shared by the side panel and the content script. Stored in
// chrome.storage.local, which content scripts can read directly.

export interface EdimaSettings {
  /** Show the floating mascot on detected financial pages. */
  showMascot: boolean;
  /** null = follow the system's light/dark preference. */
  theme: 'light' | 'dark' | null;
  rateIndex: number;
}

export const DEFAULT_SETTINGS: EdimaSettings = { showMascot: true, theme: null, rateIndex: 0 };
const KEY = 'edimaSettings';

const hasStorage = () => typeof chrome !== 'undefined' && !!chrome.storage?.local;

export async function loadSettings(): Promise<EdimaSettings> {
  if (!hasStorage()) return DEFAULT_SETTINGS;
  const stored = (await chrome.storage.local.get(KEY))[KEY] as Partial<EdimaSettings> | undefined;
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(patch: Partial<EdimaSettings>): Promise<EdimaSettings> {
  const next = { ...(await loadSettings()), ...patch };
  if (hasStorage()) await chrome.storage.local.set({ [KEY]: next });
  return next;
}

export function onSettingsChanged(cb: (s: EdimaSettings) => void): () => void {
  if (!hasStorage()) return () => {};
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === 'local' && changes[KEY]) cb({ ...DEFAULT_SETTINGS, ...(changes[KEY].newValue as Partial<EdimaSettings>) });
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
