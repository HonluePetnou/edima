import { Button } from '../ui/Button';
import type { FieldDescription } from '../../utils/messages';

interface FormCardProps {
  fields: FieldDescription[];
  onListen: () => void;
}

export function FormCard({ fields, onListen }: FormCardProps) {
  return (
    <section class="form-card">
      <p class="recap-label">Ce qu'Edima t'explique</p>
      <ol class="form-fields">
        {fields.map((field, i) => (
          <li key={field.label} class="form-field">
            <span class="form-field-index">{i + 1}</span>
            <div>
              <p class="form-field-label">{field.label}</p>
              <p class="form-field-desc">{field.description}</p>
            </div>
          </li>
        ))}
      </ol>
      <Button variant="secondary" onClick={onListen}>
        Écouter cette étape
      </Button>
    </section>
  );
}
