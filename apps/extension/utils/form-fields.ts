// F5's "explication de chaque champ": describes every fillable field on the
// page. No site-specific selectors — matches on the standard form controls
// plus whatever label the page itself provides (F11).

const FIELD_SELECTOR = 'input:not([type=hidden]):not([type=submit]):not([type=button]), textarea, select';

const KNOWN_FIELD_DESCRIPTIONS: Record<string, string> = {
  bénéficiaire: 'La personne qui va recevoir l’argent.',
  destinataire: 'La personne qui va recevoir l’argent.',
  montant: 'Combien tu envoies.',
  'montant à envoyer': 'Combien tu envoies.',
  message: 'Un message facultatif, pour expliquer pourquoi tu envoies cet argent.',
  'nom du bénéficiaire': 'Le nom de la personne qui va recevoir l’argent. Écris-le exactement.',
  'numéro de téléphone': 'Le numéro de la personne qui reçoit l’argent. Vérifie-le deux fois.',
  'motif du transfert': 'Pourquoi tu envoies cet argent, par exemple « loyer » ou « famille ».',
  'note (optionnel)': 'Un petit mot facultatif. Tu peux laisser vide.',
  "type d'opération": 'Où va l’argent : un compte de la même banque, Mobile Money ou une autre banque.',
};

export interface FormField {
  element: HTMLElement;
  label: string;
  description: string;
}

function labelFor(el: HTMLElement): string {
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel.trim();

  if (el.id) {
    const labelEl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (labelEl?.textContent) return labelEl.textContent.trim();
  }

  const closestLabel = el.closest('label');
  if (closestLabel?.textContent) return closestLabel.textContent.trim();

  const placeholder = el.getAttribute('placeholder');
  if (placeholder) return placeholder.trim();

  return visualLabel(el);
}

const LABEL_MAX = 60;

/** Fallback for pages that show a caption above the field without wiring it
 * as a <label> (the SAFINUM test page does this): the nearest short text
 * just before the field, walking up a few container levels. textContent,
 * not innerText, so a CSS `text-transform: uppercase` caption comes back
 * in its real casing ("Montant à envoyer"). */
function visualLabel(el: HTMLElement): string {
  let node: Element | null = el;
  for (let depth = 0; node && depth < 4; depth++, node = node.parentElement) {
    let sibling = node.previousElementSibling;
    while (sibling) {
      if (!sibling.querySelector(FIELD_SELECTOR) && !sibling.matches(FIELD_SELECTOR)) {
        const text = sibling.textContent?.replace(/\s+/g, ' ').trim() ?? '';
        if (text.length >= 2 && text.length <= LABEL_MAX) return text;
        if (text.length > LABEL_MAX) break; // a paragraph, not a caption
      }
      sibling = sibling.previousElementSibling;
    }
  }
  return '';
}

export function findFormFields(root: ParentNode = document.body): FormField[] {
  const fields: FormField[] = [];
  for (const el of root.querySelectorAll<HTMLElement>(FIELD_SELECTOR)) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;

    const label = labelFor(el);
    if (!label) continue;

    const isCheckbox = el instanceof HTMLInputElement && el.type === 'checkbox';
    const description =
      KNOWN_FIELD_DESCRIPTIONS[label.toLowerCase()] ??
      (isCheckbox ? 'Coche cette case seulement si c’est vrai. Sinon, ne va pas plus loin.' : `Un champ à remplir : ${label}.`);
    fields.push({ element: el, label, description });
  }
  return fields;
}
