import { IconAlertTriangle, IconRepeat } from '../ui/icons';

interface WarningBannerProps {
  text: string;
  onReplay: () => void;
}

/** F7: solid-fill, not a pastel card. A "never share your PIN" reminder
 * should look like a safety notice, not a decorative tip. */
export function WarningBanner({ text, onReplay }: WarningBannerProps) {
  return (
    <section class="warning-banner" role="alert">
      <IconAlertTriangle size={20} />
      <div class="warning-banner-body">
        <p class="warning-banner-title">Rappel de sécurité</p>
        <p class="warning-banner-text">{text}</p>
      </div>
      <button type="button" class="warning-banner-replay" onClick={onReplay} aria-label="Réécouter ce rappel">
        <IconRepeat size={16} />
      </button>
    </section>
  );
}
