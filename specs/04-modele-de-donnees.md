# 04 · Modèle de données

Base : **PostgreSQL** (Neon, région UE). Schéma défini avec **Drizzle ORM** dans `src/lib/db/schema.ts`, migrations générées par `drizzle-kit` et versionnées.

## 1. Vue d'ensemble

```
user (Better Auth) ─┬─ 1:1 ─ profile
                    ├─ 1:n ─ weight_entry
                    ├─ 1:n ─ measurement_session ─ 1:n ─ measurement
                    ├─ 1:n ─ goal
                    ├─ 1:n ─ session, account (Better Auth)
                    └─ 1:n ─ consent
```

Toutes les clés étrangères vers `user` sont en `ON DELETE CASCADE` : supprimer l'utilisateur supprime toutes ses données (EF-SET-05).

## 2. Tables gérées par Better Auth

`user`, `session`, `account`, `verification` : schéma généré par la CLI Better Auth pour l'adaptateur Drizzle, sans modification manuelle hors champs additionnels. Les identifiants sont des chaînes (format Better Auth).

## 3. Tables métier

### `profile`

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `user_id` | text | PK, FK → user.id, cascade | |
| `sex` | enum `sex` ('male', 'female') | not null | Choisit la silhouette |
| `height_cm` | numeric(4,1) | null jusqu'à l'étape 2 de l'onboarding, 100–250 si non null | |
| `birth_date` | date | null jusqu'à l'étape 2 de l'onboarding | Âge ≥ 16 ans (validé côté applicatif) |
| `weight_unit` | enum ('kg', 'lb') | not null, défaut 'kg' | Unité d'affichage |
| `length_unit` | enum ('cm', 'in') | not null, défaut 'cm' | Unité d'affichage |
| `timezone` | text | not null, défaut 'Europe/Paris' | Fuseau IANA détecté à l'inscription, sert à calculer « aujourd'hui » |
| `reminder_weekday` | smallint | null, 0–6 (0 = lundi) | Jour de mesure conseillé |
| `onboarding_completed_at` | timestamptz | null | Renseigné quand profil + pesée + objectif existent |
| `created_at`, `updated_at` | timestamptz | not null, défaut now() | |

### `weight_entry`

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | uuid | PK, défaut gen_random_uuid() | |
| `user_id` | text | FK → user.id, cascade, not null | |
| `date` | date | not null | **Date locale** de la pesée (pas d'horodatage, donc pas de problème de fuseau) |
| `weight_kg` | numeric(5,2) | not null, CHECK 20–400 | |
| `body_fat_pct` | numeric(4,1) | null, CHECK 2–70 | Saisi depuis une balance impédancemètre |
| `note` | varchar(140) | null | |
| `created_at`, `updated_at` | timestamptz | not null | |

- `UNIQUE (user_id, date)`, qui sert aussi d'index pour les lectures chronologiques.

### `measurement_session`

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | text | FK → user.id, cascade, not null |
| `date` | date | not null |
| `created_at`, `updated_at` | timestamptz | not null |

- `UNIQUE (user_id, date)` : une séance par jour, complétée au fil des saisies.

### `measurement`

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK |
| `session_id` | uuid | FK → measurement_session.id, cascade, not null |
| `zone` | enum `zone` ('neck', 'shoulders', 'chest', 'arm', 'waist', 'hips', 'thigh', 'calf') | not null |
| `value_cm` | numeric(4,1) | not null, CHECK 10–250 |
| `created_at`, `updated_at` | timestamptz | not null |

- `UNIQUE (session_id, zone)`.
- Règle applicative : quand la dernière mesure d'une séance est supprimée, la séance l'est aussi (même transaction).

### `goal`

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | uuid | PK | |
| `user_id` | text | FK → user.id, cascade, not null | |
| `type` | enum `goal_type` ('lose', 'gain', 'recomp', 'maintain') | not null | |
| `status` | enum `goal_status` ('active', 'achieved', 'archived') | not null, défaut 'active' | |
| `start_date` | date | not null | |
| `start_weight_kg` | numeric(5,2) | not null | Tendance à la création, et référence en maintien ou recompo |
| `target_weight_kg` | numeric(5,2) | null | Obligatoire pour lose et gain (CHECK) |
| `weekly_rate_pct` | numeric(3,2) | null | Obligatoire pour lose et gain (CHECK), dans les bornes du type |
| `ended_at` | date | null | Date de passage à achieved ou archived |
| `created_at`, `updated_at` | timestamptz | not null | |

- **Index unique partiel** `UNIQUE (user_id) WHERE status = 'active'` : un seul objectif actif par utilisateur.
- CHECK (5, migration `0003_goal.sql`) :
  - `goal_target_and_rate` : `(type IN ('lose','gain')) = (target_weight_kg IS NOT NULL AND weekly_rate_pct IS NOT NULL)` ;
  - `goal_target_with_rate` : cible et rythme ensemble ou absents ;
  - `goal_rate_range` : rythme dans les bornes du type (perte 0,25 à 1,5 ; prise 0,1 à 0,75) ;
  - `goal_weight_range` : poids de départ (et cible) entre 20 et 400 kg ;
  - `goal_ended_at` : `(status = 'active') = (ended_at IS NULL)`.

### `consent`

Trace du consentement explicite (RGPD, article 9) et de l'acceptation des CGU.

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | uuid | PK | |
| `user_id` | text | FK → user.id, cascade, not null | |
| `kind` | enum ('health_data', 'terms') | not null | |
| `version` | text | not null | Version du texte accepté, par exemple « 2026-09-29 » |
| `accepted_at` | timestamptz | not null | |

- Une ligne par acceptation. Un changement de version des CGU ou de la politique pourra demander une nouvelle acceptation (hors V1).

## 4. Règles d'accès

- **Toute** lecture ou écriture d'une table métier est filtrée par `user_id = <id de la session serveur>`. Pour `measurement`, le filtre passe par une jointure avec `measurement_session.user_id`.
- Cet accès est centralisé dans `src/features/*/queries.ts` et `actions.ts` ([05](05-architecture-technique.md)). Aucune requête Drizzle n'est écrite ailleurs.

## 5. Volumétrie estimée

Par utilisateur actif et par an : environ 300 pesées et environ 40 séances × 8 mesures, soit environ 620 lignes. Pour 10 000 utilisateurs actifs : environ 6 millions de lignes par an. C'est trivial pour PostgreSQL avec les index ci-dessus, et le calcul de tendance à la volée sur l'historique complet d'un utilisateur (< 2 000 lignes) reste en dessous de la milliseconde.

## 6. Données de démonstration

Un script `pnpm db:seed` crée, en environnement de développement uniquement, un compte `demo@my-body.test` avec 120 jours de pesées bruitées, 10 séances de mesure et un objectif de perte. Le mot de passe est défini dans `.env.example`.

En L2, le seed crée le compte, son profil, ses consentements et 120 jours de pesées (déterministes, jusqu'à la veille). En L3, le seed ajoute un objectif de perte (cible 75 kg, 0,5 %/sem, démarré 30 jours plus tôt). Les séances de mesure (L4) y seront ajoutées. Script : `src/lib/db/seed.ts`, lancé avec `tsx`.
