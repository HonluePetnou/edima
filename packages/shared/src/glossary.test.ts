import { describe, expect, it } from 'vitest';
import {
  explanations,
  fillTemplate,
  findExplanationForText,
  findTemplate,
  findTerm,
  glossaryTerms,
  templatePhrases,
  translateText,
} from './glossary';

describe('glossary data', () => {
  it('loads and validates every term', () => {
    expect(glossaryTerms.length).toBeGreaterThan(0);
    for (const term of glossaryTerms) {
      expect(term.status).toBe('a_traduire');
      expect(term.ewo).toBeNull();
      expect(term.dua).toBeNull();
    }
  });

  it('loads and validates every template phrase', () => {
    expect(templatePhrases.length).toBeGreaterThan(0);
  });

  it('declares every {variable} it actually uses in its French text', () => {
    for (const template of templatePhrases) {
      for (const variable of template.variables) {
        expect(template.fr, `${template.id} is missing {${variable}}`).toContain(`{${variable}}`);
      }
    }
  });

  it('finds a known term and template by id', () => {
    expect(findTerm('solde_disponible')?.fr).toBe('Solde disponible');
    expect(findTemplate('tpl_envoi_montant_nom')?.fr).toBe('Tu vas envoyer {montant} à {nom}.');
  });

  it('every explanation references a real glossary term', () => {
    expect(explanations.length).toBeGreaterThan(0);
    for (const explanation of explanations) {
      expect(findTerm(explanation.termId), `${explanation.termId} has no matching glossary term`).toBeDefined();
    }
  });
});

describe('fillTemplate', () => {
  it('substitutes every placeholder', () => {
    const template = findTemplate('tpl_envoi_montant_nom')!;
    const result = fillTemplate(template, { montant: '5 000 FCFA', nom: 'Paul Mballa' });
    expect(result).toBe('Tu vas envoyer 5 000 FCFA à Paul Mballa.');
  });

  it('leaves an unmatched placeholder visibly unresolved rather than guessing', () => {
    const template = findTemplate('tpl_envoi_montant_nom')!;
    const result = fillTemplate(template, { montant: '5 000 FCFA' });
    expect(result).toBe('Tu vas envoyer 5 000 FCFA à {nom}.');
  });
});

describe('translateText', () => {
  it('falls back to the French original for an unmatched string', () => {
    const result = translateText('Un texte jamais vu sur aucune page', 'ewo');
    expect(result).toEqual({
      original: 'Un texte jamais vu sur aucune page',
      text: 'Un texte jamais vu sur aucune page',
      source: 'original',
      status: null,
    });
  });

  it('falls back to French for a known term that is not yet "valide"', () => {
    const result = translateText('Solde disponible', 'ewo');
    expect(result.source).toBe('original');
    expect(result.text).toBe('Solde disponible');
    expect(result.status).toBe('a_traduire');
  });

  it('matches regardless of surrounding whitespace or case', () => {
    const result = translateText('  solde DISPONIBLE  ', 'ewo');
    expect(result.status).toBe('a_traduire');
  });

  it('uses the glossary translation once a term is valide', () => {
    const term = glossaryTerms.find((t) => t.id === 'solde_disponible')!;
    const originalStatus = term.status;
    const originalEwo = term.ewo;
    try {
      term.status = 'valide';
      term.ewo = 'Ndoŋ ye mony ye ô kôló';
      const result = translateText('Solde disponible', 'ewo');
      expect(result).toEqual({
        original: 'Solde disponible',
        text: 'Ndoŋ ye mony ye ô kôló',
        source: 'glossaire',
        status: 'valide',
      });
    } finally {
      term.status = originalStatus;
      term.ewo = originalEwo;
    }
  });
});

describe('findExplanationForText', () => {
  it('finds a jargon explanation regardless of translation status', () => {
    const result = findExplanationForText('Frais');
    expect(result?.simple).toContain('garde');
    expect(result?.example).toContain('FCFA');
  });

  it('matches regardless of whitespace or case, like translateText', () => {
    expect(findExplanationForText('  frais  ')).not.toBeNull();
  });

  it('returns null for a term with no explanation written yet', () => {
    expect(findExplanationForText('Accueil')).toBeNull();
  });

  it('returns null for text that matches no glossary term at all', () => {
    expect(findExplanationForText('Un texte jamais vu')).toBeNull();
  });
});
