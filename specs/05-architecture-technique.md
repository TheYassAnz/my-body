# 05 · Architecture technique

## 1. Stack

| Couche | Choix | Rôle |
|---|---|---|
| Framework | **Next.js** (App Router, dernière version stable au démarrage) + **TypeScript** strict | Pages en React Server Components, mutations en Server Actions |
| UI | **React**, **Tailwind CSS**, police **Geist** (`next/font`) | Design system « Clarté » ([06](06-design-system.md)) |
| Composants de base | Primitives accessibles **Radix UI** (Dialog, Popover, Slider…), stylées maison | Fenêtres modales, panneaux, curseur de rythme |
| Graphiques | **Recharts** | Courbes de poids et de mensurations, mini-courbes |
| Silhouette | Composant **SVG maison** | Deux tracés (homme, femme) et des ancres de zones |
| Formulaires | **React Hook Form** + **Zod** (schémas partagés client et serveur) | |
| Base de données | **PostgreSQL** chez **Neon** (région UE, via la marketplace Vercel) | |
| ORM | **Drizzle ORM** + `drizzle-kit` | Schéma typé, migrations SQL versionnées |
| Auth | **Better Auth** (adaptateur Drizzle) | Email + mot de passe, Google OAuth, vérification d'email, réinitialisation, limitation de débit |
| Emails | **Resend** + **React Email** | Vérification, réinitialisation, confirmation de suppression |
| Hébergement | **Vercel**, fonctions en région **fra1** (Francfort) | Déploiements de prévisualisation sur chaque PR |
| Gestionnaire de paquets | **pnpm** | |
| Qualité | ESLint, Prettier, `tsc --noEmit` | |
| Tests | **Vitest**, **PGlite** (Postgres en mémoire), **Playwright** | [09](09-strategie-de-tests.md) |
| CI | **GitHub Actions** | Lint, types, tests, E2E |

## 2. Vue d'ensemble

