export interface TranslatedLine {
  original: string;
  text: string;
  source: 'glossaire' | 'original';
  /** F4: the amount in words, when this line is (or contains) an FCFA amount. */
  spokenAmount?: string;
}

export interface PageTranslatedMessage {
  type: 'edima:page-translated';
  url: string;
  lines: TranslatedLine[];
  buttonLabels: string[];
  /** F7: short, keyword-matched warning lines, most recent last. */
  warnings: string[];
}

export interface RequestStateMessage {
  type: 'edima:request-state';
}

export type ExtensionMessage = PageTranslatedMessage | RequestStateMessage;
