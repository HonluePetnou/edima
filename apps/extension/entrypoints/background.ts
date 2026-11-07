import { SERVER_URL } from '../utils/server-config';
import type { ExtensionMessage, TranslateUnknownResponse } from '../utils/messages';

export default defineBackground(() => {
  // Clicking the toolbar icon opens the side panel directly, instead of a popup.
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);

  // F9: relays the content script's fallback-translation request to
  // apps/server. Runs here rather than in the content script so the
  // request is never subject to the host page's own CSP.
  chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type !== 'edima:translate-unknown') return undefined;

    fetch(`${SERVER_URL}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ masked: message.masked, language: message.language }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { translated?: string } | null) => {
        const response: TranslateUnknownResponse = { translated: data?.translated ?? null };
        sendResponse(response);
      })
      .catch(() => {
        const response: TranslateUnknownResponse = { translated: null };
        sendResponse(response);
      });

    return true; // keep the message channel open for the async response above
  });
});
