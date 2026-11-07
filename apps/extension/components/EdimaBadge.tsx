/**
 * Placeholder proof that the Shadow DOM mount works end-to-end. Phase 2
 * replaces this with the real per-element "boutons parlants" bubbles (F3)
 * and the priority-warning toast (F7) — both still living in this same
 * isolated root, never touching the host page's own DOM.
 */
export default function EdimaBadge() {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        zIndex: 2147483647,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 14px',
        borderRadius: '999px',
        background: '#1D2E73',
        color: '#F3F0E6',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        fontWeight: 600,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.18)',
        pointerEvents: 'none',
      }}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '999px',
          background: '#60A5FA',
        }}
      />
      Edima actif
    </div>
  );
}
