// F4: montants dits en mots, chiffre toujours affiché à côté. French is the
// only language implemented so far — `amountToWords` returns null for
// ewo/dua until the linguist delivers the number grammar (the cahier
// explicitly flags ewondo/duala numbers as complex and "à valider en
// priorité"). The French implementation below is also the reference
// `num2words`-style module the linguist's modules are meant to match.

import type { LanguageCode } from './schemas';

const ONES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
const TEENS = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const TENS_WORD = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];

function wordsUnder100(n: number): string {
  if (n < 10) return ONES[n]!;
  if (n < 20) return TEENS[n - 10]!;
  if (n < 70) {
    const tens = Math.floor(n / 10);
    const tensWord = TENS_WORD[tens]!;
    const unit = n % 10;
    if (unit === 0) return tensWord;
    if (unit === 1) return `${tensWord} et un`;
    return `${tensWord}-${ONES[unit]}`;
  }
  if (n < 80) {
    const remainder = n - 60; // 10..19
    if (remainder === 11) return 'soixante et onze';
    return `soixante-${TEENS[remainder - 10]}`;
  }
  // 80..99
  const remainder = n - 80; // 0..19
  if (remainder === 0) return 'quatre-vingts';
  if (remainder < 10) return `quatre-vingt-${ONES[remainder]}`;
  return `quatre-vingt-${TEENS[remainder - 10]}`;
}

function wordsUnderThousand(n: number): string {
  if (n < 100) return wordsUnder100(n);
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const hundredsWord = hundreds === 1 ? 'cent' : `${ONES[hundreds]} cent${rest === 0 ? 's' : ''}`;
  if (rest === 0) return hundredsWord;
  return `${hundredsWord} ${wordsUnder100(rest)}`;
}

/** Integers from 0 up to 999,999,999. FCFA amounts never need more. */
export function numberToFrenchWords(n: number): string {
  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError('numberToFrenchWords expects a non-negative integer');
  }
  if (n >= 1_000_000_000) {
    throw new RangeError('numberToFrenchWords only supports values below 1 000 000 000');
  }
  if (n === 0) return 'zéro';

  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;

  const parts: string[] = [];
  if (millions > 0) {
    parts.push(millions === 1 ? 'un million' : `${wordsUnderThousand(millions)} millions`);
  }
  if (thousands > 0) {
    parts.push(thousands === 1 ? 'mille' : `${wordsUnderThousand(thousands)} mille`);
  }
  if (rest > 0) {
    parts.push(wordsUnderThousand(rest));
  }
  return parts.join(' ');
}

/** Extracts the integer value from an FCFA amount string like "245 500 FCFA". */
export function parseFcfaAmount(text: string): number | null {
  const match = text.match(/(\d[\d\s ]*)(?:[.,]\d+)?\s?(?:FCFA|F\s?CFA|francs?)/i);
  if (!match || !match[1]) return null;
  const digits = match[1].replace(/[\s ]/g, '');
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

/** Null means "no spoken form for this language yet" — callers must fall
 * back to showing the digits only, never invent a reading. */
export function amountToWords(amountFcfa: number, language: LanguageCode | 'fr'): string | null {
  if (language !== 'fr') return null; // awaiting the linguist's ewo/dua number grammar
  const words = numberToFrenchWords(amountFcfa);
  const unit = amountFcfa === 1 ? 'franc' : 'francs';
  return `${words} ${unit}`;
}

/** Convenience: parse + convert in one call, for a raw amount string. */
export function speakAmount(text: string, language: LanguageCode | 'fr'): string | null {
  const amount = parseFcfaAmount(text);
  if (amount === null) return null;
  return amountToWords(amount, language);
}
