// F6: récapitulatif avant confirmation. Same label-matching heuristic as
// F2's solde/frais detection (no site-specific selectors — matches the
// jury's "étape 3 sur 3" screen and the mocked one alike), extended to the
// three values the acceptance test checks: montant, bénéficiaire, frais.

import { extractPhoneNumber, phoneToWords } from 'edima-shared';
import type { TranslatedLine } from './messages';

const AMOUNT_PATTERN = /\d[\d\s ]*\s?(FCFA|F\s?CFA|francs?)/i;
// A recap label is a short caption ("Bénéficiaire", "Nom du destinataire"),
// never a sentence that merely mentions the word.
const BENEFICIAIRE_LABEL = /^(nom du |nom de la )?(b[ée]n[ée]ficiaire|destinataire)\s*:?$/i;
// Step and section names: a "Bénéficiaire" caption followed by one of these
// is a stepper or a menu, not the recap's beneficiary line.
const NOT_A_NAME = /^(solde|frais|b[ée]n[ée]ficiaire|r[ée]capitulatif|confirmation|re[çc]u|montant|total|t[ée]l[ée]phone|r[ée]f[ée]rence|op[ée]ration|motif|note)\b/i;
const LABEL_MAX = 40;
const VALUE_MAX = 60;

export interface RecapInfo {
  beneficiaire: string | null;
  montant: string | null;
  frais: string | null;
  total: string | null;
  /** D12: the bénéficiaire's phone number, read in pairs the Cameroonian
   * way — null when no phone number is found inside `beneficiaire`. */
  beneficiairePhoneWords: string | null;
}

/** Returns null when the page doesn't look like a confirmation screen at all. */
export function extractRecap(lines: TranslatedLine[]): RecapInfo | null {
  const info: RecapInfo = {
    beneficiaire: null,
    montant: null,
    frais: null,
    total: null,
    beneficiairePhoneWords: null,
  };

  // Labels are matched on the bank's own wording (`original`): once a label
  // is translated its `text` no longer says "Montant", "Frais", etc.
  const beneficiaires: { index: number; value: string }[] = [];
  let montantIndex = -1;
  let phoneLine: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const label = lines[i]?.original ?? '';
    const value = lines[i + 1]?.original;
    if (!value || label.length > LABEL_MAX) continue;

    if (BENEFICIAIRE_LABEL.test(label.trim()) && value.length <= VALUE_MAX && !AMOUNT_PATTERN.test(value) && !NOT_A_NAME.test(value.trim())) {
      beneficiaires.push({ index: i, value });
    }
    if (!phoneLine && /^(t[ée]l[ée]phone|num[ée]ro( de t[ée]l[ée]phone)?)\s*:?$/i.test(label.trim())) phoneLine = value;
    if (!info.total && /total/i.test(label) && AMOUNT_PATTERN.test(value)) {
      info.total = value;
    } else if (!info.frais && /^frais/i.test(label) && AMOUNT_PATTERN.test(value)) {
      info.frais = value;
    } else if (!info.montant && /montant|tu envoies/i.test(label) && AMOUNT_PATTERN.test(value)) {
      info.montant = value;
      montantIndex = i;
    }
  }

  // "Bénéficiaire" can also be a step name in the page's stepper; the one
  // that belongs to the recap sits closest to the amount.
  const closest = [...beneficiaires].sort((a, b) => Math.abs(a.index - montantIndex) - Math.abs(b.index - montantIndex))[0];
  if (closest) {
    info.beneficiaire = closest.value;
    // D12: the phone sits inside the name line on some pages, on its own
    // "Téléphone" line on others (SAFINUM).
    const phone = extractPhoneNumber(closest.value) ?? (phoneLine ? extractPhoneNumber(phoneLine) : null);
    if (phone) info.beneficiairePhoneWords = phoneToWords(phone);
  }

  // A confirmation screen shows who gets the money, how much, and what it
  // costs. A balance or form page that only shows a running total doesn't.
  const isRecap = !!info.beneficiaire && !!info.montant && !!(info.frais || info.total);
  return isRecap ? info : null;
}

export function formatRecapSummary(info: RecapInfo): string {
  const parts: string[] = [];
  if (info.montant) parts.push(`Montant envoyé : ${info.montant}.`);
  if (info.beneficiaire) {
    const phone = info.beneficiairePhoneWords ? ` Numéro : ${info.beneficiairePhoneWords}.` : '';
    parts.push(`Bénéficiaire : ${info.beneficiaire}.${phone}`);
  }
  if (info.frais) parts.push(`Frais : ${info.frais}.`);
  if (info.total) parts.push(`Total débité de ton compte : ${info.total}.`);
  if (parts.length === 0) return '';
  return `Récapitulatif avant confirmation. ${parts.join(' ')}`;
}
