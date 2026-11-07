import type { RecapInfo } from './recap';
import type { StepInfo } from './journey';
import type { ConsistencyInfo } from './consistency';

/** D5: the only two languages the cahier asks for in the MVP. */
export type LanguageCode = 'ewo' | 'dua';

export interface TranslatedLine {
  original: string;
  text: string;
  /** "ia" (F9) means: matched neither the glossary nor a template phrase,
   * and the fallback server's response survived F10's value check. Shown
   * with a "non vérifié" badge (D1) — never treated as validated. */
  source: 'glossaire' | 'ia' | 'original';
  /** F4: the amount in words, when this line is (or contains) an FCFA amount. */
  spokenAmount?: string;
  /** D10: a plain-language gloss for this line, when it matches a jargon
   * term that has one — independent of `source` (see findExplanationForText). */
  explanation?: { simple: string; example: string };
}

export interface FieldDescription {
  label: string;
  description: string;
}

export interface PageTranslatedMessage {
  type: 'edima:page-translated';
  url: string;
  /** D5: which language this page was scanned in — lets the panel reflect
   * the content script's current choice even right after it re-injects. */
  language: LanguageCode;
  lines: TranslatedLine[];
  buttonLabels: string[];
  /** F7: short, keyword-matched warning lines, most recent last. */
  warnings: string[];
  /** F5: which step of the guided transfer journey this page looks like, if any. */
  step: StepInfo | null;
  /** F5: field-by-field explanations, populated when step is "formulaire". */
  formFields: FieldDescription[];
  /** F6: populated when step is "recapitulatif". */
  recap: RecapInfo | null;
  /** D4: populated once the récap amount has been compared against what was
   * captured on the formulaire step (asynchronous — see consistency.ts). */
  consistency: ConsistencyInfo | null;
}

export interface RequestStateMessage {
  type: 'edima:request-state';
}

/** F9: content script → background. `masked` must already have every
 * amount/name/date/number replaced by protect-values.ts — never send
 * unmasked text to the fallback server. */
export interface TranslateUnknownMessage {
  type: 'edima:translate-unknown';
  masked: string;
  language: LanguageCode;
}

/** D5: side panel → content script, switches the active language and
 * triggers an immediate re-scan of the current page. */
export interface SetLanguageMessage {
  type: 'edima:set-language';
  language: LanguageCode;
}

export interface TranslateUnknownResponse {
  /** null covers every failure mode the same way: no key configured yet,
   * network error, non-2xx response — the caller always falls back to the
   * French original, never guesses. */
  translated: string | null;
}

/** D4: content script → background, sent whenever the formulaire step's
 * montant field changes, so it survives the navigation to récapitulatif. */
export interface SaveEnteredAmountMessage {
  type: 'edima:save-entered-amount';
  amount: number;
}

export interface GetEnteredAmountMessage {
  type: 'edima:get-entered-amount';
}

export interface GetEnteredAmountResponse {
  amount: number | null;
}

export type ExtensionMessage =
  | PageTranslatedMessage
  | RequestStateMessage
  | TranslateUnknownMessage
  | SaveEnteredAmountMessage
  | GetEnteredAmountMessage
  | SetLanguageMessage;
