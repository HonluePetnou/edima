import { ListenButton } from '../ui/Button';
import type { RecapInfo } from '../../utils/recap';

function Amount({ value, total = false }: { value: string; total?: boolean }) {
  const m = value.match(/^(.*?)(\s*(?:FCFA|F CFA|XAF))$/i);
  return (
    <span class={total ? 'recap-value recap-value--total' : 'recap-value'}>
      {m ? (
        <>
          {m[1]}
          <span class="amount-unit">{m[2]}</span>
        </>
      ) : (
        value
      )}
    </span>
  );
}

interface RecapCardProps {
  recap: RecapInfo;
  playingKey: string | null;
  onListen: (key: string, text: string) => void;
}

/** F6: every line is listenable on its own; the total gets the one big figure. */
export function RecapCard({ recap, playingKey, onListen }: RecapCardProps) {
  const [name, phone] = (recap.beneficiaire ?? '').split(/\s+[—-]\s+/);
  const rows: { key: string; label: string; value: string; detail?: string; speech: string }[] = [];
  if (recap.montant) rows.push({ key: 'recap-montant', label: 'Montant à envoyer', value: recap.montant, speech: `Montant à envoyer : ${recap.montant}.` });
  if (recap.beneficiaire)
    rows.push({
      key: 'recap-benef',
      label: 'Bénéficiaire',
      value: name ?? recap.beneficiaire,
      detail: phone,
      speech: `Bénéficiaire : ${name ?? recap.beneficiaire}${recap.beneficiairePhoneWords ? `, numéro ${recap.beneficiairePhoneWords}` : ''}.`,
    });
  if (recap.frais) rows.push({ key: 'recap-frais', label: 'Frais', value: recap.frais, speech: `Frais : ${recap.frais}.` });

  return (
    <>
      {rows.length > 0 && (
        <div class="card">
          {rows.map((r, i) => (
            <div key={r.key}>
              {i > 0 && <hr class="divider" />}
              <div class="recap-row">
                <span class="recap-label">{r.label}</span>
                <span class="recap-values">
                  <Amount value={r.value} />
                  {r.detail && <span class="recap-detail">{r.detail}</span>}
                </span>
                <ListenButton label={r.label} playing={playingKey === r.key} onClick={() => onListen(r.key, r.speech)} />
              </div>
            </div>
          ))}
        </div>
      )}
      {recap.total && (
        <div class="recap-row recap-row--total">
          <span class="recap-label">Total débité</span>
          <Amount value={recap.total} total />
          <ListenButton label="le total débité" playing={playingKey === 'recap-total'} onClick={() => onListen('recap-total', `Total débité : ${recap.total}.`)} />
        </div>
      )}
    </>
  );
}
