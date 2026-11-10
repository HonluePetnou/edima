import { IconChevronDown } from '../ui/icons';
import type { LanguageCode } from '../../utils/messages';

const LANGUAGE_LABELS: Record<LanguageCode, string> = { ewo: 'Ewondo', dua: 'Duala' };

interface HeaderProps {
  language: LanguageCode;
  onChangeLanguage: (next: LanguageCode) => void;
  avatarSrc: string;
}

export function Header({ language, onChangeLanguage, avatarSrc }: HeaderProps) {
  return (
    <header class="panel-header">
      <div class="panel-header-brand">
        <img class="brand-avatar" src={avatarSrc} width={32} height={32} alt="" />
        <p class="brand-name">Edima</p>
      </div>
      <label class="lang-select">
        <span class="sr-only">Langue de lecture</span>
        <select value={language} onChange={(e) => onChangeLanguage((e.target as HTMLSelectElement).value as LanguageCode)}>
          {(Object.keys(LANGUAGE_LABELS) as LanguageCode[]).map((code) => (
            <option key={code} value={code}>
              {LANGUAGE_LABELS[code]}
            </option>
          ))}
        </select>
        <IconChevronDown size={13} />
      </label>
    </header>
  );
}
