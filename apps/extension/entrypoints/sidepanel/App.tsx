import { useEffect, useRef, useState } from 'preact/hooks';
import { summarizePage } from '../../utils/summarize';
import { formatRecapSummary, type RecapInfo } from '../../utils/recap';
import type { StepInfo } from '../../utils/journey';
import type { ConsistencyInfo } from '../../utils/consistency';
import type { FieldDescription, LanguageCode, PageTranslatedMessage, TranslatedLine } from '../../utils/messages';

const LANGUAGE_LABELS: Record<LanguageCode, string> = { ewo: 'Ewondo', dua: 'Duala' };
const SPEECH_RATES = [1, 0.85, 0.7];
// Decorative only (no real-time audio analysis) — same static silhouette
// used throughout the v2 Figma exploration.
const WAVEFORM_HEIGHTS = [4, 7, 11, 15, 18, 20, 17, 13, 9, 6, 8, 12, 16, 19, 15, 10, 6, 4];

/**
 * Phase 1 scaffold: shows whatever the content script found (F1) and reads
 * a short summary on demand (F2). Every line currently falls back to French
 * because no glossary term is `status: "valide"` yet — that is the correct,
 * intended behaviour (F10/D9) until the linguist signs terms off, not a bug.
 */
export default function App() {
  const [lines, setLines] = useState<TranslatedLine[] | null>(null);
  const [language, setLanguageState] = useState<LanguageCode>('ewo');
  const [buttonLabels, setButtonLabels] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [step, setStep] = useState<StepInfo | null>(null);
  const [formFields, setFormFields] = useState<FieldDescription[]>([]);
  const [recap, setRecap] = useState<RecapInfo | null>(null);
  const [consistency, setConsistency] = useState<ConsistencyInfo | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  // D9: "un appui long affiche le français d'origine" — adapted to a click,
  // since a side panel has no long-press gesture of its own.
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());
  // D10 "Explique-moi ce mot" — separate from D9's toggle: a line can have
  // both an original-text reveal and a jargon explanation at once.
  const [expandedExplanations, setExpandedExplanations] = useState<Set<string>>(new Set());

  // ---- command bar: speech state, shared by the hero orb and the bar itself ----
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
    };

    async function requestCurrentState() {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      try {
        const response: PageTranslatedMessage = await chrome.tabs.sendMessage(tab.id, { type: 'edima:request-state' });
        if (response) apply(response);
      } catch {
        // No content script on this tab (e.g. chrome:// page) — nothing to show.
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

  const toggleExplanation = (key: string) => {
    setExpandedExplanations((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const readFormStep = () => {
    const intro = `Étape ${step?.index} sur ${step?.total} : ${step?.label}.`;
    const fields = formFields.map((f) => `${f.label} : ${f.description}`).join(' ');
    speak(`${intro} ${fields}`);
  };

  // ---- command bar actions ----
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
    if (lines) readPage();
  };

  const handleRepeat = () => {
    if (lastTextRef.current) speak(lastTextRef.current);
  };

  const handleSlower = () => {
    rateIndexRef.current = (rateIndexRef.current + 1) % SPEECH_RATES.length;
    if (lastTextRef.current) speak(lastTextRef.current);
  };

  const primaryLabel = isSpeaking && !isPaused ? 'Pause' : isPaused ? 'Reprendre' : 'Lire';
  const primaryIcon = isSpeaking && !isPaused ? '❚❚' : '▶';

  const validated = lines?.filter((l) => l.source === 'glossaire').length ?? 0;
  const recapSummary = recap ? `${formatRecapSummary(recap)}${consistency ? ` ${consistency.message}` : ''}` : '';
  const heroMessage = summary ?? (step ? `Étape ${step.index} sur ${step.total} — ${step.label}` : "Edima explique n'importe quelle page, à voix haute.");

  return (
    <>
      <header class="header">
        <div class="brand">
          <span class="brand-dot" />
          <h1 class="wordmark">Edima</h1>
        </div>
        <select
          class="lang-pill"
          value={language}
          onChange={(e) => changeLanguage((e.target as HTMLSelectElement).value as LanguageCode)}
        >
          {(Object.keys(LANGUAGE_LABELS) as LanguageCode[]).map((code) => (
            <option key={code} value={code}>
              {LANGUAGE_LABELS[code]}
            </option>
          ))}
        </select>
      </header>

      <main class="content">
        <section class="hero">
          <button
            type="button"
            class="orb-button"
            onClick={handlePrimary}
            aria-label={lines ? 'Lis-moi cette page' : 'En attente'}
          >
            <span class={`orb${isSpeaking && !isPaused ? ' orb--active' : ''}`} />
            <span class="waveform" aria-hidden="true">
              {WAVEFORM_HEIGHTS.map((h, i) => (
                <span key={i} style={{ height: `${h}px` }} />
              ))}
            </span>
          </button>
          <p class="hero-message">{heroMessage}</p>
          {lines && (
            <button type="button" class="hero-link" onClick={readPage}>
              Lis-moi cette page
            </button>
          )}
          {lines && (
            <div class="hero-pills">
              <span class="pill pill--success">✓ {validated} validé(s)</span>
              <span class="pill pill--outline">{lines.length} trouvé(s)</span>
            </div>
          )}
        </section>

        {lines === null ? (
          <p class="status">En attente d'une page à expliquer.</p>
        ) : (
          <>
            {warnings.length > 0 && (
              <section class="warning-card" role="alert">
                <p class="warning-title">⚠ Avertissement prioritaire</p>
                {warnings.map((text) => (
                  <p key={text} class="warning-row">
                    {text}
                  </p>
                ))}
                <button class="secondary-button secondary-button--danger" type="button" onClick={() => speak(warnings[0]!)}>
                  Réécouter
                </button>
              </section>
            )}

            {step?.id === 'formulaire' && formFields.length > 0 && (
              <section class="flat-card">
                <p class="flat-card-title">Ce qu'Edima t'explique</p>
                {formFields.map((field, i) => (
                  <p key={field.label} class="flat-row">
                    <span class="flat-row-label">
                      <span class="flat-row-index">{i + 1}.</span>
                      {field.label}
                    </span>
                    <span class="flat-row-value">{field.description}</span>
                  </p>
                ))}
                <div class="flat-card-footer">
                  <button class="secondary-button" type="button" onClick={readFormStep}>
                    Lire cette étape
                  </button>
                </div>
              </section>
            )}

            {recap && (
              <section class="flat-card">
                <p class="flat-card-title">Récapitulatif avant confirmation</p>
                {recap.montant && (
                  <p class="flat-row">
                    <span class="flat-row-label">Montant envoyé</span>
                    <span class="flat-row-value">{recap.montant}</span>
                  </p>
                )}
                {recap.beneficiaire && (
                  <p class="flat-row">
                    <span class="flat-row-label">Bénéficiaire</span>
                    <span class="flat-row-value">
                      {recap.beneficiaire}
                      {recap.beneficiairePhoneWords && <span class="line-spoken"><br />{recap.beneficiairePhoneWords}</span>}
                    </span>
                  </p>
                )}
                {recap.frais && (
                  <p class="flat-row">
                    <span class="flat-row-label">Frais</span>
                    <span class="flat-row-value">{recap.frais}</span>
                  </p>
                )}
                {recap.total && (
                  <p class="flat-row">
                    <span class="flat-row-label">Total débité</span>
                    <span class="flat-row-value flat-row-value--total">{recap.total}</span>
                  </p>
                )}
                {consistency && (
                  <p class={consistency.status === 'match' ? 'consistency-row consistency-row--ok' : 'consistency-row consistency-row--alert'}>
                    {consistency.status === 'match' ? '✓ ' : '⚠ '}
                    {consistency.message}
                  </p>
                )}
                <div class="flat-card-footer">
                  <button class="secondary-button" type="button" onClick={() => speak(recapSummary)}>
                    Lire le récapitulatif
                  </button>
                </div>
              </section>
            )}

            <ul class="line-list">
              {lines.map((line) => {
                const isExpanded = expandedLines.has(line.original);
                const isExplained = expandedExplanations.has(line.original);
                const hasOriginalToShow = line.source !== 'original' && line.original !== line.text;
                return (
                  <li
                    key={line.original}
                    class={`line-item${hasOriginalToShow ? ' line-item--clickable' : ''}`}
                    onClick={hasOriginalToShow ? () => toggleOriginal(line.original) : undefined}
                  >
                    <span class={`line-badge line-badge--${line.source}`}>
                      {line.source === 'glossaire' ? 'Validé' : line.source === 'ia' ? 'IA — non vérifié' : 'Français'}
                    </span>
                    <span class="line-text-group">
                      <span class="line-text-row">
                        <span class="line-text">{line.text}</span>
                        {line.explanation && (
                          <button
                            type="button"
                            class="explain-button"
                            title="Explique-moi ce mot"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExplanation(line.original);
                            }}
                          >
                            ?
                          </button>
                        )}
                      </span>
                      {line.spokenAmount && <span class="line-spoken">{line.spokenAmount}</span>}
                      {/* D3: the numbers inside an IA line are always F10-verified
                          before the line is ever cached — the translation quality
                          badge above is separate from (and doesn't vouch for) that. */}
                      {line.source === 'ia' && <span class="line-verified">✓ montants vérifiés</span>}
                      {isExpanded && <span class="line-original">Texte original : {line.original}</span>}
                      {isExplained && line.explanation && (
                        <span class="line-explanation">
                          {line.explanation.simple} <em>{line.explanation.example}</em>
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </main>

      <nav class="command-bar">
        <button type="button" class="command-button" onClick={handleRepeat} aria-label="Répéter">
          <span class="command-button-icon">↻</span>
          <span class="command-button-label">Répéter</span>
        </button>
        <button type="button" class="command-button command-button--primary" onClick={handlePrimary} aria-label={primaryLabel}>
          <span class="command-button-icon">{primaryIcon}</span>
          <span class="command-button-label">{primaryLabel}</span>
        </button>
        <button type="button" class="command-button" onClick={handleSlower} aria-label="Plus lent">
          <span class="command-button-icon">🐌</span>
          <span class="command-button-label">Plus lent</span>
        </button>
      </nav>
    </>
  );
}
