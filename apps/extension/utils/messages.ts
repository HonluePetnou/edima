export interface TranslatedLine {
  original: string;
  text: string;
  source: 'glossaire' | 'original';
}

export interface PageTranslatedMessage {
  type: 'edima:page-translated';
  url: string;
  lines: TranslatedLine[];
}

export interface RequestStateMessage {
  type: 'edima:request-state';
}

export type ExtensionMessage = PageTranslatedMessage | RequestStateMessage;
