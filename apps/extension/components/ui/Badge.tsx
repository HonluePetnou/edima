import type { TranslatedLine } from '../../utils/messages';

const LABELS: Record<TranslatedLine['source'], string> = {
  glossaire: 'Validé',
  ia: 'IA — non vérifié',
  original: 'Français',
};

/** Dot + label rather than a filled pill: a status indicator reads as
 * editorial/trustworthy, a pastel pill reads as generic SaaS chrome. */
export function Badge({ tone }: { tone: TranslatedLine['source'] }) {
  return (
    <span class={`badge badge--${tone}`}>
      <span class="badge-dot" aria-hidden="true" />
      {LABELS[tone]}
    </span>
  );
}
