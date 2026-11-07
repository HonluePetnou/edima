import { describe, expect, it } from 'vitest';
import { findWarningLines } from './warnings';
import type { TranslatedLine } from './messages';

function line(text: string): TranslatedLine {
  return { original: text, text, source: 'original' };
}

describe('findWarningLines', () => {
  it('catches the exact warning lines used across the mock screens', () => {
    // Known limit: a heading with no keyword of its own (e.g. "Ce n'est pas
    // ta banque") isn't caught by this line alone — the body text right
    // next to it always is, which is what actually gets read aloud.
    const lines = [
      line('Mon compte courant'),
      line('Ne communiquez jamais votre code secret, même à un conseiller de la banque.'),
      line('Arnaque possible'),
      line('Erreur — transfert refusé'),
      line('Dernières opérations'),
    ];
    const found = findWarningLines(lines).map((l) => l.text);
    expect(found).toContain('Ne communiquez jamais votre code secret, même à un conseiller de la banque.');
    expect(found).toContain('Arnaque possible');
    expect(found).toContain('Erreur — transfert refusé');
    expect(found).not.toContain('Mon compte courant');
    expect(found).not.toContain('Dernières opérations');
  });

  it('matches English keywords too (F1 covers French and English pages)', () => {
    const found = findWarningLines([line('Warning: never share your PIN with anyone.')]);
    expect(found).toHaveLength(1);
  });

  it('ignores long paragraphs even if they contain a keyword', () => {
    const longText = 'attention '.repeat(30); // way over the 200-char cutoff
    expect(findWarningLines([line(longText)])).toHaveLength(0);
  });

  it('returns an empty array when nothing matches', () => {
    expect(findWarningLines([line('Bonjour'), line('Comptes')])).toEqual([]);
  });
});
