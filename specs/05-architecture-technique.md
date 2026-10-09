# 05 · Architecture technique

## 1. Stack

| Couche | Choix | Rôle |
|---|---|---|
| Framework | **Next.js** (App Router, dernière version stable au démarrage) + **TypeScript** strict | Pages en React Server Components, mutations en Server Actions |
| UI | **React**, **Tailwind CSS**, police **Geist** (`next/font`) | Design system « Clarté » ([06](06-design-system.md)) |
| Composants de base | Primitives accessibles **Radix UI** (`@radix-ui/react-dialog` en L2 ; Popover, Slider… plus tard), stylées maison | Fenêtres modales, panneaux, curseur de rythme |
| Graphiques | **Recharts** pour les grands graphiques (Progrès, Accueil desktop) ; mini-courbe de l'Accueil mobile en SVG rendu côté serveur (ENF-03) | Courbes de poids et de mensurations, mini-courbes |
| Silhouette | Composant **SVG maison** | Deux tracés (homme, femme) et des ancres de zones |
| Formulaires | **React Hook Form** + **Zod** (schémas partagés client et serveur) | |
| Base de données | **PostgreSQL** chez **Neon** (région UE, via la marketplace Vercel) | |
| ORM | **Drizzle ORM** + `drizzle-kit` | Schéma typé, migrations SQL versionnées |
| Auth | **Better Auth** (adaptateur Drizzle) | Email + mot de passe, Google OAuth, vérification d'email, réinitialisation, limitation de débit |
| Emails | **Resend** ; gabarits texte/HTML (React Email optionnel plus tard) | Vérification, réinitialisation, confirmation de suppression |
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
│  src/proxy.ts (Next.js 16) : cookie de session présent, sinon /connexion               │
│  groupes (app), (settings), onboarding, consentement : requireUser(area)                │
│                                                                                        │
│  features/<domaine>/                                                                   │
│     actions.ts   (écritures) ─┐                                                        │
│     queries.ts   (lectures) ──┼──► lib/db (Drizzle) ──► PostgreSQL (Neon, UE)          │
│     schemas.ts   (Zod)        │                                                        │
│                               └──► lib/metrics (calculs purs)                          │
│  lib/auth/ (Better Auth) ──► /api/auth/[...all]                                        │
│  lib/email ──► Resend                                                                  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

## 3. Arborescence

