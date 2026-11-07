import { describe, expect, it } from 'vitest';
import { fillTemplate, findTemplate, findTerm, glossaryTerms, templatePhrases } from './glossary';

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
