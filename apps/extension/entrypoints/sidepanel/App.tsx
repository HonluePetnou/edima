import { useEffect, useRef, useState } from 'preact/hooks';
import { summarizePage } from '../../utils/summarize';
import { formatRecapSummary } from '../../utils/recap';
import { loadSettings, saveSettings, DEFAULT_SETTINGS, type EdimaSettings } from '../../utils/settings';
import { speakFrenchLocally } from '../../utils/speech';
import { fillTemplate, matchTemplatePhrase } from 'edima-shared';
import { clipUrl, loadClipManifest, type ClipManifest } from '../../utils/audio-clips';
import { Header, SPEECH_RATES } from '../../components/panel/Header';
import { AlertBanner } from '../../components/panel/Blocks';
import { HomeView, ReadView, LinesView, GuideView, SafetyView, TransparencyView, SettingsView, PanelFooter, type View, type ViewContext } from './views';
import { LoadingState, NoBankPageState, UnsupportedState } from './states';
import type { MascotState } from '../../components/ui/Mascot';
import { DEV_SCENARIOS, type DevScenarioKey } from '../../utils/devMocks';
import type { FieldDescription, LanguageCode, PageTranslatedMessage, TranslateUnknownResponse, TranslatedLine } from '../../utils/messages';
import type { RecapInfo } from '../../utils/recap';
import type { StepInfo } from '../../utils/journey';
import type { ConsistencyInfo } from '../../utils/consistency';

// The panel's own source of truth is whatever the content script reports —
// never assumed from `chrome` alone, since this file also renders as a
// plain page in dev (see the scenario switcher at the bottom of this file).
const hasExtensionContext = typeof chrome !== 'undefined' && !!chrome.runtime?.id;

