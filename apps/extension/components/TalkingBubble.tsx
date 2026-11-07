export interface BubbleState {
  x: number;
  y: number;
  text: string;
}

/** The F3 hover bubble — visual echo of whatever Edima just spoke. Reuses
 * the "Bulle bouton parlant" look explored on Figma, simplified. */
export default function TalkingBubble({ state }: { state: BubbleState | null }) {
  if (!state) return null;

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
        maxWidth: '280px',
        padding: '10px 14px',
        borderRadius: '12px',
        background: '#1D2E73',
        color: '#F3F0E6',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        fontWeight: 500,
        lineHeight: 1.4,
        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.22)',
        pointerEvents: 'none',
      }}
    >
      <span
        style={{ flexShrink: 0, width: '7px', height: '7px', borderRadius: '999px', background: '#60A5FA' }}
      />
      {state.text}
    </div>
  );
}
