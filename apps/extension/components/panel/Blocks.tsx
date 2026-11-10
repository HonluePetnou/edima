import type { ComponentChildren } from 'preact';
import { Icon, type IconName } from '../ui/Icon';
import { ListenButton } from '../ui/Button';
import { Mascot, type MascotState } from '../ui/Mascot';
import { Badge } from '../ui/Badge';
import type { TranslatedLine } from '../../utils/messages';
import type { StepInfo } from '../../utils/journey';

export function BackLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" class="back-link" onClick={onClick}>
      <Icon name="arrow-left" size={20} />
      {label}
    </button>
  );
}

export function SectionTitle({ title, trailing }: { title: string; trailing?: string }) {
  return (
    <div class="section-title">
      <h2>{title}</h2>
      {trailing && <span>{trailing}</span>}
    </div>
  );
}

export function GreetingCard({ playing, onListen }: { playing: boolean; onListen: () => void }) {
  return (
    <section class="greeting-card">
      <ListenButton label="le message d’accueil" playing={playing} onClick={onListen} />
      <div>
        <p class="greeting-title">Je suis Edima.</p>
        <p class="greeting-line">Je suis là pour t’aider.</p>
        <p class="greeting-question">Que veux-tu faire ?</p>
      </div>
    </section>
  );
}

export type ActionTone = 'success' | 'warning' | 'info' | 'neutral';

export function ActionRow({ icon, tone, title, subtitle, onClick }: { icon: IconName; tone: ActionTone; title: string; subtitle: string; onClick: () => void }) {
  return (
    <button type="button" class="action-row" onClick={onClick}>
      <span class={`icon-bubble icon-bubble--${tone}`}>
        <Icon name={icon} size={22} />
      </span>
      <span class="action-row-text">
        <span class="action-row-title">{title}</span>
        <span class="action-row-subtitle">{subtitle}</span>
      </span>
      <Icon name="chevron-right" size={20} />
    </button>
  );
}

export function Card({ children, class: className = '' }: { children: ComponentChildren; class?: string }) {
  return <div class={`card ${className}`}>{children}</div>;
}

export function StatusBar({ status, hint }: { status: string; hint: string }) {
  return (
    <div class="status-bar" role="status">
      <span class="status-dot" aria-hidden="true" />
      <div>
        <p class="status-text">{status}</p>
        <p class="status-hint">{hint}</p>
      </div>
    </div>
  );
}

const NOTICE_ICONS: Record<'warning' | 'info' | 'success', IconName> = { warning: 'alert', info: 'info', success: 'check-circle' };

export function Notice({ tone, children }: { tone: 'warning' | 'info' | 'success'; children: ComponentChildren }) {
  return (
    <div class={`notice notice--${tone}`}>
      <Icon name={NOTICE_ICONS[tone]} size={22} />
      <p>{children}</p>
    </div>
  );
}

/** F7 / D4: priority banner. Rendered above every view, read first. */
export function AlertBanner({ message, playing, onListen }: { message: string; playing: boolean; onListen: () => void }) {
  return (
    <section class="alert-banner" role="alert">
      <Icon name="hand" size={28} />
      <div class="alert-banner-body">
        <p class="alert-banner-title">Attention</p>
        <p class="alert-banner-text">{message}</p>
      </div>
      <ListenButton label="l’avertissement" playing={playing} onClick={onListen} />
    </section>
  );
}

/** One dominant figure per screen; the digit always sits next to the words (F4). */
export function AmountCard({ line, label, playing, onListen }: { line: TranslatedLine; label: string; playing: boolean; onListen: () => void }) {
  const match = line.text.match(/^(.*?)(\s*(?:FCFA|F CFA|XAF))$/i);
  return (
    <section class="amount-card">
      <p class="caps">{label}</p>
      <div class="amount-row">
        <p class="amount">
          {match ? (
            <>
              {match[1]}
              <span class="amount-unit">{match[2]}</span>
            </>
          ) : (
            line.text
          )}
        </p>
        <ListenButton label={label} playing={playing} onClick={onListen} />
      </div>
      {line.spokenAmount && <p class="amount-spoken">« {line.spokenAmount} »</p>}
      <Badge source={line.source} />
    </section>
  );
}

export function StepProgress({ step }: { step: StepInfo }) {
  return (
    <div class="step-progress">
      <div class="step-progress-top">
        <p class="step-progress-label">{step.label}</p>
        <p class="step-progress-count">
          Étape {step.index} sur {step.total}
        </p>
      </div>
      <div class="step-progress-bar" aria-hidden="true">
        {Array.from({ length: step.total }, (_, i) => (
          <span key={i} class={i < step.index ? 'is-done' : ''} />
        ))}
      </div>
    </div>
  );
}

export function EmptyState({ mascot, title, children, action }: { mascot: MascotState; title: string; children: ComponentChildren; action?: ComponentChildren }) {
  return (
    <div class="empty-state-wrap">
      <section class="empty-state">
        <Mascot state={mascot} size={96} />
        <h2>{title}</h2>
        <p>{children}</p>
      </section>
      {action}
    </div>
  );
}

export function TipRow({ icon, title, detail, playing, onListen }: { icon: IconName; title: string; detail: string; playing: boolean; onListen: () => void }) {
  return (
    <div class="row">
      <span class="icon-bubble icon-bubble--info icon-bubble--sm">
        <Icon name={icon} size={20} />
      </span>
      <div class="row-text">
        <p class="row-title">{title}</p>
        <p class="row-detail">{detail}</p>
      </div>
      <ListenButton label={title} playing={playing} onClick={onListen} />
    </div>
  );
}

export function Divider() {
  return <hr class="divider" />;
}
