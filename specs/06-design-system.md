# 06 · Design system : direction « Clarté »

Références visuelles validées : [`maquettes/desktop-clarte.html`](maquettes/desktop-clarte.html) (desktop) et la direction A de [`maquettes/directions-visuelles.html`](maquettes/directions-visuelles.html) (mobile).

## 1. Principes

1. **La typographie fait le design.** Les grands chiffres et la hiérarchie typographique structurent la page, avec aussi peu de cadres et de fonds que possible.
2. **Monochrome et un seul signal.** Noir, blanc et gris. La seule couleur sémantique est le **vert**, pour « dans le bon sens ». Pas de rouge pour les données (on ne culpabilise pas). Le rouge est réservé aux actions destructrices.
3. **Espace généreux.** Les blocs sont séparés par l'espace et par des filets de 1 px, pas par des ombres.
4. **Le chiffre d'abord.** Chaque écran a un seul chiffre héros.
5. **Rien de décoratif.** Pas d'illustration, de dégradé ni d'animation gratuite.

## 2. Tokens

Définis comme variables CSS dans `globals.css` et exposés dans la configuration Tailwind.

### Couleurs

| Token | Valeur | Usage |
|---|---|---|
| `--bg` | `#ffffff` | Fond de page |
| `--fg` | `#0a0a0a` | Texte principal, traits de graphique, boutons pleins, éléments actifs |
| `--fg-2` | `#6a6a6a` | Texte secondaire (noms de zones, libellés de tableau) |
| `--muted` | `#9a9a9a` | Libellés, unités, métadonnées |
| `--subtle` | `#b0b0b0` | Éléments inactifs (onglets, segments), axes |
| `--dot` | `#d4d4d4` | Pesées brutes sur les graphiques |
| `--line` | `#f0f0f0` | Filets, séparateurs, grille des graphiques |
| `--surface` | `#f5f5f5` | Survol, élément de navigation actif, fonds de champs |
| `--positive` | `#1a7f37` | Écart ou statut dans le bon sens |
| `--danger` | `#b42318` | **Uniquement** pour les actions destructrices (suppression) |
| `--focus` | `#0a0a0a` | Anneau de focus (2 px, décalage de 2 px) |

Contraste : `--muted` sur blanc atteint 2,8:1. Il est réservé aux textes de 12 px et plus **non essentiels**, ou doublés d'une information équivalente. Tout texte porteur d'information utilise `--fg` ou `--fg-2` (5,4:1).

### Typographie : Geist

| Rôle | Mobile | Desktop | Graisse | Interlettrage |
|---|---|---|---|---|
| Chiffre héros | 64 px | 88 px | 600 | −0,05 em |
| Titre de page (h1) | 24 px | 28 px | 600 | −0,035 em |
| Titre de section (h3) | 15 px | 15 px | 600 | −0,02 em |
| Chiffre secondaire | 22 px | 22 px | 600 | −0,03 em |
| Corps | 14 px | 14 px | 400/500 | 0 |
| Libellé | 12 px | 12 px | 500 | 0 |
| Micro | 11 px | 11 px | 500 | 0 |

- **Chiffres tabulaires** (`font-variant-numeric: tabular-nums`) partout où des nombres sont affichés.
- L'unité accompagne le chiffre héros en plus petit (22 à 18 px) et en `--muted`.

### Espacements, rayons, ombres

- Échelle d'espacement en multiples de 4 px (4, 8, 12, 16, 20, 24, 32, 40, 56).
- Marges de page : 22 px en mobile, 40 px en desktop.
- Rayons : 99 px (boutons « pilule », pastilles), 12 px (champs, cartes rares), 22 px (haut des panneaux bas).
- Ombres : **aucune** dans la page. Les panneaux et fenêtres modales portent seulement `0 -8px 30px rgba(0,0,0,.12)`.

## 3. Composants

