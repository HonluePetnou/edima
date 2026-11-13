// Native-language audio clips (MP3) shipped inside the extension under
// public/audio/<lang>/. Each manifest maps a French source text (the same
// key the glossary uses) to a clip that says its translation aloud.
//
// Clips are played from the side panel only: it's an extension page, so no
// bank CSP applies and nothing is fetched from the network.

import type { LanguageCode } from './messages';

export interface ClipManifest {
  /** How the clips were produced — shown in the transparency screen. */
  source: 'enregistrement' | 'synthese';
  generator?: string;
  clips: Record<string, string>;
}

export function normalizeClipKey(text: string): string {
  return text
    .normalize('NFC')
    .trim()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

const manifests = new Map<LanguageCode, Promise<ClipManifest | null>>();

export function loadClipManifest(language: LanguageCode): Promise<ClipManifest | null> {
  let pending = manifests.get(language);
  if (!pending) {
    pending = fetch(`/audio/${language}/manifest.json`)
      .then((res) => (res.ok ? (res.json() as Promise<ClipManifest>) : null))
      .then((m) => {
        if (!m) return null;
        const clips: Record<string, string> = {};
        for (const [key, file] of Object.entries(m.clips)) clips[normalizeClipKey(key)] = file;
        return { ...m, clips };
      })
      .catch(() => null);
    manifests.set(language, pending);
  }
  return pending;
}

/** URL of the clip for this French text, or null. */
export function clipUrl(manifest: ClipManifest | null, language: LanguageCode, frenchText: string): string | null {
  const file = manifest?.clips[normalizeClipKey(frenchText)];
  return file ? `/audio/${language}/${file}` : null;
}
