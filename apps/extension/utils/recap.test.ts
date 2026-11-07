import { describe, expect, it } from 'vitest';
import { extractRecap, formatRecapSummary } from './recap';
import type { TranslatedLine } from './messages';

function line(text: string): TranslatedLine {
  return { original: text, text, source: 'original' };
}

describe('extractRecap', () => {
  it('reads bénéficiaire, montant, frais, total and the spoken phone number', () => {
    const lines = [
      line('Étape 3 sur 3'),
      line('Récapitulatif du transfert'),
      line('Bénéficiaire'),
      line('Paul Mballa — 6 99 12 34 56'),
      line('Montant envoyé'),
      line('5 000 FCFA'),
      line('Frais'),
      line('100 FCFA'),
      line('Total débité'),
      line('5 100 FCFA'),
    ];

    const recap = extractRecap(lines);
    expect(recap).toEqual({
      beneficiaire: 'Paul Mballa — 6 99 12 34 56',
      montant: '5 000 FCFA',
      frais: '100 FCFA',
      total: '5 100 FCFA',
      beneficiairePhoneWords: 'six, quatre-vingt-dix-neuf, douze, trente-quatre, cinquante-six',
    });
  });

  it('returns null on a page with nothing recap-shaped', () => {
    expect(extractRecap([line('Mon compte courant'), line('Dernières opérations')])).toBeNull();
  });

  it('returns partial info rather than discarding what it did find', () => {
    const recap = extractRecap([line('Montant envoyé'), line('5 000 FCFA')]);
    expect(recap).toEqual({
      beneficiaire: null,
      montant: '5 000 FCFA',
      frais: null,
      total: null,
      beneficiairePhoneWords: null,
    });
  });

  it('leaves beneficiairePhoneWords null when the name carries no phone number', () => {
    const recap = extractRecap([line('Bénéficiaire'), line('Paul Mballa')]);
    expect(recap?.beneficiairePhoneWords).toBeNull();
  });
});

describe('formatRecapSummary', () => {
  it('reads montant, bénéficiaire (with phone) and frais clearly, in that order', () => {
    const summary = formatRecapSummary({
      beneficiaire: 'Paul Mballa — 6 99 12 34 56',
      montant: '5 000 FCFA',
      frais: '100 FCFA',
      total: '5 100 FCFA',
      beneficiairePhoneWords: 'six, quatre-vingt-dix-neuf, douze, trente-quatre, cinquante-six',
    });
    expect(summary).toBe(
      'Récapitulatif avant confirmation. Montant envoyé : 5 000 FCFA. ' +
        'Bénéficiaire : Paul Mballa — 6 99 12 34 56. Numéro : six, quatre-vingt-dix-neuf, douze, trente-quatre, cinquante-six. ' +
        'Frais : 100 FCFA. Total débité de ton compte : 5 100 FCFA.',
    );
  });

  it('returns an empty string when there is nothing to read', () => {
    expect(
      formatRecapSummary({ beneficiaire: null, montant: null, frais: null, total: null, beneficiairePhoneWords: null }),
    ).toBe('');
  });
});
