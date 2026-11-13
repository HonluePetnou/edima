import { describe, expect, it } from 'vitest';
import { checkConsistency, checkRecapArithmetic } from './consistency';

describe('checkConsistency', () => {
  it('reports a match when the amounts are identical', () => {
    const result = checkConsistency(5000, '5 000 FCFA');
    expect(result).toEqual({
      status: 'match',
      enteredAmount: 5000,
      recapAmount: 5000,
      message: 'Montant vérifié — correspond à ta saisie.',
    });
  });

  it('reports a mismatch and names both amounts clearly', () => {
    const result = checkConsistency(5000, '500 000 FCFA');
    expect(result?.status).toBe('mismatch');
    expect(result?.message).toContain('5 000 FCFA');
    expect(result?.message).toContain('500 000 FCFA');
  });

  it('returns null when nothing was captured on the formulaire step', () => {
    expect(checkConsistency(null, '5 000 FCFA')).toBeNull();
  });

  it('returns null when the récap text has no parseable amount', () => {
    expect(checkConsistency(5000, 'Bénéficiaire')).toBeNull();
  });
});

describe('checkRecapArithmetic', () => {
  it('reports a match when montant + frais = total', () => {
    const result = checkRecapArithmetic({ montant: '5 000 FCFA', frais: '100 FCFA', total: '5 100 FCFA' });
    expect(result).toEqual({
      status: 'match',
      enteredAmount: 5100,
      recapAmount: 5100,
      message: 'Le total correspond bien au montant plus les frais.',
    });
  });

  it('reports a mismatch and names all three amounts (simulated tampered page)', () => {
    const result = checkRecapArithmetic({ montant: '5 000 FCFA', frais: '100 FCFA', total: '50 000 FCFA' });
    expect(result?.status).toBe('mismatch');
    expect(result?.message).toContain('5 000 FCFA');
    expect(result?.message).toContain('100 FCFA');
    expect(result?.message).toContain('5 100 FCFA'); // the expected sum
    expect(result?.message).toContain('50 000 FCFA');
  });

  it('returns null when any of the three fields is missing', () => {
    expect(checkRecapArithmetic({ montant: null, frais: '100 FCFA', total: '5 100 FCFA' })).toBeNull();
    expect(checkRecapArithmetic({ montant: '5 000 FCFA', frais: null, total: '5 100 FCFA' })).toBeNull();
    expect(checkRecapArithmetic({ montant: '5 000 FCFA', frais: '100 FCFA', total: null })).toBeNull();
  });

  it('returns null when a field has no parseable amount', () => {
    expect(checkRecapArithmetic({ montant: 'Bénéficiaire', frais: '100 FCFA', total: '5 100 FCFA' })).toBeNull();
  });
});
