import { render } from 'preact';
import { speakAmount, translateText } from 'edima-shared';
import { extractVisibleText, observeNewContent } from '../utils/dom-reader';
import { describeElement, findInteractiveElements } from '../utils/buttons';
import { findWarningLines } from '../utils/warnings';
import { findFormFields } from '../utils/form-fields';
import { extractRecap } from '../utils/recap';
import { classifyStep } from '../utils/journey';
import TalkingBubble, { type BubbleState } from '../components/TalkingBubble';
import type { ExtensionMessage, FieldDescription, PageTranslatedMessage, TranslatedLine } from '../utils/messages';

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

// Best-effort voice while no Ewondo/Duala synthesis exists yet (D2) — French
// placeholder so every "lu à voix haute" requirement (F2/F3/F5/F7) already
// holds end-to-end before real native-language audio is wired in.
function speakFrench(text: string) {
  if (!('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'fr-FR';
  speechSynthesis.cancel(); // F7: a new warning always interrupts whatever was playing
  speechSynthesis.speak(utterance);
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
          speakFrench(described.description);
        };
        const hide = () => showBubble(null);

        el.addEventListener('mouseenter', speak);
        el.addEventListener('focus', speak);
        el.addEventListener('mouseleave', hide);
        el.addEventListener('blur', hide);
      }
      return labels;
    }

    // ---- F7: avertissements et erreurs prioritaires ----
    const spokenWarnings = new Set<string>();
    let warningBubbleTimer: ReturnType<typeof setTimeout> | undefined;

    function announceNewWarnings(lines: TranslatedLine[]): string[] {
      const warnings = findWarningLines(lines).map((l) => l.text);
      const fresh = warnings.filter((text) => !spokenWarnings.has(text));
      for (const text of fresh) spokenWarnings.add(text);

      if (fresh.length > 0) {
        // Only one can be spoken at a time — the first is the most urgent
        // (DOM order usually puts the banner before the rest of the page).
        speakFrench(fresh[0]!);
        showBubble({ x: window.innerWidth / 2, y: 64, text: fresh[0]!, tone: 'danger' });
        clearTimeout(warningBubbleTimer);
        warningBubbleTimer = setTimeout(() => showBubble(null), 6000);
      }
      return warnings;
    }

    // ---- state reported to the side panel ----
    let currentLines: TranslatedLine[] = [];
    let currentButtonLabels: string[] = [];
    let currentWarnings: string[] = [];
    let currentFormFields: FieldDescription[] = [];
    let currentRecap: ReturnType<typeof extractRecap> = null;
    let currentStep: ReturnType<typeof classifyStep> = null;

    const rescan = () => {
      currentLines = translateVisiblePage();
      currentButtonLabels = wireInteractiveElements();
      currentWarnings = announceNewWarnings(currentLines);

      // ---- F5: parcours guidé ----
      const fields = findFormFields();
      currentFormFields = fields.map(({ label, description }) => ({ label, description }));
      currentRecap = extractRecap(currentLines);
      currentStep = classifyStep(currentLines, fields.length > 0, currentRecap !== null);
    };
    rescan();

    function buildMessage(): PageTranslatedMessage {
      return {
        type: 'edima:page-translated',
        url: location.href,
        lines: currentLines,
        buttonLabels: currentButtonLabels,
        warnings: currentWarnings,
        step: currentStep,
        formFields: currentFormFields,
        recap: currentRecap,
      };
    }

    const reportToSidePanel = () => {
      chrome.runtime.sendMessage(buildMessage()).catch(() => {
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
        sendResponse(buildMessage());
      }
      return true;
    });
  },
});
