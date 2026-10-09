# 01 · Parcours et écrans

Maquettes de référence : [`maquettes/wireframes-mobile.html`](maquettes/wireframes-mobile.html) (structure) et [`maquettes/desktop-clarte.html`](maquettes/desktop-clarte.html) (style final). Le style de référence est la direction **« Clarté »** ([06](06-design-system.md)). Les wireframes mobiles décrivent la structure, pas l'esthétique finale.

## 1. Plan du site

| Route | Écran | Accès |
|---|---|---|
| `/` | Page d'accueil publique (présentation et appel à s'inscrire) | Public ; redirige vers `/accueil` si connecté |
| `/inscription` | Inscription | Public |
| `/connexion` | Connexion | Public |
| `/mot-de-passe-oublie`, `/reinitialiser` | Réinitialisation du mot de passe | Public |
| `/api/auth/verify-email` | Lien de confirmation d'email (Better Auth), redirige vers `/accueil?email=verifie` | Public |
| `/consentement` | Consentement (comptes Google) | Connecté sans consentement |
| `/onboarding` | Onboarding en 5 étapes | Connecté, onboarding non terminé |
| `/accueil` | Tableau de bord | Connecté |
| `/progres` | Courbes et historique | Connecté |
| `/corps` | Silhouette annotée | Connecté |
| `/corps/seance` | Séance de mesure guidée | Connecté |
| `/objectif` | Objectif actif et historique | Connecté |
| `/reglages` | Profil, unités, données, compte | Connecté |
| `/mentions-legales`, `/cgu`, `/confidentialite` | Pages légales | Public |

Règles de redirection :
- Un utilisateur non connecté qui accède à une route connectée est envoyé vers `/connexion?next=<route>`.
- Un utilisateur connecté dont l'onboarding n'est pas terminé est envoyé vers `/onboarding`. L'onboarding est terminé quand le profil, une première pesée et un objectif existent.

## 2. Navigation

| Viewport | Navigation |
|---|---|
| **Mobile et tablette** (< 1024 px) | Barre d'onglets fixe en bas : **Accueil · Progrès · [+] · Corps · Objectif**. Le bouton central `+` ouvre la saisie de pesée. Réglages accessibles par l'avatar en haut à droite de l'Accueil. |
| **Desktop** (≥ 1024 px) | Barre latérale gauche de 210 px : logo, Accueil, Progrès, Corps, Objectif, Réglages, puis le profil en bas. Les actions « Mesurer » et « + Nouvelle pesée » se trouvent en haut à droite de l'Accueil. |

Icônes au trait, et seul l'élément actif est en noir ([06](06-design-system.md)).

## 3. Écrans

### 3.1 Onboarding (`/onboarding`)

Assistant plein écran, une question par étape, avec une barre de progression fine en haut. Les boutons « Retour » et « Continuer » sont en bas. Chaque étape est enregistrée à la validation, ce qui permet de reprendre en cas d'abandon.

