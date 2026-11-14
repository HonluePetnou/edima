# Expérimentation « invention de langue »

Branche `experiment/invention-langue`, **pas `main`**. Ce dossier existe pour
voir concrètement jusqu'où on peut pousser une génération automatique de
duala (nombres + glossaire manquant) et où ça casse — pas pour produire du
contenu prêt à montrer au jury. Rien ici n'a de statut `valide` ni
`a_valider` dans `packages/shared/data/glossary/` : tant que ce n'est pas
relu par un locuteur/linguiste, ça reste dans ce dossier, hors du chemin
que l'extension importe réellement.

## 1. Nombres (`numbers-experimental.ts`, `numbers-report.ts`)

Étend les 36 formes confirmées de la source primaire (MPI-EVA, Dr. Francine
Ebegne Ndedi, 2012) avec trois niveaux de confiance :

- **`confirmee`** : la forme exacte donnée par la source.
- **`haute`** : le même schéma « [dizaine] na [unité] » est confirmé deux
  fois indépendamment (10-19 et 20-29) — l'étendre à 30-99 est un pari
  raisonnable.
- **`speculative`** : tout le reste (centaines 300-900, milliers au-delà de
  2000). La source donne exactement UN exemple de ce qui se passe à un
  multiplicateur (« 2 » devient `ɓéɓǎ` à 200 et `lóɓǎ` à 2000, au lieu de la
  forme autonome `ɓébǎ`) — un seul point de données, pas assez pour déduire
  ce que deviennent 3 à 9 dans ce rôle. La fonction fait le choix naïf
  (réutiliser la forme autonome) *exprès*, pour que l'écart avec le seul cas
  confirmé soit visible plutôt que masqué.

Lancer : `pnpm dlx tsx ml/experiments/numbers-report.ts`

**Conclusion de l'expérience** : la plage 1-99 est généralisable avec un bon
niveau de confiance. Au-delà, non — pas sans un locuteur pour donner au
moins un exemple par chiffre (3 à 9) à chaque ordre de grandeur (centaine,
millier). Aucun mot pour « francs » dans la source, à aucun niveau de
confiance.

## 2. Glossaire manquant (`translate_batch.py`)

Fait tourner le vrai modèle M2M100 fine-tuné duala (`ml/models/m2m100_dua_ct2`,
déjà entraîné pour ce projet — pas moi qui invente à la main) sur :
- les ~45 textes du protocole SAFINUM encore vides (`docs/safinum-vocabulaire-a-traduire-duala.txt`),
- les termes/phrases du glossaire encore `a_traduire`.

Setup : voir `ml/inference/README.md` (même modèle, même venv). Puis :

```powershell
ml\inference\.venv\Scripts\python.exe ml\experiments\translate_batch.py <input.json> <output.json>
```

Sortie : liste `{fr, dua_ia, ok}` — **jamais à copier directement** dans
`dua_status: "valide"` ou même `"a_valider"` sans relecture humaine. C'est
une sortie de modèle, pas une traduction. Utile pour donner à un locuteur
une base à corriger plutôt qu'une page blanche — pas pour remplir le
glossaire tout seul.

## 3. Données prêtes pour un entraînement multi-locuteurs (`prepare-tts-dataset.py`)

Convertit le corpus Common Voice brut (`ml/data/common-voice/<lang>/`) en
wav 22050 Hz mono + `metadata.csv` (`id|speaker|texte`), format compatible
aussi bien Piper que Coqui TTS. Lancé pour `dua` et `wes` : 7018 et 9018
clips convertis, 0 échec. Sortie dans `tts-dataset/<lang>/` (gitignored —
audio régénérable, pas du code).

Meilleur locuteur unique par langue (utile pour une voix mono-locuteur
plus propre) : ~1,2 à 1,5 h / ~900-1000 clips — voir `speakers.csv` dans
chaque dossier de sortie pour le classement complet.

**Blocage découvert en préparant l'entraînement, pas juste le compute** :
Piper a besoin d'espeak-ng pour phonétiser le texte avant l'entraînement,
et espeak-ng ne connaît ni le duala ni le pidgin camerounais. D'autres
projets dans la même situation (féroïen, tigrigna) ont dû soit fabriquer
une voix espeak-ng pour leur langue à la main, soit utiliser un autre
outil (Coqui TTS) qui accepte un entraînement directement sur les
caractères, sans phonétisation. Ce choix d'outil n'est pas tranché ici —
les données préparées marchent pour les deux options.

## Pourquoi tout ça reste hors de `packages/shared/`

Parce que `packages/shared/src/glossary.ts` et `numbers.ts` sont importés
tels quels par l'extension réelle. Si ce contenu spéculatif atterrissait
dedans avec un statut affiché à l'utilisateur, ça romprait exactement la
règle F10 (ne jamais deviner) — appliquée ici à la langue plutôt qu'aux
montants. Ce dossier est volontairement hors de ce chemin d'import.
