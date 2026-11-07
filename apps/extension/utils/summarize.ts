// F2: "Lis-moi cette page" — a short spoken summary (solde, frais, état,
// actions possibles). Keyword-based on purpose, like the rest of F1/F11:
// no site-specific selectors, so it degrades gracefully on an unknown page
// instead of finding nothing silently.

import type { TranslatedLine } from './messages';

const AMOUNT_PATTERN = /\d[\d\s ]*\s?(FCFA|F\s?CFA|francs?)/i;
const ALERT_KEYWORDS = /(attention|avertissement|sécurité|erreur|jamais|secret)/i;

export function summarizePage(lines: TranslatedLine[], buttonLabels: string[]): string {
  const parts: string[] = [];

  let solde: string | null = null;
  let frais: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i]?.text;
    if (!text || !AMOUNT_PATTERN.test(text)) continue;
    const label = lines[i - 1]?.text ?? '';
    if (!solde && /solde/i.test(label)) solde = text;
    if (!frais && /frais/i.test(label)) frais = text;
  }

  if (solde) parts.push(`Ton solde disponible est de ${solde}.`);
  if (frais) parts.push(`Les frais affichés sont de ${frais}.`);

  // Short alert-like lines first (F7 says warnings take priority elsewhere;
  // here it just earns a mention in the summary).
  const alert = lines.find((l) => ALERT_KEYWORDS.test(l.text) && l.text.length < 160);
  if (alert) parts.push(`Avertissement : ${alert.text}`);

  if (buttonLabels.length > 0) {
    parts.push(`Tu peux : ${buttonLabels.slice(0, 4).join(', ')}.`);
  }

  if (parts.length === 0) {
    parts.push("Edima n'a pas trouvé de solde, de frais ni d'avertissement clairs sur cette page.");
  }

  return parts.join(' ');
}
