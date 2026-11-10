import type { ComponentChildren } from 'preact';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  children: ComponentChildren;
}

export function Button({ variant = 'secondary', onClick, disabled, ariaLabel, children }: ButtonProps) {
  return (
    <button type="button" class={`btn btn--${variant}`} onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      {children}
    </button>
  );
}
