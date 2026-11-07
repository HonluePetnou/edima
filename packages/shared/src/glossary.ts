import { z } from 'zod';
import termsData from '../data/glossary/terms.json';
import templatesData from '../data/glossary/templates.json';
import explanationsData from '../data/glossary/explanations.json';
import {
  ExplanationSchema,
  GlossaryTermSchema,
  TemplatePhraseSchema,
  type Explanation,
  type GlossaryTerm,
  type LanguageCode,
  type TemplatePhrase,
} from './schemas';

// Validated at import time: a malformed glossary entry fails the build
// instead of reaching the user as a silent gap.
export const glossaryTerms: GlossaryTerm[] = z.array(GlossaryTermSchema).parse(termsData);
export const templatePhrases: TemplatePhrase[] = z.array(TemplatePhraseSchema).parse(templatesData);
export const explanations: Explanation[] = z.array(ExplanationSchema).parse(explanationsData);

export function findTerm(id: string): GlossaryTerm | undefined {
  return glossaryTerms.find((term) => term.id === id);
}

export function findTemplate(id: string): TemplatePhrase | undefined {
  return templatePhrases.find((template) => template.id === id);
}

/**
 * Fills a template's `{placeholder}` slots. Callers must only pass values
 * that already went through `protect-values.ts` (or are already-trusted
 * app state like a chosen beneficiary name) — this function does no
 * extraction or verification of its own.
 */
export function fillTemplate(template: TemplatePhrase, values: Record<string, string>): string {
  // TODO (Phase 2): read from template.ewo / template.dua once a status is
  // "valide" for the active language, falling back to `fr` until then.
  return template.variables.reduce(
    (text, name) => text.replaceAll(`{${name}}`, values[name] ?? `{${name}}`),
    template.fr,
  );
}

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

const termsByNormalizedFr = new Map(glossaryTerms.map((term) => [normalize(term.fr), term]));

export interface TranslateResult {
  original: string;
  text: string;
  source: 'glossaire' | 'original';
  /** The matched term's status, or null if nothing in the glossary matched this exact string. */
  status: GlossaryTerm['status'] | null;
}

/**
 * F1's first and only link for now (phrases-modèles and IA come in later —
 * F9). Exact, whitespace-normalized match against the glossary.
 *
 * F10/D9's fallback rule applies here too: an unmatched string, or a term
 * that isn't yet `status: "valide"`, is shown as the original French rather
 * than an invented or unverified translation.
 */
export function translateText(text: string, language: LanguageCode): TranslateResult {
  const term = termsByNormalizedFr.get(normalize(text));
  const translated = term?.[language];

  if (term && term.status === 'valide' && translated) {
    return { original: text, text: translated, source: 'glossaire', status: term.status };
  }
  return { original: text, text, source: 'original', status: term?.status ?? null };
}

const explanationByTermId = new Map(explanations.map((e) => [e.termId, e]));

/**
 * D10 "Explique-moi ce mot" — looks up a plain-language gloss by matching
 * `text` against the glossary's own `fr` field, same normalization as
 * translateText(). Deliberately independent of translation status: knowing
 * what "frais" means doesn't require ewondo/duala to be ready yet.
 */
export function findExplanationForText(text: string): Explanation | null {
  const term = termsByNormalizedFr.get(normalize(text));
  if (!term) return null;
  return explanationByTermId.get(term.id) ?? null;
}
