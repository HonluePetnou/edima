import type { TranslatedLine } from './messages';
import type { StepInfo } from './journey';

// Words that only show up together on banking / mobile-money pages. One hit
// is not enough (a shop page can say "compte" or show a price in FCFA); two
// distinct cues, or a recognised journey step, are.
const CUES = [
  /\bsolde\b/i,
  /\bvirement/i,
  /\btransf[ée]r/i,
  /\bb[ée]n[ée]ficiaire/i,
  /\bmobile\s*money\b/i,
  /\bcode\s+secret\b/i,
  /\brelev[ée]/i,
  /\bfrais\b/i,
  /\b(?:FCFA|F\s?CFA|XAF)\b/,
  /\bn°\s*de\s*compte|\bnum[ée]ro\s+de\s+compte/i,
];

/** Decides whether the floating mascot should appear on this page. */
export function isFinancialPage(lines: TranslatedLine[], step: StepInfo | null): boolean {
  if (step) return true;
  const hits = new Set<number>();
  for (const { original } of lines) {
    CUES.forEach((re, i) => {
      if (re.test(original)) hits.add(i);
    });
    if (hits.size >= 2) return true;
  }
  return false;
}
