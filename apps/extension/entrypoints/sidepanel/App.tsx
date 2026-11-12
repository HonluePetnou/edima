import { useEffect, useRef, useState } from 'preact/hooks';
import { summarizePage } from '../../utils/summarize';
import { formatRecapSummary } from '../../utils/recap';
import { Header } from '../../components/panel/Header';
import { WarningBanner } from '../../components/panel/WarningBanner';
import { RecapCard } from '../../components/panel/RecapCard';
import { FormCard } from '../../components/panel/FormCard';
import { LineList } from '../../components/panel/LineList';
import { CommandBar } from '../../components/panel/CommandBar';
import { IdleState, LoadingState, UnsupportedState } from '../../components/panel/PanelStates';
import { DEV_SCENARIOS, type DevScenarioKey } from '../../utils/devMocks';
import type {
  FieldDescription,
  LanguageCode,
  PageTranslatedMessage,
  TranslateUnknownResponse,
  TranslatedLine,
} from '../../utils/messages';
import type { RecapInfo } from '../../utils/recap';
import type { StepInfo } from '../../utils/journey';
import type { ConsistencyInfo } from '../../utils/consistency';

const SPEECH_RATES = [1, 0.85, 0.7];
const RATE_LABELS = ['1×', '0.85×', '0.7×'];

// The panel's own source of truth is whatever the content script reports —
// never assumed from `chrome` alone, since this file also renders as a
// plain page in dev (see the scenario switcher at the bottom of this file).
const hasExtensionContext = typeof chrome !== 'undefined' && !!chrome.runtime?.id;

// D10 explanations are static glossary content (never user data), so they can
// go to the fallback server as-is; masking their illustrative amounts would
// only make the model drop the placeholders and return nothing.
function requestAiTranslation(text: string, language: LanguageCode): Promise<string | null> {
  return new Promise((resolve) => {
    if (!hasExtensionContext) {
      resolve(null);
      return;
    }
    chrome.runtime.sendMessage(
      { type: 'edima:translate-explanation', text, language },
      (response: TranslateUnknownResponse | undefined) => resolve(response?.translated ?? null),
    );
  });
}

