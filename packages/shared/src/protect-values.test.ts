import { describe, expect, it } from 'vitest';
import { extractProtectedValues, reinsertProtectedValues, verifyValuesIntact } from './protect-values';

describe('extractProtectedValues', () => {
  it('masks an FCFA amount', () => {
    const { masked, values } = extractProtectedValues('Solde disponible 245 500 FCFA');
    expect(masked).toBe('Solde disponible {{V0}}');
    expect(values).toEqual([{ token: '{{V0}}', type: 'montant', value: '245 500 FCFA' }]);
  });

  it('masks several amounts in the same sentence', () => {
    const { masked, values } = extractProtectedValues('Montant 5 000 FCFA, frais 100 FCFA');
    expect(masked).toBe('Montant {{V0}}, frais {{V1}}');
    expect(values.map((v) => v.value)).toEqual(['5 000 FCFA', '100 FCFA']);
  });

  it('masks a Cameroonian phone number', () => {
    const { masked, values } = extractProtectedValues('Bénéficiaire : Paul Mballa, 6 99 12 34 56');
    expect(masked).toContain('{{V0}}');
    expect(values[0].type).toBe('telephone');
    expect(values[0].value.replace(/\s/g, '')).toContain('699123456');
  });

  it('masks a date', () => {
    const { masked, values } = extractProtectedValues("Aujourd'hui, 07/11/2026");
    expect(masked).toBe("Aujourd'hui, {{V0}}");
    expect(values[0]).toEqual({ token: '{{V0}}', type: 'date', value: '07/11/2026' });
  });

  it('leaves text with no protected values untouched', () => {
    const { masked, values } = extractProtectedValues('Ne donne jamais ton code secret');
    expect(masked).toBe('Ne donne jamais ton code secret');
    expect(values).toHaveLength(0);
  });
});

describe('reinsertProtectedValues', () => {
  it('restores every token with its original value', () => {
    const { masked, values } = extractProtectedValues('Frais 100 FCFA');
    // Simulate a translation that kept the token untouched.
    const translated = masked.replace('Frais', '[EWO: Frais]');
    const result = reinsertProtectedValues(translated, values);
    expect(result).toBe('[EWO: Frais] 100 FCFA');
  });
});

describe('verifyValuesIntact', () => {
  it('passes when every value survived translation', () => {
    const { masked, values } = extractProtectedValues('Total 5 100 FCFA');
    const final = reinsertProtectedValues(masked, values);
    expect(verifyValuesIntact(final, values)).toBe(true);
  });

  it('fails when the translation dropped or altered a value', () => {
    const { values } = extractProtectedValues('Total 5 100 FCFA');
    const corrupted = 'Total 5 000 FCFA'; // wrong amount, as if the model changed it
    expect(verifyValuesIntact(corrupted, values)).toBe(false);
  });
});
