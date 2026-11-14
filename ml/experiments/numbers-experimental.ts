// EXPERIMENTAL — branch experiment/invention-langue only. NOT imported by
// packages/shared or the extension. See README.md in this folder.
//
// Extends the 36 confirmed Duala number forms (MPI-EVA Channel Numerals,
// Dr. Francine Ebegne Ndedi, Univ. Yaoundé I, 2012 —
// https://lingweb.eva.mpg.de/channumerals/Duala.htm) past what the primary
// source actually gives, to see exactly how far a pattern-based guess can
// go and where it breaks — not to produce something shippable.
//
// The 36 confirmed forms, verbatim (tone marks as given: v̄=mid, v̂=falling,
// v́=rising, v̀=unmarked low):
//
//   1 ewɔ́          10 ɗôm              20 mwáɓā
//   2 ɓébǎ          11 ɗôm na ewɔ́       21 mwáɓā na ewɔ́
//   3 ɓélálo        12 ɗôm na ɓébǎ       22 mwáɓā na ɓébǎ
//   4 ɓénɛ́j         13 ɗôm na ɓélálo    23 mwáɓā na ɓélálo
//   5 ɓétánu        14 ɗôm na ɓénɛ́j     24 mwáɓā na ɓénɛ́j
//   6 mutóɓá        15 ɗôm na ɓétánu    25 mwáɓā na ɓétánu
//   7 sǎmbá         16 ɗôm na mutóɓá    26 mwáɓā na mutóɓá
//   8 lɔmbi         17 ɗôm na sǎmbá     27 mwáɓā na sǎmbá
//   9 dibuá         18 ɗôm na lɔmbi     28 mwáɓā na lɔmbi
//                   19 ɗôm na dibuá     29 mwáɓā na dibuá
//
//   30 mwalálo   40 mwánɛ́j   50 mwatánu   60 mǔmutóɓá
//   70 mǔsǎmbá   80 mǔlɔmbi   90 mǔdibuá
//   100 eɓwéa    200 ɓebwéa ɓéɓǎ    1000 ikólí    2000 lokólí lóɓǎ
//
// WHAT THE CONFIRMED DATA ALREADY PROVES ABOUT THE RISK:
// "2" alone is ɓébǎ. In "22" it stays ɓébǎ (ɗôm/mwáɓā na ɓébǎ — additive,
// unit unchanged). But in "200" it becomes ɓéɓǎ (ɓebwéa ɓéɓǎ) — a DIFFERENT
// form, agreeing with the class of "hundred" rather than being the
// standalone word. Same story for the multiplier noun itself: "hundred"
// alone is eɓwéa, but "two hundred" uses ɓebwéa, not eɓwéa — the noun's own
// class prefix shifts too (e- → ɓe-). "thousand" shows the identical
// pattern: ikólí alone vs. lokólí (i- → lo-) plus lóɓǎ (not ɓébǎ) for "two
// thousand". This is Bantu noun-class agreement: the multiplier and the
// multiplying digit both re-inflect together, in a way the tens (10-90)
// never show. We have exactly ONE data point for this phenomenon (the "2"
// case, at both 200 and 2000) — nowhere near enough to infer what 3-9
// become in that position.

export type Confidence =
  | 'confirmee' // the primary source gives this exact form
  | 'haute' // same "[base] na [unit]" pattern confirmed independently at two different decades (10s, 20s) before being extended here
  | 'speculative'; // extrapolated past the only data point available — likely wrong, kept only to show where naive extrapolation fails

export interface ExperimentalNumber {
  value: number;
  dua: string;
  confidence: Confidence;
  note?: string;
}

const UNITS = ['', 'ewɔ́', 'ɓébǎ', 'ɓélálo', 'ɓénɛ́j', 'ɓétánu', 'mutóɓá', 'sǎmbá', 'lɔmbi', 'dibuá'];
// The tens' own base word (30, 40, 50 already contract "mwa-" + root — see
// note below on 1-29 vs 30-99: these four are taken directly from the
// confirmed 11-29 range, not invented.
const TENS_WORD: Record<number, string> = {
  1: 'ɗôm',
  2: 'mwáɓā',
  3: 'mwalálo',
  4: 'mwánɛ́j',
  5: 'mwatánu',
  6: 'mǔmutóɓá',
  7: 'mǔsǎmbá',
  8: 'mǔlɔmbi',
  9: 'mǔdibuá',
};

/** 1-99. The 1-29 range is the confirmed source verbatim. The 30-99 range
 * reuses the EXACT "[tens word] na [unit]" structure the source confirms
 * twice over (ɗôm na X for 10s, mwáɓā na X for 20s) — the only part of this
 * file with a real evidence base for generalizing. */
