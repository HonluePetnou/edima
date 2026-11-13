import { render } from 'preact';
import {
  extractProtectedValues,
  fillTemplate,
  findExplanationForText,
  matchTemplatePhrase,
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
import { checkConsistency, checkRecapArithmetic } from '../utils/consistency';
import { isFinancialPage } from '../utils/financial-page';
import { speakFrenchLocally } from '../utils/speech';
import { applyInPage, restoreAll, restoreExcept } from '../utils/in-page';
import { loadSettings, onSettingsChanged } from '../utils/settings';
import TalkingBubble, { type BubbleState } from '../components/TalkingBubble';
import FloatingMascot from '../components/FloatingMascot';
import mascotIdleSrc from '../assets/mascot/edima-idle.webp?inline';
import mascotAlertSrc from '../assets/mascot/edima-alert.webp?inline';
import type {
  ExtensionMessage,
  FieldDescription,
  GetEnteredAmountResponse,
  LanguageCode,
  PageTranslatedMessage,
  PanelStateResponse,
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

    const result = translateText(text, language);
    // A glossary "translation" identical to the French (e.g. "Confirmer le
    // transfert" → "confirmer le transfert") isn't one: show it as French.
    const sameAsFrench = result.text.trim().toLowerCase() === text.trim().toLowerCase();
    if (result.source === 'glossaire' && !sameAsFrench) {
      const source = result.status === 'valide' ? 'glossaire' : 'a_valider';
      lines.push({ original: result.original, text: result.text, source, spokenAmount, explanation });
      continue;
    }

    const templateMatch = matchTemplatePhrase(text, language);
    if (templateMatch) {
      lines.push({
        original: text,
        text: fillTemplate(templateMatch.template, templateMatch.values, language),
        source: templateMatch.template[`${language}_status`] === 'valide' ? 'phrase_modele' : 'a_valider',
        spokenAmount,
        explanation,
      });
      continue;
    }

    const cached = aiCache.get(text);
    if (cached) {
      lines.push({ original: text, text: cached, source: 'ia', spokenAmount, explanation });
      continue;
    }

    lines.push({ original: result.original, text: result.text, source: 'original', spokenAmount, explanation });
  }
  return lines;
}

