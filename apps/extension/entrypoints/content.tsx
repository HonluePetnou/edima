import { render } from 'preact';
import {
  extractProtectedValues,
  findExplanationForText,
  reinsertProtectedValues,
  speakAmount,
  translateText,
  verifyValuesIntact,
} from 'edima-shared';
import { extractVisibleText, observeNewContent } from '../utils/dom-reader';
import { describeElement, findInteractiveElements } from '../utils/buttons';
import { findWarningLines } from '../utils/warnings';
import { findFormFields } from '../utils/form-fields';
import { extractRecap } from '../utils/recap';
import { classifyStep } from '../utils/journey';
import { checkConsistency } from '../utils/consistency';
import TalkingBubble, { type BubbleState } from '../components/TalkingBubble';
import type {
  ExtensionMessage,
  FieldDescription,
  GetEnteredAmountResponse,
  LanguageCode,
  PageTranslatedMessage,
  TranslateUnknownResponse,
  TranslatedLine,
} from '../utils/messages';

// amountToWords()/speakAmount() return null for ewo/dua until the linguist
// delivers each language's number grammar, so French is used for F4's
// spoken form in the meantime — never a guessed ewondo/duala reading. This
// is independent of the D5 language switch below (which only changes which
// glossary column translateText() reads from).
const AMOUNT_SPEECH_LANGUAGE = 'fr' as const;

