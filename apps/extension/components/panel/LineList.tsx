import { Badge } from '../ui/Badge';
import { IconHelp } from '../ui/icons';
import type { LanguageCode, TranslatedLine } from '../../utils/messages';

interface LineListProps {
  lines: TranslatedLine[];
  language: LanguageCode;
  expandedLines: Set<string>;
  expandedExplanations: Set<string>;
  explanationTranslations: Record<string, { simple: string; example: string }>;
  onToggleOriginal: (key: string) => void;
  onToggleExplanation: (key: string) => void;
}

export function LineList({
  lines,
  language,
  expandedLines,
  expandedExplanations,
  explanationTranslations,
  onToggleOriginal,
  onToggleExplanation,
}: LineListProps) {
  return (
    <section class="lines">
      <p class="lines-label">Sur cette page</p>
      <ul class="line-list">
        {lines.map((line) => {
          const isExpanded = expandedLines.has(line.original);
          const isExplained = expandedExplanations.has(line.original);
          const hasOriginalToShow = line.source !== 'original' && line.original !== line.text;
          const explanation =
            language === 'dua' && explanationTranslations[line.original]
              ? explanationTranslations[line.original]
              : line.explanation;
          return (
            <li
              key={line.original}
              class={`line-item${hasOriginalToShow ? ' line-item--clickable' : ''}`}
              onClick={hasOriginalToShow ? () => onToggleOriginal(line.original) : undefined}
            >
              <Badge tone={line.source} />
              <div class="line-body">
                <div class="line-text-row">
                  <p class="line-text">{line.text}</p>
                  {line.explanation && (
                    <button
                      type="button"
                      class="line-explain"
                      title="Explique-moi ce mot"
                      aria-label="Explique-moi ce mot"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleExplanation(line.original);
                      }}
                    >
                      <IconHelp />
                    </button>
                  )}
                </div>
                {line.spokenAmount && <p class="line-spoken">{line.spokenAmount}</p>}
                {line.source === 'ia' && <p class="line-verified">✓ Montants vérifiés</p>}
                {isExpanded && <p class="line-original">Texte d'origine : {line.original}</p>}
                {isExplained && explanation && (
                  <p class="line-explanation">
                    {explanation.simple} <em>{explanation.example}</em>
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
