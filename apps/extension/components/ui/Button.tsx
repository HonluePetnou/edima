import type { ComponentChildren } from 'preact';
import { Icon, type IconName } from './Icon';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost';
  icon?: IconName;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  children: ComponentChildren;
}

export function Button({ variant = 'secondary', icon, onClick, disabled, ariaLabel, children }: ButtonProps) {
  return (
    <button type="button" class={`btn btn--${variant}`} onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      {icon && <Icon name={icon} size={20} />}
      <span>{children}</span>
    </button>
  );
}

/** 44×44 round "écouter" control. `playing` swaps to a pause glyph on the
 * brand fill so the user can see which item is currently being read. */
export function ListenButton({ label, playing = false, onClick }: { label: string; playing?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      class={`listen-btn${playing ? ' listen-btn--playing' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={playing ? 'Mettre en pause' : `Écouter : ${label}`}
    >
      <Icon name={playing ? 'pause' : 'volume'} size={playing ? 18 : 20} />
    </button>
  );
}

export function IconButton({ icon, label, onClick }: { icon: IconName; label: string; onClick: () => void }) {
  return (
    <button type="button" class="icon-btn" onClick={onClick} aria-label={label} title={label}>
      <Icon name={icon} size={22} />
    </button>
  );
}

export function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (next: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} class="toggle" onClick={() => onChange(!checked)}>
      <span class="toggle-knob" />
    </button>
  );
}
