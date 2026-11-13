# Edima ML — M2M100 Duala

Pipeline de fine-tuning de `facebook/m2m100_418M` (MIT) pour la traduction
**français → duala** (`fra` → `dua`), avec un prior anglais → duala
(`en` → `dua`) appris sur MT560.

Le modèle n'est **qu'une couche de brouillon** : le glossaire et les
phrases-modèles validés (`packages/shared/data/glossary/`) restent la source
de vérité pour le domaine bancaire. Le modèle sert au texte inédit et doit
pouvoir s'abstenir (repli français + badge « IA — non vérifié »).

## Pourquoi M2M100

- Licence **MIT** (compatible avec la politique du projet : gratuit, non
  copyleft).
- 418M paramètres : tient sur un GPU T4 (Kaggle) et s'exporte en int8
  (~450 Mo) pour une démo locale hors ligne.
- Ne couvre pas le duala nativement → on ajoute le token `__dua__` et on
  initialise son embedding à partir des langues bantoues proches
  (`ln`, `lg`, `rw`, `ny`, `sw`, `zu`, `xh`).

NLLB-200 est volontairement exclu de l'entraînement (CC-BY-NC, usage
commercial interdit) ; il peut servir de référence de démo.

## Structure

```
ml/
  configs/m2m100_dua.yaml   hyperparamètres et chemins
  scripts/
    common.py               chemins, config, seed, token duala
    01_download.py          modèle de base + MT560 (+ BOUQuET optionnel)
    02_prepare_data.py      nettoyage, déduplication, split JSONL
    03_add_dua_token.py     ajout de __dua__ + warm-start des embeddings
    04_make_synthetic_fr.py paires FR synthétiques (M2M100 EN→FR)
    05_train.py             fine-tuning (EN→DUA + FR→DUA)
    06_evaluate.py          chrF/BLEU + précision terminologique
    07_export_ct2.py        export CTranslate2 int8 + vérification
  notebooks/kaggle_train.ipynb  déroulé complet sur Kaggle
  data/                     (gitignoré) corpus brut et préparé
  models/                   (gitignoré) modèle de base, init, export CT2
  out/                      (gitignoré) checkpoints, métriques, prédictions
```

## Prérequis

- Un compte Hugging Face (gratuit) et un token `HF_TOKEN`.
- Pour BOUQuET : accepter les conditions sur la page du dataset (gated).
- Kaggle recommandé : GPU **T4 ×2**, Internet activé, ~30 h/semaine.
  Colab gratuit fonctionne en secours (sessions plus courtes).
- En local, une GTX 1650 Ti 4 Go ne suffit que pour l'**inférence int8**,
  pas pour l'entraînement.

## Démarrage rapide (Kaggle)

1. Cloner le repo dans le notebook :

   ```bash
   git clone -b feature/moteur-de-traduction https://github.com/HonluePetnou/edima.git
   cd edima
   pip install -r ml/requirements.txt
   ```

2. Ajouter `HF_TOKEN` dans *Add-ons → Secrets*.
3. Exécuter les scripts dans l'ordre :

   ```bash
   python ml/scripts/01_download.py
   python ml/scripts/02_prepare_data.py
   python ml/scripts/03_add_dua_token.py
   python ml/scripts/04_make_synthetic_fr.py   # optionnel, long
   python ml/scripts/05_train.py
   python ml/scripts/06_evaluate.py
   python ml/scripts/07_export_ct2.py
   ```

4. Avant le run complet, faire un smoke test :

   ```bash
   python ml/scripts/05_train.py --sample 2000 --max-steps 200 --no-synthetic
   ```

Le notebook `notebooks/kaggle_train.ipynb` enchaîne ces étapes.

## Données et licences

| Donnée | Usage | Licence | Remarque |
| --- | --- | --- | --- |
| MT560 EN–DUA (15 351 paires) | entraînement | CC-BY-4.0 | contenu religieux (Watch Tower), provenance à vérifier avant commercial |
| BOUQuET `dua_Latn` / `fra_Latn` | évaluation uniquement | CC-BY-4.0 (gated) | ~1,3 k phrases, ne pas entraîner dessus |
| Common Voice Duala 27.0 (`data/common-voice/dua/`) | non utilisé ici — réservé à la voix (F-11/F-18) | CC0 | 8 095 clips, 14,4 h, 1 004 phrases ; pas de re-hosting |
| Common Voice Pidgin camerounais 27.0 (`data/common-voice/wes/`) | non utilisé ici — réservé à F-12 (3ᵉ langue) | CC0 | 9 417 clips, 10,8 h, 999 phrases ; pas de re-hosting |
| Lexique bancaire Ekwalla (2013) | référence humaine | © | ne pas recopier, ~40 termes |

Aucun corpus public **français–duala financier** n'existe : le domaine
bancaire viendra du glossaire validé puis, à l'étape 2, d'une adaptation
LoRA sur 200–500 paires or issues du faux portail de démo.

## Sorties attendues

- `data/processed/{train,val,test}.jsonl` : paires EN→DUA nettoyées.
- `data/processed/{train,val,test}_fr_syn.jsonl` : paires FR→DUA synthétiques.
- `models/m2m100_dua_init/` : modèle de base + token `__dua__`.
- `out/m2m100_dua/best/` : meilleur checkpoint (chrF).
- `out/eval/metrics.json` et `out/eval/predictions.jsonl`.
- `models/m2m100_dua_ct2/` : modèle int8 prêt pour le sidecar local.

## Notes techniques

- Le tokenizer M2M100 reconstruit `lang_code_to_id` à chaque chargement :
  `common.register_dua_token()` doit être appelé après chaque
  `from_pretrained`. Les scripts le font déjà ; le sidecar d'inférence devra
  faire de même après avoir chargé le tokenizer exporté.
- L'orthographe duala utilise des diacritiques combinants : on normalise en
  **NFC** sans supprimer les accents.
- Le décodage contraint (glossaire) et l'abstention sont gérés côté
  application, pas dans ce pipeline.
- Les scripts détectent automatiquement l'API disponible : `eval_strategy`
  (transformers ≥ 4.46) ou `evaluation_strategy`, et `processing_class` ou
  `tokenizer`. Aucun épinglage strict n'est nécessaire.

## Dépannage

- `ValueError: Some generation parameters are set in the model config` :
  ancienne version de `03`/`05` ; le paramètre est maintenant uniquement dans
  `model.generation_config`. Récupérer la dernière version et relancer `03`.
- `You need to have sentencepiece ...` : `pip install sentencepiece`.
- `AutoTokenizer` ne charge pas `m2m100_dua_init` : `03` a échoué avant de
  sauvegarder le tokenizer ; corriger l'erreur puis relancer `03`.

## Étape suivante

1. Traduire/valider `docs/glossaire-a-traduire-duala.txt` et
   `docs/phrases-modeles-a-traduire-duala.txt` avec l'équipe native.
2. Constituer 200–500 paires bancaires or via le faux portail.
3. Ajouter `08_train_lora.py` (adaptation domaine) et réévaluer la précision
   terminologique avant de brancher le sidecar dans l'extension.
