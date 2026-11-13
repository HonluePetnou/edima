// F7: avertissements et erreurs prioritaires. Two generic signals, neither
// tied to a specific site (F11): proper ARIA alert roles when the page uses
// them, and a French/English keyword fallback for everything else —
// including our own mock screens, which don't carry ARIA roles yet.

import type { TranslatedLine } from './messages';

const ALERT_SELECTOR = '[role="alert"], [role="alertdialog"], [aria-live="assertive"], [aria-live="polite"]';

export function findWarningElements(root: ParentNode = document.body): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(ALERT_SELECTOR)];
}

const WARNING_KEYWORDS =
  /(attention|avertissement|alerte|erreur|arnaque|refusé|insuffisant|code secret|n'y réponds pas|jamais|warning|alert|error|security warning|fraud|never|suspicious)/i;
// Plain "sécurité" was dropped: it matches headings ("Sécurité") and
// reassurances ("…en toute sécurité") that are not warnings at all.

/** Short, keyword-matching lines — long paragraphs are unlikely to be a
 * genuine warning banner and would make for an unreadable spoken alert. */
export function findWarningLines(lines: TranslatedLine[]): TranslatedLine[] {
  // Match on the page's own wording: once a line is translated, its `text`
  // no longer contains the French/English keywords.
  return lines.filter((line) => line.original.length < 200 && WARNING_KEYWORDS.test(line.original));
}