// Best-effort voice while no Ewondo/Duala synthesis exists yet (D2) — French
// placeholder so every "lu à voix haute" requirement (F2/F3/F5/F7) already
// holds end-to-end before real native-language audio is wired in.
// On-device voices only (utils/speech.ts): nothing displayed on the bank
// page is sent to an online speech service. speakFrenchLocally() cancels
// whatever was playing, so a new F7 warning always interrupts.
function speakFrench(text: string) {
  speakFrenchLocally(text);
}

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    // D5: switched live via the side panel's language selector.
    let activeLanguage: LanguageCode = 'dua';

    // Safety rule from the cahier des charges: by default the page's own DOM is
    // never written to. Every bit of Edima UI lives inside one Shadow DOM host,
    // isolated from the host page's styles and scripts.
    let mountContainer: Element | null = null;
    let bubbleState: BubbleState | null = null;
    // Floating mascot: visible on financial pages, unless the user turned it
    // off or the side panel is already open.
    let panelOpen = false;
    const initialSettings = await loadSettings();
    let showMascotSetting = initialSettings.showMascot;
    // F9 IA: off unless the user turned it on in the panel's settings.
    let aiEnabled = initialSettings.aiEnabled;
    // "Traduire dans la page": off unless chosen in the panel's settings.
    let inPageEnabled = initialSettings.inPage;
    let isFinancial = false;
    let hasAlert = false;

    const openPanel = () => chrome.runtime.sendMessage({ type: 'edima:open-panel' }).catch(() => {});
    // Inlined as data: URLs (see imports) rather than chrome-extension:// URLs,
    // which a bank's CSP can block and which break after an extension reload.
    const idleSrc = mascotIdleSrc;
    const alertSrc = mascotAlertSrc;

    const renderOverlay = () => {
      if (!mountContainer) return;
      const mascotVisible = isFinancial && showMascotSetting && !panelOpen;
      render(
        <>
          <TalkingBubble state={bubbleState} />
          {mascotVisible && <FloatingMascot idleSrc={idleSrc} alertSrc={alertSrc} alert={hasAlert} onOpen={openPanel} />}
        </>,
        mountContainer,
      );
    };

    const ui = await createShadowRootUi(ctx, {
      name: 'edima-overlay',
      position: 'inline',
      anchor: 'body',
      append: 'last',
      onMount(container) {
        mountContainer = container;
        renderOverlay();
      },
      onRemove(container) {
        if (container) render(null, container);
      },
    });
    ui.mount();

    const showBubble = (state: BubbleState | null) => {
      bubbleState = state;
      renderOverlay();
    };

    onSettingsChanged((s) => {
      showMascotSetting = s.showMascot;
      if (s.inPage !== inPageEnabled) {
        inPageEnabled = s.inPage;
        if (!inPageEnabled) restoreAll();
        rescan();
        reportToSidePanel();
      }
      const aiWasEnabled = aiEnabled;
      aiEnabled = s.aiEnabled;
      if (aiWasEnabled && !aiEnabled) {
        // Turning IA off removes every provisional IA line straight away.
        aiCache.clear();
        aiAttempted.clear();
        rescan();
        reportToSidePanel();
      } else if (!aiWasEnabled && aiEnabled) {
        void tryAiFallback(currentLines.map((l) => l.original));
      }
      renderOverlay();
    });
    chrome.runtime.sendMessage({ type: 'edima:get-panel-state' }, (response: PanelStateResponse | undefined) => {
      panelOpen = response?.open ?? false;
      renderOverlay();
    });

    // ---- F3: boutons parlants (also re-run on F8 mutations below, so a
    // button inside a freshly-injected pop-up gets wired up too) ----
    const wiredElements = new WeakSet<HTMLElement>();

    // Hover descriptions are generated from a French template until the
    // linguist validates a Duala version, so F9 translates them on demand.
    // Cache by French source text; bump the request id on every hover/leave
    // so a slow response never replaces a newer bubble.
    const hoverCache = new Map<string, string>();
    let hoverRequestId = 0;

    function wireInteractiveElements(): string[] {
      const labels: string[] = [];
      for (const el of findInteractiveElements()) {
        const described = describeElement(el, activeLanguage);
        if (!described) continue;
        labels.push(described.label);
        if (wiredElements.has(el)) continue;
        wiredElements.add(el);

        const speak = () => {
          const rect = el.getBoundingClientRect();
          const x = rect.left + rect.width / 2;
          const y = rect.top - 8;
          const frenchDescription = described.description;
          const language = activeLanguage;
          const requestId = ++hoverRequestId;
          const cached = hoverCache.get(frenchDescription);

          showBubble({ x, y, text: cached ?? frenchDescription });
          speakFrench(frenchDescription);

          if (!aiEnabled || language !== 'dua' || cached) return;

          const { masked, values } = extractProtectedValues(frenchDescription);
          void requestAiTranslation(masked, language).then((translated) => {
            if (!translated || requestId !== hoverRequestId) return;

            const final = reinsertProtectedValues(translated, values);
            if (!verifyValuesIntact(final, values)) return; // F10: never show a value mismatch

            hoverCache.set(frenchDescription, final);
            const currentRect = el.getBoundingClientRect();
            showBubble({
              x: currentRect.left + currentRect.width / 2,
              y: currentRect.top - 8,
              text: final,
            });
          });
        };
        const hide = () => {
          hoverRequestId++;
          showBubble(null);
        };

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
      // The bank's own French wording: spoken by a French voice, and shown in
      // the panel with its translation (if any) above it.
      const warnings = findWarningLines(lines).map((l) => l.original);
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
    // Exact glossary match first, then validated template sentences, then the
    // IA fallback for genuinely unseen text (including glossary terms still
    // waiting for linguist review).
    const aiCache = new Map<string, string>();
    // Texts already sent to the model (successful or not), so a failed request
    // is not retried on every DOM mutation. Cleared on a language switch.
    const aiAttempted = new Set<string>();

    function requestAiTranslation(
      masked: string,
      language: LanguageCode = activeLanguage,
    ): Promise<string | null> {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { type: 'edima:translate-unknown', masked, language },
          (response: TranslateUnknownResponse | undefined) => resolve(response?.translated ?? null),
        );
      });
    }

    async function tryAiFallback(texts: string[]) {
      if (!aiEnabled) return;
      let changed = false;
      for (const text of texts) {
        if (aiCache.has(text) || aiAttempted.has(text)) continue;
        // A validated glossary entry or template phrase always wins;
        // unvalidated entries (and genuinely unseen text) are allowed to get
        // a provisional IA reading.
        if (translateText(text, activeLanguage).source === 'glossaire') continue;
        if (matchTemplatePhrase(text, activeLanguage)) continue;
        if (text.length < 8 || text.length > 200) continue; // not sentence-like enough to bother the LLM with

        aiAttempted.add(text);
        const { masked, values } = extractProtectedValues(text);
        // Nothing left to translate once names/numbers/amounts are masked
        // (e.g. "Amina Ngo Bell", "CM 001 2345 6789 01"): never send it.
        if (!/\p{L}{2,}/u.test(masked.replace(/\{\{V\d+\}\}/g, ''))) continue;
        const translated = await requestAiTranslation(masked);
        if (!translated) continue; // server unavailable — French original keeps showing, correctly

        const final = reinsertProtectedValues(translated, values);
        if (!verifyValuesIntact(final, values)) continue; // F10's safety net: never show a value mismatch

        aiCache.set(text, final);
        changed = true;
      }

      // One rescan/report for the whole batch instead of one per translated line.
      if (changed) {
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
      const entered = checkConsistency(enteredAmount, currentRecap.montant);
      // F-3: when there's nothing to compare the user's entry against (or it
      // matches), also check the récap's own arithmetic — catches a tampered
      // or buggy total even without a captured formulaire amount. D4's own
      // mismatch always takes priority when both fire.
      const arithmetic = checkRecapArithmetic(currentRecap);
      const result = entered?.status === 'mismatch' ? entered : (arithmetic?.status === 'mismatch' ? arithmetic : (entered ?? arithmetic));
      currentConsistency = result;
      hasAlert = currentWarnings.length > 0 || result?.status === 'mismatch';
      renderOverlay();

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
      // The recap is read on the page's full text in order: the displayed
      // list drops repeats ("15 000 FCFA" is both montant and total), which
      // would break the label → value pairs.
      const visible = extractVisibleText();
      const pageLines: TranslatedLine[] = visible.map(({ text }) => ({ original: text, text, source: 'original' }));
      currentRecap = extractRecap(pageLines);
      currentStep = classifyStep(currentLines, fields.length > 0, currentRecap !== null);
      wireMontantCapture(fields);

      isFinancial = isFinancialPage(currentLines, currentStep);
      hasAlert = currentWarnings.length > 0 || currentConsistency?.status === 'mismatch';
      if (inPageEnabled) translateInPage(visible, fields);
      renderOverlay();
    };

    // ---- "Traduire dans la page" (in-page.ts) ----
    // Rewrites only labels that have a translation; values, names and what
    // the user typed are never touched, and everything Edima reads keeps
    // seeing the bank's French through pageText().
    function translateInPage(visible: ReturnType<typeof extractVisibleText>, fields: ReturnType<typeof findFormFields>) {
      const byOriginal = new Map(currentLines.filter((l) => l.source !== 'original').map((l) => [l.original, l.text]));
      const userValues = new Set(
        fields
          .map(({ element }) => ('value' in element ? String((element as HTMLInputElement).value) : '').trim().toLowerCase())
          .filter((v) => v.length > 0),
      );
      const candidates = visible.flatMap(({ node, text }) => {
        const translated = byOriginal.get(text);
        return translated ? [{ node, original: text, translated }] : [];
      });
      const keep = new Set(candidates.map((c) => c.node));
      restoreExcept(keep);
      applyInPage(candidates, userValues);
    }
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
    void tryAiFallback(currentLines.map((l) => l.original));


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
      if (message.type === 'edima:panel-state') {
        panelOpen = message.open;
        renderOverlay();
        return false;
      }
      if (message.type === 'edima:set-language') {
        activeLanguage = message.language;
        aiCache.clear(); // a cached translation only makes sense for the language it was produced in
        aiAttempted.clear();
        rescan();
        reportToSidePanel();
        checkRecapConsistency();
        void tryAiFallback(currentLines.map((l) => l.original));
        sendResponse({});
        return true;
      }
      return true;
    });
  },
});
