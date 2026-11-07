import { describe, expect, it } from 'vitest';
import { amountToWords, extractPhoneNumber, numberToFrenchWords, parseFcfaAmount, phoneToWords, speakAmount } from './numbers';

describe('numberToFrenchWords', () => {
  const cases: [number, string][] = [
    [0, 'zéro'],
    [1, 'un'],
    [9, 'neuf'],
    [10, 'dix'],
    [16, 'seize'],
    [17, 'dix-sept'],
    [20, 'vingt'],
    [21, 'vingt et un'],
    [22, 'vingt-deux'],
    [30, 'trente'],
    [31, 'trente et un'],
    [60, 'soixante'],
    [61, 'soixante et un'],
    [69, 'soixante-neuf'],
    [70, 'soixante-dix'],
    [71, 'soixante et onze'],
    [72, 'soixante-douze'],
    [79, 'soixante-dix-neuf'],
    [80, 'quatre-vingts'],
    [81, 'quatre-vingt-un'],
    [89, 'quatre-vingt-neuf'],
    [90, 'quatre-vingt-dix'],
    [91, 'quatre-vingt-onze'],
    [99, 'quatre-vingt-dix-neuf'],
    [100, 'cent'],
    [101, 'cent un'],
    [200, 'deux cents'],
    [201, 'deux cent un'],
    [999, 'neuf cent quatre-vingt-dix-neuf'],
    [1000, 'mille'],
    [1001, 'mille un'],
    [2000, 'deux mille'],
    [5000, 'cinq mille'],
    [5100, 'cinq mille cent'],
    [100000, 'cent mille'],
    [245500, 'deux cent quarante-cinq mille cinq cents'],
    [1000000, 'un million'],
    [2000000, 'deux millions'],
  ];

  for (const [input, expected] of cases) {
    it(`reads ${input} as "${expected}"`, () => {
      expect(numberToFrenchWords(input)).toBe(expected);
    });
  }

  it('rejects negative numbers', () => {
    expect(() => numberToFrenchWords(-1)).toThrow();
  });

  it('rejects non-integers', () => {
    expect(() => numberToFrenchWords(1.5)).toThrow();
  });

  it('rejects numbers at or above a billion', () => {
    expect(() => numberToFrenchWords(1_000_000_000)).toThrow();
  });
});

describe('parseFcfaAmount', () => {
  it('parses the exact strings used across the mock screens', () => {
    expect(parseFcfaAmount('245 500 FCFA')).toBe(245500);
    expect(parseFcfaAmount('5 000 FCFA')).toBe(5000);
    expect(parseFcfaAmount('100 FCFA')).toBe(100);
    expect(parseFcfaAmount('5 100 FCFA')).toBe(5100);
  });

  it('returns null for text with no amount', () => {
    expect(parseFcfaAmount('Bénéficiaire')).toBeNull();
  });
});

describe('amountToWords', () => {
  it('matches the spoken forms already used in the Figma mocks', () => {
    expect(amountToWords(245500, 'fr')).toBe('deux cent quarante-cinq mille cinq cents francs');
    expect(amountToWords(5000, 'fr')).toBe('cinq mille francs');
    expect(amountToWords(100, 'fr')).toBe('cent francs');
    expect(amountToWords(5100, 'fr')).toBe('cinq mille cent francs');
  });

  it('uses the singular for exactly 1', () => {
    expect(amountToWords(1, 'fr')).toBe('un franc');
  });

  it('returns null for a language with no number grammar yet', () => {
    expect(amountToWords(100, 'ewo')).toBeNull();
    expect(amountToWords(100, 'dua')).toBeNull();
  });
});

describe('speakAmount', () => {
  it('parses and converts in one step', () => {
    expect(speakAmount('5 000 FCFA', 'fr')).toBe('cinq mille francs');
  });

  it('returns null when there is nothing to parse', () => {
    expect(speakAmount('Bénéficiaire', 'fr')).toBeNull();
  });
});

describe('extractPhoneNumber', () => {
  it('finds a Cameroonian number inside a longer line', () => {
    expect(extractPhoneNumber('Paul Mballa — 6 99 12 34 56')).toBe('6 99 12 34 56');
  });

  it('returns null when there is no phone number', () => {
    expect(extractPhoneNumber('Bénéficiaire')).toBeNull();
  });
});

describe('phoneToWords', () => {
  it('reads a 9-digit mobile number the Cameroonian way: one digit, then pairs', () => {
    expect(phoneToWords('699123456')).toBe('six, quatre-vingt-dix-neuf, douze, trente-quatre, cinquante-six');
  });

  it('ignores any spacing or punctuation already in the input', () => {
    expect(phoneToWords('6 99 12 34 56')).toBe('six, quatre-vingt-dix-neuf, douze, trente-quatre, cinquante-six');
  });

  it('reads a leading-zero group as "zéro X", not just X', () => {
    expect(phoneToWords('05')).toBe('zéro cinq');
    expect(phoneToWords('00')).toBe('zéro zéro');
  });

  it('groups a purely even-length number into pairs with no leading single digit', () => {
    expect(phoneToWords('1234')).toBe('douze, trente-quatre');
  });

  it('returns an empty string for input with no digits', () => {
    expect(phoneToWords('abc')).toBe('');
  });
});
