import { describe, expect, it } from 'vitest';
import { checkConsistency } from './consistency';

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
