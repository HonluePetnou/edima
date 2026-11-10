import { ListenButton } from '../ui/Button';
import type { FieldDescription } from '../../utils/messages';

interface FormCardProps {
  fields: FieldDescription[];
  playingKey: string | null;
  onListen: (key: string, text: string) => void;
}

/** F5: one row per form field, labelled exactly as on the site. */
export function FormCard({ fields, playingKey, onListen }: FormCardProps) {
  return (
    <ol class="card field-list">
      {fields.map((field, i) => {
        const key = `field-${i}`;
        return (
          <li key={field.label}>
            {i > 0 && <hr class="divider" />}
            <div class="row">
              <span class="field-num">{i + 1}</span>
              <div class="row-text">
                <p class="row-title">{field.label}</p>
                <p class="row-detail">{field.description}</p>
              </div>
              <ListenButton label={field.label} playing={playingKey === key} onClick={() => onListen(key, `${field.label} : ${field.description}`)} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
