# Edima — Plan de travail

Équipe : 2 personnes, assistées d'IA sur le développement. Pas de calendrier figé par semaine : le découpage ci-dessous est par **phase**, à enchaîner au rythme réel d'avancement.

## Blocage à lever en premier

> *« Le principal risque n'est pas le code mais la qualité de la langue »* — cahier des charges.

Avec 2 personnes et de l'assistance IA sur le code, le goulot d'étranglement n'est pas l'ingénierie, c'est la langue. Personne ne peut produire ni valider le glossaire (150 termes + 50 phrases), la grammaire des nombres, ou les enregistrements audio sans accès à un linguiste ou à des locuteurs natifs ewondo/duala.

**Action immédiate :**
- Identifier si l'un de vous est locuteur natif, ou mobiliser un contact (Resulam, linguistique Yaoundé I/Douala, NTeALan).
- Trancher la langue MVP prioritaire (ewondo ou duala) dès qu'un locuteur est disponible.
- Tant que ce n'est pas réglé, le reste du plan avance quand même (voir Phase 1), mais rien n'est *livrable* sans validation linguistique.

## Répartition des rôles (2 personnes)

| | Périmètre | Fonctions couvertes |
| --- | --- | --- |
| **Personne A** — Extension & interface | Scaffold WXT + Preact, Shadow DOM, `chrome.sidePanel`, lecture générique du DOM, surimpression, détection des nouveaux messages | F1, F3, F8, F11, D1, D3, D9 |
| **Personne B** — Moteur, voix & serveur | Glossaire JSON, protection des montants (regex + `libphonenumber-js` + Vitest), chaîne glossaire → phrases-modèles → LLM, serveur Hono de secours, assemblage audio des montants | F2, F4, F9, F10, D4 |
| **Ensemble** | Parcours guidé, récapitulatif, avertissements (intersection UI/moteur), faux portail de répétition, tests multi-sites, vidéo de démo | F5, F6, F7, D6 |

Ajuster selon les compétences réelles (si l'un de vous est aussi locuteur natif ou designer, ça change la donne).

## Phase 1 — Fondations

- [ ] Lancer le recrutement linguiste / locuteurs natifs (bloquant, voir ci-dessus)
- [ ] Trancher la langue MVP (ewondo ou duala)
- [x] Scaffold monorepo pnpm : `apps/extension`, `apps/server`, `packages/shared`
- [x] Extension : config WXT, Manifest V3, `chrome.sidePanel`, content script en Shadow DOM isolé, `MutationObserver` + lecture générique du DOM
- [x] Structure du glossaire JSON (72 termes + 24 phrases-modèles en français — à étendre vers 150/50 avec le linguiste)
- [x] Protection des montants (F10) : regex + `libphonenumber-js`, testé avec Vitest (14 tests, tout passe)
- [x] Serveur Hono de secours : route `/translate` validée par Zod, prête pour une clé LLM
- [ ] Choisir une direction visuelle parmi les 3 maquettes Figma explorées (dark/dramatique, fond blanc, épurée) ou les fusionner — cible nécessaire pour Personne A
- [ ] En parallèle (linguiste/locuteurs) : traduction du glossaire + grammaire des nombres

## Phase 2 — Fonctions du MVP

- [ ] F1, F3, F11 — surimpression, boutons parlants, testé sur plusieurs sites inconnus
- [ ] F8 — détection des nouveaux messages en direct
- [ ] F9 + serveur Hono — contenu inédit, badge « non vérifié »
- [ ] F2, F4 — lecture des montants, audios (natifs si livrés, sinon synthèse en secours)
- [ ] F5, F6, F7 — parcours guidé, récapitulatif, avertissements, sur le faux portail bancaire
- [ ] D1, D3, D4 si le temps le permet (badge de fiabilité, panneau de transparence, contrôle de cohérence)
- [ ] Protection des montants testée sur 200 phrases ; jeu de 100 montants validé
- [ ] En parallèle : relecture par 2 locuteurs, rétro-traduction, jeu de test 200 phrases / 100 montants (seuil : 0 erreur montants/frais/avertissements, ≥ 90 % compris)

## Phase 3 — Durcissement et dépôt

- [ ] Tests sur au moins 10 sites inconnus (Playwright)
- [ ] Répétitions du parcours jury, hors ligne, audios pré-générés en secours
- [ ] Vidéo de démo (3 min max)
- [ ] Note technique (architecture, dépendances, limites connues)
- [ ] Dépôt du dossier de présélection

## Questions ouvertes (bloquent encore certaines décisions)

- [ ] Date limite et format de dépôt réels de la présélection
- [ ] Nom « Edima » confirmé par un locuteur (sens et tons) + disponibilité (Chrome Web Store, OAPI)
- [ ] Couverture réelle de l'ewondo et du duala par MMS-TTS et Omnilingual ASR
