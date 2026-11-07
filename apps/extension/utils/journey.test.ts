import { describe, expect, it } from 'vitest';
import { classifyStep } from './journey';
import type { TranslatedLine } from './messages';

function line(text: string): TranslatedLine {
  return { original: text, text, source: 'original' };
}

describe('classifyStep', () => {
  it('recognises the balance-consultation step', () => {
    const lines = [line('Solde disponible'), line('245 500 FCFA')];
    const step = classifyStep(lines, false, false);
    expect(step).toEqual({ id: 'solde', index: 1, total: 3, label: 'Consulter le solde' });
  });

  it('recognises the form-filling step when the page has fillable fields', () => {
    const step = classifyStep([line('Envoyer de l’argent')], true, false);
    expect(step).toEqual({ id: 'formulaire', index: 2, total: 3, label: 'Remplir le formulaire' });
  });

  it('recognises the récapitulatif step, which takes priority over a lingering form', () => {
    const step = classifyStep([line('Récapitulatif du transfert')], true, true);
    expect(step?.id).toBe('recapitulatif');
    expect(step?.index).toBe(3);
  });

  it('returns null on a page that matches none of the three steps', () => {
    expect(classifyStep([line('Bienvenue sur notre site')], false, false)).toBeNull();
  });
});
