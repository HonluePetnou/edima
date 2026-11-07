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