| Étape | Contenu | Validation |
|---|---|---|
| 1. Sexe | « Pour afficher la bonne silhouette » : deux grands choix illustrés, Homme / Femme. | Obligatoire |
| 2. Toi | Taille (en cm ; bascule cm/in qui fixe aussi l'unité de longueur du profil), date de naissance. | Taille entre 100 et 250 cm ; âge ≥ 16 ans |
| 3. Poids actuel | Grand champ numérique avec stepper ± 0,1, bascule kg/lb (qui fixe l'unité de poids du profil), date du jour. Petit texte d'aide sur le protocole de pesée. | 20 à 400 kg. Crée la première pesée. |
| 4. Objectif | Choix du type (4 cartes avec une phrase d'explication), puis cible et rythme selon le type ([03 §4](03-regles-metier-et-calculs.md)). Aperçu : « ≈ 0,39 kg/sem · atteinte vers le 15 nov. ». Sous le formulaire (après « Terminer »), un lien discret **« Juste suivre mon poids »** crée un objectif maintien (référence : dernière pesée) et passe à l'étape suivante. | Voir EF-GOAL |
| 5. Première séance | « Mesure-toi maintenant pour voir ta progression plus tard ». Deux boutons : « Commencer (3 min) » termine l'onboarding puis ouvre la séance guidée (`/corps/seance` exige l'onboarding terminé), « Plus tard » termine l'onboarding et mène à l'accueil. Seule cette étape termine l'onboarding, et seulement si le profil, une pesée et un objectif existent. | Optionnel |

### 3.2 Accueil (`/accueil`)

**Mobile**, de haut en bas :
1. Date du jour, « Bonjour », avatar (lien vers Réglages).
2. **Poids · tendance** : grand chiffre (tendance du jour), rythme hebdomadaire en vert s'il va dans le sens de l'objectif, « Pesée du jour : X » (ou « Pas encore de pesée aujourd'hui »). Mini-courbe sur 3 mois : pesées en points gris, tendance en trait noir, projection en pointillés.
3. **Objectif** : cible et date estimée, barre de progression, statut ([03 §5](03-regles-metier-et-calculs.md)), avancement « 3,6 / 7,0 kg ».
4. **Mensurations** : les 3 zones mises en avant pour l'objectif ([03 §6](03-regles-metier-et-calculs.md)), avec valeur et écart sur 30 j. Puis « Dernière séance il y a N j · Prochaine mesure : <jour> ».

**Desktop** ([maquette](maquettes/desktop-clarte.html)) :
- En-tête : date, « Bonjour », boutons « Mesurer » (contour) et « + Nouvelle pesée » (plein).
- Colonne principale : bloc Poids avec grand chiffre (88 px), rythme, sélecteur de période (1M / 3M / 6M / 1A / Tout) et **grand graphique** (grille légère, axe Y à droite, ligne cible pointillée, étiquette sur la valeur actuelle), légende. Dessous, trois chiffres clés séparés par des filets : Objectif (avec barre), Rythme sur 4 semaines (avec statut), Atteinte estimée.
- Colonne droite (300 px) : silhouette annotée (8 zones) avec sélecteur de période 7 j / 30 j / Début.
- Pleine largeur en bas : **tableau des mensurations** avec Zone, Actuel, 30 j, Début et une mini-courbe. Les 3 zones mises en avant pour l'objectif ([03 §6](03-regles-metier-et-calculs.md)) apparaissent en premier, suivies des 2 suivantes dans l'ordre de la séance. Le lien « afficher 3 zones de plus » donne le reste.

**États particuliers :**

| Situation | Affichage |
|---|---|
| Calibrage (< 7 pesées ou < 10 jours) | Le grand chiffre est la dernière pesée, avec la mention « Tendance en calibrage · encore N pesées ». Le rythme est remplacé par ce message, la projection (et son libellé) est masquée. |
| Objectif atteint | Le bandeau « objectif atteint » porte le message : la ligne de statut et la projection sont masquées. L'avancement est plafonné au total. |
| Aucune mensuration | Le bloc Mensurations devient un appel à l'action : « Mesure-toi une première fois » avec le bouton « Commencer ». Le message « Il est temps de te mesurer » est réservé aux comptes dont la dernière séance date de plus de 14 jours (EF-MEA-05). |
| Dernière séance > 14 jours | Message « Il est temps de te mesurer » et bouton. |
| Objectif atteint | Bandeau « 🎯 Objectif atteint ! » avec deux boutons : « Passer en maintien » et « Nouvel objectif ». |

### 3.3 Saisie de pesée (panneau depuis `+`)

- Panneau qui monte du bas sur mobile, fenêtre modale centrée sur desktop.
- Titre « Nouvelle pesée », date (aujourd'hui par défaut, modifiable, jamais dans le futur).
- **Grand chiffre** pré-rempli avec la dernière pesée, stepper − / + (pas de 0,1), et clavier numérique à la sélection.
- Champ « % masse grasse (optionnel) ».
- Champ « Note » (optionnel, 140 caractères maximum). Exemples de suggestions : sel, resto, règles, alcool, mauvaise nuit.
- Encadré conseil : « Pèse-toi le matin, après les toilettes, avant de boire ou manger. Même balance, même endroit. »
- Bouton « Enregistrer ». Après enregistrement : fermeture du panneau, toast « Pesée enregistrée », accueil mis à jour.
- **Cas particuliers** : une pesée existe déjà à cette date → « Remplacer 78,2 kg par 78,9 kg ? ». Écart de plus de 5 % avec la tendance → confirmation « 72,0 kg ? C'est −6,4 kg par rapport à ta tendance. Confirmer ? ».

### 3.4 Corps (`/corps`)

- Titre « Corps » et sélecteur de période : **7 j · 30 j · 90 j · Début**.
- **Silhouette au trait** (homme ou femme selon le profil) avec 8 points de zone. Pour chacun : nom, dernière valeur, écart sur la période (vert si favorable à l'objectif, gris sinon). Les zones centrales (cou, poitrine, taille, hanches) ont leur étiquette à gauche, les zones latérales (épaules, bras, cuisse, mollet) à droite.
- Zone jamais mesurée : point creux et « — ».
- **Toucher un point** ouvre le panneau de saisie de cette zone : valeur précédente, stepper, protocole de mesure. La mesure est enregistrée dans la séance du jour.
- Bouton « Nouvelle séance de mesure » qui mène à `/corps/seance`.
- Sous la silhouette : « Dernière séance le <date> ».

### 3.5 Séance de mesure guidée (`/corps/seance`)

- Écran plein, sans barre d'onglets (groupe de routes `(session)` avec sa propre garde ; l'URL reste `/corps/seance`). En-tête : « ✕ Quitter », « Séance de mesure », compteur « 3 / 8 », barre de progression.
- Silhouette réduite en haut (hauteur ajustée à 34 % de la hauteur d'écran), avec la **zone en cours surlignée** (bande noire au niveau de la zone).
- Panneau bas :
  - nom de la zone, « Précédente : 84,5 cm · il y a 7 j » ;
  - grand chiffre pré-rempli avec la valeur déjà saisie le jour même, sinon la valeur précédente, et un stepper ± 0,1 ;
  - encadré **« Comment mesurer »** avec le protocole de la zone ([03 §7](03-regles-metier-et-calculs.md)) ;
  - boutons « ← Zone précédente » et « Zone suivante → », lien « Passer cette zone ».
- Ordre fixe, de haut en bas : cou, épaules, poitrine, bras, taille, hanches, cuisse, mollet.
- Seul « Zone suivante → » enregistre la valeur affichée (champ vidé : la zone est passée, rien n'est enregistré). « ← Zone précédente » et « Passer cette zone » naviguent **sans enregistrer**. Quitter en cours de route conserve les zones déjà enregistrées. La séance guidée ré-édite sa propre séance du jour, sans confirmation de remplacement.
- Une nouvelle ouverture le même jour reprend à la première zone sans valeur datée du jour et pré-remplit les valeurs déjà saisies.
- Écran de fin : récapitulatif des zones mesurées avec leur écart par rapport à la séance précédente, et bouton « Terminer ».
- Tant que l'utilisateur n'a aucune mesure (« premier lancement », sans stockage navigateur), un écran d'introduction présente les règles générales : ruban souple non extensible, matin à jeun, toujours le même côté.

### 3.6 Progrès (`/progres`)

- Puces de métrique : **Poids** · **% MG** (seulement si au moins une valeur existe) · puis les 8 zones.
- Sélecteur de période : 1M · 3M · 6M · 1A · Tout.
- **Graphique** :
  - Poids : pesées brutes (points gris), tendance (trait noir), ligne cible (pointillés), projection (pointillés d'aujourd'hui jusqu'à la date d'atteinte estimée, qui peut dépasser la période sélectionnée ; absente si la projection n'est pas `estimated`).
  - % MG et zones : valeurs reliées par un trait noir, points aux mesures, pas de lissage.
  - Survol ou toucher d'un point : infobulle avec la date, la valeur et la note éventuelle.
- Trois statistiques : **Variation** sur la période · **Rythme** (poids) ou **Écart vs début** (zones) · **Nombre de mesures**.
- **Historique** : liste antichronologique de **tout l'historique** de la métrique sélectionnée (pas seulement la période du graphique) : date, valeur, pastille de note, 50 lignes puis « Charger plus ». Toucher une ligne ouvre l'édition (modifier ou supprimer, avec confirmation). Pour une mesure, seule la valeur est modifiable ; changer la date = supprimer puis ressaisir. Pesée éditée en lb : la valeur enregistrée n'est pas altérée si le champ n'est pas touché.
- **État dans l'URL** : `?m=` (métrique), `?p=` (période), `?n=` (nombre de lignes, multiple de 50). Une valeur invalide retombe sur le défaut.

### 3.7 Objectif (`/objectif`)

- **Objectif actif** :
  - 4 types en grille 2×2 ; le type actif est en noir ;
  - champs « Actuel (tendance) » en lecture seule et « Cible » ;
  - **curseur de rythme** (`<input type="range">` natif stylé) en %/semaine, avec la zone recommandée en surbrillance et une zone d'alerte ([03 §4](03-regles-metier-et-calculs.md)). En dessous : « ≈ X kg/sem · atteinte vers le <date> ».
  - Bloc **Suivi** : rythme réel sur 4 semaines, statut et message d'explication.
- Modifier la cible ou le rythme met à jour l'objectif actif. Changer de type **archive** l'objectif actuel et en crée un nouveau (après confirmation).
- **Historique des objectifs** (repliable) : type, dates, poids de départ et d'arrivée, statut (atteint ou archivé).
- Une mention légale (pas de conseil médical) figure en bas de l'écran.

### 3.8 Réglages (`/reglages`)

Sections :
1. **Profil** : sexe, taille, date de naissance.
2. **Unités** : poids en kg ou lb, longueurs en cm ou in.
3. **Mensurations** : jour de mesure conseillé (lundi à dimanche, ou aucun).
4. **Compte** : email (lecture seule), changer le mot de passe (compte email), fournisseurs liés (Google), déconnexion.
5. **Mes données** : « Exporter mes pesées (CSV) », « Exporter mes mensurations (CSV) ».
6. **Zone sensible** : « Supprimer mon compte ». Une confirmation forte est demandée : saisir `SUPPRIMER`. La suppression est définitive.
7. Liens vers les pages légales et version de l'application.

### 3.9 Authentification

- Écrans minimalistes centrés : logo, titre, formulaire, bouton « Continuer avec Google » et séparateur « ou ».
- **Inscription** : email, mot de passe (au moins 10 caractères, indicateur de force), **case de consentement obligatoire** pour les données de santé ([07](07-securite-et-rgpd.md)), acceptation des CGU.
- Après inscription par email : passage **direct à l'onboarding**. Un email de vérification part en arrière-plan. Tant qu'il n'est pas confirmé, un bandeau discret en haut de l'app invite à le faire (EF-AUTH-01 CA5).
- **Connexion** : email et mot de passe, lien « Mot de passe oublié ? ».
- Pour une inscription via Google, la case de consentement est présentée juste après le retour de Google, avant l'onboarding.
- L'inscription, la connexion et la réinitialisation passent par le client navigateur Better Auth ; les consentements sont enregistrés par une Server Action juste après l'inscription, et la garde de `/consentement` rattrape un enregistrement manqué (voir [05](05-architecture-technique.md) §3).

## 4. Responsive

| Plage | Mise en page |
|---|---|
| < 640 px | Mobile : une colonne, barre d'onglets en bas, panneaux qui montent du bas. |
| 640 à 1023 px | Tablette : comme le mobile, contenu centré avec une largeur maximale de 640 px. |
| ≥ 1024 px | Desktop : barre latérale, grilles à deux colonnes (Accueil : graphique + silhouette), fenêtres modales à la place des panneaux, largeur maximale du contenu de 1200 px. |

## 5. Micro-interactions et feedback

- Toast discret en bas (mobile) ou en haut à droite (desktop) après chaque enregistrement ou suppression, avec « Annuler » pendant 5 s pour les suppressions.
- Transitions courtes (150 à 200 ms), aucune animation décorative. `prefers-reduced-motion` est respecté.
- Les boutons d'action affichent un état de chargement. Les formulaires ne se soumettent jamais deux fois.
