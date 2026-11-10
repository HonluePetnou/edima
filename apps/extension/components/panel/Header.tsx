import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/Button';
import { Mascot, type MascotState } from '../ui/Mascot';
import { PillMenu, type PillMenuOption } from '../ui/PillMenu';
import type { LanguageCode } from '../../utils/messages';

export const SPEECH_RATES = [1, 0.85, 0.7] as const;

export const LANGUAGE_OPTIONS: PillMenuOption<LanguageCode>[] = [
  { value: 'ewo', short: 'EWO (Ewondo)', label: 'Ewondo', sublabel: 'EWO' },
  { value: 'dua', short: 'DUA (Duala)', label: 'Duala', sublabel: 'DUA' },
];

export const RATE_OPTIONS: PillMenuOption<number>[] = [
  { value: 0, short: '1.0×', label: 'Normale', sublabel: '1.0×' },
  { value: 1, short: '0.85×', label: 'Lente', sublabel: '0.85×' },
  { value: 2, short: '0.7×', label: 'Très lente', sublabel: '0.7×' },
];

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
        <PillMenu icon="globe" label="Langue" options={LANGUAGE_OPTIONS} value={language} onChange={onChangeLanguage} />
        <span class="spacer" />
        <PillMenu icon="gauge" label="Vitesse de lecture" options={RATE_OPTIONS} value={rateIndex} onChange={onChangeRate} align="end" />
        <button type="button" class="play-btn" onClick={onPrimary} disabled={!canPlay} aria-label={isPlaying ? 'Mettre en pause' : 'Lire'}>
          <Icon name={isPlaying ? 'pause' : 'play'} size={18} />
        </button>
      </div>
    </header>
  );
}
