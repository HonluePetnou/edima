import { IconPause, IconPlay, IconRepeat } from '../ui/icons';

interface CommandBarProps {
  canPlay: boolean;
  isSpeaking: boolean;
  primaryLabel: string;
  rateLabel: string;
  onRepeat: () => void;
  onPrimary: () => void;
  onSlower: () => void;
}

/** One primary control (play/pause, labelled — not an icon-only guess), two
 * secondary icon controls either side. Replaces the earlier three-identical-
 * circles layout, which gave "repeat" and "slower" the same visual weight
 * as the main action. */
export function CommandBar({ canPlay, isSpeaking, primaryLabel, rateLabel, onRepeat, onPrimary, onSlower }: CommandBarProps) {
  return (
    <nav class="command-bar" aria-label="Contrôles de lecture">
      <button type="button" class="command-icon-btn" onClick={onRepeat} disabled={!canPlay} aria-label="Répéter la dernière lecture">
        <IconRepeat />
      </button>
      <button type="button" class="command-primary-btn" onClick={onPrimary} disabled={!canPlay} aria-label={primaryLabel}>
        {isSpeaking ? <IconPause size={16} /> : <IconPlay size={16} />}
        <span>{primaryLabel}</span>
      </button>
      <button type="button" class="command-icon-btn command-rate-btn" onClick={onSlower} disabled={!canPlay} aria-label={`Changer la vitesse de lecture, actuellement ${rateLabel}`}>
        {rateLabel}
      </button>
    </nav>
  );
}
