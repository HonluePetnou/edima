import { describe, expect, it } from 'vitest';
import {
  explanations,
  fillTemplate,
  findExplanationForText,
  findTemplate,
  findTerm,
  glossaryTerms,
  matchTemplatePhrase,
  templatePhrases,
  translateText,
} from './glossary';

describe('glossary data', () => {
  it('loads and validates every term', () => {
    expect(glossaryTerms.length).toBeGreaterThan(0);
    for (const term of glossaryTerms) {
      expect(term.ewo_status).toBe('a_traduire');
      expect(term.dua_status).toBe('a_traduire');
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

  it('keeps every translation placeholder-complete', () => {
    for (const template of templatePhrases) {
      for (const language of ['ewo', 'dua'] as const) {
        const status = template[`${language}_status`];
        const translated = template[language];

        if (status === 'valide') {
          expect(translated, `${template.id} is valide without a ${language} translation`).toBeTruthy();
        }
        if (!translated) continue;

        for (const variable of template.variables) {
          expect(translated, `${template.id} ${language} is missing {${variable}}`).toContain(`{${variable}}`);
        }
        for (const placeholder of translated.matchAll(/\{([^{}]+)\}/g)) {
          expect(
            template.variables,
            `${template.id} ${language} has undeclared {${placeholder[1]!.trim()}}`,
          ).toContain(placeholder[1]!.trim());
        }
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
    const result = fillTemplate(template, { montant: '5 000 FCFA', nom: 'Paul Mballa' }, 'ewo');
    expect(result).toBe('Tu vas envoyer 5 000 FCFA à Paul Mballa.');
  });

  it('leaves an unmatched placeholder visibly unresolved rather than guessing', () => {
    const template = findTemplate('tpl_envoi_montant_nom')!;
    const result = fillTemplate(template, { montant: '5 000 FCFA' }, 'ewo');
    expect(result).toBe('Tu vas envoyer 5 000 FCFA à {nom}.');
  });

  it('fills the validated duala template while preserving protected values', () => {
    const template = findTemplate('tpl_envoi_montant_nom')!;
    expect(template.dua_status).toBe('valide');
    const result = fillTemplate(template, { montant: '5 000 FCFA', nom: 'Paul Mballa' });
    expect(result).toContain('5 000 FCFA');
    expect(result).toContain('Paul Mballa');
    expect(result).not.toContain('{');
    expect(result).not.toBe(template.fr);
  });

  it('uses the duala column once that template is valide, independent of ewondo', () => {
    const template = findTemplate('tpl_envoi_montant_nom')!;
    const originalStatus = template.dua_status;
    const originalDua = template.dua;
    try {
      template.dua_status = 'valide';
      template.dua = 'U la tila {montant} i {nom}.';
      const values = { montant: '5 000 FCFA', nom: 'Paul Mballa' };
      expect(fillTemplate(template, values, 'dua')).toBe('U la tila 5 000 FCFA i Paul Mballa.');
      expect(fillTemplate(template, values, 'ewo')).toBe('Tu vas envoyer 5 000 FCFA à Paul Mballa.');
    } finally {
      template.dua_status = originalStatus;
      template.dua = originalDua;
    }
  });
});

describe('matchTemplatePhrase', () => {
  it('captures amount and name from a validated sentence', () => {
    const match = matchTemplatePhrase('Tu vas envoyer 5 000 FCFA à Paul Mballa.', 'dua');
    expect(match?.template.id).toBe('tpl_envoi_montant_nom');
    expect(match?.values).toEqual({ montant: '5 000 FCFA', nom: 'Paul Mballa' });
  });

  it('is tolerant of case, repeated spaces and apostrophe style', () => {
    const match = matchTemplatePhrase('  tu   vas ENVOYER 5 000 FCFA à   Paul Mballa.  ', 'dua');
    expect(match?.template.id).toBe('tpl_envoi_montant_nom');
    expect(match?.values.nom).toBe('Paul Mballa');

    expect(matchTemplatePhrase('Aujourd’hui, 13 novembre 2026.', 'dua')?.values.date).toBe('13 novembre 2026');
  });

  it('matches a sentence without variables', () => {
    const match = matchTemplatePhrase('edima LIT ce passage.', 'dua');
    expect(match?.template.id).toBe('tpl_edima_lit_passage');
    expect(match?.values).toEqual({});
  });

  it('captures the phone number in the longer sentence', () => {
    const match = matchTemplatePhrase('Tu envoies 5 000 FCFA à Paul Mballa, numéro 6 99 12 34 56.', 'dua');
    expect(match?.template.id).toBe('tpl_envoi_complet');
    expect(match?.values).toEqual({
      montant: '5 000 FCFA',
      nom: 'Paul Mballa',
      telephone: '6 99 12 34 56',
    });
  });

  it('captures a button label inside typographic quotes', () => {
    const match = matchTemplatePhrase('Si tout est juste, clique toi-même sur « Confirmer ».', 'dua');
    expect(match?.template.id).toBe('tpl_clique_toi_meme');
    expect(match?.values).toEqual({ bouton: 'Confirmer' });
  });

  it('captures variables independently of their declaration order', () => {
    const match = matchTemplatePhrase('Transfert reçu de Paul Mballa, 5 000 FCFA.', 'dua');
    expect(match?.template.id).toBe('tpl_transfert_recu_de');
    expect(match?.values).toEqual({ nom: 'Paul Mballa', montant: '5 000 FCFA' });
  });

  it('only matches templates validated for the requested language', () => {
    expect(matchTemplatePhrase('Tu vas envoyer 5 000 FCFA à Paul Mballa.', 'ewo')).toBeNull();
  });

  it('does not match a template that is still empty', () => {
    expect(matchTemplatePhrase('Retrait au guichet, 5 000 FCFA.', 'dua')).toBeNull();
  });

  it('does not match an unrelated sentence', () => {
    expect(matchTemplatePhrase('Bienvenue sur notre site.', 'dua')).toBeNull();
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
    const originalStatus = term.ewo_status;
    const originalEwo = term.ewo;
    try {
      term.ewo_status = 'valide';
      term.ewo = 'Ndoŋ ye mony ye ô kôló';
      const result = translateText('Solde disponible', 'ewo');
      expect(result).toEqual({
        original: 'Solde disponible',
        text: 'Ndoŋ ye mony ye ô kôló',
        source: 'glossaire',
        status: 'valide',
      });
    } finally {
      term.ewo_status = originalStatus;
      term.ewo = originalEwo;
    }
  });

  it('uses the duala translation once a term is dua_status valide', () => {
    const term = glossaryTerms.find((t) => t.id === 'solde_disponible')!;
    const originalStatus = term.dua_status;
    const originalDua = term.dua;
    try {
      term.dua_status = 'valide';
      term.dua = 'Ndoŋ ye mony ye ô kôló';
      const result = translateText('Solde disponible', 'dua');
      expect(result).toEqual({
        original: 'Solde disponible',
        text: 'Ndoŋ ye mony ye ô kôló',
        source: 'glossaire',
        status: 'valide',
      });
      expect(translateText('Solde disponible', 'ewo').source).toBe('original');
    } finally {
      term.dua_status = originalStatus;
      term.dua = originalDua;
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
