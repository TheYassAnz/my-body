# 09 · Stratégie de tests

## 1. Pyramide

| Niveau | Outil | Portée | Quand |
|---|---|---|---|
| **Unitaire** | Vitest | `lib/metrics`, `lib/units`, `lib/dates`, schémas Zod | À chaque commit, en quelques secondes |
| **Intégration** | Vitest + **PGlite** (Postgres en mémoire, compatible Drizzle) | `features/*/actions.ts` et `queries.ts` : validation, persistance, **isolation entre utilisateurs**, transactions | À chaque commit |
| **Composant** (C) | Vitest + Testing Library | Stepper, silhouette (accessibilité, positions), formulaire d'objectif | À chaque commit |
| **E2E** | Playwright | Parcours critiques sur l'app réelle, en viewports mobile (390×844) et desktop (1440×900) | Sur chaque PR, contre une base dédiée |

Développement en **TDD** pour `lib/metrics` et les Server Actions : on écrit le test avant le code.

## 2. Tests unitaires : `lib/metrics`

### Tendance (`trend.ts`)
- Une seule pesée : la tendance est égale à cette pesée.
- Amorçage : pour les 3 premières pesées, la tendance est la moyenne des pesées déjà connues.
- À partir de la 4e pesée : la formule avec α = 0,1 est respectée (exemple chiffré de [03 §1](03-regles-metier-et-calculs.md)).
- Jour manquant : α_eff = 1 − 0,9^Δ (Δ = 3 → 0,271).
- Pesées fournies dans le désordre : elles sont triées avant le calcul.
- Série journalière : les jours sans pesée reprennent la dernière tendance.

### Calibrage et rythme (`rate.ts`)
- 6 pesées sur 20 jours : calibrage, 1 pesée manquante.
- 7 pesées sur 8 jours : calibrage (durée insuffisante).
- 7 pesées sur 10 jours : calibrage terminé.
- Pesées brutes parfaitement linéaires (−0,1 kg/jour) : rythme = −0,7 kg/sem exactement, **sans retard**, même juste après un changement de rythme une fois la fenêtre renouvelée.
- La régression porte sur les pesées brutes, pas sur la tendance (un test compare les deux sur une série avec rupture de pente).
- Historique < 28 jours : régression sur l'historique disponible.
- Moins de 5 pesées dans les 28 derniers jours : la fenêtre s'étend jusqu'aux 5 dernières pesées.
- Conversion en %/sem par rapport à la tendance actuelle.

### Statut (`goal-status.ts`)
Une table de cas couvre **chaque ligne** des tableaux de [03 §5](03-regles-metier-et-calculs.md), et en particulier :
- l'ordre de priorité : atteint > plateau > sens inverse > trop rapide > trop lent > dans le rythme ;
- les bornes exactes : v = 0,5 × r (dans le rythme), v = 1,5 × r (dans le rythme), v = 1,5 × r + ε (trop rapide) ;
- l'absence de plafond absolu : perte avec r = 1,2 et v = 1,3 → dans le rythme ; prise avec r = 0,7 et v = 0,9 → dans le rythme ;
- le plateau : exige au moins 21 jours d'historique ;
- le maintien : bande de ±1,5 % (bornes incluses) ;
- la recompo : les trois états de l'indicateur de taille, combinés avec stable et hors bande.

### Projection (`projection.ts`)
- Cas nominal, arrondi au jour supérieur.
- Plus de 730 jours : « plus de 2 ans ».
- Statut sens inverse, plateau ou calibrage : pas de projection.
- Progression bornée entre 0 et 100 %.

### Écarts (`deltas.ts`)
- Référence = mesure la plus récente au plus tard à `aujourd'hui − P`.
- Aucune mesure avant la période : on prend la première mesure.
- Une seule mesure : « — ».
- Sens favorable selon la matrice zone × objectif. Écart < 0,3 cm = 0, en gris.