```
┌──────────────────────────── Navigateur (mobile / desktop) ─────────────────────────────┐
│  Composants client : panneaux de saisie, stepper, graphiques Recharts, silhouette      │
└───────────────┬────────────────────────────────────────────────▲───────────────────────┘
                │ Server Actions (mutations)                     │ HTML RSC
┌───────────────▼────────────────── Next.js sur Vercel (fra1) ───┴───────────────────────┐
│  middleware.ts : présence d'un cookie de session, sinon /connexion                     │
│  app/(app)/layout.tsx : session serveur + onboarding terminé, sinon /onboarding        │
│                                                                                        │
│  features/<domaine>/                                                                   │
│     actions.ts   (écritures) ─┐                                                        │
│     queries.ts   (lectures) ──┼──► lib/db (Drizzle) ──► PostgreSQL (Neon, UE)          │
│     schemas.ts   (Zod)        │                                                        │
│                               └──► lib/metrics (calculs purs)                          │
│  lib/auth.ts (Better Auth) ──► /api/auth/[...all]                                      │
│  lib/email ──► Resend                                                                  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

## 3. Arborescence

```
my-body/
├─ specs/                       ← ce cahier des charges
├─ src/
│  ├─ app/
│  │  ├─ (public)/              page d'accueil /, pages légales
│  │  ├─ (auth)/                connexion, inscription, mot-de-passe-oublie, reinitialiser, verifier-email
│  │  ├─ (app)/
│  │  │  ├─ layout.tsx          garde de session et d'onboarding, navigation (barre du bas / latérale)
│  │  │  ├─ accueil/page.tsx
│  │  │  ├─ progres/page.tsx
│  │  │  ├─ corps/page.tsx
│  │  │  ├─ corps/seance/page.tsx
│  │  │  ├─ objectif/page.tsx
│  │  │  └─ reglages/page.tsx
│  │  ├─ onboarding/page.tsx
│  │  ├─ api/auth/[...all]/route.ts     handler Better Auth
│  │  └─ api/export/[kind]/route.ts     export CSV (pesees | mensurations)
│  ├─ features/
│  │  ├─ weight/        actions.ts · queries.ts · schemas.ts · components/ (WeightSheet, WeightChart, History)
│  │  ├─ measurements/  actions.ts · queries.ts · schemas.ts · components/ (Silhouette, ZoneSheet, MeasureSession)
│  │  ├─ goals/         actions.ts · queries.ts · schemas.ts · components/ (GoalForm, RateSlider, GoalStatus)
│  │  ├─ dashboard/     queries.ts (agrégation pour l'Accueil) · components/
│  │  ├─ profile/       actions.ts · queries.ts · schemas.ts · components/
│  │  └─ account/       actions.ts (suppression) · export.ts (CSV)
│  ├─ lib/
│  │  ├─ metrics/       config.ts · trend.ts · rate.ts · goal-status.ts · projection.ts · deltas.ts · index.ts
│  │  ├─ units.ts       conversions et formatage (Intl.NumberFormat)
│  │  ├─ dates.ts       « aujourd'hui » dans le fuseau de l'utilisateur, calculs en jours
│  │  ├─ db/            schema.ts · client.ts · migrations/ · seed.ts
│  │  ├─ auth.ts        configuration serveur Better Auth
│  │  ├─ auth-client.ts client Better Auth
│  │  ├─ session.ts     requireUser() : renvoie { userId, profile } ou redirige
│  │  └─ email/         templates React Email + envoi
│  └─ components/ui/    Button, Input, NumberStepper, Segmented, Sheet, Dialog, Toast, Slider, Pill…
├─ tests/
│  ├─ e2e/              Playwright
│  └─ helpers/          fabrique de base PGlite, fixtures
├─ drizzle.config.ts
├─ .env.example
└─ README.md
```

**Règles de dépendance :**
- `lib/metrics` ne dépend de **rien** (ni base, ni Next, ni horloge).
- `features/*` dépendent de `lib/*` et de `components/ui`. Un domaine peut lire les `queries` d'un autre domaine, jamais ses `actions`.
- `app/*` n'appelle que `features/*` et `components/ui`. **Aucune requête Drizzle directe dans `app/`.**

## 4. Patterns

### 4.1 Lecture (Server Components)

```ts
// app/(app)/accueil/page.tsx
const { userId, profile } = await requireUser();
const data = await getDashboard(userId, today(profile.timezone));
return <Dashboard data={data} units={profile} />;
```

`getDashboard` charge les pesées, les mensurations et l'objectif actif, puis appelle `lib/metrics` et renvoie un objet d'affichage déjà calculé. Les composants ne font aucun calcul métier.

### 4.2 Écriture (Server Actions)

```ts
'use server'
export async function saveWeight(input: unknown): Promise<ActionResult> {
  const { userId, profile } = await requireUser();
  const parsed = weightInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  // conversion d'unités → métrique, upsert (user_id, date) …
  revalidatePath('/(app)', 'layout');
  return { ok: true };
}
```

- Type de retour unique : `ActionResult = { ok: true; data?: T } | { ok: false; fieldErrors?: Record<string, string[]>; formError?: string; needsConfirmation?: ConfirmReason }`.
- `needsConfirmation` gère les cas « remplacer la pesée existante » et « valeur suspecte ». Le client renvoie l'action avec `confirm: true`.
- Les erreurs inattendues sont journalisées côté serveur. Le client reçoit `formError: "Une erreur est survenue, réessaie."`.
- Les écritures sur plusieurs tables (suppression de la dernière mesure d'une séance, changement d'objectif) passent par une **transaction**.

### 4.3 « Aujourd'hui »

Le fuseau de l'utilisateur est stocké dans son profil. `today(tz)` renvoie une date `YYYY-MM-DD`. Toutes les dates métier sont des `date` SQL, jamais des timestamps. Les fonctions de `lib/metrics` reçoivent `today` en paramètre.

### 4.4 Rafraîchissement

Après chaque mutation, `revalidatePath` sur le layout `(app)`, puisque tous les écrans affichent des dérivés du poids ou des mensurations. Pas de cache applicatif en V1 : les calculs sont peu coûteux ([04 §5](04-modele-de-donnees.md)).

## 5. Environnements

| Environnement | Hébergement | Base |
|---|---|---|
| Local | `pnpm dev` | Neon (branche `dev`) ou Postgres local |
| Prévisualisation | Vercel Preview (par PR) | Branche Neon créée par PR (intégration Vercel ↔ Neon) |
| Production | Vercel Production, fra1 | Neon `main`, région UE |

Migrations : `drizzle-kit generate` en local, les fichiers SQL sont commités, et `drizzle-kit migrate` est exécuté dans l'étape de build Vercel avant `next build`.

## 6. Variables d'environnement (`.env.example`)

```
DATABASE_URL=                 # Neon, connexion poolée
BETTER_AUTH_SECRET=           # 32+ octets aléatoires
BETTER_AUTH_URL=              # http://localhost:3000 | https://<domaine>
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
RESEND_API_KEY=
EMAIL_FROM=                   # "my-body <noreply@<domaine>>"
SEED_DEMO_PASSWORD=           # dev uniquement
```

Aucun secret n'est commité. Les variables sont configurées dans Vercel par environnement.

## 7. Évolutivité prévue (sans l'implémenter)

- **PWA** : l'App Router permet d'ajouter `manifest.ts` et un service worker sans restructuration.
- **Apps natives** : les `queries` et `actions` étant isolées par domaine, une API REST ou tRPC pourra les exposer plus tard.
- **Freemium** : ajouter une table `subscription` et une garde par fonctionnalité dans `requireUser()`.
