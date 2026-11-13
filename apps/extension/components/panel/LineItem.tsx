import { Icon, type IconName } from '../ui/Icon';
import { ListenButton } from '../ui/Button';
import { Badge } from '../ui/Badge';
import type { TranslatedLine } from '../../utils/messages';

/** Picks a glyph from the line's own words — purely decorative. */
function iconFor(text: string): IconName {
  const t = text.toLowerCase();
  if (/fcfa|solde|montant|frais/.test(t)) return 'wallet';
  if (/envoy|transf|virement/.test(t)) return 'route';
  if (/b[ée]n[ée]ficiaire|nom/.test(t)) return 'user';
  if (/historique|date|derni/.test(t)) return 'list';
  return 'file-text';
}

interface LineItemProps {
  line: TranslatedLine;
  showOriginal: boolean;
  showExplanation: boolean;
  /** D10 AI pass (F-4): a translated gloss, or null to show the French one as-is. */
  explanationOverride: { simple: string; example: string } | null;
  explanationLoading: boolean;
  playing: boolean;
  onToggleOriginal: () => void;
  onToggleExplanation: () => void;
  onListen: () => void;
}

/** One phrase read from the page. Row click reveals the French original (D9);
 * "?" opens the plain-language gloss (D10), independent of translation status. */
export function LineItem({
  line,
  showOriginal,
  showExplanation,
  explanationOverride,
  explanationLoading,
  playing,
  onToggleOriginal,
  onToggleExplanation,
  onListen,
}: LineItemProps) {
  const hasOriginal = line.source !== 'original' && line.original !== line.text;
  return (
    <li class="line-item">
      <div
        class={`row${hasOriginal ? ' row--clickable' : ''}`}
        onClick={hasOriginal ? onToggleOriginal : undefined}
        onKeyDown={
          hasOriginal
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToggleOriginal();
                }
              }
            : undefined
        }
        role={hasOriginal ? 'button' : undefined}
        tabIndex={hasOriginal ? 0 : undefined}
        aria-expanded={hasOriginal ? showOriginal : undefined}
      >
        <span class="icon-bubble icon-bubble--accent icon-bubble--xs">
          <Icon name={iconFor(line.original)} size={18} />
        </span>
        <div class="row-text">
          <p class="row-title">{line.text}</p>
          {line.spokenAmount && <p class="row-detail">« {line.spokenAmount} »</p>}
          {hasOriginal && showOriginal && <p class="row-detail">Original : « {line.original} »</p>}
          <div class="line-meta">
            <Badge source={line.source} />
            {line.source === 'ia' && (
              <span class="line-verified">
                <Icon name="check-circle" size={14} />
                Montants vérifiés
              </span>
            )}
          </div>
        </div>
        {line.explanation && (
          <button
            type="button"
            class="help-btn"
            aria-label={`Explique-moi : ${line.original}`}
            aria-expanded={showExplanation}
            onClick={(e) => {
              e.stopPropagation();
              onToggleExplanation();
            }}
          >
            <Icon name="help" size={20} />
          </button>
        )}
        <ListenButton label={line.text} playing={playing} onClick={onListen} />
      </div>
      {showExplanation && line.explanation && (
        <div class="explain-panel">
          <p class="explain-question">
            <Icon name="book" size={18} />
            {line.original}, c’est quoi ?
          </p>
          {explanationLoading ? (
            <p class="explain-simple">Traduction en cours…</p>
          ) : (
            <>
              <p class="explain-simple">{explanationOverride?.simple ?? line.explanation.simple}</p>
              <p class="explain-example">{explanationOverride?.example ?? line.explanation.example}</p>
              {explanationOverride && <Badge source="ia" />}
            </>
          )}
        </div>
      )}
    </li>
  );
}
