import { z } from 'zod';

export const LanguageCode = z.enum(['ewo', 'dua']);
export type LanguageCode = z.infer<typeof LanguageCode>;

const TranslationStatus = z.enum(['a_traduire', 'a_valider', 'valide']);

/** One glossary entry. `fr` is always authoritative; `ewo`/`dua` start empty
 * until the linguist fills them in, and a term is never shown to users until
 * its status is "valide". Shape mirrors a flat spreadsheet export (one row
 * per term) so the linguist's sheet maps onto this directly. */
export const GlossaryTermSchema = z.object({
  id: z.string(),
  category: z.string(),
  fr: z.string(),
  ewo: z.string().nullable(),
  dua: z.string().nullable(),
  status: TranslationStatus,
});
export type GlossaryTerm = z.infer<typeof GlossaryTermSchema>;

/** A reusable sentence with `{placeholders}` for protected values
 * (amount, name, fees, ...), e.g. "Tu vas envoyer {montant} à {nom}." */
export const TemplatePhraseSchema = z.object({
  id: z.string(),
  category: z.string(),
  fr: z.string(),
  variables: z.array(z.string()),
  ewo: z.string().nullable(),
  dua: z.string().nullable(),
  status: TranslationStatus,
});
export type TemplatePhrase = z.infer<typeof TemplatePhraseSchema>;

/** Where a translated string came from — drives the D1 reliability badge and
 * the D3 transparency panel ("validé" vs "IA — non vérifié"). */
export const TranslationSourceSchema = z.enum(['glossaire', 'phrase_modele', 'ia']);
export type TranslationSource = z.infer<typeof TranslationSourceSchema>;

export const TranslationResultSchema = z.object({
  original: z.string(),
  translated: z.string(),
  language: LanguageCode,
  source: TranslationSourceSchema,
  /** false if F10's reinsertion check failed — caller must fall back to `original`. */
  valuesVerified: z.boolean(),
});
export type TranslationResult = z.infer<typeof TranslationResultSchema>;
