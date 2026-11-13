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
    const phone = values.find((v) => v.type === 'telephone');
    expect(phone?.value.replace(/\s/g, '')).toContain('699123456');
    expect(masked).toContain(phone!.token);
    // The beneficiary's name is protected too — names are never translated.
    expect(values.find((v) => v.type === 'nom')?.value).toBe('Paul Mballa');
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

// Values from the SAFINUM hackathon test page — none may ever be translated.
describe('extractProtectedValues on SAFINUM values', () => {
  const kinds = (text: string) => extractProtectedValues(text).values.map((v) => [v.type, v.value]);

  it('masks a full person name', () => {
    expect(kinds('Bonjour, Amina Ngo Bell')).toContainEqual(['nom', 'Amina Ngo Bell']);
  });

  it('masks an account number', () => {
    expect(kinds('Numéro de compte : CM 001 2345 6789 01')).toContainEqual(['reference', 'CM 001 2345 6789 01']);
  });

  it('masks a transfer reference', () => {
    expect(kinds('Référence : TRX-2026-00042')).toContainEqual(['reference', 'TRX-2026-00042']);
  });

  it('masks a written date', () => {
    expect(kinds('Paiement marchand 05 nov. 2026')).toContainEqual(['date', '05 nov. 2026']);
  });

  it('masks a fee rate', () => {
    expect(kinds('Frais de 1,5 % (min. 100 FCFA, max. 2 500 FCFA)').map((k) => k[1])).toEqual(['1,5 %', '100 FCFA', '2 500 FCFA']);
  });

  it('leaves an ordinary sentence untouched', () => {
    const text = 'Vérifiez les informations avant de confirmer le transfert.';
    expect(extractProtectedValues(text)).toEqual({ masked: text, values: [] });
  });
});
