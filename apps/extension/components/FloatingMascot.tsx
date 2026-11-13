import { useEffect, useRef, useState } from 'preact/hooks';

export interface MascotPosition {
  right: number;
  bottom: number;
}

interface FloatingMascotProps {
  /** data: URLs inlined in the content script — this renders on the bank's page. */
  idleSrc: string;
  alertSrc: string;
  alert: boolean;
  /** null = the default bottom-right corner. */
  position: MascotPosition | null;
  onOpen: () => void;
  /** F-5: called once a drag ends with real movement — never on a plain click. */
  onMove: (position: MascotPosition) => void;
}

const DEFAULT_POSITION: MascotPosition = { right: 24, bottom: 24 };
// Below this many pixels of total movement, a pointer-up is treated as a
// click (opens the panel), not a drag — otherwise the button would become
// impossible to click without nudging it first.
const DRAG_THRESHOLD = 6;
const EDGE_MARGIN = 8;
const BUTTON_SIZE = 72;

// Inline styles: this lives in a Shadow DOM on arbitrary bank pages and can't
// use the side panel's stylesheet. Values mirror the panel tokens by hand
// (accent #F5A623, surface #FFFFFF, text #1A1D1B, danger #C6282B).
const CSS = `
.edima-fab{position:fixed;z-index:2147483646;display:flex;align-items:center;gap:12px;font-family:'Nunito Sans',system-ui,sans-serif;animation:edima-pop .3s ease-out}
.edima-fab--dragging{animation:none;transition:none}
.edima-fab-btn{position:relative;width:72px;height:72px;padding:4px;border:0;border-radius:999px;background:#F5A623;box-shadow:0 8px 24px rgba(26,20,8,.18);cursor:grab;touch-action:none;user-select:none}
.edima-fab-btn:active{cursor:grabbing}
.edima-fab-btn:focus-visible{outline:3px solid #1E7A5F;outline-offset:3px}
.edima-fab-btn img{display:block;width:64px;height:64px;border-radius:999px;background:#FCEBC9;pointer-events:none}
.edima-fab-fallback{display:grid;place-items:center;width:64px;height:64px;border-radius:999px;background:#FCEBC9;color:#1A1D1B;pointer-events:none}
.edima-fab-dot{position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:999px;background:#C6282B;border:2px solid #fff}
.edima-fab-tip{padding:12px 16px;border:1.5px solid #FCEBC9;border-radius:16px;background:#fff;color:#1A1D1B;font-size:14px;font-weight:600;line-height:20px;box-shadow:0 2px 8px rgba(26,20,8,.08);white-space:nowrap}
@keyframes edima-pop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.edima-fab{animation:none}}
`;

function clamp(value: number, max: number): number {
  return Math.min(Math.max(value, EDGE_MARGIN), Math.max(max, EDGE_MARGIN));
}

/** Bottom-right shortcut to the side panel, shown only on detected financial
 * pages. Draggable (F-5): a real drag repositions it and persists through
 * `onMove`; a plain click/tap still opens the panel. */
export default function FloatingMascot({ idleSrc, alertSrc, alert, position, onOpen, onMove }: FloatingMascotProps) {
  const [hover, setHover] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const base = position ?? DEFAULT_POSITION;
  const [live, setLive] = useState<MascotPosition>(base);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startRight: number; startBottom: number; moved: boolean } | null>(null);

  // Follow settings synced from elsewhere (e.g. another tab) — but never
  // fight the user's own hand while they're actively dragging.
  useEffect(() => {
    if (!dragRef.current) setLive(base);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base.right, base.bottom]);

  const label = alert ? 'Ouvrir Edima — un avertissement est affiché sur cette page' : 'Ouvrir Edima';

  const handlePointerDown = (e: PointerEvent) => {
    if (e.button !== undefined && e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startRight: live.right, startBottom: live.bottom, moved: false };
  };

  const handlePointerMove = (e: PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      d.moved = true;
      setDragging(true);
    }
    const maxRight = window.innerWidth - BUTTON_SIZE;
    const maxBottom = window.innerHeight - BUTTON_SIZE;
    setLive({ right: clamp(d.startRight - dx, maxRight), bottom: clamp(d.startBottom - dy, maxBottom) });
  };

  const endDrag = (e: PointerEvent) => {
    const d = dragRef.current;
    dragRef.current = null;
    setDragging(false);
    if (!d) return;
    if (d.moved) {
      onMove(live);
    } else if (e.type === 'pointerup') {
      onOpen();
    }
  };

  return (
    <div
      class={`edima-fab${dragging ? ' edima-fab--dragging' : ''}`}
      style={{ right: `${live.right}px`, bottom: `${live.bottom}px` }}
    >
      <style>{CSS}</style>
      {(hover || alert) && !dragging && (
        <div class="edima-fab-tip" aria-hidden="true">
          {alert ? 'Attention : ouvre-moi pour comprendre.' : 'Besoin d’aide ? Clique sur moi, ou glisse-moi ailleurs.'}
        </div>
      )}
      <button
        type="button"
        class="edima-fab-btn"
        aria-label={label}
        title={label}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
      >
        {imgFailed ? (
          // A very strict page CSP can block even data: images — never show a broken icon.
          <span class="edima-fab-fallback" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" />
              <path d="M16 9a5 5 0 0 1 0 6" />
              <path d="M19.364 18.364a9 9 0 0 0 0-12.728" />
            </svg>
          </span>
        ) : (
          <img src={alert ? alertSrc : idleSrc} alt="" width={64} height={64} onError={() => setImgFailed(true)} />
        )}
        {alert && <span class="edima-fab-dot" />}
      </button>
    </div>
  );
}
