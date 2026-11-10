import { useRef } from 'preact/hooks';

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
  sublabel?: string;
}

interface SegmentedProps<T extends string | number> {
  label: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** All choices visible side by side (radiogroup pattern: one tab stop,
 * arrow keys move and select). Used where there are only 2–3 options. */
export function Segmented<T extends string | number>({ label, options, value, onChange }: SegmentedProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (from: number, delta: number) => {
    const next = (from + delta + options.length) % options.length;
    onChange(options[next]!.value);
    refs.current[next]?.focus();
  };

  return (
    <div class="segmented" role="radiogroup" aria-label={label}>
      {options.map((opt, i) => {
        const checked = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            class={`segmented-option${checked ? ' is-checked' : ''}`}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                move(i, 1);
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                move(i, -1);
              }
            }}
          >
            <span class="segmented-text">
              <span class="segmented-label">{opt.label}</span>
              {opt.sublabel && <span class="segmented-sublabel">{opt.sublabel}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
