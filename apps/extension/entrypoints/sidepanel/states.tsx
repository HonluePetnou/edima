import { EmptyState } from '../../components/panel/Blocks';

export function LoadingState() {
  return (
    <div aria-busy="true">
      <EmptyState mascot="thinking" title="Je lis la page…">
        Un instant, je regarde ce qui est écrit.
      </EmptyState>
      <div class="skeleton">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

export function NoBankPageState() {
  return (
    <EmptyState mascot="greeting" title="Ouvre ta banque en ligne">
      Quand une page de banque ou de mobile money est ouverte dans cet onglet, je t’explique ce qu’elle contient.
    </EmptyState>
  );
}

export function UnsupportedState() {
  return (
    <EmptyState mascot="question" title="Je ne peux pas lire cette page">
      C’est une page du navigateur. Ouvre plutôt le site de ta banque.
    </EmptyState>
  );
}
