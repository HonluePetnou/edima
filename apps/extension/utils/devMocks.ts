// Dev-only sample data so the panel can be previewed and screenshotted as a
// plain web page (no `chrome` context, no live bank page to translate).
// Never imported by production code paths — see App.tsx's `import.meta.env.DEV` guard.
import type { PageTranslatedMessage } from './messages';

type Scenario = Omit<PageTranslatedMessage, 'type' | 'url' | 'language'>;

export const DEV_SCENARIOS: Record<string, Scenario> = {
  recapitulatif: {
    lines: [
      {
        original: 'Frais',
        text: 'Frais',
        source: 'original',
        explanation: { simple: 'Ce que la banque prélève pour faire l’opération.', example: 'Ici : 100 FCFA pour un envoi de 5 000 FCFA.' },
      },
      {
        original: 'Vous envoyez 5 000 FCFA à Paul Mballa.',
        text: 'Ô tôma ngenge nkobo 5 000 FCFA ya Paul Mballa.',
        source: 'ia',
        spokenAmount: 'cinq mille francs',
      },
      { original: 'Le solde du compte est suffisant.', text: 'Ndoŋ ye mony ye ô kôló', source: 'a_valider' },
    ],
    buttonLabels: ['Confirmer le transfert'],
    warnings: ['Ne communique jamais ton code secret, même à un conseiller de la banque.'],
    step: { id: 'recapitulatif', index: 3, total: 3, label: 'Vérifier le récapitulatif' },
    formFields: [],
    recap: {
      beneficiaire: 'Paul Mballa — 6 99 12 34 56',
      montant: '5 000 FCFA',
      frais: '100 FCFA',
      total: '5 100 FCFA',
      beneficiairePhoneWords: 'six, quatre-vingt-dix-neuf, douze, trente-quatre, cinquante-six',
    },
    consistency: {
      status: 'mismatch',
      enteredAmount: 500000,
      recapAmount: 5000,
      message: 'Tu avais saisi 500 000 FCFA, mais le récapitulatif affiche 5 000 FCFA.',
    },
  },

  'recapitulatif-ok': {
    lines: [
      { original: 'Montant', text: 'Montant', source: 'a_valider' },
      { original: 'Bénéficiaire', text: 'Bénéficiaire', source: 'a_valider' },
    ],
    buttonLabels: ['Confirmer le transfert'],
    warnings: [],
    step: { id: 'recapitulatif', index: 3, total: 3, label: 'Vérifier le récapitulatif' },
    formFields: [],
    recap: {
      beneficiaire: 'Awa Ndjeuga — 6 77 45 12 90',
      montant: '15 000 FCFA',
      frais: '150 FCFA',
      total: '15 150 FCFA',
      beneficiairePhoneWords: 'six, soixante-dix-sept, quarante-cinq, douze, quatre-vingt-dix',
    },
    consistency: { status: 'match', enteredAmount: 15000, recapAmount: 15000, message: 'Le montant correspond à ce que tu as saisi.' },
  },

  formulaire: {
    lines: [],
    buttonLabels: ['Continuer'],
    warnings: [],
    step: { id: 'formulaire', index: 2, total: 3, label: 'Remplir le formulaire' },
    formFields: [
      { label: 'Bénéficiaire', description: 'Le nom de la personne qui va recevoir l’argent.' },
      { label: 'Montant', description: 'La somme en francs CFA que tu veux envoyer.' },
      { label: 'Motif', description: 'La raison du transfert, par exemple « loyer » ou « famille ».' },
    ],
    recap: null,
    consistency: null,
  },

  solde: {
    lines: [
      { original: 'Solde disponible', text: 'Solde disponible', source: 'a_valider' },
      { original: '245 500 FCFA', text: '245 500 FCFA', source: 'a_valider', spokenAmount: 'deux cent quarante-cinq mille cinq cents francs' },
      { original: 'Dernière mise à jour : aujourd’hui à 10h30.', text: 'Dernière mise à jour : aujourd’hui à 10h30.', source: 'original' },
    ],
    buttonLabels: ['Envoyer de l’argent', 'Recharger', 'Payer une facture', 'Historique'],
    warnings: [],
    step: { id: 'solde', index: 1, total: 3, label: 'Consulter le solde' },
    formFields: [],
    recap: null,
    consistency: null,
  },
};

export type DevScenarioKey = keyof typeof DEV_SCENARIOS;