| Composant | Spécification |
|---|---|
| **Bouton principal** | Pilule, fond `--fg`, texte blanc, 600, hauteur 44 px (mobile) / 40 px (desktop). |
| **Bouton secondaire** | Pilule, bordure 1 px `--fg`, texte `--fg`. |
| **Bouton destructif** | Pilule, bordure `--danger`, texte `--danger`. Version pleine dans la confirmation finale. |
| **Bouton +** (barre d'onglets) | Cercle de 44 px, fond `--fg`, « + » blanc fin. |
| **Stepper numérique** | Grand chiffre centré (40 à 44 px) entouré de deux boutons ronds − / + (**44 px**, ENF-14 ; bordure `--line`). Appui long = répétition. Toucher le chiffre ouvre le clavier numérique (`inputmode="decimal"`). |
| **Contrôle segmenté** | Texte seul, espacement de 16 à 18 px. L'élément actif est en `--fg`, 600, souligné de 1,5 px. Inactifs en `--subtle`. |
| **Puces de métrique** | Pilule, bordure `--line`. Active : fond `--fg`, texte blanc. |
| **Panneau bas (mobile)** | Poignée de 40×5 px, haut arrondi à 22 px, fond assombri `rgba(10,10,10,.35)`. Se ferme par glissement vers le bas, Échap ou toucher du fond. |
| **Fenêtre modale (desktop)** | Largeur de 440 px, centrée, rayon de 16 px. Même contenu que le panneau bas. |
| **Barre de progression** | 3 px de haut, fond `--line`, remplissage `--fg`. |
| **Statut** | Texte seul en `--positive` pour un statut favorable, `--fg-2` sinon. Pas de pastille colorée. |
| **Encadré conseil** | Fond `--surface`, rayon de 12 px, texte de 12 px en `--fg-2`, titre en 600. |
| **Toast** | Fond `--fg`, texte blanc, pilule, action « Annuler » soulignée. |
| **Tableau** | En-têtes de 11,5 px en `--muted`, lignes séparées par `--line`. Chiffres alignés à droite et en tabulaire. |
| **Icônes** | Au trait, épaisseur 1,7 px, 18 à 22 px, `currentColor`. Jeu : Lucide, ou maison pour la silhouette de l'onglet Corps. |

## 4. Graphiques (Recharts)

| Élément | Style |
|---|---|
| Pesées brutes | Points de rayon 2,5 px, `--dot` |
| Tendance du poids | Trait de 2 px, `--fg`, courbe `monotone` |
| Série de mesures (% MG, zones) | Trait de 2 px, `--fg`, valeurs reliées en ligne droite (`linear`), pas de lissage |
| Projection | Pointillés ronds (`strokeDasharray="0.1 6"`, `strokeLinecap="round"`), 1,6 px, `--fg`. Tracée d'aujourd'hui jusqu'à la date estimée, au-delà de la période sélectionnée si besoin |
| Cible | Ligne horizontale en tirets (`2 5`), `--fg` à 50 % d'opacité. Libellé de valeur en `--fg`, 600 |
| Grille | Horizontale uniquement, `--line`. Axe Y **à droite**, axe X en mois ou jours, 11 px, `--subtle` |
| Valeur courante | Point de 5 px `--fg` avec halo à 7 %, étiquette pilule noire « 78,4 kg ». **Pas encore implémentée** (reportée) |
| Mini-courbes (tableau) | 90×20 px, trait de 1,4 px `--fg`, sans axe |
| Infobulle | Fond `--fg`, texte blanc 12 px, rayon de 8 px : date, valeur, note |

## 5. Silhouette

### 5.1 Rendu

- **Tracé au trait** : `fill: none`, `stroke: --fg`, 1,2 à 1,3 px. Pas de remplissage.
- Système de coordonnées : `viewBox="0 0 200 440"`, élargi à `-80 0 360 440` pour laisser la place aux étiquettes.
- Chaque silhouette est composée d'une **tête** (cercle ou ellipse) et d'une **demi-silhouette droite**, reflétée par `transform="translate(200,0) scale(-1,1)"`.
- Les tracés de référence (homme `m-half`, femme `f-half`) sont dans [`maquettes/silhouette-concepts.html`](maquettes/silhouette-concepts.html), bloc `<defs>`. Ils pourront être affinés par un·e designer tant que les ancres restent cohérentes.

### 5.2 Ancres des zones

| Zone | Homme (x, y) | Femme (x, y) | Côté de l'étiquette |
|---|---|---|---|
| Cou | 100, 70 | 100, 70 | gauche |
| Épaules | 145, 90 | 135, 90 | droite |
| Poitrine | 100, 130 | 100, 135 | gauche |
| Bras | 153, 140 | 144, 140 | droite |
| Taille | 100, 180 | 100, 185 | gauche |
| Hanches | 100, 220 | 100, 228 | gauche |
| Cuisse | 118, 280 | 117, 285 | droite |
| Mollet | 116, 360 | 115, 360 | droite |

- Ligne de rappel : 1 px, `--line`/`#e0e0e0`, de l'ancre jusqu'à x = 18 (gauche) ou x = 186 (droite).
- Point : cercle plein `--fg` de 3,5 px. Zone jamais mesurée : cercle creux.
- Étiquette : nom de la zone (10 px, `--muted`) au-dessus de la valeur (12,5 px, 600) et de l'écart (400, `--positive` ou `--muted`).
- **Zone de toucher** : au moins 44×44 px autour de chaque ancre, réalisée par des **boutons HTML superposés au SVG** (le SVG est `aria-hidden`). Seul le point est cliquable, pas l'étiquette.
- **Séance guidée** : la silhouette est ajustée en hauteur à 34 % de la hauteur d'écran (`34dvh`). La barre de surbrillance couvre, pour chaque zone, la largeur du corps à cette hauteur (constante `BAND` de `silhouette-geometry.ts`). Les valeurs de `BAND` ont été vérifiées visuellement à 390 px pour la silhouette **masculine uniquement** ; la féminine reste à vérifier.
- **Séance guidée** : la zone courante est surlignée par une barre horizontale arrondie `--fg` (hauteur de 16 unités, largeur ajustée au corps à cette hauteur), les autres éléments passent à 30 % d'opacité.

## 6. Mise en page

- **Mobile** : une colonne, contenu en pleine largeur avec marges de 22 px. Barre d'onglets de 64 px avec 20 px de zone de sécurité en bas (`env(safe-area-inset-bottom)`).
- **Desktop** : barre latérale de 210 px et contenu d'une largeur maximale de 1200 px. Accueil en grille `1fr 300px` avec un espace de 56 px. Tableau des mensurations en pleine largeur.
- Élément de navigation actif : fond `--surface`, texte `--fg`, 600.

## 7. Ton et contenus

- Tutoiement, phrases courtes, bienveillance factuelle : « Plus lent que prévu », pas « Tu échoues ».
- Les nombres suivent le format `fr-FR` (virgule décimale, espace fine insécable avant l'unité).
- Pas de jargon non expliqué : « tendance » et « rythme » ont une infobulle « ? » la première fois.
