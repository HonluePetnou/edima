import { IconWifiOff } from '../ui/icons';

/** Shown briefly while the panel asks the content script for its current
 * read of the page — distinct from the idle state so a user doesn't read
 * "waiting" copy during a sub-second request. */
export function LoadingState() {
  return (
    <div class="panel-state" aria-busy="true">
      <div class="skeleton-row skeleton-row--wide" />
      <div class="skeleton-row" />
      <div class="skeleton-row skeleton-row--short" />
    </div>
  );
}

export function IdleState() {
  return (
    <div class="panel-state">
      <p class="panel-state-title">Ouvre ta banque en ligne</p>
      <p class="panel-state-text">Edima explique le contenu de la page dès qu'une page de service financier est ouverte dans cet onglet.</p>
    </div>
  );
}

export function UnsupportedState() {
  return (
    <div class="panel-state">
      <IconWifiOff size={28} />
      <p class="panel-state-title">Cette page n'est pas accessible</p>
      <p class="panel-state-text">Edima ne peut pas lire cet onglet (page interne du navigateur ou connexion indisponible). Ouvre une page de ta banque en ligne.</p>
    </div>
  );
}
