// Small inline SVG icon set — stroke-based, 2px, round caps, 24x24 viewBox.
// Kept as real vectors (not emoji) so the panel reads as a built product,
// not a quick prototype: emoji glyphs render inconsistently across OS/fonts
// and carry no deliberate art direction.

type IconProps = { size?: number };

export function IconRepeat({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 10a8 8 0 0 1 13.66-5.66M20 14a8 8 0 0 1-13.66 5.66"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path d="M17 2v4h-4M7 22v-4h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function IconPlay({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 4.5v15l13-7.5-13-7.5Z" fill="currentColor" />
    </svg>
  );
}

export function IconPause({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" />
      <rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" />
    </svg>
  );
}

export function IconChevronDown({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m6 9 6 6 6-6" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function IconAlertTriangle({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.5 2.5 20h19L12 3.5Z"
        stroke="currentColor"
        stroke-width="2"
        stroke-linejoin="round"
      />
      <path d="M12 9.5v5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <circle cx="12" cy="17.2" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function IconHelp({ size = 13 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" stroke-width="2" />
      <path
        d="M9.5 9.3a2.5 2.5 0 1 1 3.6 2.25c-.77.4-1.1.9-1.1 1.7"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <circle cx="12" cy="16.9" r="1.05" fill="currentColor" />
    </svg>
  );
}

export function IconWifiOff({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 3l18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <path
        d="M5 8.8a15.5 15.5 0 0 1 4.2-2.3M12 5a15.5 15.5 0 0 1 7 1.8M8.5 12.4a9.8 9.8 0 0 1 4-1.3M15.5 12.6a9.8 9.8 0 0 1 2 1.1"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path d="M9.2 16.3a5 5 0 0 1 5.6 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <circle cx="12" cy="19.5" r="1.1" fill="currentColor" />
    </svg>
  );
}
