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

  it('is not a recap without who, how much and what it costs', () => {
    // A form page showing a running total (SAFINUM "Frais" step) is not a recap.
    expect(extractRecap([line('Montant envoyé'), line('5 000 FCFA')])).toBeNull();
    expect(extractRecap([line('Total à débiter'), line('25 000 FCFA'), line('Solde après opération'), line('225 000 FCFA')])).toBeNull();
  });

  it('leaves beneficiairePhoneWords null when the name carries no phone number', () => {
    const recap = extractRecap([line('Bénéficiaire'), line('Paul Mballa'), line('Montant'), line('15 000 FCFA'), line('Frais'), line('0 FCFA')]);
    expect(recap?.beneficiairePhoneWords).toBeNull();
  });

  it('ignores a sentence that merely mentions the bénéficiaire', () => {
    // SAFINUM sidebar: a long safety tip followed by "Connexion sécurisée".
    const lines = [line('Vérifiez toujours le nom et le numéro du bénéficiaire avant de confirmer un transfert.'), line('Connexion sécurisée')];
    expect(extractRecap(lines)).toBeNull();
  });

  it('picks the recap bénéficiaire, not the stepper step of the same name', () => {
    const recap = extractRecap([
      line('Solde'), line('Frais'), line('Bénéficiaire'), line('Récapitulatif'), line('Confirmation'),
      line('Montant'), line('15 000 FCFA'), line('Frais'), line('0 FCFA'), line('Total débité'), line('15 000 FCFA'),
      line('Bénéficiaire'), line('Paul Mballa'), line('Téléphone'), line('699123456'),
    ]);
    expect(recap?.beneficiaire).toBe('Paul Mballa');
    expect(recap?.beneficiairePhoneWords).toBeTruthy();
  });

  it('reads the SAFINUM recap even when its labels are displayed translated', () => {
    const t = (original: string, text: string): TranslatedLine => ({ original, text, source: 'a_valider' });
    const recap = extractRecap([
      line('Montant'), line('15 000 FCFA'),
      line('Frais'), line('0 FCFA'),
      t('Total débité', 'mujsousou mou soumuabé'), line('15 000 FCFA'),
      t('Bénéficiaire', 'mukousédi'), line('Paul Mballa'),
      line('Téléphone'), line('699123456'),
    ]);
    expect(recap).toMatchObject({ beneficiaire: 'Paul Mballa', montant: '15 000 FCFA', frais: '0 FCFA', total: '15 000 FCFA' });
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
