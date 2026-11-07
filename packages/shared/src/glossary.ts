import { z } from 'zod';
import termsData from '../data/glossary/terms.json';
import templatesData from '../data/glossary/templates.json';
import { GlossaryTermSchema, TemplatePhraseSchema, type GlossaryTerm, type TemplatePhrase } from './schemas';

// Validated at import time: a malformed glossary entry fails the build
// instead of reaching the user as a silent gap.
export const glossaryTerms: GlossaryTerm[] = z.array(GlossaryTermSchema).parse(termsData);
export const templatePhrases: TemplatePhrase[] = z.array(TemplatePhraseSchema).parse(templatesData);

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
