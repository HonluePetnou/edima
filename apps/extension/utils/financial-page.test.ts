import { describe, expect, it } from 'vitest';
import { isFinancialPage } from './financial-page';
import type { TranslatedLine } from './messages';

const line = (original: string): TranslatedLine => ({ original, text: original, source: 'original' });

describe('isFinancialPage', () => {
  it('accepts a page with a recognised journey step', () => {
    expect(isFinancialPage([], { id: 'formulaire', index: 2, total: 3, label: 'Remplir le formulaire' })).toBe(true);
  });

  it('accepts a balance page with two distinct banking cues', () => {
    expect(isFinancialPage([line('Solde disponible'), line('245 500 FCFA')], null)).toBe(true);
  });

  it('rejects a shop page that only shows a price in FCFA', () => {
    expect(isFinancialPage([line('Chaussures en cuir'), line('12 000 FCFA'), line('Ajouter au panier')], null)).toBe(false);
  });

  it('does not count the same cue twice', () => {
    expect(isFinancialPage([line('Frais de port'), line('Frais de livraison')], null)).toBe(false);
  });

  it('rejects an empty page', () => {
    expect(isFinancialPage([], null)).toBe(false);
  });
});
