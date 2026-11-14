# Analyse : sortie brute du modèle M2M100 sur le glossaire manquant

Branche `experiment/invention-langue`. Généré avec `translate_batch.py`, le
vrai modèle M2M100 fine-tuné duala du projet (`ml/models/m2m100_dua_ct2`),
sur les 74 textes français qui manquent encore : les 45 du protocole
SAFINUM (`docs/safinum-vocabulaire-a-traduire-duala.txt`) + les 24 termes
et 5 phrases-modèles du glossaire au statut `a_traduire`. Résultat brut
dans `glossaire-ia-dua.json`.

## Résultat 1 : les {placeholders} ne survivent pas

**4 phrases-modèles sur 4 qui contenaient un `{placeholder}` l'ont perdu ou
cassé** à la traduction :

| Français | Sortie du modèle |
| --- | --- |
| `« {bouton} » : {description}.` | `E? ( Efe.` |
| `Le bouton « {bouton} » sert à {description}.` | `But'a " [ [ [ ] ] " e mabolane̱ nde ońola [ langwa ].` |
| `Retrait au guichet, {montant}.` | `Diba omo̱ ń a bo̱ ngo̱.` (le `{montant}` a disparu) |
| `Compte numéro {numero_masque}.` | `No̱ ngo̱ numba la mo̱ ni.` (le `{numero_masque}` a disparu) |

**C'est la confirmation concrète, avec le vrai modèle du projet, de ce que
F10 refuse par principe** : un modèle de traduction ne préserve pas de
façon fiable un jeton qu'il ne reconnaît pas comme un mot. C'est exactement
pour ça que `fillTemplate()` (`packages/shared/src/glossary.ts`) n'appelle
jamais le modèle sur une phrase-modèle — le `dua` d'une phrase-modèle doit
être écrit à la main par quelqu'un qui garde le `{placeholder}` au bon
endroit, jamais produit par traduction automatique.

## Résultat 2 : les libellés courts — une sortie, aucune certification

Pour les 70 textes sans placeholder (labels courts, phrases de l'UI), le
modèle produit *quelque chose* dans la bonne famille de graphie duala à
chaque fois (aucun échec technique). Mais :

- **Rien ne confirme que c'est correct.** Je ne suis pas locuteur duala, et
  `docs/ETAT-PROJET.md` note déjà qu'**aucun score d'évaluation n'a jamais
  été mesuré pour ce modèle** — personne n'a vérifié sa qualité, même
  approximativement.
- **L'exemple du propre README du sidecar ne se reproduit pas.** Un test
  isolé sur *« Le solde de votre compte est disponible. »* donne
  `Eboled'a mo̱ ngo̱ e te̱ nge̱ n.` — pas `Ese le ná o we le bolane mo ni.`
  comme l'indique `ml/inference/README.md`. Soit cet exemple n'a jamais été
  rejoué contre le modèle réel, soit le résultat n'est pas déterministe
  d'une façon qui devrait inquiéter. Dans les deux cas : ne faites pas
  confiance à un exemple de doc qui n'a pas été revérifié.
- **Certaines sorties ont l'air d'artefacts, pas de mots.** Ex. `Validé` →
  `JALEA` (tout en majuscules, détonne du reste), `IA — non vérifié` →
  `KA - Esibe̱ jombwea` (`KA` ne ressemble à rien d'observé ailleurs dans le
  corpus).

## Conclusion

Utilisable comme **brouillon de travail pour un locuteur** (plus rapide
que de traduire depuis zéro), **jamais comme contenu affiché**. Rien de ce
fichier ne doit passer dans `packages/shared/data/glossary/` avec un statut
`a_valider` ou `valide` sans qu'un locuteur l'ait relu phrase par phrase —
et pour les 4 phrases-modèles à placeholder, la sortie du modèle est à
jeter purement et simplement, pas juste « à corriger ».
