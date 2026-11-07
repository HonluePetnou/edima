import type { RecapInfo } from './recap';
import type { StepInfo } from './journey';

export interface TranslatedLine {
  original: string;
  text: string;
  source: 'glossaire' | 'original';
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

export type ExtensionMessage = PageTranslatedMessage | RequestStateMessage;
