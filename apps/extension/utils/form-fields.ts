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

  return '';
}

export function findFormFields(root: ParentNode = document.body): FormField[] {
  const fields: FormField[] = [];
  for (const el of root.querySelectorAll<HTMLElement>(FIELD_SELECTOR)) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;

    const label = labelFor(el);
    if (!label) continue;

    const description = KNOWN_FIELD_DESCRIPTIONS[label.toLowerCase()] ?? `Un champ à remplir : ${label}.`;
    fields.push({ element: el, label, description });
  }
  return fields;
}
