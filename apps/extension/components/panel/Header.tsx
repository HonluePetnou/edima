import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/Button';
import { Mascot, type MascotState } from '../ui/Mascot';
import type { LanguageCode } from '../../utils/messages';

const LANGUAGE_LABELS: Record<LanguageCode, string> = { ewo: 'EWO (Ewondo)', dua: 'DUA (Duala)' };
export const SPEECH_RATES = [1, 0.85, 0.7] as const;
const RATE_LABELS = ['1.0×', '0.85×', '0.7×'];

interface HeaderProps {
  mascot: MascotState;
  speaking: boolean;
  language: LanguageCode;
  onChangeLanguage: (next: LanguageCode) => void;
  rateIndex: number;
  onChangeRate: (index: number) => void;
  canPlay: boolean;
  isPlaying: boolean;
  onPrimary: () => void;
  onClose: () => void;
}

export function Header({ mascot, speaking, language, onChangeLanguage, rateIndex, onChangeRate, canPlay, isPlaying, onPrimary, onClose }: HeaderProps) {
  return (
    <header class="panel-header">
      <div class="panel-header-top">
        <Mascot state={mascot} size={64} />
        <div class="panel-header-brand">
          <p class="brand-name">Edima</p>
          <p class="brand-tagline" aria-live="polite">
            {speaking ? 'Edima parle…' : 'ta banque parle ta langue.'}
          </p>
        </div>
        <IconButton icon="x" label="Fermer Edima" onClick={onClose} />
      </div>
      <div class="panel-header-controls">
        <label class="pill-select">
          <Icon name="globe" size={18} />
          <span class="sr-only">Langue</span>
          <select value={language} onChange={(e) => onChangeLanguage((e.target as HTMLSelectElement).value as LanguageCode)}>
            {(Object.keys(LANGUAGE_LABELS) as LanguageCode[]).map((code) => (
              <option key={code} value={code}>
                {LANGUAGE_LABELS[code]}
              </option>
            ))}
          </select>
          <Icon name="chevron-down" size={16} />
        </label>
        <span class="spacer" />
        <label class="pill-select">
          <Icon name="gauge" size={18} />
          <span class="sr-only">Vitesse de lecture</span>
          <select value={rateIndex} onChange={(e) => onChangeRate(Number((e.target as HTMLSelectElement).value))}>
            {RATE_LABELS.map((label, i) => (
              <option key={label} value={i}>
                {label}
              </option>
            ))}
          </select>
          <Icon name="chevron-down" size={16} />
        </label>
        <button type="button" class="play-btn" onClick={onPrimary} disabled={!canPlay} aria-label={isPlaying ? 'Mettre en pause' : 'Lire'}>
          <Icon name={isPlaying ? 'pause' : 'play'} size={18} />
        </button>
      </div>
    </header>
  );
}
