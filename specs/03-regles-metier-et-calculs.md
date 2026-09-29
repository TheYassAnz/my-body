# 03 · Règles métier et calculs

Toutes les règles de ce document sont implémentées dans `src/lib/metrics/` sous forme de **fonctions pures**, sans accès à la base ni à l'horloge système : la date « aujourd'hui » est passée en paramètre. Elles sont couvertes par des tests unitaires exhaustifs ([09](09-strategie-de-tests.md)).

**On ne stocke que les mesures brutes.** Tendance, rythme, statut et projection sont **recalculés à la lecture**. Modifier une ancienne pesée garde donc tout cohérent, sans migration ni recalcul différé.

Les paramètres ci-dessous sont regroupés dans `src/lib/metrics/config.ts` pour pouvoir être ajustés facilement.

| Paramètre | Valeur |
|---|---|
| `TREND_ALPHA` | 0,1 |
| `RATE_WINDOW_DAYS` | 28 |
| `CALIBRATION_MIN_ENTRIES` | 7 |
| `CALIBRATION_MIN_SPAN_DAYS` | 10 |
| `PLATEAU_WINDOW_DAYS` | 21 |
| `PLATEAU_THRESHOLD_PCT` | 0,1 %/sem |
| `STABLE_BAND_PCT` | 1,5 % |
| `SUSPICIOUS_DELTA_PCT` | 5 % |
| `MEASURE_STALE_DAYS` | 14 |
| `PROJECTION_MAX_DAYS` | 730 |

---

## 1. Tendance lissée

