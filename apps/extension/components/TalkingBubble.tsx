export interface BubbleState {
  x: number;
  y: number;
  text: string;
  /** "danger" is F7's priority-warning styling — a fixed, top-of-viewport
   * bubble rather than one anchored to a hovered element. */
  tone?: 'default' | 'danger';
}

// Matches the panel's own ink/accent/danger tokens (entrypoints/sidepanel/style.css)
// — this component can't `import` that stylesheet since it renders inside a
// Shadow DOM on arbitrary bank pages, so the values are kept in sync by hand.
const PALETTE = {
  default: { background: '#231f1c', dot: '#e8955f' },
  danger: { background: '#8c2e24', dot: '#f2a99d' },
};

/** The F3 hover bubble — visual echo of whatever Edima just spoke. Reuses
 * the "Bulle bouton parlant" look explored on Figma, simplified. Also used
 * by F7 (tone="danger") for a priority warning. */
export default function TalkingBubble({ state }: { state: BubbleState | null }) {
  if (!state) return null;
  const colors = PALETTE[state.tone ?? 'default'];

  return (
    <div
      style={{
        position: 'fixed',
        left: `${state.x}px`,
        top: `${state.y}px`,
        transform: 'translate(-50%, -100%)',
        zIndex: 2147483647,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        maxWidth: '320px',
        padding: '10px 14px',
        borderRadius: '12px',
        background: colors.background,
        color: '#F3F0E6',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        fontWeight: state.tone === 'danger' ? 700 : 500,
        lineHeight: 1.4,
        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)',
        pointerEvents: 'none',
      }}
    >
      <span style={{ flexShrink: 0, width: '7px', height: '7px', borderRadius: '999px', background: colors.dot }} />
      {state.text}
    </div>
  );
}
