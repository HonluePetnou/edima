import { useEffect, useState } from 'preact/hooks';
import { summarizePage } from '../../utils/summarize';
import type { PageTranslatedMessage, TranslatedLine } from '../../utils/messages';

/**
 * Phase 1 scaffold: shows whatever the content script found (F1) and reads
 * a short summary on demand (F2). Every line currently falls back to French
 * because no glossary term is `status: "valide"` yet — that is the correct,
 * intended behaviour (F10/D9) until the linguist signs terms off, not a bug.
 */
export default function App() {
  const [lines, setLines] = useState<TranslatedLine[] | null>(null);
  const [buttonLabels, setButtonLabels] = useState<string[]>([]);
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const apply = (message: PageTranslatedMessage) => {
      if (cancelled) return;
      setLines(message.lines);
      setButtonLabels(message.buttonLabels);
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
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    }
  };

  const validated = lines?.filter((l) => l.source === 'glossaire').length ?? 0;

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
            <p class="status">
              {lines.length} libellé(s) trouvé(s), {validated} validé(s) par le linguiste.
            </p>
            <button class="primary-button" type="button" onClick={readPage}>
              Lis-moi cette page
            </button>
            {summary && <p class="summary">{summary}</p>}
            <ul class="line-list">
              {lines.map((line) => (
                <li key={line.original} class="line-item">
                  <span class={`line-badge line-badge--${line.source}`}>
                    {line.source === 'glossaire' ? 'Validé' : 'Français'}
                  </span>
                  <span class="line-text">{line.text}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </>
  );
}
