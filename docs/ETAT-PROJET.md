# Edima — état du projet et ce qui manque

Mis à jour le 13 novembre 2026, veille du passage devant le jury SAFINUM.

## 1. Ce qui marche (vérifié)

Vérifié de bout en bout sur la page du jury https://safinum.cm/hackathon-test
(Edge + extension, test automatisé) : solde → frais → bénéficiaire → récapitulatif → reçu.

| Fonction | État |
|---|---|
| Mascotte flottante (pages financières), clic → panneau latéral | ✅ (le clic qui ouvre le panneau reste à tester à la main dans Chrome) |
| Panneau : accueil, Lis-moi, éléments traduits, guide, récap, conseils, transparence, réglages, mode sombre | ✅ |
| Détection des étapes (solde / formulaire / récapitulatif) | ✅ sur SAFINUM |
| Champs du formulaire sans `<label>` (libellé lu au-dessus du champ) | ✅ |
| Alertes F7 (ex. « bénéficiaire jamais utilisé »), sans fausses alertes | ✅ |
| Récapitulatif : bénéficiaire, montant, frais, total, téléphone lu par paires | ✅ |
| D4 : montant saisi ≠ montant du récap → alerte prioritaire + point rouge sur la mascotte | ✅ (attaque simulée détectée) |
| F-3 : contrôle arithmétique du récap (montant + frais = total), même sans saisie captée | ✅ (`utils/consistency.ts`, 4 tests dont une attaque simulée) |
| Contenu injecté après chargement, et valeurs modifiées sur place | ✅ |
| Protection des valeurs : montants, téléphones, comptes, références, dates, %, noms | ✅ jamais traduits ni envoyés |
| Option « Traduire dans la page » (désactivée par défaut) | ✅ libellés traduits à l'écran, valeurs identiques, restauration exacte |
| Voix : voix locales uniquement (rien envoyé en ligne) ; jamais de duala lu par une voix française | ✅ |
| 34 clips audio duala (Africa TTS) joués depuis le panneau | ✅ — voix de synthèse non relue, licence non commerciale |
| IA (M2M100 local) | ✅ désactivée par défaut, option « Traduction IA (expérimentale) » |
| F-4 : explications « ? » traduites par l'IA si l'option est activée, badge « IA — non vérifiée » | ✅ (`LineItem.tsx`), repli silencieux en français sinon |
| Tests | 160 tests verts (shared 97, server 7, extension 56) |

Documents pour le jury : `docs/declaration-outils-safinum.md`.

## 2. Avant le passage du jury

