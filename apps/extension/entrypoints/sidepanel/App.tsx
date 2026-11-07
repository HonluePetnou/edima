import { glossaryTerms, templatePhrases } from 'edima-shared';

/**
 * Phase 1 scaffold only: proves the sidePanel + Preact pipeline works, and
 * that the extension can read the shared glossary. The real panel
 * (translated lines, récapitulatif, warnings, command bar) gets built in
 * Phase 2 against whichever Figma direction is locked in.
 */
export default function App() {
  return (
    <>
      <header class="header">
        <h1 class="wordmark">Edima</h1>
        <button class="lang-pill" type="button" disabled>
          Ewondo
        </button>
      </header>
      <main class="content">
        <p class="status">En attente d'une page à expliquer.</p>
        <p class="status">
          Glossaire chargé : {glossaryTerms.length} termes, {templatePhrases.length} phrases-modèles (0 encore
          validés par le linguiste).
        </p>
        <button class="primary-button" type="button" disabled>
          Lis-moi cette page
        </button>
      </main>
    </>
  );
}
