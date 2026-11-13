// Speech output shared by the side panel and the content script.
//
// Two rules, both from the SAFINUM test protocol and the cahier des charges:
// 1. Never send displayed text to an online voice. Chrome's "Google …"
//    voices synthesize server-side, so only voices with `localService` are
//    used — if none is installed, Edima stays silent rather than leak.
// 2. Never read Duala/Ewondo text with a French voice (it comes out as
//    gibberish). Callers pass the French original; a native-language MP3 is
//    played instead when one exists (see audio-clips.ts).

let cachedVoice: SpeechSynthesisVoice | null | undefined;

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === 'undefined') return null;
  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return null; // not loaded yet — don't cache
  const local = voices.filter((v) => v.localService);
  cachedVoice =
    local.find((v) => v.lang.toLowerCase() === 'fr-fr') ??
    local.find((v) => v.lang.toLowerCase().startsWith('fr')) ??
    null;
  return cachedVoice;
}

if (typeof speechSynthesis !== 'undefined') {
  speechSynthesis.addEventListener?.('voiceschanged', () => {
    cachedVoice = undefined;
  });
}

export function localFrenchVoice(): SpeechSynthesisVoice | null {
  return cachedVoice === undefined ? pickVoice() : cachedVoice;
}

export interface SpeakOptions {
  rate?: number;
  onStart?: () => void;
  onEnd?: () => void;
}

/** Speaks French text with an on-device voice. Returns false (and says
 * nothing) when no local French voice is installed. */
export function speakFrenchLocally(text: string, { rate = 1, onStart, onEnd }: SpeakOptions = {}): boolean {
  if (!text || typeof speechSynthesis === 'undefined') return false;
  const voice = localFrenchVoice();
  if (!voice) {
    console.warn('[Edima] Aucune voix française locale : lecture désactivée pour ne rien envoyer en ligne.');
    return false;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = rate;
  if (onStart) utterance.onstart = onStart;
  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
  return true;
}
