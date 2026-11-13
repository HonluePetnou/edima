// F-9: known glossary vocabulary is masked the same way protect-values.ts
// masks amounts/names before text reaches the IA fallback (F9/content.tsx) —
// so the model never has to (and can't) retranslate a term we already
// trust. Reinsertion puts back OUR glossary translation, not the model's
// guess, keeping the same word said the same way everywhere it appears.

import { glossaryTerms, isShownTranslation } from './glossary';
import type { LanguageCode } from './schemas';

export interface MaskedTerm {
  token: string;
  original: string;
  translation: string;
}

export interface TermMaskResult {
  masked: string;
  terms: MaskedTerm[];
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Longer phrases first: "montant total" is masked whole rather than leaving
// a dangling "total" that a shorter term could then partially re-match.
const termsBySpecificity = [...glossaryTerms].sort((a, b) => b.fr.length - a.fr.length);

/**
 * Masks every known glossary term found inside `text` for `language`. Only
 * terms with a shown translation (`valide` or `a_valider`) are candidates —
 * anything else has no translation worth injecting, and masking it would
 * just send the model a token for a word it already handles fine itself.
 */
export function extractGlossaryTerms(text: string, language: LanguageCode): TermMaskResult {
  const statusKey = `${language}_status` as const;
  let masked = text;
  const terms: MaskedTerm[] = [];

  for (const term of termsBySpecificity) {
    const translation = term[language];
    if (!isShownTranslation(term[statusKey]) || !translation) continue;

    // Fresh RegExp per term: a stateful /g object reused across .test() and
    // .replace() calls would silently skip matches after the first.
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(term.fr)}(?![\\p{L}\\p{N}])`, 'giu');
    const token = `{{T:${term.id}}}`;
    const next = masked.replace(pattern, token);
    if (next !== masked) {
      masked = next;
      terms.push({ token, original: term.fr, translation });
    }
  }

  return { masked, terms };
}

export function reinsertGlossaryTerms(modelOutput: string, terms: MaskedTerm[]): string {
  let result = modelOutput;
  for (const { token, translation } of terms) {
    result = result.split(token).join(translation);
  }
  return result;
}

/** Every masked term's token must survive the model's output untouched — if
 * it dropped or mangled one, the line doesn't get to claim a consistency it
 * doesn't actually have; the caller falls back the same way F10 does for
 * a protected-value mismatch. */
export function verifyTermsIntact(modelOutput: string, terms: MaskedTerm[]): boolean {
  return terms.every(({ token }) => modelOutput.includes(token));
}