### Unités (`units.ts`)
- Aller-retour kg → lb → kg et cm → in → cm sans dérive au-delà de la précision de stockage.
- Formatage `fr-FR` : « 78,4 », « −3,5 », « +1 ».

## 3. Tests d'intégration

Chaque test crée une base PGlite neuve, applique les migrations et crée deux utilisateurs A et B.

| Domaine | Cas |
|---|---|
| Pesées | Création · bornes rejetées (19,9 et 400,1 kg) · date future rejetée · même date → `needsConfirmation` puis remplacement avec `confirm` · valeur suspecte → `needsConfirmation` · saisie en lb convertie · modification · suppression |
| Mensurations | Séance guidée : zones enregistrées au fil de l'eau, séance unique par jour · saisie d'une zone isolée qui complète la séance du jour · remplacement d'une zone · la suppression de la dernière mesure supprime la séance |
| Objectifs | Création perte : cible ≥ tendance rejetée · rythme hors bornes rejeté · changement de type : l'ancien est archivé et le nouveau actif (transaction) · deux objectifs actifs impossibles (contrainte) · passage à `achieved` |
| Profil | Onboarding étape par étape, `onboarding_completed_at` renseigné · âge < 16 ans rejeté |
| Compte | Suppression : plus aucune ligne pour A dans aucune table, B intact · export CSV : colonnes, BOM, neutralisation des formules |
| **Isolation** | Pour **chaque** action qui prend un identifiant, A qui cible une ressource de B reçoit « introuvable » et rien n'est modifié. Chaque `query` ne renvoie que les données de l'utilisateur appelant. |

## 4. Parcours E2E (Playwright)

| # | Parcours | Viewports |
|---|---|---|
| E2E-1 | Inscription email → consentement → onboarding complet → accueil en calibrage avec bandeau « Confirme ton email » → ouverture du lien de vérification (lu depuis une boîte de test ou un point d'entrée de test) → bandeau disparu | mobile |
| E2E-2 | Connexion du compte de démo → pesée via `+` → la tendance de l'accueil change | mobile, desktop |
| E2E-3 | Séance de mesure guidée : 3 zones saisies, 1 passée, abandon, reprise → la silhouette affiche les valeurs | mobile |
| E2E-4 | Toucher la zone Taille sur la silhouette → saisie → écart mis à jour | mobile, desktop |
| E2E-5 | Changement d'objectif perte → prise, avec confirmation → l'historique contient l'ancien | desktop |
| E2E-6 | Passage de l'unité en lb → accueil, saisie et graphique en lb | mobile |
| E2E-7 | Export CSV téléchargé et non vide | desktop |
| E2E-8 | Suppression du compte → reconnexion impossible | desktop |
| E2E-9 | Accès à `/accueil` sans session → `/connexion?next=/accueil` | desktop |
| E2E-10 | Contrôle d'accessibilité automatique (`@axe-core/playwright`) sur chaque écran : aucune violation sérieuse ou critique | mobile, desktop |

Les E2E tournent contre `next build && next start`, avec une base Postgres éphémère (conteneur de service GitHub Actions) et un seed dédié.

## 5. Intégration continue (GitHub Actions)

À chaque push et chaque PR :
1. `pnpm install --frozen-lockfile`
2. `pnpm lint` et `pnpm typecheck`
3. `pnpm test` (unitaires et intégration, avec couverture ; seuil de 95 % sur `lib/metrics` et `lib/units`)
4. `pnpm build`
5. `pnpm test:e2e` (sur PR vers `main`)

`main` est protégée : tout doit être vert avant la fusion. Vercel déploie une prévisualisation pour chaque PR et la production à la fusion sur `main`.

## 6. Recette manuelle avant lancement

- Parcours complets sur un iPhone (Safari) et un Android (Chrome) réels.
- Lecteur d'écran : VoiceOver sur iOS pour l'onboarding, la saisie de pesée et la silhouette.
- Vérification visuelle de la direction « Clarté » face aux maquettes.
