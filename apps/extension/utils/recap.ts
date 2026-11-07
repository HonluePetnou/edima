// F6: récapitulatif avant confirmation. Same label-matching heuristic as
// F2's solde/frais detection (no site-specific selectors — matches the
// jury's "étape 3 sur 3" screen and the mocked one alike), extended to the
// three values the acceptance test checks: montant, bénéficiaire, frais.

import { extractPhoneNumber, phoneToWords } from 'edima-shared';
import type { TranslatedLine } from './messages';

const AMOUNT_PATTERN = /\d[\d\s ]*\s?(FCFA|F\s?CFA|francs?)/i;

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

  for (let i = 0; i < lines.length; i++) {
    const label = lines[i]?.text ?? '';
    const value = lines[i + 1]?.text;
    if (!value) continue;

    if (!info.beneficiaire && /b[ée]n[ée]ficiaire|destinataire/i.test(label)) {
      info.beneficiaire = value;
      const phone = extractPhoneNumber(value);
      if (phone) info.beneficiairePhoneWords = phoneToWords(phone);
    }
    if (!info.total && /total/i.test(label) && AMOUNT_PATTERN.test(value)) {
      info.total = value;
    } else if (!info.frais && /^frais/i.test(label) && AMOUNT_PATTERN.test(value)) {
      info.frais = value;
    } else if (!info.montant && /montant|tu envoies/i.test(label) && AMOUNT_PATTERN.test(value)) {
      info.montant = value;
    }
  }

  const found = info.beneficiaire || info.montant || info.frais || info.total;
  return found ? info : null;
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
