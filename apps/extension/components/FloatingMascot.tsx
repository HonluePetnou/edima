import { useState } from 'preact/hooks';

interface FloatingMascotProps {
  /** Absolute extension URLs (browser.runtime.getURL) — this renders on the bank's page. */
  idleSrc: string;
  alertSrc: string;
  alert: boolean;
  onOpen: () => void;
}

// Inline styles: this lives in a Shadow DOM on arbitrary bank pages and can't
// use the side panel's stylesheet. Values mirror the panel tokens by hand
// (accent #F5A623, surface #FFFFFF, text #1A1D1B, danger #C6282B).
const CSS = `
.edima-fab{position:fixed;right:24px;bottom:24px;z-index:2147483646;display:flex;align-items:center;gap:12px;font-family:'Nunito Sans',system-ui,sans-serif;animation:edima-pop .3s ease-out}
.edima-fab-btn{position:relative;width:72px;height:72px;padding:4px;border:0;border-radius:999px;background:#F5A623;box-shadow:0 8px 24px rgba(26,20,8,.18);cursor:pointer}
.edima-fab-btn:focus-visible{outline:3px solid #1E7A5F;outline-offset:3px}
.edima-fab-btn img{display:block;width:64px;height:64px;border-radius:999px;background:#FCEBC9}
.edima-fab-dot{position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:999px;background:#C6282B;border:2px solid #fff}
.edima-fab-tip{padding:12px 16px;border:1.5px solid #FCEBC9;border-radius:16px;background:#fff;color:#1A1D1B;font-size:14px;font-weight:600;line-height:20px;box-shadow:0 2px 8px rgba(26,20,8,.08);white-space:nowrap}
@keyframes edima-pop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.edima-fab{animation:none}}
`;

/** Bottom-right shortcut to the side panel, shown only on detected financial pages. */
export default function FloatingMascot({ idleSrc, alertSrc, alert, onOpen }: FloatingMascotProps) {
  const [hover, setHover] = useState(false);
  const label = alert ? 'Ouvrir Edima — un avertissement est affiché sur cette page' : 'Ouvrir Edima';
  return (
    <div class="edima-fab">
      <style>{CSS}</style>
      {(hover || alert) && (
        <div class="edima-fab-tip" aria-hidden="true">
          {alert ? 'Attention : ouvre-moi pour comprendre.' : 'Besoin d’aide ? Clique sur moi.'}
        </div>
      )}
      <button
        type="button"
        class="edima-fab-btn"
        aria-label={label}
        title={label}
        onClick={onOpen}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
      >
        <img src={alert ? alertSrc : idleSrc} alt="" width={64} height={64} />
        {alert && <span class="edima-fab-dot" />}
      </button>
    </div>
  );
}