// F9: confirmed-good IA translations for this page (verified by F10 below),
// keyed by the original French text so they survive every later rescan
// instead of reverting to French the next time F8 notices a mutation. Reset
// on a D5 language switch (see 'edima:set-language' below) — a cached
// translation only makes sense for the language it was produced in.
function translateVisiblePage(aiCache: Map<string, string>, language: LanguageCode): TranslatedLine[] {
  const seen = new Set<string>();
  const lines: TranslatedLine[] = [];
  for (const { text } of extractVisibleText()) {
    if (seen.has(text)) continue;
    seen.add(text);
    const spokenAmount = speakAmount(text, AMOUNT_SPEECH_LANGUAGE) ?? undefined;
    const explanation = findExplanationForText(text) ?? undefined;

    const cached = aiCache.get(text);
    if (cached) {
      lines.push({ original: text, text: cached, source: 'ia', spokenAmount, explanation });
      continue;
    }

    const result = translateText(text, language);
    lines.push({ original: result.original, text: result.text, source: result.source, spokenAmount, explanation });
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
    // D5: switched live via the side panel's language selector.
    let activeLanguage: LanguageCode = 'ewo';

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

    // ---- F9: contenu inédit — chaîne glossaire → phrases-modèles → IA ----
    // (phrases-modèles matching isn't wired yet: it needs real sentence
    // structure matching, not just the exact-string lookup translateText()
    // does today. Unmatched text here goes straight to the IA fallback.)
    const aiCache = new Map<string, string>();

    function requestAiTranslation(masked: string): Promise<string | null> {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { type: 'edima:translate-unknown', masked, language: activeLanguage },
          (response: TranslateUnknownResponse | undefined) => resolve(response?.translated ?? null),
        );
      });
    }

    async function tryAiFallback(addedTexts: string[]) {
      for (const text of addedTexts) {
        if (aiCache.has(text)) continue;
        // Only genuinely unseen content is F9's job — a known glossary term
        // (any status) was already handled by translateText() above.
        if (translateText(text, activeLanguage).status !== null) continue;
        if (text.length < 8 || text.length > 200) continue; // not sentence-like enough to bother the LLM with

        const { masked, values } = extractProtectedValues(text);
        const translated = await requestAiTranslation(masked);
        if (!translated) continue; // server unavailable — French original keeps showing, correctly

        const final = reinsertProtectedValues(translated, values);
        if (!verifyValuesIntact(final, values)) continue; // F10's safety net: never show a value mismatch

        aiCache.set(text, final);
        rescan();
        reportToSidePanel();
      }
    }

    // ---- D4: contrôle de cohérence ----
    // Captures the amount typed on the formulaire step (relayed through the
    // background, since content scripts can't use chrome.storage.session
    // directly) and compares it against the récapitulatif's own amount.
    const wiredMontantFields = new WeakSet<HTMLElement>();

    function parseEnteredAmount(raw: string): number | null {
      const n = Number(raw.replace(/[\s ]/g, ''));
      return Number.isFinite(n) && n > 0 ? n : null;
    }

    function wireMontantCapture(fields: ReturnType<typeof findFormFields>) {
      for (const { element, label } of fields) {
        if (!/montant/i.test(label) || wiredMontantFields.has(element)) continue;
        wiredMontantFields.add(element);
        element.addEventListener('input', () => {
          const amount = parseEnteredAmount((element as HTMLInputElement).value ?? '');
          if (amount !== null) chrome.runtime.sendMessage({ type: 'edima:save-entered-amount', amount });
        });
      }
    }

    function requestEnteredAmount(): Promise<number | null> {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'edima:get-entered-amount' }, (response: GetEnteredAmountResponse | undefined) =>
          resolve(response?.amount ?? null),
        );
      });
    }

    async function checkRecapConsistency() {
      if (currentStep?.id !== 'recapitulatif' || !currentRecap?.montant) {
        currentConsistency = null;
        return;
      }
      const enteredAmount = await requestEnteredAmount();
      const result = checkConsistency(enteredAmount, currentRecap.montant);
      currentConsistency = result;

      // Same priority treatment as an F7 warning — a mismatched amount is
      // exactly the kind of thing that must interrupt and be heard first.
      if (result?.status === 'mismatch' && !spokenWarnings.has(result.message)) {
        spokenWarnings.add(result.message);
        speakFrench(result.message);
        showBubble({ x: window.innerWidth / 2, y: 64, text: result.message, tone: 'danger' });
        clearTimeout(warningBubbleTimer);
        warningBubbleTimer = setTimeout(() => showBubble(null), 6000);
      }
      reportToSidePanel();
    }

    // ---- state reported to the side panel ----
    let currentLines: TranslatedLine[] = [];
    let currentButtonLabels: string[] = [];
    let currentWarnings: string[] = [];
    let currentFormFields: FieldDescription[] = [];
    let currentRecap: ReturnType<typeof extractRecap> = null;
    let currentStep: ReturnType<typeof classifyStep> = null;
    let currentConsistency: ReturnType<typeof checkConsistency> = null;

    const rescan = () => {
      currentLines = translateVisiblePage(aiCache, activeLanguage);
      currentButtonLabels = wireInteractiveElements();
      currentWarnings = announceNewWarnings(currentLines);

      // ---- F5: parcours guidé ----
      const fields = findFormFields();
      currentFormFields = fields.map(({ label, description }) => ({ label, description }));
      currentRecap = extractRecap(currentLines);
      currentStep = classifyStep(currentLines, fields.length > 0, currentRecap !== null);
      wireMontantCapture(fields);
    };
    rescan();

    function buildMessage(): PageTranslatedMessage {
      return {
        type: 'edima:page-translated',
        url: location.href,
        language: activeLanguage,
        lines: currentLines,
        buttonLabels: currentButtonLabels,
        warnings: currentWarnings,
        step: currentStep,
        formFields: currentFormFields,
        recap: currentRecap,
        consistency: currentConsistency,
      };
    }

    const reportToSidePanel = () => {
      chrome.runtime.sendMessage(buildMessage()).catch(() => {
        // No listener yet (side panel closed) — fine, it'll ask for state itself on open.
      });
    };
    reportToSidePanel();
    checkRecapConsistency();

    observeNewContent((added) => {
      rescan();
      reportToSidePanel();
      tryAiFallback(added.map((a) => a.text));
      checkRecapConsistency();
    });

    chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
      if (message.type === 'edima:request-state') {
        sendResponse(buildMessage());
        return true;
      }
      if (message.type === 'edima:set-language') {
        activeLanguage = message.language;
        aiCache.clear(); // a cached translation only makes sense for the language it was produced in
        rescan();
        reportToSidePanel();
        checkRecapConsistency();
        sendResponse({});
        return true;
      }
      return true;
    });
  },
});
