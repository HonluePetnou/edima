import { useEffect, useState } from 'preact/hooks';
import type { PageTranslatedMessage, TranslatedLine } from '../../utils/messages';

/**
 * Phase 1 scaffold: shows whatever the content script found (F1). Every
 * line currently falls back to French because no glossary term is
 * `status: "valide"` yet — that is the correct, intended behaviour (F10/D9)
 * until the linguist signs terms off, not a bug.
 */
export default function App() {
  const [lines, setLines] = useState<TranslatedLine[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function requestCurrentState() {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      try {
        const response: PageTranslatedMessage = await chrome.tabs.sendMessage(tab.id, { type: 'edima:request-state' });
        if (!cancelled && response) setLines(response.lines);
      } catch {
        // No content script on this tab (e.g. chrome:// page) — nothing to show.
      }
    }
    requestCurrentState();

    const onMessage = (message: PageTranslatedMessage) => {
      if (message.type === 'edima:page-translated' && !cancelled) setLines(message.lines);
    };
    chrome.runtime.onMessage.addListener(onMessage);

    return () => {
      cancelled = true;
      chrome.runtime.onMessage.removeListener(onMessage);
    };
  }, []);

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
