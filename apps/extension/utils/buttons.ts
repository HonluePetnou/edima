// F3: describes every clickable element on the page. The description text
// itself is a heuristic for now — a real NLU/LLM pass (F9) can replace
// `guessAction` later without touching the hover-detection plumbing below.

import { fillTemplate, findTemplate } from 'edima-shared';

const INTERACTIVE_SELECTOR = 'button, a[href], [role="button"], input[type="button"], input[type="submit"]';

/** Known actions for the vocabulary already in the glossary (F3's test page
 * uses these exact labels). Anything else gets a generic description. */
const KNOWN_ACTIONS: Record<string, string> = {
  "envoyer de l'argent": "envoyer de l'argent à quelqu'un",
  retirer: 'retirer de l’argent à un guichet',
  'payer une facture': "payer une facture, comme l'électricité ou l'eau",
  confirmer: 'valider cette opération',
  'confirmer le transfert': "valider et envoyer l'argent — cette action est irréversible",
  annuler: "arrêter cette opération, rien n'est envoyé",
  accueil: "revenir à la page d'accueil",
  comptes: 'voir tes comptes',
  virements: 'faire ou consulter un virement',
  aide: "ouvrir l'aide",
};

export interface DescribedElement {
  element: HTMLElement;
  label: string;
  description: string;
}

export function findInteractiveElements(root: ParentNode = document.body): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(INTERACTIVE_SELECTOR)].filter((el) => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
}

function labelFor(el: HTMLElement): string {
  const ariaLabel = el.getAttribute('aria-label');
  const text = ariaLabel || el.textContent || '';
  return text.trim().replace(/\s+/g, ' ');
}

export function describeElement(el: HTMLElement): DescribedElement | null {
  const label = labelFor(el);
  if (!label) return null;

  const action = KNOWN_ACTIONS[label.toLowerCase()] ?? `fait une action liée à « ${label} »`;
  const template = findTemplate('tpl_bouton_sert_a');
  const description = template ? fillTemplate(template, { bouton: label, description: action }) : `${label} : ${action}`;

  return { element: el, label, description };
}
