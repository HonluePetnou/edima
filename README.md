# Edima

Couche d'accessibilité linguistique pour les services financiers en ligne. Voir [PLAN.md](PLAN.md) pour le découpage du travail et [le cahier des charges](https://github.com/HonluePetnou/edima) pour les spécifications.

## Structure

```
apps/
  extension/   WXT + Preact : panneau latéral, content script, clips audio duala
  server/      Hono : relais local vers le sidecar M2M100 (port 8787)
packages/
  shared/      types, schémas Zod, glossaire, protection des valeurs (F10)
ml/
  inference/   sidecar FastAPI + CTranslate2 (port 8000)
  models/      modèle M2M100 duala (gitignored, à télécharger une fois)
  scripts/     entraînement, évaluation, export CT2
docs/          état du projet, déclaration jury, fiches de traduction
```

## Démarrage

### Prérequis

- Node.js 20+ et `pnpm`
- Python **3.10 à 3.12**
- Chrome ou Edge
- Le modèle `ml/models/m2m100_dua_ct2/model.bin` (voir l’étape 2)

### 1. Installer les dépendances

```powershell
pnpm install
```

### 2. Récupérer le modèle Duala (une seule fois)

Le modèle est sur Hugging Face : <https://huggingface.co/SupraJac/edima-m2m100-dua-ct2>.

```powershell
huggingface-cli download SupraJac/edima-m2m100-dua-ct2 m2m100_dua_ct2.zip --local-dir .
Expand-Archive -Path "m2m100_dua_ct2.zip" -DestinationPath "D:\hackathon" -Force
Test-Path "ml\models\m2m100_dua_ct2\model.bin"
```

Le zip contient le chemin `edima/ml/models/m2m100_dua_ct2`, donc on l’extrait dans le **parent** du dépôt. `ml/models/` est gitignored.

### 3. Lancer le sidecar M2M100 (terminal 1)

Première installation du venv :

```powershell
python -m venv ml\inference\.venv
ml\inference\.venv\Scripts\pip install -r ml\inference\requirements.txt
```

Puis, à chaque démarrage :

```powershell
ml\inference\.venv\Scripts\uvicorn server:app --app-dir ml\inference --port 8000
```

Vérification :

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

Réponse attendue : `ok: true` et `model_loaded: true`. Le premier chargement du modèle (490 Mo) peut prendre plusieurs dizaines de secondes.

### 4. Lancer le serveur Hono (terminal 2)

```powershell
pnpm dev:server
```

Le serveur écoute sur `http://localhost:8787` et relaie les traductions au sidecar. Variables utiles :

```powershell
$env:EDIMA_SIDECAR_URL = "http://127.0.0.1:8000"
$env:EDIMA_SIDECAR_TIMEOUT_MS = "20000"
```

Vérification :

```powershell
Invoke-RestMethod http://localhost:8787/health
```

### 5. Lancer l’extension (terminal 3)

```powershell
pnpm dev:extension    # mode watch
# ou
pnpm build:extension  # build de production
```

Puis dans Chrome/Edge :

1. Ouvrir `chrome://extensions` ou `edge://extensions`.
2. Activer **Mode développeur**.
3. **Charger l’extension non empaquetée** → `apps/extension/.output/chrome-mv3`.
4. Ouvrir le panneau latéral en cliquant sur l’icône Edima.
5. Dans les réglages : choisir **Duala**, activer **Traduction IA (expérimentale)** et, si besoin, **Traduire dans la page**.
6. Recharger l’onglet de la page test après chaque rebuild de l’extension.

Page de test du jury : <https://safinum.cm/hackathon-test>.

### 6. Vérifier

```powershell
pnpm test          # tests unitaires
pnpm compile       # vérification TypeScript
pnpm build:extension
pnpm test:e2e      # Playwright + Edge, extension réelle
```

### Ce qui a besoin de quoi

