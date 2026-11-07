import { render } from 'preact';
import { speakAmount, translateText } from 'edima-shared';
import { extractVisibleText, observeNewContent } from '../utils/dom-reader';
import { describeElement, findInteractiveElements } from '../utils/buttons';
import TalkingBubble, { type BubbleState } from '../components/TalkingBubble';
import type { ExtensionMessage, PageTranslatedMessage, TranslatedLine } from '../utils/messages';

// The language picker in the side panel isn't wired to real state yet
// (Phase 1 scaffold) — this is the single place that default will come
// from once it is. amountToWords()/speakAmount() return null for 'ewo' until
// the linguist delivers the number grammar, so French is used for F4's
// spoken form in the meantime — never a guessed ewondo/duala reading.
const ACTIVE_LANGUAGE = 'ewo' as const;
const AMOUNT_SPEECH_LANGUAGE = 'fr' as const;

function translateVisiblePage(): TranslatedLine[] {
  const seen = new Set<string>();
  const lines: TranslatedLine[] = [];
  for (const { text } of extractVisibleText()) {
    if (seen.has(text)) continue;
    seen.add(text);
    const result = translateText(text, ACTIVE_LANGUAGE);
    const spokenAmount = speakAmount(text, AMOUNT_SPEECH_LANGUAGE) ?? undefined;
    lines.push({ original: result.original, text: result.text, source: result.source, spokenAmount });
  }
  return lines;
}

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    // Safety rule from the cahier des charges: by default the page's own DOM is
    // never written to. Every bit of Edima UI lives inside one Shadow DOM host,
    // isolated from the host page's styles and scripts.
    let mountContainer: Element | null = null;
    const ui = await createShadowRootUi(ctx, {
      name: 'edima-overlay',
      position: 'inline',
      anchor: 'body',
      append: 'last',
      onMount(container) {
        mountContainer = container;
        render(<TalkingBubble state={null} />, container);
      },
      onRemove(container) {
        if (container) render(null, container);
      },
    });
    ui.mount();

    const showBubble = (state: BubbleState | null) => {
      if (mountContainer) render(<TalkingBubble state={state} />, mountContainer);
    };

    // ---- F3: boutons parlants (also re-run on F8 mutations below, so a
    // button inside a freshly-injected pop-up gets wired up too) ----
    const wiredElements = new WeakSet<HTMLElement>();

    function wireInteractiveElements(): string[] {
      const labels: string[] = [];
      for (const el of findInteractiveElements()) {
        const described = describeElement(el);
        if (!described) continue;
        labels.push(described.label);
        if (wiredElements.has(el)) continue;
        wiredElements.add(el);

        const speak = () => {
          const rect = el.getBoundingClientRect();
          showBubble({ x: rect.left + rect.width / 2, y: rect.top - 8, text: described.description });

          // Best-effort voice while no Ewondo/Duala synthesis exists yet (D2) —
          // reads the French description aloud so F3's "est décrit" requirement
          // holds even before real native-language audio is wired in.
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(described.description);
            utterance.lang = 'fr-FR';
            speechSynthesis.cancel();
            speechSynthesis.speak(utterance);
          }
        };
        const hide = () => showBubble(null);

        el.addEventListener('mouseenter', speak);
        el.addEventListener('focus', speak);
        el.addEventListener('mouseleave', hide);
        el.addEventListener('blur', hide);
      }
      return labels;
    }

    // ---- F1: surimpression (reported to the side panel) ----
    let currentLines: TranslatedLine[] = [];
    let currentButtonLabels: string[] = [];

    const rescan = () => {
      currentLines = translateVisiblePage();
      currentButtonLabels = wireInteractiveElements();
    };
    rescan();

    const reportToSidePanel = () => {
      const message: PageTranslatedMessage = {
        type: 'edima:page-translated',
        url: location.href,
        lines: currentLines,
        buttonLabels: currentButtonLabels,
      };
      chrome.runtime.sendMessage(message).catch(() => {
        // No listener yet (side panel closed) — fine, it'll ask for state itself on open.
      });
    };
    reportToSidePanel();

    observeNewContent(() => {
      rescan();
      reportToSidePanel();
    });

    chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
      if (message.type === 'edima:request-state') {
        const response: PageTranslatedMessage = {
          type: 'edima:page-translated',
          url: location.href,
          lines: currentLines,
          buttonLabels: currentButtonLabels,
        };
        sendResponse(response);
      }
      return true;
    });
  },
});
