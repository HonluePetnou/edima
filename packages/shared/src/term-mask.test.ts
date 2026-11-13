import { describe, expect, it } from 'vitest';
import { findTerm } from './glossary';
import { extractGlossaryTerms, reinsertGlossaryTerms, verifyTermsIntact } from './term-mask';

const frais = findTerm('frais')!;
const beneficiaire = findTerm('beneficiaire')!;
const envoyerArgent = findTerm('envoyer_argent')!;
const token = (id: string) => `{{T:${id}}}`;

describe('extractGlossaryTerms', () => {
  it('masks a known term found inside a larger sentence', () => {
    const { masked, terms } = extractGlossaryTerms('Les frais de ce transfert sont offerts.', 'dua');
    expect(masked).toBe(`Les ${token('frais')} de ce transfert sont offerts.`);
    expect(terms).toEqual([{ token: token('frais'), original: 'Frais', translation: frais.dua }]);
  });

  it('masks several known terms in the same sentence, case-insensitively', () => {
    const { masked, terms } = extractGlossaryTerms("ENVOYER DE L'ARGENT au bénéficiaire que tu as choisi.", 'dua');
    expect(masked).toContain(token('envoyer_argent'));
    expect(masked).toContain(token('beneficiaire'));
    expect(terms.map((t) => t.token).sort()).toEqual([token('beneficiaire'), token('envoyer_argent')].sort());
  });

  it('does not match a term as a mere substring of another word', () => {
    // "frais" must not fire inside "rafraîchissement" or similar run-ons.
    const { masked, terms } = extractGlossaryTerms('Un rafraichissement de la page a eu lieu.', 'dua');
    expect(masked).toBe('Un rafraichissement de la page a eu lieu.');
    expect(terms).toEqual([]);
  });

  it('leaves text with no known term untouched', () => {
    const { masked, terms } = extractGlossaryTerms('Ceci est une phrase totalement inconnue.', 'dua');
    expect(masked).toBe('Ceci est une phrase totalement inconnue.');
    expect(terms).toEqual([]);
  });

  it('never masks a term whose status is only "a_traduire" (no shown translation)', () => {
    // Ewondo has no shown translations at all yet (cahier des charges / ETAT-PROJET.md).
    const { masked, terms } = extractGlossaryTerms('Les frais de ce transfert sont offerts.', 'ewo');
    expect(masked).toBe('Les frais de ce transfert sont offerts.');
    expect(terms).toEqual([]);
  });
});

describe('reinsertGlossaryTerms', () => {
  it('replaces every token with the glossary translation, not the French', () => {
    const { masked, terms } = extractGlossaryTerms('Les frais sont offerts.', 'dua');
    const modelOutput = masked.replace('Les', 'E').replace('sont offerts.', 'na ofert.');
    const result = reinsertGlossaryTerms(modelOutput, terms);
    expect(result).toContain(frais.dua);
    expect(result).not.toContain('{{T:');
  });

  it('replaces every occurrence of a repeated term', () => {
    const { masked, terms } = extractGlossaryTerms('Frais puis encore des frais.', 'dua');
    const result = reinsertGlossaryTerms(masked, terms);
    expect(result).toBe(`${frais.dua} puis encore des ${frais.dua}.`);
  });
});

describe('verifyTermsIntact', () => {
  it('passes when every token survived the model output', () => {
    const { masked, terms } = extractGlossaryTerms('Les frais pour le bénéficiaire.', 'dua');
    expect(verifyTermsIntact(masked, terms)).toBe(true);
  });

  it('fails when the model dropped or mangled a token', () => {
    const { terms } = extractGlossaryTerms('Les frais pour le bénéficiaire.', 'dua');
    expect(verifyTermsIntact('Les frais seulement, rien d’autre.', terms)).toBe(false);
  });
});