export default function App() {
  const [lines, setLines] = useState<TranslatedLine[] | null>(null);
  const [language, setLanguageState] = useState<LanguageCode>('dua');
  const [buttonLabels, setButtonLabels] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [step, setStep] = useState<StepInfo | null>(null);
  const [formFields, setFormFields] = useState<FieldDescription[]>([]);
  const [recap, setRecap] = useState<RecapInfo | null>(null);
  const [consistency, setConsistency] = useState<ConsistencyInfo | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(hasExtensionContext);
  const [unsupported, setUnsupported] = useState(false);

  // D9: a click reveals the French original (adapted from the spec's long-press,
  // since a side panel has no long-press gesture of its own).
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());
  // D10 "Explique-moi ce mot" — independent of D9's toggle: a line can have
  // both an original-text reveal and a jargon explanation open at once.
  const [expandedExplanations, setExpandedExplanations] = useState<Set<string>>(new Set());
  const [explanationTranslations, setExplanationTranslations] = useState<
    Record<string, { simple: string; example: string }>
  >({});
  const pendingExplanationKeys = useRef<Set<string>>(new Set());

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const lastTextRef = useRef<string | null>(null);
  const rateIndexRef = useRef(0);

  const speak = (text: string) => {
    if (!text || !('speechSynthesis' in window)) return;
    lastTextRef.current = text;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = SPEECH_RATES[rateIndexRef.current] ?? 1;
    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (!hasExtensionContext) return;
    let cancelled = false;

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
      setSummary(null); // a new page invalidates any summary read for the previous one
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

    return () => {
      cancelled = true;
      chrome.runtime.onMessage.removeListener(onMessage);
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

  const readPage = () => {
    if (!lines) return;
    const text = summarizePage(lines, buttonLabels);
    setSummary(text);
    speak(text);
  };

  const toggleOriginal = (key: string) => {
    setExpandedLines((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const translateExplanation = async (key: string, explanation: { simple: string; example: string }) => {
    if (
      !hasExtensionContext ||
      language !== 'dua' ||
      explanationTranslations[key] ||
      pendingExplanationKeys.current.has(key)
    ) {
      return;
    }

    pendingExplanationKeys.current.add(key);
    try {
      const [simple, example] = await Promise.all([
        requestAiTranslation(explanation.simple, 'dua'),
        requestAiTranslation(explanation.example, 'dua'),
      ]);
      if (!simple || !example) return; // server unavailable — the French gloss keeps showing
      setExplanationTranslations((prev) => ({ ...prev, [key]: { simple, example } }));
    } finally {
      pendingExplanationKeys.current.delete(key);
    }
  };

  const toggleExplanation = (key: string) => {
    const isOpening = !expandedExplanations.has(key);
    setExpandedExplanations((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

    if (isOpening) {
      const line = lines?.find((candidate) => candidate.original === key);
      if (line?.explanation) void translateExplanation(key, line.explanation);
    }
  };

  const readFormStep = () => {
    const intro = `Étape ${step?.index} sur ${step?.total} : ${step?.label}.`;
    const fields = formFields.map((f) => `${f.label} : ${f.description}`).join(' ');
    speak(`${intro} ${fields}`);
  };

  const recapSummary = recap ? `${formatRecapSummary(recap)}${consistency ? ` ${consistency.message}` : ''}` : '';

  const canPlay = !!recap || (step?.id === 'formulaire' && formFields.length > 0) || !!(lines && lines.length > 0);

  const handlePrimary = () => {
    if (isSpeaking && !isPaused) {
      speechSynthesis.pause();
      setIsPaused(true);
      return;
    }
    if (isPaused) {
      speechSynthesis.resume();
      setIsPaused(false);
      return;
    }
    if (recap) {
      speak(recapSummary);
    } else if (step?.id === 'formulaire' && formFields.length > 0) {
      readFormStep();
    } else if (lines && lines.length > 0) {
      readPage();
    }
  };

  const handleRepeat = () => {
    if (lastTextRef.current) speak(lastTextRef.current);
  };

  const handleSlower = () => {
    rateIndexRef.current = (rateIndexRef.current + 1) % SPEECH_RATES.length;
    if (lastTextRef.current) speak(lastTextRef.current);
  };

  const primaryLabel = isSpeaking && !isPaused ? 'Pause' : isPaused ? 'Reprendre' : 'Lire';
  const avatarSrc = isSpeaking && !isPaused ? '/mascot/edima-speaking.webp' : isPaused ? '/mascot/edima-paused.webp' : warnings.length > 0 ? '/mascot/edima-alert.webp' : '/mascot/edima-idle.webp';

  return (
    <div class="panel">
      <Header language={language} onChangeLanguage={changeLanguage} avatarSrc={avatarSrc} />

      <main class="panel-content">
        {loading ? (
          <LoadingState />
        ) : unsupported ? (
          <UnsupportedState />
        ) : lines === null ? (
          <IdleState />
        ) : (
          <>
            {step && (
              <p class="eyebrow">
                Étape {step.index} sur {step.total} — {step.label}
              </p>
            )}

            {summary && <p class="summary-readout">{summary}</p>}

            {warnings.length > 0 && <WarningBanner text={warnings[warnings.length - 1]!} onReplay={() => speak(warnings[warnings.length - 1]!)} />}

            {recap && <RecapCard recap={recap} consistency={consistency} onListen={() => speak(recapSummary)} />}

            {step?.id === 'formulaire' && formFields.length > 0 && <FormCard fields={formFields} onListen={readFormStep} />}

            {lines.length > 0 && (
              <LineList
                lines={lines}
                language={language}
                expandedLines={expandedLines}
                expandedExplanations={expandedExplanations}
                explanationTranslations={explanationTranslations}
                onToggleOriginal={toggleOriginal}
                onToggleExplanation={toggleExplanation}
              />
            )}
          </>
        )}
      </main>

      <CommandBar
        canPlay={canPlay}
        isSpeaking={isSpeaking && !isPaused}
        primaryLabel={primaryLabel}
        rateLabel={RATE_LABELS[rateIndexRef.current] ?? '1×'}
        onRepeat={handleRepeat}
        onPrimary={handlePrimary}
        onSlower={handleSlower}
      />

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
            setSummary(null);
            setLoading(false);
            setUnsupported(false);
          }}
          onState={(s) => {
            setLines(null);
            setLoading(s === 'loading');
            setUnsupported(s === 'unsupported');
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
  onState: (s: 'idle' | 'loading' | 'unsupported') => void;
}) {
  // Inline styles, not a stylesheet class: this component is already fully
  // tree-shaken out of production (see the `import.meta.env.DEV` guard
  // above), and a class here would otherwise leave dead rules in the
  // shipped CSS even though no production element ever uses them.
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
      <button type="button" style={btnStyle} onClick={() => onState('idle')}>
        idle
      </button>
      <button type="button" style={btnStyle} onClick={() => onState('loading')}>
        loading
      </button>
      <button type="button" style={btnStyle} onClick={() => onState('unsupported')}>
        unsupported
      </button>
    </div>
  );
}
