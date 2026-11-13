export type MascotState = 'idle' | 'greeting' | 'speaking' | 'thinking' | 'alert' | 'question' | 'paused' | 'offline' | 'thanks';

const ART: Record<MascotState, string> = {
  idle: 'idle',
  greeting: 'greeting',
  speaking: 'speaking',
  thinking: 'thinking',
  alert: 'alert',
  question: 'question',
  paused: 'paused',
  offline: 'offline',
  thanks: 'thanks',
};

export function Mascot({ state, size = 64 }: { state: MascotState; size?: number }) {
  return (
    <span class={`mascot mascot--${state}`} style={{ width: `${size}px`, height: `${size}px` }}>
      <img class="mascot-img" src={`/mascot/edima-${ART[state]}.webp`} width={size} height={size} alt="" />
      {state === 'speaking' && (
        <svg class="mascot-waves" width={size * 0.32} height={size * 0.44} viewBox="0 0 20 28" fill="none" aria-hidden="true">
          <path d="M3 8a8 8 0 0 1 0 12" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
          <path d="M10 3a15 15 0 0 1 0 22" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
        </svg>
      )}
      {state === 'alert' && <span class="mascot-dot" aria-hidden="true" />}
    </span>
  );
}
