import { Button } from '../ui/Button';
import { IconAlertTriangle } from '../ui/icons';
import type { RecapInfo } from '../../utils/recap';
import type { ConsistencyInfo } from '../../utils/consistency';

interface RecapCardProps {
  recap: RecapInfo;
  consistency: ConsistencyInfo | null;
  onListen: () => void;
}

/** F6/D4: the total is the one number that matters before confirming — it
 * gets the display-size treatment. Everything else is a supporting detail
 * underneath, not a row of four equally-weighted facts. */
export function RecapCard({ recap, consistency, onListen }: RecapCardProps) {
  const mismatch = consistency?.status === 'mismatch';

  return (
    <section class="recap">
      <p class="recap-label">Récapitulatif avant confirmation</p>

      {mismatch && (
        <div class="recap-mismatch" role="alert">
          <IconAlertTriangle size={17} />
          <p>{consistency!.message}</p>
        </div>
      )}

      {recap.total && (
        <div class="recap-total">
          <span class="recap-total-label">Total débité</span>
          <span class="recap-total-value">{recap.total}</span>
        </div>
      )}

      <dl class="recap-details">
        {recap.montant && (
          <div class="recap-detail-row">
            <dt>Montant envoyé</dt>
            <dd>{recap.montant}</dd>
          </div>
        )}
        {recap.beneficiaire && (
          <div class="recap-detail-row">
            <dt>Bénéficiaire</dt>
            <dd>
              {recap.beneficiaire}
              {recap.beneficiairePhoneWords && <span class="recap-spoken">{recap.beneficiairePhoneWords}</span>}
            </dd>
          </div>
        )}
        {recap.frais && (
          <div class="recap-detail-row">
            <dt>Frais</dt>
            <dd>{recap.frais}</dd>
          </div>
        )}
      </dl>

      <Button variant="secondary" onClick={onListen}>
        Écouter le récapitulatif
      </Button>
    </section>
  );
}