Moyenne mobile exponentielle adaptée aux jours manquants (méthode du *Hacker's Diet*).

Pour des pesées triées par date `(d₀, w₀), (d₁, w₁), …` :

```
T₀ = w₀
Δᵢ = dᵢ − dᵢ₋₁                  (en jours, ≥ 1)
αᵢ = 1 − (1 − α)^Δᵢ              α = TREND_ALPHA
Tᵢ = Tᵢ₋₁ + αᵢ × (wᵢ − Tᵢ₋₁)
```

- La **tendance du jour** est `Tₙ` de la dernière pesée. Elle n'est pas extrapolée aux jours sans pesée.
- **Série de tendance journalière** (pour les graphiques et le rythme) : les jours sans pesée reprennent la dernière valeur `T` connue.
- Arrondi à l'affichage seulement (1 décimale). Les calculs internes se font en précision complète.

**Exemple :** pesées 80,0 (J0), 79,0 (J1), 79,6 (J4).
- T₀ = 80,0
- J1 : α = 0,1 → T = 80,0 + 0,1 × (79,0 − 80,0) = **79,90**
- J4 : Δ = 3 → α = 1 − 0,9³ = 0,271 → T = 79,90 + 0,271 × (79,6 − 79,90) = **79,82**

## 2. Calibrage

L'utilisateur est **en calibrage** tant que l'une de ces conditions est vraie :
- moins de `CALIBRATION_MIN_ENTRIES` pesées au total ;
- moins de `CALIBRATION_MIN_SPAN_DAYS` jours entre la première et la dernière pesée.

Pendant le calibrage :
- le grand chiffre de l'accueil affiche la **dernière pesée** (et non la tendance), avec la mention « en calibrage » ;
- le rythme, le statut et la projection ne sont pas calculés. Le message est « Encore N pesées pour calculer ton rythme », où N est le nombre de pesées manquantes (au moins 1 si seule la contrainte de durée n'est pas remplie).

## 3. Rythme réel

1. Prendre la série de tendance journalière sur les `RATE_WINDOW_DAYS` derniers jours (ou depuis la première pesée si l'historique est plus court).
2. Faire une **régression linéaire des moindres carrés** tendance ~ jour. On obtient une pente `p` en kg/jour.
3. `rythme_kg_sem = p × 7`
4. `rythme_pct_sem = rythme_kg_sem / tendance_actuelle × 100`

Convention de signe : **négatif = baisse**. Pour l'affichage et la comparaison avec le rythme visé, on utilise la valeur « dans le sens de l'objectif » `v` :
- perte : `v = −rythme_pct_sem` (une perte donne un v positif) ;
- prise : `v = +rythme_pct_sem`.

## 4. Rythmes visés par type d'objectif

| Type | Rythme visé (r) | Bornes autorisées | Zone recommandée | Défaut | Cible |
|---|---|---|---|---|---|
| **Perte** | %/sem de perte | 0,25 à 1,5 | 0,5 à 1,0 | 0,5 | Obligatoire, < tendance |
| **Prise** | %/sem de prise | 0,1 à 0,75 | 0,1 à 0,5 | 0,25 | Obligatoire, > tendance |
| **Maintien** | aucun | — | — | — | Aucune (référence = tendance à la création) |
| **Recompo** | aucun | — | — | — | Aucune (référence = tendance à la création) |

- Curseur au pas de 0,05 %. Au-delà de la zone recommandée, le curseur passe en zone d'alerte avec un message :
  - perte > 1,0 % : « Rythme agressif : risque accru de perte musculaire et de fatigue. »
  - prise > 0,5 % : « Rythme rapide : une part importante de la prise sera du gras. »
- Aperçu en kg/sem : `r / 100 × tendance_actuelle`.
- Date théorique : `aujourd'hui + |cible − tendance| / (kg/sem) × 7` jours.

## 5. Statut de l'objectif

Évalué dans cet ordre (le premier cas vrai l'emporte) :

### 5.1 Perte et prise

| # | Condition | Statut | Message |
|---|---|---|---|
| 1 | Calibrage | `calibrating` | « Encore N pesées pour calculer ton rythme. » |
| 2 | Perte : tendance ≤ cible ; prise : tendance ≥ cible | `achieved` | « Objectif atteint ! » |
| 3 | \|rythme_pct_sem\| sur `PLATEAU_WINDOW_DAYS` < `PLATEAU_THRESHOLD_PCT` | `plateau` | « Plateau depuis 3 semaines. C'est normal de temps en temps. Si ça dure, ajuste ton alimentation ou ton activité. » |
| 4 | v < 0 | `wrong_direction` | Perte : « Ta tendance remonte. » Prise : « Ta tendance baisse. » |
| 5 | v > 1,5 × r, **ou** perte avec v > 1,0, **ou** prise avec v > 0,5 | `too_fast` | Perte : « Trop rapide : risque de perte musculaire. » Prise : « Trop rapide : prise de gras probable. » |
| 6 | v < 0,5 × r | `too_slow` | « Plus lent que prévu. » |
| 7 | sinon | `on_track` | « Dans le rythme. » |

Pour le plateau (ligne 3), on refait le calcul du §3 sur une fenêtre de 21 jours. Il faut au moins 21 jours d'historique.

### 5.2 Maintien

| Condition | Statut | Message |
|---|---|---|
| Calibrage | `calibrating` | idem |
| \|tendance − référence\| / référence ≤ `STABLE_BAND_PCT` | `stable` | « Stable, dans ta zone (± 1,5 %). » |
| sinon | `out_of_band` | « Hors de ta zone : +X kg » ou « −X kg ». |

### 5.3 Recompo

Le poids est évalué comme en maintien (`stable` ou `out_of_band`). On y ajoute un **indicateur de tour de taille** :
- On prend les mesures de taille des 28 derniers jours et la dernière mesure antérieure à cette fenêtre.
- Moins de 2 mesures au total : `waist_insufficient`, message « Mesure ta taille régulièrement pour suivre ta recompo. »
- Écart (dernière − plus ancienne) ≤ −0,5 cm : `waist_improving`, message « Tour de taille en baisse : ta recompo fonctionne. »
- Sinon : `waist_flat`, message « Tour de taille stable : patience, la recompo est lente. »

Le statut affiché combine les deux, par exemple « Poids stable · Tour de taille en baisse ».

### 5.4 Projection

Calculée uniquement pour **perte ou prise**, avec le statut `on_track`, `too_slow` ou `too_fast` :

```
jours_restants = |cible − tendance| / |p|              (p en kg/jour, §3)
date_estimée   = aujourd'hui + ceil(jours_restants)
```

- Si `jours_restants > PROJECTION_MAX_DAYS` : « Plus de 2 ans au rythme actuel ».
- Sinon : « Atteinte estimée : ~ 15 nov. ». On ajoute l'année si elle diffère de l'année en cours.
- Dans tous les autres cas : « Non estimable pour l'instant ».

Progression affichée : `(départ − tendance) / (départ − cible)`, bornée entre 0 et 100 %.

## 6. Écarts des mensurations

Pour une zone `z` et une période `P` (7 j, 30 j, 90 j, Début) :

- **Valeur actuelle** : la mesure la plus récente de `z`, avec sa date.
- **Valeur de référence** :
  - `Début` : la toute première mesure de `z` ;
  - sinon : la mesure la plus récente de `z` datée **au plus tard** `aujourd'hui − P`. S'il n'y en a pas, on prend la première mesure de `z`.
- **Écart** = actuelle − référence. On ne l'affiche pas si les deux sont la même mesure : on affiche alors « — ».

**Sens favorable** (écart coloré en vert) :

| Zone | Perte | Prise | Recompo | Maintien |
|---|---|---|---|---|
| Taille | ↓ | — | ↓ | — |
| Hanches | ↓ | — | ↓ | — |
| Cou | ↓ | — | — | — |
| Poitrine, épaules, bras, cuisse, mollet | — | ↑ | ↑ | — |

« — » : toujours gris. Une variation inférieure à 0,3 cm est considérée comme nulle et affichée « 0 », en gris.

**Zones mises en avant sur l'Accueil :**
- perte : taille, hanches, cuisse ;
- prise : bras, épaules, poitrine ;
- recompo : taille, bras, épaules ;
- maintien : taille, hanches, bras.

## 7. Protocoles de mesure

**Règles générales** (écran d'introduction de la séance et aide) :
- Ruban souple **non extensible**, posé au contact de la peau, bien à plat, **sans comprimer**.
- **Le matin, à jeun**, après être passé aux toilettes, **avant** l'entraînement (le « pump » fausse les mesures).
- **Toujours le même côté** du corps (par exemple le droit) pour les bras, cuisses et mollets.
- Muscles **relâchés** et posture droite. Mesurer deux fois et garder la moyenne en cas de doute.
- Fréquence conseillée : **toutes les 1 à 2 semaines**, le même jour.

| Zone | Protocole affiché |
|---|---|
| **Cou** | Juste sous la pomme d'Adam, ruban légèrement incliné vers l'avant. Regard droit, épaules relâchées. |
| **Épaules** | Tour complet au point le plus large des épaules (deltoïdes), bras relâchés le long du corps. |
| **Poitrine** | Au niveau des mamelons, ruban horizontal passant sous les aisselles, en fin d'expiration normale. |
| **Bras** | Au point le plus large du biceps, bras relâché le long du corps, non contracté. |
| **Taille** | Au niveau du nombril, ventre relâché (ne pas le rentrer), en fin d'expiration normale. |
| **Hanches** | Au point le plus large des fessiers, pieds joints, ruban horizontal. |
| **Cuisse** | Au point le plus large, juste sous le pli fessier, poids réparti sur les deux jambes. |
| **Mollet** | Au point le plus large du mollet, debout, poids réparti sur les deux jambes. |

## 8. Unités et arrondis

| Conversion | Facteur exact |
|---|---|
| 1 lb | 0,45359237 kg |
| 1 in | 2,54 cm |

- **Stockage** : kg à 2 décimales, cm à 1 décimale, % MG à 1 décimale.
- **Affichage** : 1 décimale pour toutes les unités (kg, lb, cm, in, %), séparateur décimal selon la locale (virgule en `fr-FR`). Les écarts sont signés (« −3,5 », « +1 »), sans zéro décimal inutile.
- **Saisie en unité impériale** : conversion en métrique **avant** validation et stockage, puis arrondi à la précision de stockage.
- Stepper : ± 0,1 dans l'unité affichée.

## 9. Validation des saisies (serveur, Zod)

| Champ | Règle |
|---|---|
| Date de pesée ou de mesure | ≤ aujourd'hui (fuseau de l'utilisateur, envoyé par le client et borné à ±14 h de l'UTC) ; ≥ 1900-01-01 |
| Poids | 20 à 400 kg |
| % MG | 2 à 70 %, optionnel |
| Note | ≤ 140 caractères, espaces retirés en début et fin, vide → null |
| Mensuration | 10 à 250 cm |
| Taille (height) | 100 à 250 cm |
| Date de naissance | âge ≥ 16 ans et ≤ 120 ans |
| Rythme | dans les bornes du type (§4) |
| Cible | perte : 20 kg ≤ cible < tendance ; prise : tendance < cible ≤ 400 kg |
