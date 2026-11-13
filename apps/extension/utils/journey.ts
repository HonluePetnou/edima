// F5: parcours guidé. The cahier's own glossary term names the three steps
// explicitly (etape_1_sur_3_consulter_solde, etape_2_sur_3_remplir,
// etape_3_sur_3_verifier) — classification below mirrors that order.
// F7's warnings are deliberately NOT a 4th step here: they interrupt
// independently of wherever the user is in this flow.

import type { TranslatedLine } from './messages';

export type StepId = 'solde' | 'formulaire' | 'recapitulatif';

export interface StepInfo {
  id: StepId;
  index: 1 | 2 | 3;
  total: 3;
  label: string;
}

const STEPS: Record<StepId, StepInfo> = {
  solde: { id: 'solde', index: 1, total: 3, label: 'Consulter le solde' },
  formulaire: { id: 'formulaire', index: 2, total: 3, label: 'Remplir le formulaire' },
  recapitulatif: { id: 'recapitulatif', index: 3, total: 3, label: 'Vérifier le récapitulatif' },
};

const AMOUNT_PATTERN = /\d[\d\s ]*\s?(FCFA|F\s?CFA|francs?)/i;

function hasSoldeMention(lines: TranslatedLine[]): boolean {
  return lines.some((line, i) => /solde/i.test(line.original) && AMOUNT_PATTERN.test(lines[i + 1]?.original ?? line.original));
}

/**
 * Priority order matters: a récapitulatif page can still contain form-like
 * markup (disabled inputs, etc.), and a formulaire page often repeats the
 * balance in a header — the most *specific* signal wins.
 */
export function classifyStep(lines: TranslatedLine[], hasFormFields: boolean, hasRecap: boolean): StepInfo | null {
  if (hasRecap) return STEPS.recapitulatif;
  if (hasFormFields) return STEPS.formulaire;
  if (hasSoldeMention(lines)) return STEPS.solde;
  return null;
}
