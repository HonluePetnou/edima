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
export function fillTemplate(template: TemplatePhrase, values: Record<string, string>, language: LanguageCode = 'dua'): string {
  const statusKey = `${language}_status` as const;
  const status = template[statusKey];
  const translated = template[language];

  const baseText = (status === 'valide' && translated) ? translated : template.fr;

  return template.variables.reduce(
    (text, name) => text.replaceAll(`{${name}}`, values[name] ?? `{${name}}`),
    baseText,
  );
}

export interface TemplateMatch {
  template: TemplatePhrase;
  values: Record<string, string>;
}

function normalizeLiteral(text: string): string {
  return text
    .replace(/[«»"]/g, '"')
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ');
}

function normalizeForMatch(text: string): string {
  return normalizeLiteral(text).trim();
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Longer French sentences first: if two templates could match, the more
// specific one wins (e.g. a sentence with a phone number over a short one).
const templatesBySpecificity = [...templatePhrases].sort((a, b) => b.fr.length - a.fr.length);

/**
 * F9: matches a visible French sentence against a validated template phrase
 * and captures its `{variables}`. This is deliberately a whole-string match:
 * partial matches would translate only half a sentence and leave the rest in
 * French. Only templates validated for `language` are considered.
 */
export function matchTemplatePhrase(text: string, language: LanguageCode): TemplateMatch | null {
  const normalizedText = normalizeForMatch(text);
  if (!normalizedText) return null;

  const statusKey = `${language}_status` as const;

  for (const template of templatesBySpecificity) {
    if (template[statusKey] !== 'valide' || !template[language]) continue;

    const names: string[] = [];
    const pattern = template.fr
      .split(/(\{[^{}]+\})/g)
      .map((part) => {
        const placeholder = part.match(/^\{([^{}]+)\}$/);
        if (placeholder) {
          const name = placeholder[1]!.trim();
          if (template.variables.includes(name)) {
            names.push(name);
            return '(.+?)';
          }
          return escapeRegExp(part);
        }
        return escapeRegExp(normalizeLiteral(part)).replace(/ /g, '\\s+');
      })
      .join('');

    const match = new RegExp(`^${pattern}$`, 'i').exec(normalizedText);
    if (!match) continue;

    const values: Record<string, string> = {};
    names.forEach((name, index) => {
      const value = match[index + 1]?.trim();
      if (value) values[name] = value;
    });
    return { template, values };
  }

  return null;
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
  status: 'a_traduire' | 'a_valider' | 'valide' | null;
}

/**
 * F1/F9's exact glossary lookup. Template sentences are handled separately
 * by matchTemplatePhrase(); the IA fallback is the content script's last
 * step for genuinely unseen text.
 *
 * F10/D9's fallback rule applies here too: an unmatched string, or a term
 * whose `{language}_status` isn't yet "valide", is shown as the original
 * French rather than an invented or unverified translation.
 */
export function translateText(text: string, language: LanguageCode): TranslateResult {
  const term = termsByNormalizedFr.get(normalize(text));
  const translated = term?.[language];
  const statusKey = `${language}_status` as const;
  const status = term?.[statusKey] ?? null;

  if (term && status === 'valide' && translated) {
    return { original: text, text: translated, source: 'glossaire', status };
  }
  return { original: text, text, source: 'original', status };
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
