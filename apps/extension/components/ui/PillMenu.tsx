import { useEffect, useRef, useState } from 'preact/hooks';
import { Icon, type IconName } from './Icon';

export interface PillMenuOption<T extends string | number> {
  value: T;
  /** Short text shown in the closed pill. */
  short: string;
  /** Full text shown in the open menu. */
  label: string;
  sublabel?: string;
}

interface PillMenuProps<T extends string | number> {
  icon: IconName;
  label: string;
  options: PillMenuOption<T>[];
  value: T;
  onChange: (value: T) => void;
  align?: 'start' | 'end';
}

let menuCount = 0;

/** Edima-styled replacement for a native <select> (WAI-ARIA "select-only
 * combobox" pattern): ↑/↓ move, Enter/Space pick, Esc closes, Home/End jump,
 * typing a letter jumps to the matching option. */
export function PillMenu<T extends string | number>({ icon, label, options, value, onChange, align = 'start' }: PillMenuProps<T>) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const idRef = useRef(`pill-menu-${++menuCount}`);
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const current = options[selectedIndex]!;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const openMenu = () => {
    setActive(selectedIndex);
    setOpen(true);
  };
  const pick = (i: number) => {
    onChange(options[i]!.value);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActive((a) => Math.min(options.length - 1, a + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
        break;
      case 'Home':
        e.preventDefault();
        setActive(0);
        break;
      case 'End':
        e.preventDefault();
        setActive(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        pick(active);
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
      case 'Tab':
        setOpen(false);
        break;
      default:
        if (e.key.length === 1) {
          const i = options.findIndex((o) => o.label.toLowerCase().startsWith(e.key.toLowerCase()));
          if (i >= 0) setActive(i);
        }
    }
  };

  const listId = `${idRef.current}-list`;
  return (
    <div class="pill-menu" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        class={`pill-select${open ? ' is-open' : ''}`}
        role="combobox"
        aria-label={`${label} : ${current.label}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${idRef.current}-opt-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
      >
        <Icon name={icon} size={18} />
        <span>{current.short}</span>
        <Icon name="chevron-down" size={16} />
      </button>
      {open && (
        <ul id={listId} class={`pill-menu-list pill-menu-list--${align}`} role="listbox" aria-label={label}>
          {options.map((opt, i) => {
            const selected = i === selectedIndex;
            return (
              <li
                key={String(opt.value)}
                id={`${idRef.current}-opt-${i}`}
                role="option"
                aria-selected={selected}
                class={`pill-menu-option${i === active ? ' is-active' : ''}${selected ? ' is-selected' : ''}`}
                onMouseEnter={() => setActive(i)}
                // mousedown, not click: keeps focus on the combobox button.
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(i);
                }}
              >
                <span class="pill-menu-text">
                  <span class="pill-menu-label">{opt.label}</span>
                  {opt.sublabel && <span class="pill-menu-sublabel">{opt.sublabel}</span>}
                </span>
                {selected && <Icon name="check-circle" size={20} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
