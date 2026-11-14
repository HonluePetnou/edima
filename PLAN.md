# Edima — Plan de travail

Équipe : 2 personnes, assistées d'IA sur le développement. Pas de calendrier figé par semaine : le découpage ci-dessous est par **phase**, à enchaîner au rythme réel d'avancement.

**État le plus à jour** : `docs/ETAT-PROJET.md` — vérifié de bout en bout sur la page du jury, mis à jour à chaque changement. Ce fichier-ci reste la trame par phases ; `ETAT-PROJET.md` est la source de vérité au jour le jour.

## Blocage à lever en premier — toujours réel, mais déplacé

> *« Le principal risque n'est pas le code mais la qualité de la langue »* — cahier des charges.

La langue MVP est tranchée : **duala**, pas ewondo (aucun corpus ewondo en main à ce jour). Le glossaire (72 termes + 24 phrases-modèles), la grammaire des nombres dans `packages/shared/src/numbers.ts`, 34 clips audio (Africa TTS) et le corpus Common Voice duala (14,4 h, `ml/data/common-voice/dua/`) sont tous en main. Ce qui manque encore :

- **Validation par un linguiste.** Tout le duala est au statut `a_valider` (proposé par un locuteur, jamais relu par un linguiste) — c'est ce qui bloque la note « fidélité des traductions » du jury, pas l'absence de contenu.
- L'orthographe duala du glossaire est écrite « à la française » plutôt qu'avec ɛ ɔ ɓ ɗ ŋ — à corriger avec un locuteur.
- Les montants au-delà de 2 000 et le mot duala pour « francs » : aucune source trouvée (voir `docs/ETAT-PROJET.md` § Langue pour le détail — y compris pourquoi une règle de composition générique serait risquée, l'accord de classe nominale bantoue changeant la forme des nombres).

**Action immédiate, toujours valable :** mobiliser un locuteur/linguiste duala (Resulam, linguistique Yaoundé I/Douala, NTeALan) pour relire le glossaire et combler les nombres manquants — c'est le seul gain qui débloquerait plusieurs lignes de la feuille de route (F-1, F-2, F-7b/7c) d'un coup.

## Répartition des rôles (2 personnes, historique)

| | Périmètre | Fonctions couvertes |
| --- | --- | --- |
| **Personne A** — Extension & interface | Scaffold WXT + Preact, Shadow DOM, `chrome.sidePanel`, lecture générique du DOM, surimpression, détection des nouveaux messages | F1, F3, F8, F11, D1, D3, D9 |
| **Personne B** — Moteur, voix & serveur | Glossaire JSON, protection des montants (regex + `libphonenumber-js` + Vitest), chaîne glossaire → phrases-modèles → LLM, serveur Hono de secours, assemblage audio des montants | F2, F4, F9, F10, D4 |
| **Ensemble** | Parcours guidé, récapitulatif, avertissements (intersection UI/moteur), faux portail de répétition, tests multi-sites, vidéo de démo | F5, F6, F7, D6 |

Dans les faits, l'essentiel du code depuis a été écrit avec une assistance IA poussée (sessions Claude Code) plutôt que selon ce découpage strict — la répartition reste utile pour savoir qui valide quoi (langue vs code), pas qui a tapé quelle ligne.

## Phase 1 — Fondations ✅ terminée

- [x] Lancer le recrutement linguiste / locuteurs natifs — **partiellement** : des locuteurs ont livré le glossaire duala (statut `a_valider`) et le corpus Common Voice est en main ; **la relecture par un linguiste reste à obtenir** (voir blocage ci-dessus)
- [x] Trancher la langue MVP : **duala**
- [x] Scaffold monorepo pnpm : `apps/extension`, `apps/server`, `packages/shared`
- [x] Extension : config WXT, Manifest V3, `chrome.sidePanel`, content script en Shadow DOM isolé, `MutationObserver` + lecture générique du DOM
- [x] Structure du glossaire JSON (72 termes + 24 phrases-modèles, duala rempli au statut `a_valider`)
- [x] Protection des montants (F10) : regex + `libphonenumber-js`, étendue aux noms/références/dates/pourcentages
- [x] Serveur Hono de secours : route `/translate` + sidecar M2M100 local (`ml/inference/`)
- [x] Direction visuelle : panneau redessiné (éditorial sobre, encre + terracotta) puis aligné sur le fichier Figma « Edima — Extension UI » (mascotte à 9 états, palette clair/sombre, navigation par écrans)
- [x] Glossaire + phrases-modèles duala livrés par des locuteurs (statut `a_valider`) — relecture linguiste en attente

## Phase 2 — Fonctions du MVP ✅ terminée (hors validation linguistique)

Détail et preuves dans le README (§ État actuel) et `docs/ETAT-PROJET.md` (§ Ce qui marche) — vérifié de bout en bout sur https://safinum.cm/hackathon-test.

- [x] F1, F3 — surimpression, boutons parlants
- [x] F8, F9 — détection des nouveaux messages, contenu inédit → glossaire → phrases-modèles → IA (badge « non vérifié »)
- [x] F2, F4 — lecture des montants (français complet ; duala bloqué sur les nombres, voir ci-dessus), résumé de page
- [x] F5, F6, F7 — parcours guidé, récapitulatif, avertissements prioritaires
- [x] D1, D3, D4, D5, D9, D10, D12 — badge de fiabilité, transparence, contrôle de cohérence (+ contrôle arithmétique du récap), changement de langue en direct, texte original en un geste, explications « ? », numéros lus par paires
- [x] Option « Traduire dans la page » (`utils/in-page.ts`) — réécrit les libellés, jamais les valeurs
- [x] Vocabulaire du glossaire masqué comme les valeurs avant l'IA (`packages/shared/src/term-mask.ts`) — le modèle ne retraduit jamais un terme déjà validé
- [x] Mascotte flottante sur les pages financières, déplaçable par glisser-déposer, position mémorisée
- [ ] Protection des montants testée sur 200 phrases / jeu de 100 montants validés — pas formalisé comme jeu de test dédié (la couverture actuelle vient des suites unitaires, 169 tests)
- [ ] Relecture par 2 locuteurs, rétro-traduction — toujours en attente du linguiste

## Phase 3 — Durcissement et dépôt — en cours

- [x] Test automatisé (Playwright + Edge, extension réelle) contre la page du jury SAFINUM — `apps/extension/e2e/`, `pnpm test:e2e`
- [ ] Étendre les tests à d'autres sites inconnus (10 visés à l'origine) — seul SAFINUM est couvert pour l'instant ; voir F-14 dans `docs/ETAT-PROJET.md`
- [ ] Répétition du parcours jury en conditions réelles (PC de démo, voix française locale installée, extension rechargée)
- [ ] Vidéo de démo (3 min max)
- [ ] Note technique (architecture, dépendances, limites connues) — `docs/ETAT-PROJET.md` et `docs/declaration-outils-safinum.md` en sont la base
- [ ] Nettoyer la branche `feature/moteur-de-traduction` (journal de session de 11 000 lignes commité par erreur)
- [ ] Dépôt du dossier de présélection

## Feuille de route au-delà du MVP

Tenue à jour dans `docs/ETAT-PROJET.md` (§ Features futures) : montants/audio duala complets (F-1, F-2), ewondo (F-7), évaluation et adaptation du modèle (F-7b, F-7c), IA qui sait s'abstenir (F-8), pidgin camerounais en 3ᵉ langue (F-12, corpus déjà en main), voix libres de droits (F-11), et au-delà.

## Questions ouvertes (bloquent encore certaines décisions)

- [ ] Date limite et format de dépôt réels de la présélection
- [ ] Nom « Edima » confirmé par un locuteur (sens et tons) + disponibilité (Chrome Web Store, OAPI)
- [ ] Couverture réelle de l'ewondo et du duala par MMS-TTS et Omnilingual ASR
