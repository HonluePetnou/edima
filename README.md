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
- [ ] Traduction effective (glossaire → phrases-modèles → IA) — Phase 2
- [ ] Traductions ewondo/duala validées par le linguiste — bloquant, voir PLAN.md
- [ ] Panneau Edima complet (reprend une des 3 directions visuelles explorées sur Figma)

Le glossaire ne couvre pas encore les ~150 termes visés par le cahier des charges : les 72 termes actuels sont choisis pour couvrir le parcours de test (solde, frais, transfert, récapitulatif, avertissement), à étendre avec le linguiste.
