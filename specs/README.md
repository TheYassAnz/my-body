# my-body : cahier des charges

Application web responsive de suivi du poids et des mensurations, avec des objectifs configurables : perte, prise, recomposition, maintien.

| | |
|---|---|
| **Version du document** | 1.3 |
| **Date** | 7 octobre 2026 |
| **Statut** | Revu et validé |
| **Périmètre** | V1 : produit public, gratuit |
| **Développement** | Développeur solo, sans échéance imposée |

## Sommaire

| # | Document | Contenu |
|---|---|---|
| 00 | [Vision et périmètre](00-vision-et-perimetre.md) | Contexte, cible, personas, périmètre V1, hors périmètre, contraintes |
| 01 | [Parcours et écrans](01-parcours-et-ecrans.md) | Navigation, description détaillée de chaque écran, états vides, responsive |
| 02 | [Exigences fonctionnelles](02-exigences-fonctionnelles.md) | Exigences numérotées et critères d'acceptation, par domaine |
| 03 | [Règles métier et calculs](03-regles-metier-et-calculs.md) | Tendance lissée, rythme, statut d'objectif, projection, écarts, protocoles de mesure |
| 04 | [Modèle de données](04-modele-de-donnees.md) | Tables, contraintes, règles d'intégrité |
| 05 | [Architecture technique](05-architecture-technique.md) | Stack, arborescence, patterns, hébergement, variables d'environnement |
| 06 | [Design system](06-design-system.md) | Direction « Clarté » : tokens, typographie, composants, silhouette |
| 07 | [Sécurité et RGPD](07-securite-et-rgpd.md) | Authentification, isolation des données, données de santé, droits des utilisateurs |
| 08 | [Exigences non fonctionnelles](08-exigences-non-fonctionnelles.md) | Performance, accessibilité, compatibilité, observabilité |
| 09 | [Stratégie de tests](09-strategie-de-tests.md) | Tests unitaires, d'intégration, E2E, CI |
| 10 | [Planning et jalons](10-planning-et-jalons.md) | Lots de développement, définition de « terminé » |
| 11 | [Backlog V2+](11-backlog-v2.md) | Idées validées mais hors V1 |
| — | [Maquettes](maquettes/) | HTML à ouvrir dans un navigateur, voir ci-dessous |

### Maquettes

| Fichier | Contenu | Statut |
|---|---|---|
| [`wireframes-mobile.html`](maquettes/wireframes-mobile.html) | Les 6 écrans mobiles et un premier desktop : structure et contenu | Structure validée, style remplacé par « Clarté » |
| [`directions-visuelles.html`](maquettes/directions-visuelles.html) | 3 directions visuelles (Clarté, Nuit, Doux) | **A. Clarté retenue** |
| [`desktop-clarte.html`](maquettes/desktop-clarte.html) | Tableau de bord desktop dans le style final | **Référence visuelle** |
| [`silhouette-concepts.html`](maquettes/silhouette-concepts.html) | 3 usages de la silhouette (annotée, carte de chaleur, avant/après), tracés homme et femme | **A retenue en V1**, B et C au backlog |

## Glossaire

| Terme | Définition |
|---|---|
| **Pesée** | Une valeur de poids saisie pour une date donnée (au plus une par jour). |
| **Tendance** | Poids lissé par moyenne mobile exponentielle. C'est le chiffre principal affiché : il gomme les fluctuations quotidiennes (eau, sel, glycogène, transit). |
| **Rythme** | Vitesse d'évolution de la tendance, en kg/semaine et en % du poids par semaine. |
| **Calibrage** | Période initiale pendant laquelle il n'y a pas assez de pesées pour calculer un rythme fiable. |
| **Zone** | Une des 8 mensurations suivies : cou, épaules, poitrine, bras, taille, hanches, cuisse, mollet. |
| **Séance de mesure** | Ensemble des mensurations prises un même jour. |
| **Recompo** | Recomposition corporelle : perdre du gras et prendre du muscle à poids à peu près stable. |
| **Objectif** | Type (perte, prise, recompo, maintien), poids cible éventuel et rythme visé. Un seul actif à la fois. |

## Historique des révisions

| Version | Date | Changements |
|---|---|---|
| 1.0 | 29/09/2026 | Première version, issue du brainstorming. |
| 1.1 | 30/09/2026 | Revue de la spec. **Rythme calculé sur les pesées brutes** (supprime le retard de la tendance) et tendance amorcée sur la moyenne des 3 premières pesées ([03](03-regles-metier-et-calculs.md)). « Trop rapide » relatif au rythme choisi, sans plafond absolu. **Vérification d'email non bloquante**, réinitialisation réservée aux emails vérifiés. Option « Juste suivre mon poids » à l'onboarding. Finalités des données de profil précisées ([07](07-securite-et-rgpd.md)). Corrections mineures (fuseau horaire, bascule kg/lb à l'onboarding). |
| 1.2 | 03/10/2026 | Ajustements issus du plan L0-L1 (proxy Next 16, groupes de routes, lien de vérification Better Auth, profil nullable pendant l'onboarding, rate limit par IP). |
| 1.3 | 07/10/2026 | Ajustements issus du plan L2 (mini-courbe SVG serveur, confirmations successives, revalidation globale, stepper 44 px, seed sans objectif). |

## Conventions

- Les exigences sont identifiées `EF-<DOMAINE>-<n>` (fonctionnelles) et `ENF-<n>` (non fonctionnelles).
- Les priorités suivent MoSCoW : **M** (Must, obligatoire en V1), **S** (Should, souhaitable en V1), **C** (Could, si le temps le permet).
- Toutes les valeurs sont stockées en unités métriques (kg, cm). Les conversions n'ont lieu qu'à l'affichage.
- L'interface est en français. Le code (identifiants, tables, routes techniques) est en anglais, sauf les routes visibles par l'utilisateur, qui sont en français.