```
my-body/
├─ specs/                       ← ce cahier des charges
├─ src/
│  ├─ app/
│  │  ├─ page.tsx               page d'accueil publique /
│  │  ├─ mentions-legales/, cgu/, confidentialite/   pages légales
│  │  ├─ (auth)/                layout centré ; connexion, inscription, mot-de-passe-oublie, reinitialiser
│  │  ├─ (app)/
│  │  │  ├─ layout.tsx          garde de session et d'onboarding, navigation (barre du bas / latérale)
│  │  │  ├─ accueil/page.tsx
│  │  │  ├─ progres/page.tsx
│  │  │  ├─ corps/page.tsx
│  │  │  └─ objectif/page.tsx
│  │  ├─ (session)/
│  │  │  ├─ layout.tsx          même garde que (app), sans barre d'onglets
│  │  │  └─ corps/seance/page.tsx   séance de mesure guidée (plein écran)
│  │  ├─ (settings)/
│  │  │  ├─ layout.tsx          garde de session sans exigence d'onboarding
│  │  │  └─ reglages/page.tsx
│  │  ├─ consentement/page.tsx  consentement des comptes Google
│  │  ├─ onboarding/page.tsx
│  │  ├─ api/auth/[...all]/route.ts     handler Better Auth
│  │  └─ api/export/[kind]/route.ts     export CSV (pesees | mensurations)
│  ├─ features/
│  │  ├─ weight/        actions.ts · queries.ts · schemas.ts · components/ (WeightSheet, WeightChart, History)
│  │  ├─ measurements/  actions.ts · queries.ts · schemas.ts · limits.ts · copy.ts · summary.ts · silhouette-geometry.ts · components/ (Silhouette, BodyView, ZoneForm, MeasureSession, MeasureBlock, PeriodTabs)
│  │  ├─ goals/         actions.ts · queries.ts · schemas.ts · copy.ts (messages de statut) · summary.ts · components/ (GoalForm, GoalTracking, GoalBlock, AchievedBanner, GoalHistory) ; le curseur de rythme est `components/ui/slider.tsx`
│  │  ├─ dashboard/     queries.ts (agrégation pour l'Accueil) · components/
│  │  ├─ auth/          actions.ts · client-actions.ts · schemas.ts · components/
│  │  ├─ consent/       queries.ts
│  │  ├─ profile/       actions.ts · queries.ts · schemas.ts · components/
│  │  └─ account/       actions.ts (suppression) · export.ts (CSV)
│  ├─ lib/
│  │  ├─ metrics/       config.ts · trend.ts · rate.ts · goal-rates.ts · goal-status.ts · projection.ts · deltas.ts · index.ts
│  │  ├─ units.ts       conversions et formatage (Intl.NumberFormat)
│  │  ├─ dates.ts       « aujourd'hui » dans le fuseau de l'utilisateur, calculs en jours
│  │  ├─ db/            schema/ (auth.ts · app.ts) · client.ts (node-postgres) · seed.ts ; migrations dans drizzle/
│  │  ├─ auth/          create-auth.ts · index.ts (serveur Better Auth) · client.ts (client navigateur)
│  │  ├─ session.ts     requireUser(area) : renvoie { userId, profile } ou redirige
│  │  └─ email/         gabarits texte/HTML + envoi
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
- Contrôle d'accès par groupes de routes via `requireUser(area)` : `(app)` et `(session)` exigent l'onboarding terminé, `(settings)` ne l'exige pas, `onboarding` exige qu'il ne soit pas terminé, `consentement` gère les comptes sans consentement.
- Authentification : l'inscription, la connexion et la réinitialisation passent par le client navigateur (`authClient`), car le limiteur de débit de Better Auth ne s'applique qu'aux requêtes HTTP `/api/auth/*`, pas aux appels serveur `auth.api`. Les consentements sont enregistrés par une Server Action juste après l'inscription (la garde de `/consentement` rattrape un oubli). Le renvoi de vérification passe par `getAuth().handler(Request)` pour la même raison.
- Onboarding côté serveur : taille 100–250 cm après conversion depuis les pouces (saisie brute bornée), âge minimum 16 ans calculé sur la date du fuseau du profil.
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
  revalidatePath('/', 'layout');
  return { ok: true };
}
```

- Type de retour unique : `ActionResult = { ok: true; data?: T } | { ok: false; fieldErrors?: Record<string, string[]>; formError?: string; needsConfirmation?: { reason: 'replace' | 'suspicious' | 'archive'; message: string } }`.
- `needsConfirmation` gère les cas « remplacer la pesée existante », « valeur suspecte » et « archiver l'objectif » (changement de type). Le client renvoie l'action avec le bouton `confirm=<reason>` ; le champ caché `confirmed` conserve les raisons déjà acceptées, ce qui permet des confirmations successives (remplacement puis valeur suspecte).
- Les erreurs inattendues sont journalisées côté serveur. Le client reçoit `formError: "Une erreur est survenue, réessaie."`.
- Les écritures sur plusieurs tables (suppression de la dernière mesure d'une séance, changement d'objectif) passent par une **transaction**.
- Terminer ou remplacer un objectif peut être lié à l'identifiant attendu (`StaleGoalError` si l'objectif a changé entre-temps, utilisé par « objectif atteint »). Le code SQLSTATE `23505` (index unique, envoi concurrent) devient un message utilisateur propre, les autres erreurs le message générique ; seuls `{ userId, code }` sont journalisés (helper `sqlState`, `src/lib/db/errors.ts`). L'action d'onboarding `saveGoalStepAction` traite `23505` comme « objectif déjà créé ».

### 4.3 « Aujourd'hui »

Le fuseau de l'utilisateur est stocké dans son profil. `today(tz)` renvoie une date `YYYY-MM-DD`. Toutes les dates métier sont des `date` SQL, jamais des timestamps. Les fonctions de `lib/metrics` reçoivent `today` en paramètre.

### 4.4 Rafraîchissement

Après chaque mutation, `revalidatePath('/', 'layout')`, puisque tous les écrans affichent des dérivés du poids ou des mensurations. Pas de cache applicatif en V1 : les calculs sont peu coûteux ([04 §5](04-modele-de-donnees.md)).

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
