import { Icon, type IconName } from './Icon';
import type { TranslatedLine } from '../../utils/messages';

// "glossaire" only ever comes back from translateText() for terms whose
// status is "valide" — the only case that may claim linguist validation (D1).
const BADGES: Record<TranslatedLine['source'], { label: string; icon: IconName }> = {
  glossaire: { label: 'Validé par un linguiste', icon: 'check-circle' },
  ia: { label: 'IA — non vérifiée', icon: 'help' },
  original: { label: 'Texte original (français)', icon: 'info' },
};

export function Badge({ source }: { source: TranslatedLine['source'] }) {
  const { label, icon } = BADGES[source];
  return (
    <span class={`badge badge--${source}`}>
      <Icon name={icon} size={14} />
      {label}
    </span>
  );
}
