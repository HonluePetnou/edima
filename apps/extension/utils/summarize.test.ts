import { describe, expect, it } from 'vitest';
import { summarizePage } from './summarize';
import type { TranslatedLine } from './messages';

function line(text: string): TranslatedLine {
  return { original: text, text, source: 'original' };
}

describe('summarizePage', () => {
  it('reads solde, frais, an avertissement and the available actions', () => {
    const lines = [
      line('Solde disponible'),
      line('245 500 FCFA'),
      line('Frais'),
      line('100 FCFA'),
      line('Ne communiquez jamais votre code secret, même à un conseiller de la banque.'),
    ];
    const summary = summarizePage(lines, ["Envoyer de l'argent", 'Retirer']);

    expect(summary).toContain('Ton solde disponible est de 245 500 FCFA.');
    expect(summary).toContain('Les frais affichés sont de 100 FCFA.');
    expect(summary).toContain('Avertissement :');
    expect(summary).toContain("Tu peux : Envoyer de l'argent, Retirer.");
  });

  it('stays under 5 seconds worth of text (short, not a full page dump)', () => {
    const lines = [line('Solde disponible'), line('245 500 FCFA')];
    const summary = summarizePage(lines, ["Envoyer de l'argent", 'Retirer', 'Payer une facture']);
    // A generous proxy for "under 5s to read aloud": well under 400 characters.
    expect(summary.length).toBeLessThan(400);
  });

  it('says so honestly when nothing was found, instead of an empty string', () => {
    const summary = summarizePage([line('Bienvenue sur notre site')], []);
    expect(summary).toBe("Edima n'a pas trouvé de solde, de frais ni d'avertissement clairs sur cette page.");
  });

  it('does not confuse an unrelated amount for solde or frais', () => {
    const lines = [line('Transfert reçu — Paul Mballa'), line('+10 000 FCFA')];
    const summary = summarizePage(lines, []);
    expect(summary).not.toContain('Ton solde disponible');
    expect(summary).not.toContain('Les frais affichés');
  });
});