export function duala1to99(n: number): ExperimentalNumber {
  if (n < 1 || n > 99 || !Number.isInteger(n)) throw new RangeError('duala1to99: 1-99 only');
  if (n < 10) return { value: n, dua: UNITS[n]!, confidence: 'confirmee' };
  const tens = Math.floor(n / 10);
  const unit = n % 10;
  const tensWord = TENS_WORD[tens]!;
  if (unit === 0) return { value: n, dua: tensWord, confidence: n <= 20 ? 'confirmee' : 'confirmee' };
  const confirmed = tens === 1 || tens === 2; // 11-19, 21-29 are the literal source rows
  return {
    value: n,
    dua: `${tensWord} na ${UNITS[unit]}`,
    confidence: confirmed ? 'confirmee' : 'haute',
    note: confirmed ? undefined : `extrapolé du schéma "[dizaine] na [unité]" confirmé pour 11-19 et 21-29`,
  };
}

/** 100-999 — SPECULATIVE past 200. We know 100=eɓwéa and 200=ɓebwéa ɓéɓǎ:
 * the multiplier noun re-inflects (e-→ɓe-) AND the digit "2" takes a
 * matching class form (ɓéɓǎ, not the standalone ɓébǎ). We have no data for
 * what 3-9 become in that same agreement slot. The function below does the
 * NAIVE thing — reuse the standalone unit word — specifically so the
 * mismatch with the one confirmed data point (ɓéɓǎ ≠ ɓébǎ) is visible
 * rather than hidden. Do not treat this as a real guess at the true form. */
export function duala100to999(n: number): ExperimentalNumber {
  if (n < 100 || n > 999 || !Number.isInteger(n)) throw new RangeError('duala100to999: 100-999 only');
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  let hundredsWord: string;
  let confidence: Confidence;
  let note: string | undefined;
  if (hundreds === 1) {
    hundredsWord = 'eɓwéa';
    confidence = 'confirmee';
  } else if (hundreds === 2) {
    hundredsWord = 'ɓebwéa ɓéɓǎ';
    confidence = 'confirmee';
  } else {
    // SPECULATIVE: naive "eɓwéa" + standalone unit — known to not match the
    // pattern the n=2 case shows (class agreement on both the noun and the
    // digit). Kept to document the failure mode, not as a usable output.
    hundredsWord = `eɓwéa ${UNITS[hundreds]}`;
    confidence = 'speculative';
    note = `forme non confirmée — "${UNITS[hundreds]}" est la forme autonome, pas la forme accordée avec "cent" (cf. 200 = ɓéɓǎ ≠ ɓébǎ autonome) ; la vraie forme est inconnue`;
  }
  if (rest === 0) return { value: n, dua: hundredsWord, confidence, note };
  const restNum = duala1to99(rest);
  return {
    value: n,
    dua: `${hundredsWord} na ${restNum.dua}`,
    confidence: confidence === 'confirmee' && restNum.confidence === 'confirmee' ? 'haute' : 'speculative',
    note: note ?? `connecteur "na" entre centaines et reste : supposé par analogie avec les dizaines, jamais observé entre centaines et unités dans la source`,
  };
}

/** 1000+ — same problem one order of magnitude up, plus an UNKNOWN
 * connector for "thousand and the rest" (never observed) and no word for
 * "francs" anywhere in the primary source. */
export function duala1000plus(n: number): ExperimentalNumber {
  if (n < 1000 || n > 999_999 || !Number.isInteger(n)) throw new RangeError('duala1000plus: 1000-999999 only');
  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  let thousandsWord: string;
  let confidence: Confidence;
  let note: string | undefined;
  if (thousands === 1) {
    thousandsWord = 'ikólí';
    confidence = 'confirmee';
  } else if (thousands === 2) {
    thousandsWord = 'lokólí lóɓǎ';
    confidence = 'confirmee';
  } else {
    thousandsWord = `ikólí ${UNITS[thousands] ?? duala1to99(thousands).dua}`;
    confidence = 'speculative';
    note = `forme non confirmée, même problème qu'aux centaines (cf. 2000 = lokólí lóɓǎ : le préfixe de classe de "mille" ET la forme de "2" changent tous les deux) — rien n'indique ce que deviennent 3 à 9 dans ce rôle`;
  }
  if (rest === 0) return { value: n, dua: thousandsWord, confidence, note };
  const restNum = rest < 100 ? duala1to99(rest) : duala100to999(rest);
  return {
    value: n,
    dua: `${thousandsWord} na ${restNum.dua}`,
    confidence: 'speculative',
    note: note ?? `connecteur "na" jamais observé entre mille et le reste — pure supposition par analogie`,
  };
}

/** No word for "francs"/currency appears anywhere in the primary source —
 * deliberately left unimplemented rather than guessed. */
export const DUALA_CURRENCY_WORD: null = null;
