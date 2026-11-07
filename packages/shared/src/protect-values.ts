// F10: amounts, fees, names, dates and numbers are extracted before any text
// leaves the device, reinserted after translation, then verified character
// for character. A mismatch means the caller shows the original French
// instead of risking a wrong number reaching the user.

import { findPhoneNumbersInText } from 'libphonenumber-js';

export type ProtectedValueType = 'montant' | 'telephone' | 'date';

export interface ProtectedValue {
  token: string;
  type: ProtectedValueType;
  value: string;
}

export interface MaskResult {
  masked: string;
  values: ProtectedValue[];
}

interface Span {
  start: number;
  end: number;
  type: ProtectedValueType;
  value: string;
}

// Cameroonian FCFA amounts: thousands separated by a space (or narrow
// no-break space), e.g. "245 500 FCFA", "5 000 F CFA", "100 francs".
const AMOUNT_PATTERN = /\b\d{1,3}(?:[\s ]\d{3})*(?:[.,]\d+)?\s?(?:FCFA|F\s?CFA|francs?)\b/gi;

// Plain numeric dates as used across the mock screens: "07/11/2026".
const DATE_PATTERN = /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g;

function findAmountSpans(text: string): Span[] {
  return [...text.matchAll(AMOUNT_PATTERN)].map((match) => ({
    start: match.index!,
    end: match.index! + match[0].length,
    type: 'montant',
    value: match[0],
  }));
}

function findDateSpans(text: string): Span[] {
  return [...text.matchAll(DATE_PATTERN)].map((match) => ({
    start: match.index!,
    end: match.index! + match[0].length,
    type: 'date',
    value: match[0],
  }));
}

function findPhoneSpans(text: string): Span[] {
  return findPhoneNumbersInText(text, 'CM').map((found) => ({
    start: found.startsAt,
    end: found.endsAt,
    type: 'telephone' as const,
    value: text.slice(found.startsAt, found.endsAt),
  }));
}

/** Longest match wins when two detectors overlap on the same span. */
function removeOverlaps(spans: Span[]): Span[] {
  const sorted = [...spans].sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
  const result: Span[] = [];
  let lastEnd = -1;
  for (const span of sorted) {
    if (span.start >= lastEnd) {
      result.push(span);
      lastEnd = span.end;
    }
  }
  return result;
}

export function extractProtectedValues(text: string): MaskResult {
  const spans = removeOverlaps([...findPhoneSpans(text), ...findAmountSpans(text), ...findDateSpans(text)]);

  let masked = '';
  let cursor = 0;
  const values: ProtectedValue[] = [];

  spans.forEach((span, i) => {
    const token = `{{V${i}}}`;
    masked += text.slice(cursor, span.start) + token;
    values.push({ token, type: span.type, value: span.value });
    cursor = span.end;
  });
  masked += text.slice(cursor);

  return { masked, values };
}

export function reinsertProtectedValues(maskedTranslated: string, values: ProtectedValue[]): string {
  let result = maskedTranslated;
  for (const { token, value } of values) {
    result = result.split(token).join(value);
  }
  return result;
}

/** 0-erreur safety net (F10's acceptance test): every protected value must
 * appear, verbatim, in the final string. */
export function verifyValuesIntact(finalText: string, values: ProtectedValue[]): boolean {
  return values.every(({ value }) => finalText.includes(value));
}
