# Edima — déclaration des outils, modèles et services

Déclaration demandée par le protocole de test du Hackathon SAFINUM Innovate 2026
(« Déclarez les outils, modèles et services externes utilisés pendant la démonstration »).

## Ce qui tourne pendant la démonstration

| Élément | Rôle | Où ça tourne | Licence / source |
|---|---|---|---|
| Extension Edima (WXT + Preact) | Lecture de la page, panneau latéral, alertes, récapitulatif | Navigateur, sur l'ordinateur | Notre code |
| Glossaire et phrases-modèles Edima | Traductions duala | Embarqués dans l'extension | Notre équipe — statut « à valider » tant qu'un linguiste ne les a pas relus |
| Synthèse vocale du système (Windows) | Lecture à voix haute en français | Sur l'ordinateur, **voix locales uniquement** (aucune voix en ligne) | Fournie par le système d'exploitation |
| Clips audio duala | Prononciation de termes du glossaire | Fichiers embarqués dans l'extension | Générés hors ligne avec **Africa TTS** (AfriSpeech, CC-BY-NC-4.0, usage non commercial) — voix de synthèse, non relue par un locuteur |
| libphonenumber-js | Détection des numéros de téléphone à protéger | Dans l'extension | MIT |

## Désactivé par défaut (option « Traduction IA (expérimentale) »)

| Élément | Rôle | Où ça tourne | Licence / source |
|---|---|---|---|
| M2M100 418M affiné français → duala | Traduction des phrases inconnues, signalée « IA — non vérifiée » | Serveur local (`localhost`), aucun service en ligne | Modèle de base Meta (MIT), affiné sur MT560 (CC-BY-4.0, textes religieux) avec un côté français produit par traduction automatique ; publié sur Hugging Face (SupraJac/edima-m2m100-dua-ct2) |

Quand l'option est activée, seul un texte **masqué** est transmis au serveur local :
montants, numéros de téléphone, numéros de compte, références, dates, pourcentages
et noms de personnes sont remplacés par des jetons avant l'envoi, puis réinsérés et
vérifiés caractère par caractère. Les textes composés uniquement de ces valeurs ne
sont jamais envoyés.

## Engagements vis-à-vis du protocole

- **Aucune modification du code de la page de test.** Par défaut, l'interface d'Edima vit
  dans un Shadow DOM séparé et dans le panneau latéral. Avec l'option « Traduire dans la
  page », seuls les **libellés** ayant une traduction sont réécrits à l'écran ; montants,
  frais, totaux, noms, numéros, références et saisies de l'utilisateur ne sont jamais
  touchés (vérifié valeur par valeur sur tout le parcours de test), et désactiver l'option
  restaure la page à l'identique.
- **Aucune collecte ni transmission** des données affichées : rien n'est stocké hors de
  la session ; pas de voix en ligne ; l'IA est désactivée par défaut et purement locale.
- **Valeurs financières** : jamais traduites ; le montant saisi est comparé à celui du
  récapitulatif, et tout écart est signalé en priorité.
- **Honnêteté linguistique** : chaque texte porte sa source — « Validé par un linguiste »,
  « Traduction à valider », « IA — non vérifiée » ou « Texte original (français) ».

## Données utilisées pour préparer le projet (pas pendant la démonstration)

- Mozilla Common Voice, duala (CC0-1.0) : référence d'orthographe.
- BOUQuET (Meta, CC-BY-4.0) : jeu d'évaluation français–duala, jamais utilisé pour l'entraînement.
- Lexique bancaire Ekwalla (2013) : consulté comme référence humaine, non recopié.
- Nombres duala et ewondo : Numeral Systems of the World's Languages (MPI-EVA),
  données fournies par des linguistes.