export default function App() {
  const [lines, setLines] = useState<TranslatedLine[] | null>(null);
  const [language, setLanguageState] = useState<LanguageCode>('dua');
  const [buttonLabels, setButtonLabels] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [step, setStep] = useState<StepInfo | null>(null);
  const [formFields, setFormFields] = useState<FieldDescription[]>([]);
  const [recap, setRecap] = useState<RecapInfo | null>(null);
  const [consistency, setConsistency] = useState<ConsistencyInfo | null>(null);
  const [loading, setLoading] = useState(hasExtensionContext);
  const [unsupported, setUnsupported] = useState(false);
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [settings, setSettings] = useState<EdimaSettings>(DEFAULT_SETTINGS);

  const [view, setView] = useState<View>('home');
  const [showAllOriginal, setShowAllOriginal] = useState(false);
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());
  const [expandedExplanations, setExpandedExplanations] = useState<Set<string>>(new Set());

  // D10 AI pass: translates an explanation's simple gloss + example, only
  // when the user turned on "Traduction IA (expérimentale)". Keyed by
  // language so switching EWO/DUA doesn't show a stale translation. `null`
  // means "tried, got nothing back" — stays in French without a badge,
  // same as never having tried.
  const [explanationTranslations, setExplanationTranslations] = useState<Record<string, { simple: string; example: string } | null>>({});
  const [explanationLoading, setExplanationLoading] = useState<Set<string>>(new Set());

  // Speech: one utterance at a time; `playingKey` says which item is being read.
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const rateRef = useRef(0);
  rateRef.current = settings.rateIndex;

  // Native-language clips for the current language (see utils/audio-clips.ts).
  const [clips, setClips] = useState<ClipManifest | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    loadClipManifest(language).then(setClips);
  }, [language]);

  /** `text` must be French (it's read by a French voice). `clipFor` is the
   * French source whose native-language clip, if any, plays instead. */
  const speak = (key: string, text: string, clipFor?: string) => {
    if (!text) return;
    const audio = audioRef.current;
    if (playingKey === key && !isPaused) {
      if (audio && !audio.paused) audio.pause();
      else if ('speechSynthesis' in window) speechSynthesis.pause();
      setIsPaused(true);
      return;
    }
    if (playingKey === key && isPaused) {
      if (audio && audio.src && audio.paused && audio.currentTime > 0) void audio.play();
      else if ('speechSynthesis' in window) speechSynthesis.resume();
      setIsPaused(false);
      return;
    }

    if ('speechSynthesis' in window) speechSynthesis.cancel();
    audio?.pause();
    const done = () => {
      setPlayingKey((current) => (current === key ? null : current));
      setIsPaused(false);
    };

    const url = clipFor ? clipUrl(clips, language, clipFor) : null;
    if (url) {
      const el = new Audio(url);
      el.playbackRate = SPEECH_RATES[rateRef.current] ?? 1;
      el.onended = done;
      el.onerror = done;
      audioRef.current = el;
      setPlayingKey(key);
      setIsPaused(false);
      void el.play().catch(done);
      return;
    }

    audioRef.current = null;
    speakFrenchLocally(text, {
      rate: SPEECH_RATES[rateRef.current] ?? 1,
      onStart: () => {
        setPlayingKey(key);
        setIsPaused(false);
      },
      onEnd: done,
    });
  };

  useEffect(() => {
    loadSettings().then(setSettings);
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme) root.dataset.theme = settings.theme;
    else delete root.dataset.theme;
  }, [settings.theme]);

  const updateSettings = (patch: Partial<EdimaSettings>) => {
    setSettings((s) => ({ ...s, ...patch }));
    saveSettings(patch);
  };

  // D10 AI pass (F-4): sends the (already French, static glossary) text to
  // the background's translate-explanation relay — the same local server
  // F9 uses, never a page value, so it needs no masking.
  function translateViaAi(text: string, lang: LanguageCode): Promise<string | null> {
    if (!hasExtensionContext) return Promise.resolve(null);
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'edima:translate-explanation', text, language: lang }, (response?: TranslateUnknownResponse) =>
        resolve(response?.translated ?? null),
      );
    });
  }

  useEffect(() => {
    if (!settings.aiEnabled || !hasExtensionContext) return;
    for (const original of expandedExplanations) {
      const cacheKey = `${language}:${original}`;
      if (cacheKey in explanationTranslations || explanationLoading.has(cacheKey)) continue;
      const line = lines?.find((l) => l.original === original);
      if (!line?.explanation) continue;

      setExplanationLoading((prev) => new Set(prev).add(cacheKey));
      const { simple, example } = line.explanation;
      Promise.all([translateViaAi(simple, language), translateViaAi(example, language)]).then(([tSimple, tExample]) => {
        setExplanationLoading((prev) => {
          const next = new Set(prev);
          next.delete(cacheKey);
          return next;
        });
        setExplanationTranslations((prev) => ({
          ...prev,
          [cacheKey]: tSimple && tExample ? { simple: tSimple, example: tExample } : null,
        }));
      });
    }
    // explanationTranslations/explanationLoading are read for their current
    // value, not watched — re-running this effect for their own updates
    // would just re-check the same (by-then-resolved) keys for nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedExplanations, settings.aiEnabled, language, lines]);

  useEffect(() => {
    if (!hasExtensionContext) return;
    let cancelled = false;

    // Lets the background hide the floating mascot while the panel is open.
    // Reconnects if the service worker restarts and drops the port.
    let port: chrome.runtime.Port | null = null;
    const connect = () => {
      port = chrome.runtime.connect({ name: 'edima-panel' });
      port.onDisconnect.addListener(() => {
        if (!cancelled) setTimeout(connect, 500);
      });
    };
    connect();

    const apply = (message: PageTranslatedMessage) => {
      if (cancelled) return;
      setLines(message.lines);
      setLanguageState(message.language);
      setButtonLabels(message.buttonLabels);
      setWarnings(message.warnings);
      setStep(message.step);
      setFormFields(message.formFields);
      setRecap(message.recap);
      setConsistency(message.consistency);
      setUnsupported(false);
    };

    async function requestCurrentState() {
      setLoading(true);
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) {
          if (!cancelled) setUnsupported(true);
          return;
        }
        const response: PageTranslatedMessage = await chrome.tabs.sendMessage(tab.id, { type: 'edima:request-state' });
        if (response) apply(response);
      } catch {
        // No content script on this tab (e.g. chrome:// page).
        if (!cancelled) setUnsupported(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    requestCurrentState();

    const onMessage = (message: PageTranslatedMessage) => {
      if (message.type === 'edima:page-translated') apply(message);
    };
    chrome.runtime.onMessage.addListener(onMessage);
    const onTabActivated = () => requestCurrentState();
    chrome.tabs.onActivated.addListener(onTabActivated);

    return () => {
      cancelled = true;
      port?.disconnect();
      chrome.runtime.onMessage.removeListener(onMessage);
      chrome.tabs.onActivated.removeListener(onTabActivated);
    };
  }, []);

  const changeLanguage = async (next: LanguageCode) => {
    setLanguageState(next); // optimistic — the content script's own report confirms it right after
    if (!hasExtensionContext) return;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    chrome.tabs.sendMessage(tab.id, { type: 'edima:set-language', language: next }).catch(() => {
      // No content script on this tab — nothing to switch.
    });
  };

  const toggleIn = (setter: typeof setExpandedLines) => (key: string) =>
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const mismatch = consistency?.status === 'mismatch' ? consistency.message : null;
  // D4 mismatch first, then the latest F7 warning — both stay visible.
  const alerts = [mismatch, warnings.length > 0 ? warnings[warnings.length - 1]! : null].filter((a): a is string => !!a);
  const priorityAlert = alerts[0] ?? null;
  // Alerts arrive as the page's French text; show the translation above it
  // when there is one, but never drop the original (SAFINUM: a translated
  // warning must not become weaker or ambiguous).
  const alertTranslation = (french: string) => lines?.find((l) => l.original === french && l.source !== 'original' && l.text !== french)?.text;

  // F6/D4: when a récap (or a mismatch) appears, jump to it once — the user
  // can still go back to the welcome screen afterwards.
  const needsGuide = !!recap || !!mismatch;
  useEffect(() => {
    if (needsGuide) setView('guide');
  }, [needsGuide]);
  const effectiveView = view;

  // Spoken by a French voice, so built from the French originals — never
  // from Duala/Ewondo text (see utils/speech.ts).
  const summary = lines ? summarizePage(lines.map((l) => ({ ...l, text: l.original })), buttonLabels) : '';
  // Shown on screen: each summary sentence that matches a (validated or
  // proposed) template phrase is displayed in the chosen language.
  const summaryDisplay = summary
    .split(/(?<=[.:])\s+/)
    .map((sentence) => {
      const match = matchTemplatePhrase(sentence, language);
      return match ? fillTemplate(match.template, match.values, language) : sentence;
    })
    .join(' ');
  const recapSummary = recap ? `${formatRecapSummary(recap)}${consistency ? ` ${consistency.message}` : ''}` : '';
  const formSpeech = step ? `${step.label}. ${formFields.map((f) => `${f.label} : ${f.description}`).join(' ')}` : '';

  // What the header's play button reads for the current screen.
  const primary: { key: string; text: string } | null =
    effectiveView === 'guide' && recap
      ? { key: 'recap-all', text: recapSummary }
      : effectiveView === 'guide' && formFields.length > 0
        ? { key: 'form-all', text: formSpeech }
        : lines && lines.length > 0
          ? { key: 'summary', text: summary }
          : null;

  const isPlaying = playingKey !== null && !isPaused;
  const handlePrimary = () => {
    if (playingKey) {
      speak(playingKey, '-'); // same key → pause/resume toggle
      return;
    }
    if (primary) speak(primary.key, primary.text);
  };

  const mascot: MascotState = isPlaying
    ? 'speaking'
    : isPaused
      ? 'paused'
      : priorityAlert
        ? 'alert'
        : loading
          ? 'thinking'
          : !online
            ? 'offline'
            : 'idle';

  const ctx: ViewContext = {
    lines: lines ?? [],
    step,
    formFields,
    recap,
    summary,
    summaryDisplay,
    online,
    settings,
    language,
    playingKey: isPaused ? null : playingKey,
    showAllOriginal,
    expandedLines,
    expandedExplanations,
    go: setView,
    speak,
    toggleOriginal: toggleIn(setExpandedLines),
    toggleExplanation: toggleIn(setExpandedExplanations),
    updateSettings,
    changeLanguage,
    explanationOverride: (original) => explanationTranslations[`${language}:${original}`] ?? null,
    explanationLoading: (original) => explanationLoading.has(`${language}:${original}`),
  };

  const showFooter = !loading && !unsupported && lines !== null && (effectiveView === 'read' || effectiveView === 'lines' || effectiveView === 'guide');

  return (
    <div class="panel">
      <Header
        mascot={mascot}
        speaking={isPlaying}
        language={language}
        onChangeLanguage={changeLanguage}
        rateIndex={settings.rateIndex}
        onChangeRate={(i) => updateSettings({ rateIndex: i })}
        canPlay={!!primary || playingKey !== null}
        isPlaying={isPlaying}
        onPrimary={handlePrimary}
        onClose={() => window.close()}
      />

      <main class="panel-content">
        {!loading &&
          !unsupported &&
          alerts.map((message, i) => (
            <AlertBanner
              key={message}
              message={message}
              translation={alertTranslation(message)}
              playing={ctx.playingKey === `alert-${i}`}
              onListen={() => speak(`alert-${i}`, message, message)}
            />
          ))}

        {effectiveView === 'settings' ? (
          <SettingsView {...ctx} />
        ) : effectiveView === 'safety' ? (
          <SafetyView {...ctx} />
        ) : loading ? (
          <LoadingState />
        ) : unsupported ? (
          <UnsupportedState />
        ) : lines === null ? (
          <NoBankPageState />
        ) : effectiveView === 'read' ? (
          <ReadView {...ctx} />
        ) : effectiveView === 'lines' ? (
          <LinesView {...ctx} />
        ) : effectiveView === 'guide' ? (
          <GuideView {...ctx} />
        ) : effectiveView === 'transparency' ? (
          <TransparencyView {...ctx} />
        ) : (
          <HomeView {...ctx} />
        )}
      </main>

      {showFooter && (
        <PanelFooter showAllOriginal={showAllOriginal} onToggleOriginal={() => setShowAllOriginal((v) => !v)} onTransparency={() => setView('transparency')} />
      )}

      {import.meta.env.DEV && !hasExtensionContext && (
        <DevScenarioSwitcher
          onPick={(key) => {
            const scenario = DEV_SCENARIOS[key]!;
            setLines(scenario.lines);
            setButtonLabels(scenario.buttonLabels);
            setWarnings(scenario.warnings);
            setStep(scenario.step);
            setFormFields(scenario.formFields);
            setRecap(scenario.recap);
            setConsistency(scenario.consistency);
            setLoading(false);
            setUnsupported(false);
            setView('home');
          }}
          onState={(s) => {
            setLines(null);
            setWarnings([]);
            setRecap(null);
            setConsistency(null);
            setLoading(s === 'loading');
            setUnsupported(s === 'unsupported');
            if (s === 'offline') setOnline((o) => !o);
          }}
        />
      )}
    </div>
  );
}

/** Dev-only: never bundled meaningfully into a real extension build (no
 * `chrome.runtime.id` ever resolves outside an installed extension), lets
 * every panel state be reached from a plain browser tab for design QA. */
function DevScenarioSwitcher({
  onPick,
  onState,
}: {
  onPick: (key: DevScenarioKey) => void;
  onState: (s: 'idle' | 'loading' | 'unsupported' | 'offline') => void;
}) {
  // Inline styles: tree-shaken out of production with the component itself.
  const wrapStyle = { display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '6px', background: '#111' } as const;
  const labelStyle = { color: '#fff', fontSize: '10px', fontWeight: 700, padding: '4px' } as const;
  const btnStyle = { fontSize: '10px', padding: '4px 8px', border: '1px solid #444', background: '#222', color: '#fff', borderRadius: '4px', cursor: 'pointer' } as const;

  return (
    <div style={wrapStyle}>
      <span style={labelStyle}>DEV</span>
      {(Object.keys(DEV_SCENARIOS) as DevScenarioKey[]).map((key) => (
        <button key={key} type="button" style={btnStyle} onClick={() => onPick(key)}>
          {key}
        </button>
      ))}
      {(['idle', 'loading', 'unsupported', 'offline'] as const).map((s) => (
        <button key={s} type="button" style={btnStyle} onClick={() => onState(s)}>
          {s}
        </button>
      ))}
    </div>
  );
}
