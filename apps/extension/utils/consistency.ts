// D4: contrôle de cohérence. Compares the amount the user typed into the
// formulaire step against the one the récapitulatif screen displays —
// catches a site bug, a stale cached page, or (worst case) a tampered
// confirmation screen before the user clicks confirm.

import { parseFcfaAmount } from 'edima-shared';

export type ConsistencyStatus = 'match' | 'mismatch';

export interface ConsistencyInfo {
  status: ConsistencyStatus;
  enteredAmount: number;
  recapAmount: number;
  message: string;
}

function formatFcfa(n: number): string {
  return `${n.toLocaleString('fr-FR').replace(/[  ]/g, ' ')} FCFA`;
}

/** F-3: montant + frais should equal the total the récap shows. Unlike
 * `checkConsistency` (D4), this needs nothing the user typed — it catches a
 * tampered or buggy confirmation screen even before any formulaire step
 * captured an amount, by checking the récap's own arithmetic against itself. */
export function checkRecapArithmetic(recap: { montant: string | null; frais: string | null; total: string | null }): ConsistencyInfo | null {
  if (!recap.montant || !recap.frais || !recap.total) return null;
  const montant = parseFcfaAmount(recap.montant);
  const frais = parseFcfaAmount(recap.frais);
  const total = parseFcfaAmount(recap.total);
  if (montant === null || frais === null || total === null) return null;

  const expected = montant + frais;
  if (expected === total) {
    return { status: 'match', enteredAmount: expected, recapAmount: total, message: 'Le total correspond bien au montant plus les frais.' };
  }
  return {
    status: 'mismatch',
    enteredAmount: expected,
    recapAmount: total,
    message: `Attention : ${formatFcfa(montant)} plus ${formatFcfa(frais)} de frais devrait faire ${formatFcfa(expected)}, mais le total affiché est ${formatFcfa(total)}. Vérifie avant de confirmer.`,
  };
}

/** Returns null when there's nothing to compare yet (no stored entry, or
 * the récap text isn't a parseable amount) — never a false "it matches". */
export function checkConsistency(enteredAmount: number | null, recapAmountText: string | null): ConsistencyInfo | null {
  if (enteredAmount === null || !recapAmountText) return null;
  const recapAmount = parseFcfaAmount(recapAmountText);
  if (recapAmount === null) return null;

  if (recapAmount === enteredAmount) {
    return { status: 'match', enteredAmount, recapAmount, message: 'Montant vérifié — correspond à ta saisie.' };
  }
  return {
    status: 'mismatch',
    enteredAmount,
    recapAmount,
    message: `Attention : tu avais saisi ${formatFcfa(enteredAmount)}, mais le récapitulatif affiche ${formatFcfa(recapAmount)}. Vérifie avant de confirmer.`,
  };
}
