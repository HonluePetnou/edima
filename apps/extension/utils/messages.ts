import type { RecapInfo } from './recap';
import type { StepInfo } from './journey';

export interface TranslatedLine {
  original: string;
  text: string;
  /** "ia" (F9) means: matched neither the glossary nor a template phrase,
   * and the fallback server's response survived F10's value check. Shown
   * with a "non vérifié" badge (D1) — never treated as validated. */
  source: 'glossaire' | 'ia' | 'original';
  /** F4: the amount in words, when this line is (or contains) an FCFA amount. */
  spokenAmount?: string;
}

export interface FieldDescription {
  label: string;
  description: string;
}

export interface PageTranslatedMessage {
  type: 'edima:page-translated';
  url: string;
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
  language: 'ewo' | 'dua';
}

export interface TranslateUnknownResponse {
  /** null covers every failure mode the same way: no key configured yet,
   * network error, non-2xx response — the caller always falls back to the
   * French original, never guesses. */
  translated: string | null;
}

export type ExtensionMessage = PageTranslatedMessage | RequestStateMessage | TranslateUnknownMessage;
