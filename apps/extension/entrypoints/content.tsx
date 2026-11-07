import { render } from 'preact';
import { translateText } from 'edima-shared';
import { extractVisibleText, observeNewContent } from '../utils/dom-reader';
import { describeElement, findInteractiveElements } from '../utils/buttons';
import TalkingBubble, { type BubbleState } from '../components/TalkingBubble';
import type { ExtensionMessage, PageTranslatedMessage, TranslatedLine } from '../utils/messages';

// The language picker in the side panel isn't wired to real state yet
// (Phase 1 scaffold) — this is the single place that default will come
// from once it is.
const ACTIVE_LANGUAGE = 'ewo' as const;

function translateVisiblePage(): TranslatedLine[] {
  const seen = new Set<string>();
  const lines: TranslatedLine[] = [];
  for (const { text } of extractVisibleText()) {
    if (seen.has(text)) continue;
    seen.add(text);
    const result = translateText(text, ACTIVE_LANGUAGE);
    lines.push({ original: result.original, text: result.text, source: result.source });
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

    // ---- F1: surimpression (reported to the side panel; see F3 below for
    // the in-page bubble, which covers buttons specifically) ----
    let currentLines = translateVisiblePage();

    const reportToSidePanel = () => {
      const message: PageTranslatedMessage = { type: 'edima:page-translated', url: location.href, lines: currentLines };
      chrome.runtime.sendMessage(message).catch(() => {
        // No listener yet (side panel closed) — fine, it'll ask for state itself on open.
      });
    };
    reportToSidePanel();

    observeNewContent(() => {
      currentLines = translateVisiblePage();
      reportToSidePanel();
    });

    chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
      if (message.type === 'edima:request-state') {
        const response: PageTranslatedMessage = { type: 'edima:page-translated', url: location.href, lines: currentLines };
        sendResponse(response);
      }
      return true;
    });

    // ---- F3: boutons parlants ----
    const described = findInteractiveElements()
      .map((el) => describeElement(el))
      .filter((d): d is NonNullable<typeof d> => d !== null);

    for (const { element, description } of described) {
      const speak = () => {
        const rect = element.getBoundingClientRect();
        showBubble({ x: rect.left + rect.width / 2, y: rect.top - 8, text: description });

        // Best-effort voice while no Ewondo/Duala synthesis exists yet (D2) —
        // reads the French description aloud so F3's "est décrit" requirement
        // holds even before real native-language audio is wired in.
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(description);
          utterance.lang = 'fr-FR';
          speechSynthesis.cancel();
          speechSynthesis.speak(utterance);
        }
      };
      const hide = () => showBubble(null);

      element.addEventListener('mouseenter', speak);
      element.addEventListener('focus', speak);
      element.addEventListener('mouseleave', hide);
      element.addEventListener('blur', hide);
    }
  },
});
