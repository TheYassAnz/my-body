# 11 · Backlog V2+

Idées évoquées ou validées pendant le cadrage, **volontairement exclues de la V1**. Elles ne sont pas priorisées définitivement : à réévaluer après la bêta, selon l'usage réel.

## Visualisation du corps

| Idée | Description | Prérequis |
|---|---|---|
| **Carte de chaleur** (direction B des maquettes) | Zones de la silhouette colorées selon leur évolution interprétée par l'objectif (vert, gris, orange « à surveiller », par exemple bras en baisse pendant une sèche). | Aucun : les données et la matrice de sens favorable existent déjà ([03 §6](03-regles-metier-et-calculs.md)). Effort faible. |
| **Avant / maintenant superposés** (direction C) | Silhouette déformée selon les vraies mensurations, contour pointillé de départ, frise de relecture. | Modèle paramétrique 2D crédible. Effort élevé. |
| Zones personnalisées | Avant-bras, poignet, tour de poitrine sous le sein… | Table `zone` au lieu d'un enum |
| Gauche / droite séparés | Bras, cuisse et mollet des deux côtés | Colonne `side` |
| Bras contracté | Mesure additionnelle « contracté » | Variante de zone |

## Usage mobile

| Idée | Description |
|---|---|
| **PWA** | Manifeste, installation sur l'écran d'accueil, icônes, splash. |
| Hors-ligne | Saisie de pesée hors connexion, synchronisée au retour du réseau. |
| **Notifications push** | Rappel de pesée quotidien et rappel de mesure le jour choisi (Web Push). |
| Apps natives | Si besoin d'Apple Santé ou Health Connect : exposer une API depuis les `features`. |

## Données et intelligence

| Idée | Description |
|---|---|
| Import de balances | Apple Santé, Google Health Connect, Withings, Garmin. |
| Import CSV | Depuis Happy Scale, Libra, MacroFactor ou un tableur. |
| Estimation du % MG | Formule US Navy (cou, taille, hanches, taille corporelle), clairement marquée « estimation ». |
| Masse maigre et masse grasse | Calculées quand le % MG est disponible. Vérification que la perte vient du gras. |
| Apport calorique simplifié | Saisie des kcal du jour, puis **dépense énergétique adaptative** (TDEE) calculée depuis la tendance. |
| Notes et contexte | Sommeil, pas, cycle menstruel, pour expliquer les fluctuations. |
| Phases | Enchaînement planifié : prise de masse de 16 semaines, puis sèche de 8 semaines. |

## Produit

| Idée | Description |
|---|---|
| Mode sombre | Variante sombre des tokens « Clarté ». Les tokens sont déjà en variables CSS. |
| Multilingue | Anglais d'abord. Les textes sont déjà regroupés par domaine. |
| Photos de progression | Écartées en V1 (stockage, confidentialité). À reconsidérer avec chiffrement. |
| Espace coach | Un coach suit plusieurs athlètes (partage consenti). |
| Freemium | Si besoin de financer l'hébergement : vues B et C, import, export avancé. |
| Partage | Image générée « −6 cm de tour de taille en 12 semaines », sans chiffre de poids par défaut. |
