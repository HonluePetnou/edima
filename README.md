# Edima

Couche d'accessibilité linguistique pour les services financiers en ligne. Voir [PLAN.md](PLAN.md) pour le découpage du travail et [le cahier des charges](https://github.com/HonluePetnou/edima) pour les spécifications.

## Structure

```
apps/
  extension/   WXT + Preact : panneau latéral, lecture générique des pages, Shadow DOM
  server/      Hono : une seule route, traduction de secours par LLM
packages/
  shared/      types, schémas Zod, glossaire + protection des montants (F10)
```

## Démarrage

```bash
pnpm install
```

- **Extension** (charge `apps/extension/.output/chrome-mv3` comme extension non empaquetée dans Chrome) :
  ```bash
  pnpm dev:extension    # mode watch
  pnpm build:extension  # build de production
  ```
- **Serveur de secours** (nécessite `LLM_API_KEY` pour répondre autrement que `llm_not_configured`) :
  ```bash
  pnpm dev:server
  ```
- **Tests** (protection des montants, glossaire, routes serveur) :
  ```bash
  pnpm test
  ```
- **Vérification des types** :
  ```bash
  pnpm compile
  ```

## État actuel (Phase 1)

- [x] Monorepo pnpm (`apps/extension`, `apps/server`, `packages/shared`)
- [x] Extension : Manifest V3, `chrome.sidePanel`, content script en Shadow DOM, `MutationObserver` générique
- [x] Protection des montants/téléphones/dates (F10) — regex + `libphonenumber-js`, testé avec Vitest
- [x] Glossaire : 72 termes + 24 phrases-modèles en français, structure prête pour les traductions ewondo/duala
- [x] Serveur Hono : route `/translate` validée par Zod, en attente d'une clé LLM
- [x] **F1** (surimpression) : chaque libellé visible de la page est passé par le glossaire et remonté au panneau latéral ; tant qu'aucun terme n'est `valide`, le français original s'affiche (comportement prévu par F10/D9, pas un trou)
- [x] **F3** (boutons parlants) : au survol/focus, chaque bouton/lien affiche une bulle et se fait lire à voix haute (voix française de secours — l'audio natif ewondo/duala arrive avec D2)
- [x] **F2** (Lis-moi cette page) : résumé court (solde, frais, avertissement, actions) lu au clic, construit à partir de ce que F1 a déjà extrait
- [x] **F4** (lecture exacte des montants) : moteur montant → mots en français (0 à ~1 milliard, 48 tests), chiffre toujours affiché à côté du mot ; ewondo/duala renverront `null` tant que le linguiste n'a pas livré la grammaire des nombres
- [x] **F6** (récapitulatif avant confirmation) : détecte bénéficiaire/montant/frais/total par les mêmes libellés que F2, carte dédiée dans le panneau avec lecture à la demande
- [x] **F7** (avertissements prioritaires) : tout avertissement détecté (mots-clés FR/EN ou `role="alert"`) interrompt et passe en premier — lu dès son apparition, bannière rouge persistante dans le panneau
- [x] **F5** (parcours guidé) : classe la page en 3 étapes (solde, formulaire, récapitulatif), explique chaque champ du formulaire avec son libellé, étiquette « Étape X sur 3 » dans le panneau
- [x] **F9** (contenu inédit) : nouveau texte détecté par F8 et absent du glossaire → masqué (F10) → envoyé à `apps/server` → réinséré et vérifié avant d'afficher « IA — non vérifié ». Le serveur répond `llm_not_configured` tant qu'aucune clé n'est posée, donc le français reste affiché par défaut — vérifié de bout en bout contre un serveur local réel. La chaîne phrases-modèles (étape du milieu) n'est pas branchée : il faut une vraie correspondance de structure de phrase, pas juste la recherche exacte du glossaire.
- [x] **D4** (contrôle de cohérence) : le montant tapé sur le formulaire est comparé à celui du récapitulatif ; un écart interrompt et se fait lire en premier, comme un avertissement F7
- [x] **D9** (texte original en un geste) : clic sur une ligne traduite pour révéler le français d'origine (adapté de l'appui long, pas de geste équivalent dans un panneau de bureau)
- [x] **D3** (partiel — panneau de transparence) : badge source par phrase déjà là (F1) ; coche « montants vérifiés » ajoutée sur les lignes IA
- [x] **D5** (changement de langue en direct) : sélecteur Ewondo/Duala fonctionnel, re-scan immédiat de la même page sans rechargement — les deux langues affichent le même repli français tant qu'aucun terme n'est validé des deux côtés
- [ ] Traductions ewondo/duala validées par le linguiste — bloquant, voir PLAN.md
- [ ] Panneau Edima complet (reprend une des 3 directions visuelles explorées sur Figma) — F1/F3 tournent pour l'instant dans le panneau de base du scaffold

Le glossaire ne couvre pas encore les ~150 termes visés par le cahier des charges : les 72 termes actuels sont choisis pour couvrir le parcours de test (solde, frais, transfert, récapitulatif, avertissement), à étendre avec le linguiste.
