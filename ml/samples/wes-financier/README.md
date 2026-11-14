# Échantillons pidgin financiers (Common Voice)

Deux phrases du corpus Mozilla Common Voice 27.0 (`wes`, pidgin camerounais) tombent
directement sur du vocabulaire financier, avec plusieurs locuteurs natifs enregistrés
chacune. CC0 — réutilisation et republication libres.

| Fichier | Sentence ID (corpus) | Transcription exacte |
| --- | --- | --- |
| `balance-for-dat-moni-na-weti.mp3` | `f7441f252cc1c748e235b3aebad6deee3da4b28c7dd86b8a33718f35c009161` | *« Balance for dat moni na weti? »* (« Quel est le solde de cet argent ? ») |
| `some-person-be-tell-yi-for-send-moni.mp3` | `1fea5d657d3918c34dce7daeae40aa3ad86e2ccf0a7a595675cb9df862afe451` | *« Some person be tell yi for send moni for some number. »* (« Quelqu'un lui a dit d'envoyer de l'argent à un numéro. ») |

Chaque phrase a 8-9 prises par des locuteurs différents dans
`ml/data/common-voice/wes/validated.tsv` (colonne `sentence_id`) — celle choisie ici est
une prise propre, sans vote négatif.

## Pourquoi ces fichiers ne sont pas branchés dans l'extension

Ce sont des **phrases complètes**, pas des traductions des libellés courts de
l'interface (« Solde disponible », « Envoyer de l'argent »). Les faire jouer à la place
d'un libellé reviendrait à faire entendre une phrase différente de ce que l'utilisateur
voit écrit — exactement le genre d'erreur que la règle F10 (« ne jamais deviner ») est
censée empêcher, appliquée ici à la langue plutôt qu'aux montants.

Elles sont conservées ici comme matière première réelle pour le pidgin (F-12) : une fois
qu'un libellé pidgin aura été écrit pour « Solde disponible » / « Envoyer de l'argent »
(ou une phrase-modèle dont le sens correspond vraiment), un locuteur pourra dire si l'une
de ces prises convient telle quelle, ou s'il faut en enregistrer une nouvelle.
