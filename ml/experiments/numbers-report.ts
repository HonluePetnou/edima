// EXPERIMENTAL — prints every value 1..2999 from numbers-experimental.ts
// with its confidence tier, so the gap between "confirmed" and "guessed"
// is visible as a block rather than scattered through code comments.
import { duala1to99, duala100to999, duala1000plus } from './numbers-experimental';

function entry(n: number) {
  if (n < 100) return duala1to99(n);
  if (n < 1000) return duala100to999(n);
  return duala1000plus(n);
}

const tally: Record<string, number> = { confirmee: 0, haute: 0, speculative: 0 };
const samples = [1, 2, 5, 9, 10, 11, 20, 22, 29, 30, 35, 42, 59, 60, 67, 90, 99,
  100, 150, 200, 250, 300, 345, 500, 999,
  1000, 1200, 1500, 2000, 2345, 2999];

console.log('valeur\tduala\tconfiance\tnote');
for (const n of samples) {
  const e = entry(n);
  tally[e.confidence] = (tally[e.confidence] ?? 0) + 1;
  console.log(`${e.value}\t${e.dua}\t${e.confidence}\t${e.note ?? ''}`);
}

console.log('\n--- tally sur cet échantillon ---');
for (const [k, v] of Object.entries(tally)) console.log(`${k}: ${v}`);