1. **Recharger l'extension** (`pnpm build:extension`, puis ↻ dans `chrome://extensions`) **et recharger l'onglet** SAFINUM.
2. **Activer « Traduire dans la page »** dans les Réglages (sinon la couverture de traduction mesurée par l'outil du jury est nulle).
3. **Écouter les clips duala** avant de les montrer (`apps/extension/public/audio/dua/`).
4. Vérifier qu'une **voix française locale** est installée sur le PC (Windows : Paramètres → Heure et langue → Voix). Sans elle, Edima reste silencieux.
5. Laisser l'**IA désactivée** pendant la démo, ou la déclarer clairement si on l'active.

### Lancer l'IA (optionnel, désactivée par défaut)

Modèle : `SupraJac/edima-m2m100-dua-ct2` sur Hugging Face (~450 Mo, Python 3.10–3.12).
Détails : `ml/inference/README.md`.

```powershell
huggingface-cli download SupraJac/edima-m2m100-dua-ct2 m2m100_dua_ct2.zip --local-dir .
# décompresser dans le dossier PARENT du dépôt (le zip contient edima/ml/models/m2m100_dua_ct2)
python -m venv ml\inference\.venv
ml\inference\.venv\Scripts\pip install -r ml\inference\requirements.txt
ml\inference\.venv\Scripts\uvicorn server:app --app-dir ml\inference --port 8000
pnpm dev:server   # dans un autre terminal
```

Puis activer « Traduction IA (expérimentale) » dans les Réglages. Si le modèle perd un
jeton `{{Vn}}`, il renvoie `null` et l'extension garde le français.

## 3. Ce qui manque

### Langue (bloquant pour la note « fidélité des traductions »)

- **Aucune traduction duala n'est validée par un linguiste.** Les 48 termes et 19 phrases du glossaire sont affichés « Traduction à valider ». Si un locuteur les a relus, remettre `dua_status` à `"valide"` dans `packages/shared/data/glossary/`.
- Le glossaire duala est écrit « à la française » (`mukousédi`), alors que l'orthographe officielle utilise ɛ, ɔ, ɓ, ɗ, ŋ et les tons (voir Common Voice). À réécrire avec un locuteur, sinon les voix prononcent mal.
- Certaines « traductions » sont identiques au français (`Confirmer le transfert`) : elles sont ignorées à l'affichage, mais à remplacer.
- **Vocabulaire de la page SAFINUM** : seuls 9 de ses textes sont dans le glossaire. Fiche à faire remplir : `docs/safinum-vocabulaire-a-traduire-duala.txt` (≈50 textes). C'est ce qui fera monter la couverture de traduction.
- **Ewondo** : rien de traduit pour l'instant.
- **Pipeline d'entraînement** (`ml/scripts`, `ml/configs`, notebook Kaggle) récupéré de `feature/moteur-de-traduction` dans `main` ; aucun score d'évaluation n'a jamais été noté (voir F-7b).
- **Montants lus en duala** : nombres de 1 à 2 000 connus (MPI-EVA, linguiste de Yaoundé I) ; il manque 10 000, 100 000, le million et « francs », à confirmer par un locuteur, puis à coder dans `packages/shared/src/numbers.ts`.

### Voix

- Pas de voix duala/ewondo pour un texte quelconque : seuls des clips préparés. Pour aller plus loin : enregistrer un locuteur (meilleur), ou entraîner une voix sur Common Voice / Duala-TTS-Dataset (Mozilla, accès demandé).
- Africa TTS est non commerciale : à remplacer avant tout usage commercial.

### Données disponibles

| | Duala | Ewondo | Pidgin camerounais |
|---|---|---|---|
| Voix (audio) | ✅ Common Voice 14 h + Duala-TTS (accès demandé) | ✅ Common Voice 14 h + Ewondo-TTS 4 h | ✅ Common Voice 10 h |
| Texte traduit du français | ⚠️ **BOUQuET** (Meta) : ~1 300 phrases `dua_Latn`/`fra_Latn`, CC-BY-4.0, accès sur demande — **réservé à l'évaluation** du modèle | ✅ 3 631 phrases (Mozilla, accès demandé) | ⚠️ non, mais proche de l'anglais |
| Texte anglais ↔ duala | ✅ MT560 : 15 351 paires (religieux, CC-BY-4.0, provenance à vérifier avant usage commercial) — déjà utilisé pour entraîner M2M100 | | |
| Référence bancaire humaine | ✅ **Lexique bancaire Ekwalla (2013)**, ~40 termes — © : à consulter pour valider le glossaire, ne pas recopier | | |
| Vocabulaire d'argent | ❌ | ❓ jeu « socioculturel » (partie économie) | ✅ 89 phrases |
| Nombres | ✅ 1–2 000 | ✅ 1–2 000 | ✅ |

Les jeux Mozilla de l'Institute of African Digital Humanities sont sous licence NOODL (ouverte pour les équipes africaines). Ne jamais mettre ces fichiers dans Git (republication interdite).

### Code

- Mascotte déplaçable, dessin « Edima parle », mise à jour de `PLAN.md`, vidéo de 3 min, note technique.
- Nettoyer la branche `feature/moteur-de-traduction` (journal de session de 11 000 lignes commité).

## 4. Features futures (feuille de route, prête à confier à Claude)

Chaque ligne indique où travailler et comment vérifier. Règles qui s'appliquent à tout :
ne jamais traduire ni envoyer une valeur protégée (`packages/shared/src/protect-values.ts`),
lire le texte de la page via `pageText()` / `elementPageText()` (`apps/extension/utils/in-page.ts`),
marquer toute traduction non relue (`a_valider`, `ia`), voix locales uniquement (`utils/speech.ts`),
et revérifier sur SAFINUM avec un test Playwright + Edge chargeant `.output/chrome-mv3`.

### Court terme (après la présélection)

| # | Feature | Où / comment | Vérification |
|---|---|---|---|
| F-1 | **Montants lus en duala** (F4) | `packages/shared/src/numbers.ts` : `amountToWords(n, 'dua')` à partir des nombres MPI-EVA (1–2 000) + milliers/millions confirmés par un locuteur ; brancher `speakAmount` dans `content.tsx` (`AMOUNT_SPEECH_LANGUAGE`) | Tests unitaires sur 100 montants validés |
| F-2 | **Montants audio assemblés** | Enregistrer 0–9, dizaines, 100, 1 000, million, « francs » ; `utils/audio-clips.ts` → nouvelle fonction qui enchaîne les clips selon F-1 | Écoute + test de l'ordre des clips |
| F-5 | **Mascotte déplaçable** | `components/FloatingMascot.tsx` : glisser-déposer, position mémorisée dans `utils/settings.ts` | Test manuel sur SAFINUM |
| F-6 | **Illustration « Edima parle »** | Nouveau dessin dans le style `etat/`, remplacer l'astuce idle + ondes dans `components/ui/Mascot.tsx` | Visuel |
| F-7 | **Ewondo** | Dès l'accès Mozilla : corpus Ewondo-French (3 631 phrases) → glossaire `ewo`, phrases-modèles, statut `a_valider` | Couverture sur SAFINUM avec la langue EWO |
| F-7b | **Évaluer le modèle duala** | Le pipeline est dans `ml/` (récupéré de la branche du collègue) : `ml/scripts/06_evaluate.py` sur **BOUQuET** (fr→dua, jamais pour l'entraînement) + nos phrases-modèles ; noter chrF et précision terminologique dans `ml/README.md` (aucun score n'existe aujourd'hui) | Scores écrits |
| F-7c | **Adaptation bancaire (LoRA)** | Prévu par le collègue : `ml/scripts/08_train_lora.py` sur 200–500 paires bancaires validées (fiche SAFINUM + glossaire), puis réévaluer | Précision terminologique avant/après |
| F-8 | **Modèle IA qui sait se taire** | `ml/inference/server.py` : seuil de confiance + aller-retour (rétro-traduction) ; sinon renvoyer `null` → français | Jeu de 200 phrases bancaires |
| F-9 | **Vocabulaire imposé à l'IA** | Masquer les termes du glossaire comme les valeurs avant envoi au modèle, puis réinsérer la traduction validée | Test unitaire sur `protect-values` |
| F-10 | **Test Playwright dans le dépôt** | Copier le script du test SAFINUM (scratchpad) dans `apps/extension/e2e/`, lançable via `pnpm test:e2e` | CI locale |

### Moyen terme

| # | Feature | Où / comment |
|---|---|---|
| F-11 | **Voix duala/ewondo libre de droits** | Entraîner une voix (Piper, MIT) sur Common Voice + Duala-TTS / Ewondo-TTS (Mozilla) ; générer les clips hors ligne, puis voix en direct via ONNX/WebAssembly dans l'extension |
| F-12 | **Pidgin camerounais** (3e langue) | `LanguageCode` += `wes` ; glossaire pidgin (vocabulaire d'argent déjà dans Common Voice : *moni*, *send*, *balance*, *price*) ; traduction facilitée par la proximité avec l'anglais |
| F-13 | **Glossaire en orthographe officielle** | Réécrire avec un locuteur (ɛ, ɔ, ɓ, ɗ, ŋ, tons) ; script de contrôle qui signale les entrées sans ces caractères |
| F-14 | **Tests sur 10 sites bancaires** (Phase 3 du PLAN) | Banques et mobile money réels, en lecture seule ; mesurer étapes/récap/alertes détectés |
| F-15 | **Mode hors ligne complet** | Glossaire + clips + voix locale embarqués ; IA facultative ; indicateur dans le panneau |
| F-16 | **Commande vocale** (plus tard seulement) | Uniquement quand une reconnaissance vocale duala/ewondo existe (Common Voice sert à l'entraîner) ; jamais en français déguisé |
| F-17 | **Contribution à Common Voice** | Soumettre nos phrases bancaires validées (thème « finance ») pour que la communauté les enregistre |
| F-18 | **Publication Chrome Web Store** | Remplacer Africa TTS (non commercial), politique de confidentialité, captures, icône |

### Livrables du hackathon encore à faire

- Vidéo de démo (3 min max) sur la page SAFINUM, mode « Traduire dans la page » activé.
- Note technique (architecture, dépendances, limites) — partir de ce document et de `docs/declaration-outils-safinum.md`.
- Mise à jour de `PLAN.md` (en retard sur le README).