| Fonction | Extension seule | + serveur `8787` | + sidecar `8000` |
|---|---:|---:|---:|
| Glossaire, phrases modèles, clips duala | oui | non | non |
| Traduction IA du texte inédit | oui | oui | oui |
| Contrôle de cohérence, récap, alertes | oui | non | non |
| Test E2E SAFINUM | oui (build) | non | non |

L’IA est **désactivée par défaut**. Le sidecar ne sert que le **duala** ; en ewondo, l’extension garde le français.

### Dépannage rapide

- `model_loaded: false` : vérifier `ml/models/m2m100_dua_ct2/model.bin` et les logs du sidecar.
- `503 model_unavailable` : sidecar arrêté, modèle absent, ou placeholder `{{Vn}}` supprimé par le modèle (l’extension garde alors le français).
- Aucune traduction IA : vérifier que l’option est activée, que la langue est **Duala**, et que les ports `8787` puis `8000` répondent.
- Port déjà utilisé : changer `PORT` pour le sidecar, ou `EDIMA_SIDECAR_URL` côté serveur.

## État actuel (Phase 1)

- [x] Monorepo pnpm (`apps/extension`, `apps/server`, `packages/shared`, `ml`)
- [x] Extension : Manifest V3, `chrome.sidePanel`, content script en Shadow DOM, `MutationObserver` générique
- [x] Protection des montants/téléphones/dates (F10) — regex + `libphonenumber-js`, testé avec Vitest
- [x] Glossaire : 72 termes + 24 phrases-modèles, dont 48 termes et 19 phrases traduits en duala et marqués `valide`
- [x] Serveur Hono : route `/translate` validée par Zod, relais local vers le sidecar M2M100 (`EDIMA_SIDECAR_URL`, port `8000`), avec `/health`
- [x] **F1** (surimpression) : chaque libellé visible de la page est passé par le glossaire et remonté au panneau latéral ; tant qu'aucun terme n'est `valide`, le français original s'affiche (comportement prévu par F10/D9, pas un trou)
- [x] **F3** (boutons parlants) : au survol/focus, chaque bouton/lien affiche une bulle et se fait lire à voix haute (voix française locale ; clips duala pour les phrases couvertes)
- [x] **F2** (Lis-moi cette page) : résumé court (solde, frais, avertissement, actions) lu au clic, construit à partir de ce que F1 a déjà extrait
- [x] **F4** (lecture exacte des montants) : moteur montant → mots en français (0 à ~1 milliard, 48 tests), chiffre toujours affiché à côté du mot ; ewondo/duala renverront `null` tant que le linguiste n'a pas livré la grammaire des nombres
- [x] **F6** (récapitulatif avant confirmation) : détecte bénéficiaire/montant/frais/total par les mêmes libellés que F2, carte dédiée dans le panneau avec lecture à la demande
- [x] **F7** (avertissements prioritaires) : tout avertissement détecté (mots-clés FR/EN ou `role="alert"`) interrompt et passe en premier — lu dès son apparition, bannière rouge persistante dans le panneau
- [x] **F5** (parcours guidé) : classe la page en 3 étapes (solde, formulaire, récapitulatif), explique chaque champ du formulaire avec son libellé, étiquette « Étape X sur 3 » dans le panneau
- [x] **F9** (contenu inédit) : nouveau texte détecté par F8 → glossaire exact, puis phrases-modèles (`valide` ou `a_valider`, matching de structure avec capture des `{variables}`), puis masquage (F10) → `apps/server` → sidecar M2M100 local → réinsertion et vérification avant d'afficher « IA — non vérifié ». L’IA est désactivée par défaut ; si le sidecar est arrêté ou si un placeholder est perdu, le français reste affiché.
- [x] **D4** (contrôle de cohérence) : le montant tapé sur le formulaire est comparé à celui du récapitulatif ; un écart interrompt et se fait lire en premier, comme un avertissement F7
- [x] **D9** (texte original en un geste) : clic sur une ligne traduite pour révéler le français d'origine (adapté de l'appui long, pas de geste équivalent dans un panneau de bureau)
- [x] **D3** (partiel — panneau de transparence) : badge source par phrase déjà là (F1) ; coche « montants vérifiés » ajoutée sur les lignes IA
- [x] **D5** (changement de langue en direct) : sélecteur Ewondo/Duala fonctionnel, re-scan immédiat de la même page sans rechargement — les termes non validés gardent le repli français, tandis que les phrases-modèles Duala validées sont déjà traduites
- [x] **D12** (numéros lus par groupes de deux) : le numéro du bénéficiaire dans le récapitulatif est lu comme on le dicte au Cameroun (un chiffre puis des paires), pas chiffre par chiffre
- [x] **D10** (Explique-moi ce mot) : bouton « ? » sur 9 termes jargon (frais, bénéficiaire, solde...) avec explication simple + exemple en FCFA, indépendant du statut de traduction
- [x] Panneau Edima redessiné : direction éditoriale sobre (encre + accent terracotta, un seul chiffre dominant par écran — le total débité, pas quatre lignes à poids égal), composants réutilisables (`components/ui`, `components/panel`), icônes SVG propres (pas d'emoji), focus clavier visible AA, cibles tactiles ≥44px, états vide/chargement/erreur réels
- [x] UI v2 alignée sur le fichier Figma « Edima — Extension UI » : mascotte (9 états), palette clair/sombre, Nunito Sans, écran d'accueil + navigation (Lis-moi, éléments traduits, guide formulaire/récap, conseils de sécurité, transparence, réglages), toutes les alertes F7/D4 affichées en tête de chaque écran
- [x] Mascotte flottante en bas à droite sur les pages détectées comme financières (`utils/financial-page.ts`) : clic → ouvre le side panel, masquée quand le panneau est ouvert, désactivable dans les réglages
- [x] Branche `feature/integration-modele-dua` fusionnée : glossaire et phrases-modèles duala (48 termes + 19 phrases `valide`), serveur local M2M100 (F9). Les 24 termes et 5 phrases restants sont encore à traduire ; la validation formelle par un linguiste reste listée comme bloquante
- [x] Parcours complet vérifié de bout en bout sur la page du jury https://safinum.cm/hackathon-test (Edge + extension) : solde, formulaire (libellés lus au-dessus des champs), alerte « bénéficiaire jamais utilisé », récapitulatif, contenu injecté, montant du récap falsifié → alerte D4
- [x] Voix : uniquement des voix **locales** de l'ordinateur (rien n'est envoyé en ligne) ; jamais de texte duala lu par une voix française ; 34 clips duala (Africa TTS, non commercial, non relus) joués depuis le panneau
- [x] Valeurs protégées étendues : noms, numéros de compte, références, dates écrites, pourcentages ; l'IA est désactivée par défaut (réglage « Traduction IA (expérimentale) »)
- [x] Option **« Traduire dans la page »** (`utils/in-page.ts`, désactivée par défaut) : réécrit les libellés traduits directement dans le site ; valeurs, noms, références et saisies jamais touchés ; toutes les détections continuent de lire le français d'origine ; restauration exacte à la désactivation. Vérifié sur tout le parcours SAFINUM, jusqu'au reçu
- [x] Déclaration des outils pour le jury : `docs/declaration-outils-safinum.md` ; vocabulaire de la page SAFINUM à faire traduire : `docs/safinum-vocabulaire-a-traduire-duala.txt`
- [ ] Traductions ewondo/duala validées par le linguiste — bloquant, voir PLAN.md

Le glossaire ne couvre pas encore les ~150 termes visés par le cahier des charges : les 72 termes actuels sont choisis pour couvrir le parcours de test (solde, frais, transfert, récapitulatif, avertissement), à étendre avec le linguiste.
