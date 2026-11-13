import { SERVER_URL } from '../utils/server-config';
import type {
  ExtensionMessage,
  GetEnteredAmountResponse,
  PanelStateMessage,
  PanelStateResponse,
  TranslateUnknownResponse,
} from '../utils/messages';

const ENTERED_AMOUNT_KEY = 'edimaEnteredAmount';

export default defineBackground(() => {
  // Clicking the toolbar icon opens the side panel directly, instead of a popup.
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);

  // The side panel holds an "edima-panel" port while it's open; the floating
  // mascot on every tab hides for as long as at least one is connected.
  let openPanels = 0;
  const broadcastPanelState = async () => {
    const message: PanelStateMessage = { type: 'edima:panel-state', open: openPanels > 0 };
    for (const tab of await chrome.tabs.query({})) {
      if (tab.id !== undefined) chrome.tabs.sendMessage(tab.id, message).catch(() => {});
    }
  };
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== 'edima-panel') return;
    openPanels++;
    broadcastPanelState();
    port.onDisconnect.addListener(() => {
      openPanels = Math.max(0, openPanels - 1);
      broadcastPanelState();
    });
  });

  chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
    // Floating mascot click. sidePanel.open() only works inside a user
    // gesture, so it's called synchronously here — no await before it.
    if (message.type === 'edima:open-panel') {
      const tabId = sender.tab?.id;
      if (tabId !== undefined) chrome.sidePanel.open({ tabId }).catch(console.error);
      return undefined;
    }
    if (message.type === 'edima:get-panel-state') {
      const response: PanelStateResponse = { open: openPanels > 0 };
      sendResponse(response);
      return undefined;
    }

    // F9: relays the content script's fallback-translation request to
    // apps/server. Runs here rather than in the content script so the
    // request is never subject to the host page's own CSP. D10 explanations
    // use the same endpoint but are static glossary text, not page data.
    if (message.type === 'edima:translate-unknown' || message.type === 'edima:translate-explanation') {
      const text = message.type === 'edima:translate-unknown' ? message.masked : message.text;
      fetch(`${SERVER_URL}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masked: text, language: message.language }),
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
    }

    // D4: content scripts can't use chrome.storage.session directly without
    // an extra access-level grant, so it's simplest to keep this one value
    // in the trusted background context and relay through it. One value per
    // browser session is a known Phase 1 limit — two tabs mid-transfer at
    // once would share it.
    if (message.type === 'edima:save-entered-amount') {
      chrome.storage.session.set({ [ENTERED_AMOUNT_KEY]: message.amount }).then(() => sendResponse({}));
      return true;
    }
    if (message.type === 'edima:get-entered-amount') {
      chrome.storage.session.get(ENTERED_AMOUNT_KEY).then((result) => {
        const stored = result[ENTERED_AMOUNT_KEY] as number | undefined;
        const response: GetEnteredAmountResponse = { amount: stored ?? null };
        sendResponse(response);
      });
      return true;
    }

    return undefined;
  });
});
