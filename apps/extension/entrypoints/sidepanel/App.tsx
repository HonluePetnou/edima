import { useEffect, useState } from 'preact/hooks';
import { summarizePage } from '../../utils/summarize';
import { formatRecapSummary, type RecapInfo } from '../../utils/recap';
import type { StepInfo } from '../../utils/journey';
import type { ConsistencyInfo } from '../../utils/consistency';
import type { FieldDescription, PageTranslatedMessage, TranslatedLine } from '../../utils/messages';

function speak(text: string) {
  if (!text || !('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'fr-FR';
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

/**
 * Phase 1 scaffold: shows whatever the content script found (F1) and reads
 * a short summary on demand (F2). Every line currently falls back to French
 * because no glossary term is `status: "valide"` yet — that is the correct,
 * intended behaviour (F10/D9) until the linguist signs terms off, not a bug.
 */
export default function App() {
  const [lines, setLines] = useState<TranslatedLine[] | null>(null);
  const [buttonLabels, setButtonLabels] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [step, setStep] = useState<StepInfo | null>(null);
  const [formFields, setFormFields] = useState<FieldDescription[]>([]);
  const [recap, setRecap] = useState<RecapInfo | null>(null);
  const [consistency, setConsistency] = useState<ConsistencyInfo | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const apply = (message: PageTranslatedMessage) => {
      if (cancelled) return;
      setLines(message.lines);
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

  const readPage = () => {
    if (!lines) return;
    const text = summarizePage(lines, buttonLabels);
    setSummary(text);
    speak(text);
  };

  const readFormStep = () => {
    const intro = `Étape ${step?.index} sur ${step?.total} : ${step?.label}.`;
    const fields = formFields.map((f) => `${f.label} : ${f.description}`).join(' ');
    speak(`${intro} ${fields}`);
  };

  const validated = lines?.filter((l) => l.source === 'glossaire').length ?? 0;
  const recapSummary = recap ? `${formatRecapSummary(recap)}${consistency ? ` ${consistency.message}` : ''}` : '';

  return (
    <>
      <header class="header">
        <h1 class="wordmark">Edima</h1>
        <button class="lang-pill" type="button" disabled>
          Ewondo
        </button>
      </header>
      <main class="content">
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
            {step && (
              <p class="step-eyebrow">
                Étape {step.index} sur {step.total} — {step.label}
              </p>
            )}
            <p class="status">
              {lines.length} libellé(s) trouvé(s), {validated} validé(s) par le linguiste.
            </p>
            <button class="primary-button" type="button" onClick={readPage}>
              Lis-moi cette page
            </button>
            {summary && <p class="summary">{summary}</p>}
            {step?.id === 'formulaire' && formFields.length > 0 && (
              <section class="form-card">
                <p class="form-title">Ce qu'Edima t'explique</p>
                {formFields.map((field, i) => (
                  <p key={field.label} class="form-row">
                    <span class="form-row-index">{i + 1}.</span> <strong>{field.label}</strong> — {field.description}
                  </p>
                ))}
                <button class="secondary-button" type="button" onClick={readFormStep}>
                  Lire cette étape
                </button>
              </section>
            )}
            {recap && (
              <section class="recap-card">
                <p class="recap-title">Récapitulatif avant confirmation</p>
                {recap.montant && <p class="recap-row">Montant envoyé : {recap.montant}</p>}
                {recap.beneficiaire && <p class="recap-row">Bénéficiaire : {recap.beneficiaire}</p>}
                {recap.frais && <p class="recap-row">Frais : {recap.frais}</p>}
                {recap.total && <p class="recap-row recap-row--total">Total débité : {recap.total}</p>}
                {consistency && (
                  <p class={consistency.status === 'match' ? 'consistency-row consistency-row--ok' : 'consistency-row consistency-row--alert'}>
                    {consistency.status === 'match' ? '✓ ' : '⚠ '}
                    {consistency.message}
                  </p>
                )}
                <button class="secondary-button" type="button" onClick={() => speak(recapSummary)}>
                  Lire le récapitulatif
                </button>
              </section>
            )}
            <ul class="line-list">
              {lines.map((line) => (
                <li key={line.original} class="line-item">
                  <span class={`line-badge line-badge--${line.source}`}>
                    {line.source === 'glossaire' ? 'Validé' : line.source === 'ia' ? 'IA — non vérifié' : 'Français'}
                  </span>
                  <span class="line-text-group">
                    <span class="line-text">{line.text}</span>
                    {line.spokenAmount && <span class="line-spoken">{line.spokenAmount}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </>
  );
}
