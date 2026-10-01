# Lots L0 + L1 (socle technique, authentification et profil) : plan d'implémentation

> **Pour les agents :** sous-skill requis : utiliser `superpowers:subagent-driven-development` (recommandé) ou `superpowers:executing-plans` pour exécuter ce plan tâche par tâche. Les étapes utilisent des cases à cocher (`- [ ]`). Agent d'exécution conseillé : `implementer` ; relecture : `reviewer`.

**Objectif :** livrer une app Next.js déployée sur Vercel où l'on peut s'inscrire (email ou Google, avec consentement), se connecter, réinitialiser son mot de passe, renseigner son profil (onboarding étapes 1 et 2) et se déconnecter, avec la CI verte.

**Architecture :** Next.js 16 (App Router), Server Components pour la lecture et Server Actions pour l'écriture. Better Auth gère les sessions (adaptateur Drizzle, PostgreSQL). L'accès est contrôlé à deux niveaux : `src/proxy.ts` fait une redirection rapide si le cookie de session est absent, puis le layout de chaque groupe de routes vérifie session, consentement et onboarding. Les fonctions d'accès aux données prennent `db` en paramètre : Postgres (node-postgres) en production, PGlite en mémoire dans les tests.

**Stack :** Next.js 16, React 19, TypeScript strict, Tailwind CSS v4, Geist, Drizzle ORM + drizzle-kit, PostgreSQL (Neon, UE), Better Auth 1.6, Zod 4, Resend, Vitest + PGlite + Testing Library, Playwright, GitHub Actions, Vercel (fra1), pnpm.

**Spec :** `specs/` (v1.1), en particulier `01`, `02` (AUTH, ONB), `04`, `05`, `06`, `07`, `09`.

**Tickets Jira :** BODY-9 à BODY-21 (epics BODY-1 = L0, BODY-2 = L1).

## Contraintes globales

- Node.js ≥ 22, pnpm. TypeScript `strict`, aucun `any` explicite hors typage de bibliothèque tierce (commentaire obligatoire).
- Interface en **français** (tutoiement) ; code, tables et identifiants en **anglais** ; routes visibles en français (`/inscription`, `/connexion`, `/accueil`…).
- Mot de passe : **au moins 10 caractères** (client et serveur).
- Âge minimum : **16 ans**. Taille : **100 à 250 cm**.
- Session : cookie HttpOnly, 30 jours glissants (`updateAge` 1 jour).
- Stockage métrique uniquement ; dates métier en `date` locale `YYYY-MM-DD` calculée dans le fuseau `profile.timezone`.
- **Jamais** de donnée de santé, d'email complet ni de jeton dans les logs ou les emails.
- Région Vercel **fra1**, base Neon en **UE**.
- Design « Clarté » (`specs/06`) : noir/blanc, `--danger` réservé aux actions destructrices, chiffres en `tabular-nums`, anneau de focus 2 px.
- Lancer `pnpm format` avant chaque commit (la CI vérifie `pnpm format:check`).
- React 19 vide un formulaire après chaque soumission : en cas d'erreur, l'action renvoie les valeurs saisies (`values`, jamais le mot de passe) et le formulaire les réaffiche via `defaultValue={fieldValue(state, …)}`.

## Écarts assumés par rapport à la spec (à reporter dans la spec à la tâche 13)

1. **Next.js 16** : le fichier `middleware.ts` s'appelle désormais `src/proxy.ts` (fonction `proxy`).
2. **Contrôle d'accès par groupes de routes** plutôt que par chemin : `(app)` exige l'onboarding terminé, `(settings)` (Réglages) ne l'exige pas, `/onboarding` exige qu'il ne soit pas terminé, `/consentement` gère les comptes Google sans consentement.
3. **Lien de vérification d'email** : géré par l'endpoint Better Auth `/api/auth/verify-email?token=…` qui redirige vers `/accueil?email=verifie`. Il n'y a pas de page `/verifier-email`.
4. **Emails en L1** : gabarits texte + HTML simples (pas de React Email pour l'instant).
5. **Profil saisi étape par étape** : `height_cm` et `birth_date` sont **nullables** en base ; la complétude est vérifiée par l'application.
6. **Onboarding en L1** : terminé après les étapes 1 et 2 (seules existantes). Les lots L2 (pesée) et L3 (objectif) ajouteront leurs étapes à `nextOnboardingStep`.
7. **Limitation de débit** : par IP et par route (natif Better Auth). La limite « par email » de la spec 07 est reportée au backlog.

## Structure des fichiers

```
.github/workflows/ci.yml            CI : lint, types, tests, build ; E2E sur PR
vercel.json                         région fra1 + migrations au build
drizzle.config.ts                   config drizzle-kit
drizzle/                            migrations SQL générées (versionnées)
vitest.config.mts                   tests unitaires + intégration (+ composants en jsdom)
playwright.config.ts                E2E mobile 390×844 et desktop 1440×900
src/proxy.ts                        redirection rapide si pas de cookie de session
src/app/
  layout.tsx, globals.css, page.tsx           racine, tokens « Clarté », page publique minimale
  api/auth/[...all]/route.ts                  handler Better Auth
  (auth)/layout.tsx                           mise en page centrée
  (auth)/inscription|connexion|mot-de-passe-oublie|reinitialiser/page.tsx
  consentement/page.tsx                       consentement des comptes Google
  onboarding/page.tsx                         assistant (étapes 1-2 en L1)
  (app)/layout.tsx                            garde « onboarding terminé » + AppShell
  (app)/accueil|progres|corps|objectif/page.tsx   écrans vides
  (settings)/layout.tsx, (settings)/reglages/page.tsx
src/components/ui/                  button, input, checkbox
src/components/app-shell/           app-shell, nav-links, email-banner
src/features/auth/                  schemas, actions, components/*
src/features/consent/queries.ts     enregistrement et lecture du consentement
src/features/profile/               queries, schemas, onboarding, actions, components/*
src/lib/
  dates.ts, units.ts, env.ts, access.ts, action-result.ts, session.ts
  db/types.ts, db/client.ts, db/schema/{auth,app,index}.ts
  email/types.ts, email/templates.ts, email/send.ts
  auth/create-auth.ts, auth/index.ts, auth/client.ts
tests/helpers/db.ts                 base PGlite migrée + utilisateur de test
tests/integration/*.test.ts         tests d'intégration (PGlite)
tests/e2e/*.spec.ts                 Playwright
```

Règles : `lib/*` ne dépend pas de `features/*` (sauf `lib/session.ts`, point d'entrée serveur). Les fichiers importés par les tests n'importent **pas** `server-only` ; seuls `lib/db/client.ts`, `lib/auth/index.ts`, `lib/session.ts` et les `actions.ts` le font.

---

## L0 · Socle technique

### Tâche 1 : initialiser le projet Next.js (BODY-9)

**Fichiers :**
- Créer (via create-next-app) : `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `src/app/*`
- Créer : `.prettierrc`, `.prettierignore`, `.env.example`
- Modifier : `.gitignore`, `src/app/layout.tsx`, `src/app/page.tsx`, `eslint.config.mjs`

**Interfaces :**
- Produit : scripts `pnpm dev | build | start | lint | typecheck | format | format:check`, alias d'import `@/*` → `src/*`.

- [ ] **Étape 1 : générer le projet dans un dossier voisin** (le dépôt contient déjà `specs/` et `.claude/`, que create-next-app refuse)

```bash
cd .. && pnpm create next-app@latest my-body-scaffold --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm
```
Accepter les valeurs par défaut pour toute autre question (Turbopack, React Compiler…).

- [ ] **Étape 2 : rapatrier les fichiers dans le dépôt**

```bash
cd my-body && rsync -a --exclude .git --exclude .gitignore --exclude README.md ../my-body-scaffold/ ./ && cat ../my-body-scaffold/.gitignore >> .gitignore && rm -rf ../my-body-scaffold && pnpm install
```

Puis dédoublonner `.gitignore` à la main et vérifier qu'il contient : `.superpowers/`, `node_modules/`, `.next/`, `coverage/`, `.env`, `.env*.local`, `.DS_Store`, `test-results/`, `playwright-report/`, `*.tsbuildinfo`, `next-env.d.ts`.

- [ ] **Étape 3 : Prettier**

```bash
pnpm add -D prettier eslint-config-prettier
```

`.prettierrc` :
```json
{ "printWidth": 100 }
```

`.prettierignore` :
```
specs
drizzle
pnpm-lock.yaml
.next
coverage
playwright-report
test-results
```

Remplacer `eslint.config.mjs` par :
```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "drizzle/**", "coverage/**"]),
]);
```
Si le gabarit généré importe d'autres modules, garder sa structure et ajouter seulement `prettier` (en avant-dernier) et les entrées de `globalIgnores`.

- [ ] **Étape 4 : scripts** (dans `package.json`, en plus de ceux générés)

```json
"typecheck": "tsc --noEmit",
"format": "prettier --write .",
"format:check": "prettier --check ."
```
Vérifier que `"lint"` vaut `"eslint"` (Next 16 n'a plus `next lint`).

- [ ] **Étape 5 : layout racine et page publique minimale**

`src/app/layout.tsx` :
```tsx
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "my-body",
  description: "Suivi du poids et des mensurations",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={geist.variable}>
      <body>{children}</body>
    </html>
  );
}
```

`src/app/page.tsx` :
```tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6">
      <h1 className="text-3xl font-semibold tracking-tight">my-body</h1>
      <p className="text-fg-2">Suis ton poids et tes mensurations, et comprends ce qu&apos;ils veulent dire.</p>
      <div className="flex gap-3">
        <Link href="/inscription" className="rounded-full bg-fg px-5 py-2.5 text-sm font-semibold text-white">
          Commencer gratuitement
        </Link>
        <Link href="/connexion" className="rounded-full border border-fg px-5 py-2.5 text-sm font-semibold">
          Se connecter
        </Link>
      </div>
    </main>
  );
}
```
(Les classes `bg-fg`, `text-fg-2` deviennent actives à la tâche 6 ; d'ici là la page s'affiche sans couleurs, c'est normal.)

- [ ] **Étape 6 : `.env.example`**

```
# Base PostgreSQL (Neon, région UE) — connexion poolée
DATABASE_URL=
# 32+ octets aléatoires : openssl rand -base64 32
BETTER_AUTH_SECRET=
# http://localhost:3000 en local ; laisser vide sur Vercel Preview (VERCEL_URL est utilisé)
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
# Vide en local : les emails sont écrits dans la console
RESEND_API_KEY=
EMAIL_FROM="my-body <noreply@example.com>"
# CI E2E uniquement : "off" désactive la limitation de débit
AUTH_RATE_LIMIT=
SEED_DEMO_PASSWORD=
```

- [ ] **Étape 7 : vérifier**

Run : `pnpm lint && pnpm typecheck && pnpm format:check && pnpm build`
Attendu : tout passe (lancer `pnpm format` d'abord si `format:check` échoue sur les fichiers générés).

- [ ] **Étape 8 : commit**

```bash
git add -A && git commit -m "chore: scaffold Next.js 16 app with TypeScript, Tailwind, ESLint and Prettier

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 2 : Vitest et utilitaires de dates (BODY-11, partie unitaire)

**Fichiers :**
- Créer : `vitest.config.mts`, `src/lib/dates.ts`, `src/lib/dates.test.ts`
- Modifier : `package.json` (scripts)

**Interfaces :**
- Produit :
  - `type LocalDate = string` (format `YYYY-MM-DD`)
  - `today(timezone: string, now?: Date): LocalDate`
  - `ageOn(birthDate: LocalDate, on: LocalDate): number`
  - `isValidTimezone(tz: string): boolean`

- [ ] **Étape 1 : installer et configurer Vitest**

```bash
pnpm add -D vitest @vitest/coverage-v8 vite-tsconfig-paths @vitejs/plugin-react
```

`vitest.config.mts` :
```ts
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}", "tests/integration/**/*.test.ts"],
    coverage: { provider: "v8", include: ["src/lib/**"] },
  },
});
```

Scripts `package.json` :
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Étape 2 : écrire les tests qui échouent** — `src/lib/dates.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { ageOn, isValidTimezone, today } from "./dates";

describe("today", () => {
  const instant = new Date("2026-09-29T22:30:00Z");

  it("returns the calendar date in the user's timezone", () => {
    expect(today("Europe/Paris", instant)).toBe("2026-09-30");
    expect(today("America/New_York", instant)).toBe("2026-09-29");
  });
});

describe("ageOn", () => {
  it("counts a birthday only once it is reached", () => {
    expect(ageOn("2010-10-01", "2026-09-30")).toBe(15);
    expect(ageOn("2010-10-01", "2026-10-01")).toBe(16);
  });

  it("handles 29 February birthdays", () => {
    expect(ageOn("2008-02-29", "2024-02-28")).toBe(15);
    expect(ageOn("2008-02-29", "2024-02-29")).toBe(16);
  });
});

describe("isValidTimezone", () => {
  it("accepts IANA names and rejects unknown ones", () => {
    expect(isValidTimezone("Europe/Paris")).toBe(true);
    expect(isValidTimezone("Mars/Olympus_Mons")).toBe(false);
  });
});
```

- [ ] **Étape 3 : lancer, vérifier l'échec**

Run : `pnpm test src/lib/dates.test.ts`
Attendu : FAIL, module `./dates` introuvable.

- [ ] **Étape 4 : implémenter** — `src/lib/dates.ts`

```ts
/** Calendar date as lived by the user, formatted YYYY-MM-DD. */
export type LocalDate = string;

/** "Today" in the given IANA timezone. `now` is injectable for tests. */
export function today(timezone: string, now: Date = new Date()): LocalDate {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Full years between birthDate and `on`, both local dates. */
export function ageOn(birthDate: LocalDate, on: LocalDate): number {
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [y, m, d] = on.split("-").map(Number);
  const birthdayReached = m > bm || (m === bm && d >= bd);
  return y - by - (birthdayReached ? 0 : 1);
}

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Étape 5 : lancer, vérifier le succès**

Run : `pnpm test src/lib/dates.test.ts`
Attendu : PASS (5 tests).

- [ ] **Étape 6 : commit**

```bash
git add -A && git commit -m "test: set up Vitest and add local date helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 3 : Drizzle, schéma d'authentification et base de test PGlite (BODY-10)

**Fichiers :**
- Créer : `drizzle.config.ts`, `src/lib/db/types.ts`, `src/lib/db/client.ts`, `src/lib/db/schema/auth.ts`, `src/lib/db/schema/index.ts`, `tests/helpers/db.ts`, `tests/integration/db.test.ts`, `drizzle/` (généré)
- Modifier : `package.json` (scripts)

**Interfaces :**
- Produit :
  - `type Schema`, `type Db` (`src/lib/db/types.ts`) — type Drizzle indépendant du driver
  - `getDb(): Db` (`src/lib/db/client.ts`, serveur uniquement)
  - tables `user`, `session`, `account`, `verification`, `rateLimit` (`src/lib/db/schema/auth.ts`)
  - `createTestDb(): Promise<{ db: Db; close: () => Promise<void> }>` et `insertTestUser(db, id, email?)` (`tests/helpers/db.ts`)

- [ ] **Étape 1 : dépendances**

```bash
pnpm add drizzle-orm pg server-only && pnpm add -D drizzle-kit @types/pg @electric-sql/pglite
```

- [ ] **Étape 2 : types et client**

`src/lib/db/types.ts` :
```ts
import type { PgDatabase } from "drizzle-orm/pg-core";
import type * as schema from "./schema";

export type Schema = typeof schema;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- driver-agnostic Drizzle type: node-postgres in prod, PGlite in tests
export type Db = PgDatabase<any, Schema>;
```

`src/lib/db/client.ts` :
```ts
import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import type { Db } from "./types";

let instance: Db | undefined;

export function getDb(): Db {
  if (!instance) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set");
    instance = drizzle(new Pool({ connectionString }), { schema });
  }
  return instance;
}
```

- [ ] **Étape 3 : schéma Better Auth** — `src/lib/db/schema/auth.ts`

```ts
import { bigint, boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  ...timestamps,
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    ...timestamps,
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});
```

`src/lib/db/schema/index.ts` :
```ts
export * from "./auth";
```

- [ ] **Étape 4 : drizzle-kit** — `drizzle.config.ts`

```ts
import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "./src/lib/db/schema",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
```

Scripts `package.json` :
```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate"
```

Run : `pnpm db:generate --name auth_tables`
Attendu : `drizzle/0000_auth_tables.sql` et `drizzle/meta/_journal.json` créés.

- [ ] **Étape 5 : helper de base de test** — `tests/helpers/db.ts`

```ts
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/lib/db/schema";
import { user } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";

/** Fresh in-memory Postgres with every migration applied. */
export async function createTestDb(): Promise<{ db: Db; close: () => Promise<void> }> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return { db, close: () => client.close() };
}

export async function insertTestUser(db: Db, id: string, email = `${id}@example.com`) {
  await db.insert(user).values({ id, name: id, email });
}
```

- [ ] **Étape 6 : écrire le test d'intégration** — `tests/integration/db.test.ts`

```ts
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { session, user } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";
import { createTestDb, insertTestUser } from "../helpers/db";

describe("database schema", () => {
  let db: Db;
  let close: () => Promise<void>;

  beforeEach(async () => {
    ({ db, close } = await createTestDb());
  });
  afterEach(() => close());

  it("deletes a user's sessions when the user is deleted", async () => {
    await insertTestUser(db, "u1");
    await db.insert(session).values({
      id: "s1",
      token: "t1",
      userId: "u1",
      expiresAt: new Date(Date.now() + 60_000),
    });

    await db.delete(user).where(eq(user.id, "u1"));

    expect(await db.select().from(session)).toEqual([]);
  });
});
```

- [ ] **Étape 7 : lancer**

Run : `pnpm test tests/integration/db.test.ts`
Attendu : PASS. (S'il échoue parce que la migration n'existe pas, refaire l'étape 4.)

- [ ] **Étape 8 : brancher Neon (dev) et appliquer la migration** — *étape manuelle, faite par l'humain*

Créer un projet Neon en région **AWS Europe (Frankfurt)**, une branche `dev`, copier la chaîne de connexion **poolée** dans `.env.local` (`DATABASE_URL=…`), puis :

Run : `pnpm db:migrate`
Attendu : « migrations applied ».

- [ ] **Étape 9 : commit**

```bash
git add -A && git commit -m "feat(db): add Drizzle setup, Better Auth tables and PGlite test helper

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 4 : Playwright (BODY-11, partie E2E)

**Fichiers :**
- Créer : `playwright.config.ts`, `tests/e2e/smoke.spec.ts`
- Modifier : `package.json` (scripts)

- [ ] **Étape 1 : installer**

```bash
pnpm add -D @playwright/test && pnpm exec playwright install --with-deps chromium
```

`playwright.config.ts` :
```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: { baseURL: "http://localhost:3000", trace: "on-first-retry" },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: "pnpm build && pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
```

Script : `"test:e2e": "playwright test"`.

- [ ] **Étape 2 : test de fumée** — `tests/e2e/smoke.spec.ts`

```ts
import { expect, test } from "@playwright/test";

test("public home page shows the product name and sign-up link", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "my-body" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Commencer gratuitement" })).toHaveAttribute("href", "/inscription");
});
```

- [ ] **Étape 3 : lancer**

Run : `pnpm test:e2e`
Attendu : 2 tests passent (mobile et desktop).

- [ ] **Étape 4 : commit**

```bash
git add -A && git commit -m "test: set up Playwright with mobile and desktop projects

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 5 : CI GitHub Actions et déploiement Vercel (BODY-12)

**Fichiers :**
- Créer : `.github/workflows/ci.yml`, `vercel.json`

- [ ] **Étape 1 : workflow CI** — `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm format:check
      - run: pnpm test
      - run: pnpm build

  e2e:
    if: github.event_name == 'pull_request' && github.base_ref == 'main'
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: mybody
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready -U postgres" --health-interval 5s --health-timeout 5s --health-retries 10
    env:
      DATABASE_URL: postgres://postgres:postgres@localhost:5432/mybody
      BETTER_AUTH_SECRET: ci-only-secret-0123456789abcdef0123456789
      BETTER_AUTH_URL: http://localhost:3000
      AUTH_RATE_LIMIT: "off"
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm db:migrate
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report
```

Ajouter dans `package.json` le champ `"packageManager"` si create-next-app ne l'a pas mis (`pnpm/action-setup` le lit) : `"packageManager": "pnpm@<version affichée par pnpm --version>"`.

- [ ] **Étape 2 : Vercel** — `vercel.json`

```json
{
  "regions": ["fra1"],
  "buildCommand": "pnpm db:migrate && pnpm build"
}
```

- [ ] **Étape 3 : vérifier localement**

Run : `pnpm lint && pnpm typecheck && pnpm format:check && pnpm test && pnpm build`
Attendu : tout passe.

- [ ] **Étape 4 : commit**

```bash
git add -A && git commit -m "ci: add GitHub Actions workflow and Vercel config (fra1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Étape 5 : actions manuelles (humain)**
  1. Créer le dépôt GitHub `my-body` (privé), `git remote add origin …`, `git push -u origin main`.
  2. Vercel : importer le dépôt, région fra1 (déjà dans `vercel.json`), ajouter l'intégration **Neon** (branche par Preview, région UE).
  3. Variables Vercel : `BETTER_AUTH_SECRET` (Production + Preview), `BETTER_AUTH_URL` (Production uniquement), `RESEND_API_KEY`, `EMAIL_FROM`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` quand disponibles.
  4. GitHub : protéger `main` (CI `checks` obligatoire).
  5. Vérifier : la CI est verte et l'URL de production affiche la page « my-body ».

---

### Tâche 6 : tokens « Clarté », Button et Input (BODY-13)

**Fichiers :**
- Modifier : `src/app/globals.css`
- Créer : `src/components/ui/button.tsx`, `src/components/ui/input.tsx`, `src/components/ui/ui.test.tsx`

**Interfaces :**
- Produit :
  - classes Tailwind : `bg-bg`, `text-fg`, `text-fg-2`, `text-muted`, `text-subtle`, `border-line`, `bg-surface`, `text-positive`, `text-danger`, `border-danger`, `font-sans` (Geist)
  - `<Button variant?: "primary" | "secondary" | "danger" loading?: boolean …>`
  - `<Input label: string error?: string hint?: string …>` (client)

- [ ] **Étape 1 : dépendances de test de composants**

```bash
pnpm add -D jsdom @testing-library/react @testing-library/dom
```

- [ ] **Étape 2 : écrire les tests qui échouent** — `src/components/ui/ui.test.tsx`

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Button } from "./button";
import { Input } from "./input";

afterEach(cleanup);

describe("Input", () => {
  it("links the error message to the field for screen readers", () => {
    render(<Input label="Email" name="email" error="Email invalide" />);
    const field = screen.getByLabelText("Email");
    expect(field.getAttribute("aria-invalid")).toBe("true");
    const describedBy = field.getAttribute("aria-describedby") ?? "";
    expect(document.getElementById(describedBy)?.textContent).toBe("Email invalide");
  });

  it("has no error attributes when valid", () => {
    render(<Input label="Email" name="email" />);
    const field = screen.getByLabelText("Email");
    expect(field.hasAttribute("aria-invalid")).toBe(false);
    expect(field.hasAttribute("aria-describedby")).toBe(false);
  });
});

describe("Button", () => {
  it("is disabled and busy while loading", () => {
    render(<Button loading>Envoyer</Button>);
    const button = screen.getByRole("button", { name: "Envoyer" });
    expect(button).toHaveProperty("disabled", true);
    expect(button.getAttribute("aria-busy")).toBe("true");
  });
});
```

- [ ] **Étape 3 : lancer, vérifier l'échec**

Run : `pnpm test src/components/ui`
Attendu : FAIL, modules introuvables.

- [ ] **Étape 4 : tokens** — remplacer `src/app/globals.css` par :

```css
@import "tailwindcss";

:root {
  --bg: #ffffff;
  --fg: #0a0a0a;
  --fg-2: #6a6a6a;
  --muted: #9a9a9a;
  --subtle: #b0b0b0;
  --dot: #d4d4d4;
  --line: #f0f0f0;
  --surface: #f5f5f5;
  --positive: #1a7f37;
  --danger: #b42318;
  --focus: #0a0a0a;
}

@theme inline {
  --color-bg: var(--bg);
  --color-fg: var(--fg);
  --color-fg-2: var(--fg-2);
  --color-muted: var(--muted);
  --color-subtle: var(--subtle);
  --color-dot: var(--dot);
  --color-line: var(--line);
  --color-surface: var(--surface);
  --color-positive: var(--positive);
  --color-danger: var(--danger);
  --font-sans: var(--font-geist), system-ui, sans-serif;
}

body {
  background: var(--bg);
  color: var(--fg);
  font-family: var(--font-sans);
}

:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
    animation: none !important;
  }
}
```

- [ ] **Étape 5 : composants**

`src/components/ui/button.tsx` :
```tsx
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-fg text-white",
  secondary: "border border-fg text-fg",
  danger: "border border-danger text-danger",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
};

export function Button({
  variant = "primary",
  loading = false,
  disabled,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex h-11 items-center justify-center rounded-full px-5 text-[13px] font-semibold disabled:opacity-50 lg:h-10 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
```

`src/components/ui/input.tsx` :
```tsx
"use client";

import { useId, type InputHTMLAttributes } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export function Input({ label, error, hint, id, className = "", ...rest }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-xs font-medium text-fg-2">
        {label}
      </label>
      <input
        {...rest}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`h-11 rounded-xl border bg-surface px-3 text-sm text-fg ${error ? "border-fg" : "border-line"} ${className}`}
      />
      {hint && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-fg">
          {error}
        </p>
      )}
    </div>
  );
}
```
(Les erreurs de champ restent en noir : `--danger` est réservé aux actions destructrices, `specs/06` §2.)

- [ ] **Étape 6 : lancer**

Run : `pnpm test src/components/ui && pnpm typecheck`
Attendu : PASS (3 tests).

- [ ] **Étape 7 : commit**

```bash
git add -A && git commit -m "feat(ui): add Clarté design tokens, Button and Input

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## L1 · Authentification et profil

### Tâche 7 : configuration Better Auth et envoi d'emails (BODY-14, BODY-16, BODY-17 — socle)

**Fichiers :**
- Créer : `src/lib/env.ts`, `src/lib/email/types.ts`, `src/lib/email/templates.ts`, `src/lib/email/send.ts`, `src/lib/auth/create-auth.ts`, `src/lib/auth/index.ts`, `src/lib/auth/client.ts`, `src/app/api/auth/[...all]/route.ts`, `tests/integration/auth.test.ts`

**Interfaces :**
- Consomme : `Db` (tâche 3), tables `user`, `session`, `account`, `verification`, `rateLimit`, `createTestDb`.
- Produit :
  - `type EmailMessage = { to: string; subject: string; text: string; html: string }`, `type SendEmail = (m: EmailMessage) => Promise<void>`
  - `verificationEmail(url): Omit<EmailMessage, "to">`, `resetPasswordEmail(url): Omit<EmailMessage, "to">`
  - `createEmailSender(): SendEmail`
  - `PASSWORD_MIN_LENGTH = 10`, `createAuth(deps: AuthDeps)`, `type Auth`
  - `getAuth(): Auth` (serveur), `authClient` (client React)
  - `requireEnv(name: string): string`

- [ ] **Étape 1 : dépendances**

```bash
pnpm add better-auth @better-auth/drizzle-adapter resend zod
```

- [ ] **Étape 2 : écrire les tests qui échouent** — `tests/integration/auth.test.ts`

```ts
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAuth, type Auth } from "@/lib/auth/create-auth";
import { session, user } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";
import type { EmailMessage } from "@/lib/email/types";
import { createTestDb } from "../helpers/db";

const EMAIL = "julie@example.com";
const PASSWORD = "correct-horse-battery";

describe("auth", () => {
  let db: Db;
  let close: () => Promise<void>;
  let auth: Auth;
  let sent: EmailMessage[];

  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    sent = [];
    auth = createAuth({
      db,
      sendEmail: async (m) => {
        sent.push(m);
      },
      baseURL: "http://localhost:3000",
      secret: "test-secret-0123456789abcdef0123456789",
      rateLimitEnabled: false,
      withNextCookies: false,
    });
  });
  afterEach(() => close());

  const signUp = () =>
    auth.api.signUpEmail({ body: { name: "julie", email: EMAIL, password: PASSWORD } });

  it("creates an unverified user and sends a verification link", async () => {
    const res = await signUp();

    expect(res.user.emailVerified).toBe(false);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe(EMAIL);
    expect(sent[0].text).toContain("/api/auth/verify-email?token=");
  });

  it("rejects passwords shorter than 10 characters", async () => {
    await expect(
      auth.api.signUpEmail({ body: { name: "julie", email: EMAIL, password: "short-12" } }),
    ).rejects.toThrow();
  });

  it("does not send a reset link to an unverified email", async () => {
    await signUp();
    sent = [];

    await auth.api.requestPasswordReset({ body: { email: EMAIL, redirectTo: "/reinitialiser" } });

    expect(sent).toHaveLength(0);
  });

  it("sends a reset link once the email is verified", async () => {
    await signUp();
    await db.update(user).set({ emailVerified: true }).where(eq(user.email, EMAIL));
    sent = [];

    await auth.api.requestPasswordReset({ body: { email: EMAIL, redirectTo: "/reinitialiser" } });

    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toContain("mot de passe");
  });

  it("creates sessions that last 30 days", async () => {
    await signUp();
    const [row] = await db.select().from(session);
    const days = (row.expiresAt.getTime() - Date.now()) / 86_400_000;

    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThanOrEqual(30);
  });

  it("never puts health-related words in emails", async () => {
    await signUp();
    expect(sent[0].text).not.toMatch(/poids|kg|mensuration/i);
  });
});
```

- [ ] **Étape 3 : lancer, vérifier l'échec**

Run : `pnpm test tests/integration/auth.test.ts`
Attendu : FAIL, `@/lib/auth/create-auth` introuvable.

- [ ] **Étape 4 : utilitaires et emails**

`src/lib/env.ts` :
```ts
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}
```

`src/lib/email/types.ts` :
```ts
export type EmailMessage = { to: string; subject: string; text: string; html: string };
export type SendEmail = (message: EmailMessage) => Promise<void>;
```

`src/lib/email/templates.ts` :
```ts
import type { EmailMessage } from "./types";

type Template = Omit<EmailMessage, "to">;

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function verificationEmail(url: string): Template {
  return {
    subject: "Confirme ton email · my-body",
    text: `Bienvenue sur my-body !\n\nConfirme ton adresse email en ouvrant ce lien :\n${url}\n\nSi tu n'es pas à l'origine de cette inscription, ignore ce message.`,
    html: `<p>Bienvenue sur my-body !</p><p><a href="${escapeHtml(url)}">Confirmer mon adresse email</a></p><p>Si tu n'es pas à l'origine de cette inscription, ignore ce message.</p>`,
  };
}

export function resetPasswordEmail(url: string): Template {
  return {
    subject: "Réinitialise ton mot de passe · my-body",
    text: `Pour choisir un nouveau mot de passe, ouvre ce lien (valable 1 heure) :\n${url}\n\nSi tu n'as rien demandé, ignore ce message : ton mot de passe reste inchangé.`,
    html: `<p><a href="${escapeHtml(url)}">Choisir un nouveau mot de passe</a> (lien valable 1 heure)</p><p>Si tu n'as rien demandé, ignore ce message : ton mot de passe reste inchangé.</p>`,
  };
}
```

`src/lib/email/send.ts` :
```ts
import { Resend } from "resend";
import type { SendEmail } from "./types";

/** Resend in production; console output in local dev when no API key is set. */
export function createEmailSender(): SendEmail {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "my-body <noreply@example.com>";

  if (!apiKey) {
    if (process.env.NODE_ENV === "production" && !process.env.CI) {
      throw new Error("RESEND_API_KEY is required in production");
    }
    return async (m) => {
      console.info(`[dev-email] ${m.subject}\n${m.text}`);
    };
  }

  const resend = new Resend(apiKey);
  return async (m) => {
    const { error } = await resend.emails.send({ from, to: m.to, subject: m.subject, text: m.text, html: m.html });
    // Never log the recipient: only the error type.
    if (error) console.error("email_send_failed", { name: error.name });
  };
}
```

- [ ] **Étape 5 : fabrique Better Auth** — `src/lib/auth/create-auth.ts`

```ts
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import * as authSchema from "@/lib/db/schema/auth";
import type { Db } from "@/lib/db/types";
import { resetPasswordEmail, verificationEmail } from "@/lib/email/templates";
import type { SendEmail } from "@/lib/email/types";

export const PASSWORD_MIN_LENGTH = 10;
const DAY = 60 * 60 * 24;

export type AuthDeps = {
  db: Db;
  sendEmail: SendEmail;
  baseURL: string;
  secret: string;
  google?: { clientId: string; clientSecret: string };
  rateLimitEnabled?: boolean;
  /** false in tests: nextCookies needs a Next.js request scope. */
  withNextCookies?: boolean;
};

export function createAuth(deps: AuthDeps) {
  return betterAuth({
    baseURL: deps.baseURL,
    secret: deps.secret,
    database: drizzleAdapter(deps.db, { provider: "pg", schema: authSchema }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: PASSWORD_MIN_LENGTH,
      requireEmailVerification: false, // EF-AUTH-01 CA4: access is immediate
      autoSignIn: true,
      revokeSessionsOnPasswordReset: true, // EF-AUTH-04 CA2
      resetPasswordTokenExpiresIn: 60 * 60,
      sendResetPassword: async ({ user, url }) => {
        // EF-AUTH-04 CA3: only verified emails can recover the account.
        if (!user.emailVerified) return;
        void deps.sendEmail({ to: user.email, ...resetPasswordEmail(url) });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        // Not awaited: avoids timing attacks (Better Auth recommendation).
        void deps.sendEmail({ to: user.email, ...verificationEmail(url) });
      },
    },
    socialProviders: deps.google ? { google: deps.google } : {},
    account: { accountLinking: { enabled: true, trustedProviders: ["google"] } },
    session: { expiresIn: 30 * DAY, updateAge: DAY },
    rateLimit: {
      enabled: deps.rateLimitEnabled ?? true,
      storage: "database",
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 3 },
        "/request-password-reset": { window: 3600, max: 3 },
        "/send-verification-email": { window: 3600, max: 3 },
      },
    },
    plugins: deps.withNextCookies === false ? [] : [nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;
```

- [ ] **Étape 6 : lancer**

Run : `pnpm test tests/integration/auth.test.ts`
Attendu : PASS (6 tests).
Si `requestPasswordReset` n'existe pas dans la version installée, vérifier le nom exact dans `node_modules/better-auth` (ancien nom : `forgetPassword`) et l'utiliser partout dans ce plan.

- [ ] **Étape 7 : instance serveur, client et route**

`src/lib/auth/index.ts` :
```ts
import "server-only";
import { getDb } from "@/lib/db/client";
import { createEmailSender } from "@/lib/email/send";
import { requireEnv } from "@/lib/env";
import { createAuth, type Auth } from "./create-auth";

let instance: Auth | undefined;

export function getAuth(): Auth {
  if (!instance) {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, BETTER_AUTH_URL } = process.env;
    instance = createAuth({
      db: getDb(),
      sendEmail: createEmailSender(),
      // Vercel Preview deployments have no fixed URL: fall back to VERCEL_URL.
      baseURL: BETTER_AUTH_URL || `https://${requireEnv("VERCEL_URL")}`,
      secret: requireEnv("BETTER_AUTH_SECRET"),
      google:
        GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET
          ? { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET }
          : undefined,
      rateLimitEnabled: process.env.AUTH_RATE_LIMIT !== "off",
    });
  }
  return instance;
}
```

`src/lib/auth/client.ts` :
```ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
```

`src/app/api/auth/[...all]/route.ts` :
```ts
import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

// Lazy: no database or secret needed at build time.
const handler = () => toNextJsHandler(getAuth());

export const GET = (request: Request) => handler().GET(request);
export const POST = (request: Request) => handler().POST(request);
```

- [ ] **Étape 8 : vérifier**

Run : `pnpm db:generate` (attendu : « No schema changes » : la table `rate_limit` existe depuis la tâche 3)
Run : `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Attendu : tout passe.

- [ ] **Étape 9 : commit**

```bash
git add -A && git commit -m "feat(auth): configure Better Auth (email, Google, verification, reset, rate limit)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 8 : tables `profile` et `consent`, requêtes associées (BODY-14 CA consentement, BODY-19 données)

**Fichiers :**
- Créer : `src/lib/db/schema/app.ts`, `src/features/consent/queries.ts`, `src/features/profile/queries.ts`, `tests/integration/profile-consent.test.ts`, migration générée
- Modifier : `src/lib/db/schema/index.ts`

**Interfaces :**
- Consomme : `user` (tâche 3), `createTestDb`, `insertTestUser`.
- Produit :
  - enums `sexEnum`, `weightUnitEnum`, `lengthUnitEnum`, `consentKindEnum` ; tables `profile`, `consent`
  - `CONSENT_VERSION = "2026-09-29"`, `recordConsents(db, userId, now?)`, `hasRequiredConsents(db, userId): Promise<boolean>`
  - `type Profile`, `type Sex = "male" | "female"`, `type LengthUnit = "cm" | "in"`
  - `getProfile(db, userId): Promise<Profile | null>`
  - `saveSex(db, userId, sex: Sex, timezone: string): Promise<void>` (crée le profil si besoin)
  - `saveBodyInfo(db, userId, info: { heightCm: number; birthDate: string; lengthUnit: LengthUnit }): Promise<void>`
  - `markOnboardingCompleted(db, userId, at?: Date): Promise<void>`

- [ ] **Étape 1 : écrire les tests qui échouent** — `tests/integration/profile-consent.test.ts`

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db/types";
import { hasRequiredConsents, recordConsents } from "@/features/consent/queries";
import { getProfile, markOnboardingCompleted, saveBodyInfo, saveSex } from "@/features/profile/queries";
import { createTestDb, insertTestUser } from "../helpers/db";

describe("consent and profile", () => {
  let db: Db;
  let close: () => Promise<void>;

  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    await insertTestUser(db, "alice");
    await insertTestUser(db, "bob");
  });
  afterEach(() => close());

  it("requires both health-data and terms consents", async () => {
    expect(await hasRequiredConsents(db, "alice")).toBe(false);
    await recordConsents(db, "alice");
    expect(await hasRequiredConsents(db, "alice")).toBe(true);
    expect(await hasRequiredConsents(db, "bob")).toBe(false);
  });

  it("creates the profile at step 1 and completes it at step 2", async () => {
    await saveSex(db, "alice", "female", "Europe/Paris");
    let profile = await getProfile(db, "alice");
    expect(profile).toMatchObject({ sex: "female", timezone: "Europe/Paris", heightCm: null, birthDate: null });

    await saveBodyInfo(db, "alice", { heightCm: 168.5, birthDate: "1990-04-12", lengthUnit: "cm" });
    profile = await getProfile(db, "alice");
    expect(profile).toMatchObject({ heightCm: 168.5, birthDate: "1990-04-12", lengthUnit: "cm" });
  });

  it("changes only the sex when step 1 is saved again", async () => {
    await saveSex(db, "alice", "female", "Europe/Paris");
    await saveBodyInfo(db, "alice", { heightCm: 168.5, birthDate: "1990-04-12", lengthUnit: "cm" });
    await saveSex(db, "alice", "male", "Europe/Paris");
    expect(await getProfile(db, "alice")).toMatchObject({ sex: "male", heightCm: 168.5 });
  });

  it("never touches another user's profile", async () => {
    await saveSex(db, "alice", "female", "Europe/Paris");
    await saveBodyInfo(db, "alice", { heightCm: 168.5, birthDate: "1990-04-12", lengthUnit: "cm" });
    await markOnboardingCompleted(db, "alice");

    expect(await getProfile(db, "bob")).toBeNull();
    expect((await getProfile(db, "alice"))?.onboardingCompletedAt).toBeInstanceOf(Date);
  });

  it("rejects an out-of-range height at the database level", async () => {
    await saveSex(db, "alice", "female", "Europe/Paris");
    await expect(
      saveBodyInfo(db, "alice", { heightCm: 99, birthDate: "1990-04-12", lengthUnit: "cm" }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Étape 2 : lancer, vérifier l'échec**

Run : `pnpm test tests/integration/profile-consent.test.ts`
Attendu : FAIL, modules introuvables.

- [ ] **Étape 3 : schéma applicatif** — `src/lib/db/schema/app.ts`

```ts
import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const sexEnum = pgEnum("sex", ["male", "female"]);
export const weightUnitEnum = pgEnum("weight_unit", ["kg", "lb"]);
export const lengthUnitEnum = pgEnum("length_unit", ["cm", "in"]);
export const consentKindEnum = pgEnum("consent_kind", ["health_data", "terms"]);

export const profile = pgTable(
  "profile",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    sex: sexEnum("sex").notNull(),
    // Nullable until onboarding step 2 is saved (spec deviation #5).
    heightCm: numeric("height_cm", { precision: 4, scale: 1, mode: "number" }),
    birthDate: date("birth_date", { mode: "string" }),
    weightUnit: weightUnitEnum("weight_unit").default("kg").notNull(),
    lengthUnit: lengthUnitEnum("length_unit").default("cm").notNull(),
    timezone: text("timezone").default("Europe/Paris").notNull(),
    reminderWeekday: smallint("reminder_weekday"),
    onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    check("profile_height_range", sql`${t.heightCm} is null or ${t.heightCm} between 100 and 250`),
    check(
      "profile_reminder_weekday_range",
      sql`${t.reminderWeekday} is null or ${t.reminderWeekday} between 0 and 6`,
    ),
  ],
);

export const consent = pgTable(
  "consent",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: consentKindEnum("kind").notNull(),
    version: text("version").notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("consent_user_id_idx").on(t.userId)],
);
```

`src/lib/db/schema/index.ts` :
```ts
export * from "./app";
export * from "./auth";
```

Run : `pnpm db:generate --name profile_consent`
Attendu : nouvelle migration `drizzle/0001_profile_consent.sql`.

- [ ] **Étape 4 : requêtes**

`src/features/consent/queries.ts` :
```ts
import { eq } from "drizzle-orm";
import { consent } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";

/** Version of the consent texts shown at sign-up (specs/07 §2). */
export const CONSENT_VERSION = "2026-09-29";

export async function recordConsents(db: Db, userId: string, now: Date = new Date()) {
  await db.insert(consent).values([
    { userId, kind: "health_data", version: CONSENT_VERSION, acceptedAt: now },
    { userId, kind: "terms", version: CONSENT_VERSION, acceptedAt: now },
  ]);
}

export async function hasRequiredConsents(db: Db, userId: string): Promise<boolean> {
  const rows = await db.select({ kind: consent.kind }).from(consent).where(eq(consent.userId, userId));
  const kinds = new Set(rows.map((r) => r.kind));
  return kinds.has("health_data") && kinds.has("terms");
}
```

`src/features/profile/queries.ts` :
```ts
import { eq } from "drizzle-orm";
import { profile } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";

export type Profile = typeof profile.$inferSelect;
export type Sex = Profile["sex"];
export type LengthUnit = Profile["lengthUnit"];

export async function getProfile(db: Db, userId: string): Promise<Profile | null> {
  const [row] = await db.select().from(profile).where(eq(profile.userId, userId));
  return row ?? null;
}

export async function saveSex(db: Db, userId: string, sex: Sex, timezone: string) {
  await db
    .insert(profile)
    .values({ userId, sex, timezone })
    .onConflictDoUpdate({ target: profile.userId, set: { sex } });
}

export async function saveBodyInfo(
  db: Db,
  userId: string,
  info: { heightCm: number; birthDate: string; lengthUnit: LengthUnit },
) {
  await db.update(profile).set(info).where(eq(profile.userId, userId));
}

export async function markOnboardingCompleted(db: Db, userId: string, at: Date = new Date()) {
  await db.update(profile).set({ onboardingCompletedAt: at }).where(eq(profile.userId, userId));
}
```

- [ ] **Étape 5 : lancer**

Run : `pnpm test tests/integration/profile-consent.test.ts`
Attendu : PASS (5 tests).

- [ ] **Étape 6 : appliquer la migration sur Neon dev et commit**

Run : `pnpm db:migrate`

```bash
git add -A && git commit -m "feat(db): add profile and consent tables with queries

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 9 : règles d'accès, proxy et `requireUser` (BODY-20, BODY-21)

**Fichiers :**
- Créer : `src/lib/access.ts`, `src/lib/access.test.ts`, `src/lib/session.ts`, `src/proxy.ts`

**Interfaces :**
- Consomme : `getAuth`, `getDb`, `getProfile`, `hasRequiredConsents`, `Profile`.
- Produit :
  - `type Area = "app" | "settings" | "onboarding" | "consent"`
  - `type AccessState = { signedIn: boolean; hasConsents: boolean; onboardingCompleted: boolean }`
  - `accessRedirect(area: Area, state: AccessState): string | null`
  - `safeNext(next: unknown): string`
  - `type CurrentUser = { userId: string; email: string; emailVerified: boolean; profile: Profile | null }`
  - `requireUser(area: Area): Promise<CurrentUser>`

- [ ] **Étape 1 : écrire les tests qui échouent** — `src/lib/access.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { accessRedirect, safeNext, type AccessState } from "./access";

const state = (s: Partial<AccessState>): AccessState => ({
  signedIn: true,
  hasConsents: true,
  onboardingCompleted: true,
  ...s,
});

describe("accessRedirect", () => {
  it("sends anonymous visitors to the sign-in page", () => {
    expect(accessRedirect("app", state({ signedIn: false }))).toBe("/connexion");
    expect(accessRedirect("settings", state({ signedIn: false }))).toBe("/connexion");
  });

  it("asks for consent before anything else", () => {
    expect(accessRedirect("app", state({ hasConsents: false }))).toBe("/consentement");
    expect(accessRedirect("onboarding", state({ hasConsents: false }))).toBe("/consentement");
    expect(accessRedirect("consent", state({ hasConsents: false }))).toBeNull();
  });

  it("leaves the consent page once consent is given", () => {
    expect(accessRedirect("consent", state({ onboardingCompleted: false }))).toBe("/onboarding");
    expect(accessRedirect("consent", state({}))).toBe("/accueil");
  });

  it("keeps the app behind onboarding but lets settings through", () => {
    expect(accessRedirect("app", state({ onboardingCompleted: false }))).toBe("/onboarding");
    expect(accessRedirect("settings", state({ onboardingCompleted: false }))).toBeNull();
    expect(accessRedirect("onboarding", state({ onboardingCompleted: false }))).toBeNull();
  });

  it("does not replay onboarding once completed", () => {
    expect(accessRedirect("onboarding", state({}))).toBe("/accueil");
    expect(accessRedirect("app", state({}))).toBeNull();
  });
});

describe("safeNext", () => {
  it("keeps internal paths", () => {
    expect(safeNext("/progres")).toBe("/progres");
    expect(safeNext("/corps?periode=30j")).toBe("/corps?periode=30j");
  });

  it("falls back to /accueil for anything else", () => {
    for (const bad of [null, undefined, "", "https://evil.example", "//evil.example", "/\\evil.example", 42]) {
      expect(safeNext(bad)).toBe("/accueil");
    }
  });
});
```

- [ ] **Étape 2 : lancer, vérifier l'échec**

Run : `pnpm test src/lib/access.test.ts`
Attendu : FAIL.

- [ ] **Étape 3 : implémenter** — `src/lib/access.ts`

```ts
/** Route groups and what they require (spec deviation #2). */
export type Area = "app" | "settings" | "onboarding" | "consent";

export type AccessState = {
  signedIn: boolean;
  hasConsents: boolean;
  onboardingCompleted: boolean;
};

export function accessRedirect(area: Area, s: AccessState): string | null {
  if (!s.signedIn) return "/connexion";
  if (!s.hasConsents) return area === "consent" ? null : "/consentement";
  if (area === "consent") return s.onboardingCompleted ? "/accueil" : "/onboarding";
  if (area === "app" && !s.onboardingCompleted) return "/onboarding";
  if (area === "onboarding" && s.onboardingCompleted) return "/accueil";
  return null;
}

/** Only same-origin paths are allowed as post-login destinations (specs/07 §7). */
export function safeNext(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/accueil";
  }
  return next;
}
```

- [ ] **Étape 4 : lancer**

Run : `pnpm test src/lib/access.test.ts`
Attendu : PASS (7 tests).

- [ ] **Étape 5 : `requireUser` et proxy**

`src/lib/session.ts` :
```ts
import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hasRequiredConsents } from "@/features/consent/queries";
import { getProfile, type Profile } from "@/features/profile/queries";
import { accessRedirect, type Area } from "@/lib/access";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";

export type CurrentUser = {
  userId: string;
  email: string;
  emailVerified: boolean;
  profile: Profile | null;
};

/** Server-side guard: the only source of userId for queries and actions. */
export async function requireUser(area: Area): Promise<CurrentUser> {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) redirect("/connexion");

  const db = getDb();
  const userId = session.user.id;
  const [hasConsents, profile] = await Promise.all([
    hasRequiredConsents(db, userId),
    getProfile(db, userId),
  ]);

  const target = accessRedirect(area, {
    signedIn: true,
    hasConsents,
    onboardingCompleted: Boolean(profile?.onboardingCompletedAt),
  });
  if (target) redirect(target);

  return { userId, email: session.user.email, emailVerified: session.user.emailVerified, profile };
}
```

`src/proxy.ts` :
```ts
import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/** Optimistic check only (cookie presence). Real checks happen in requireUser(). */
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();

  const url = new URL("/connexion", request.url);
  url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/accueil/:path*",
    "/progres/:path*",
    "/corps/:path*",
    "/objectif/:path*",
    "/reglages/:path*",
    "/onboarding/:path*",
    "/consentement",
  ],
};
```

- [ ] **Étape 6 : vérifier et commit**

Run : `pnpm lint && pnpm typecheck && pnpm test`
Attendu : tout passe.

```bash
git add -A && git commit -m "feat(auth): add access rules, requireUser guard and session proxy

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 10 : écrans et actions d'authentification (BODY-14 à BODY-18)

**Fichiers :**
- Créer : `src/lib/action-result.ts`, `src/lib/action-result.test.ts`, `src/features/auth/schemas.ts`, `src/features/auth/schemas.test.ts`, `src/features/auth/actions.ts`, `src/components/ui/checkbox.tsx`, `src/features/auth/components/{consent-checkboxes,sign-up-form,sign-in-form,forgot-password-form,reset-password-form,consent-form,google-button}.tsx`, `src/app/(auth)/layout.tsx`, `src/app/(auth)/{inscription,connexion,mot-de-passe-oublie,reinitialiser}/page.tsx`, `src/app/consentement/page.tsx`, `src/app/{cgu,confidentialite,mentions-legales}/page.tsx`

**Interfaces :**
- Consomme : `getAuth`, `authClient`, `getDb`, `recordConsents`, `requireUser`, `safeNext`, `PASSWORD_MIN_LENGTH`, `Button`, `Input`.
- Produit :
  - `type ActionResult = { ok: true } | { ok: false; fieldErrors?: Record<string, string[]>; formError?: string; values?: Record<string, string> }`
  - `fieldErrorsFrom(error: z.ZodError): Record<string, string[]>`
  - `fieldError(state: ActionResult | null, field: string): string | undefined`
  - `fieldValue(state: ActionResult | null, field: string): string | undefined`
  - `keepValues(formData: FormData, ...fields: string[]): Record<string, string>`
  - schémas `signUpSchema`, `signInSchema`, `forgotPasswordSchema`, `resetPasswordSchema`, `consentSchema`
  - actions de formulaire `signUpAction`, `signInAction`, `requestPasswordResetAction`, `resetPasswordAction`, `acceptConsentsAction` (signature `(prev: ActionResult | null, formData: FormData) => Promise<ActionResult>`) ; `signOutAction(): Promise<void>` ; `resendVerificationAction(): Promise<ActionResult>`
  - `<Checkbox name label error? />`, `<ConsentCheckboxes state />`

- [ ] **Étape 1 : écrire les tests qui échouent** — `src/features/auth/schemas.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { consentSchema, resetPasswordSchema, signInSchema, signUpSchema } from "./schemas";

const valid = {
  email: "  Julie@Example.com ",
  password: "correct-horse-battery",
  consentHealth: "on",
  consentTerms: "on",
};

describe("signUpSchema", () => {
  it("normalises the email", () => {
    const r = signUpSchema.safeParse(valid);
    expect(r.success && r.data.email).toBe("julie@example.com");
  });

  it("requires a 10-character password", () => {
    const r = signUpSchema.safeParse({ ...valid, password: "123456789" });
    expect(r.success).toBe(false);
  });

  it("requires both consents, unticked by default", () => {
    const { consentHealth: _h, ...withoutHealth } = valid;
    const { consentTerms: _t, ...withoutTerms } = valid;
    expect(signUpSchema.safeParse(withoutHealth).success).toBe(false);
    expect(signUpSchema.safeParse(withoutTerms).success).toBe(false);
  });

  it("rejects malformed emails", () => {
    expect(signUpSchema.safeParse({ ...valid, email: "julie@" }).success).toBe(false);
  });
});

describe("signInSchema", () => {
  it("accepts any non-empty password (length is not revealed at sign-in)", () => {
    expect(signInSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
    expect(signInSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("requires matching passwords", () => {
    const base = { token: "t", password: "correct-horse-battery" };
    expect(resetPasswordSchema.safeParse({ ...base, confirm: "correct-horse-battery" }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ ...base, confirm: "other-password-1" }).success).toBe(false);
  });
});

describe("consentSchema", () => {
  it("requires both boxes", () => {
    expect(consentSchema.safeParse({ consentHealth: "on", consentTerms: "on" }).success).toBe(true);
    expect(consentSchema.safeParse({ consentHealth: "on" }).success).toBe(false);
  });
});
```

`src/lib/action-result.test.ts` :
```ts
import { describe, expect, it } from "vitest";
import { fieldError, fieldValue, keepValues, type ActionResult } from "./action-result";

describe("action results", () => {
  const failed: ActionResult = {
    ok: false,
    fieldErrors: { email: ["Adresse email invalide"] },
    values: { email: "julie@" },
  };

  it("exposes the first error and the submitted value of a field", () => {
    expect(fieldError(failed, "email")).toBe("Adresse email invalide");
    expect(fieldValue(failed, "email")).toBe("julie@");
    expect(fieldError({ ok: true }, "email")).toBeUndefined();
    expect(fieldValue(null, "email")).toBeUndefined();
  });

  it("keeps only the requested fields, never the others", () => {
    const fd = new FormData();
    fd.set("email", "julie@example.com");
    fd.set("password", "secret-secret");
    expect(keepValues(fd, "email")).toEqual({ email: "julie@example.com" });
  });
});
```

- [ ] **Étape 2 : lancer, vérifier l'échec**

Run : `pnpm test src/features/auth src/lib/action-result.test.ts`
Attendu : FAIL.

- [ ] **Étape 3 : schémas et résultat d'action**

`src/lib/action-result.ts` :
```ts
import { z } from "zod";

export type ActionResult =
  | { ok: true }
  | {
      ok: false;
      fieldErrors?: Record<string, string[]>;
      formError?: string;
      /** Submitted values to show again: React 19 resets forms after each submission. Never passwords. */
      values?: Record<string, string>;
    };

export function fieldErrorsFrom(error: z.ZodError): Record<string, string[]> {
  return z.flattenError(error).fieldErrors as Record<string, string[]>;
}

export function fieldError(state: ActionResult | null, field: string): string | undefined {
  return state && !state.ok ? state.fieldErrors?.[field]?.[0] : undefined;
}

export function fieldValue(state: ActionResult | null, field: string): string | undefined {
  return state && !state.ok ? state.values?.[field] : undefined;
}

export function keepValues(formData: FormData, ...fields: string[]): Record<string, string> {
  return Object.fromEntries(fields.map((f) => [f, String(formData.get(f) ?? "")]));
}
```

`src/features/auth/schemas.ts` :
```ts
import { z } from "zod";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/create-auth";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Adresse email invalide" }));

const newPassword = z
  .string()
  .min(PASSWORD_MIN_LENGTH, { error: `Au moins ${PASSWORD_MIN_LENGTH} caractères` })
  .max(128, { error: "128 caractères maximum" });

const consents = {
  consentHealth: z.literal("on", {
    error: "Ce consentement est nécessaire pour suivre ta progression",
  }),
  consentTerms: z.literal("on", { error: "Tu dois accepter les conditions d'utilisation" }),
};

export const signUpSchema = z.object({ email, password: newPassword, ...consents });
export const consentSchema = z.object(consents);
export const signInSchema = z.object({ email, password: z.string().min(1, { error: "Mot de passe requis" }) });
export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z
  .object({ token: z.string().min(1), password: newPassword, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    error: "Les deux mots de passe ne correspondent pas",
  });
```

Run : `pnpm test src/features/auth src/lib/action-result.test.ts`
Attendu : PASS (10 tests).

- [ ] **Étape 4 : actions serveur** — `src/features/auth/actions.ts`

```ts
"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { recordConsents } from "@/features/consent/queries";
import { safeNext } from "@/lib/access";
import { fieldErrorsFrom, keepValues, type ActionResult } from "@/lib/action-result";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/session";
import {
  consentSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "./schemas";

const VERIFIED_CALLBACK = "/accueil?email=verifie";
const GENERIC_ERROR = "Une erreur est survenue, réessaie.";

function errorCode(e: unknown): string {
  return e instanceof APIError ? String(e.body?.code ?? e.status) : "unknown";
}

export async function signUpAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const values = keepValues(formData, "email");
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error), values };
  const { email, password } = parsed.data;

  let userId: string;
  try {
    const res = await getAuth().api.signUpEmail({
      // name is required by Better Auth; we derive it from the email (no new personal data).
      body: { name: email.split("@")[0], email, password, callbackURL: VERIFIED_CALLBACK },
      headers: await headers(),
    });
    userId = res.user.id;
  } catch (e) {
    const code = errorCode(e);
    if (code.includes("ALREADY_EXISTS")) {
      return { ok: false, fieldErrors: { email: ["Un compte existe déjà avec cet email."] }, values };
    }
    console.error("sign_up_failed", { code });
    return { ok: false, formError: GENERIC_ERROR, values };
  }

  await recordConsents(getDb(), userId);
  redirect("/onboarding");
}

export async function signInAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const values = keepValues(formData, "email");
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error), values };

  try {
    await getAuth().api.signInEmail({ body: parsed.data, headers: await headers() });
  } catch (e) {
    const code = errorCode(e);
    if (code === "429") return { ok: false, formError: "Trop de tentatives. Réessaie dans une minute.", values };
    return { ok: false, formError: "Email ou mot de passe incorrect", values };
  }
  redirect(safeNext(formData.get("next")));
}

export async function requestPasswordResetAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error), values: keepValues(formData, "email") };
  }

  try {
    await getAuth().api.requestPasswordReset({
      body: { email: parsed.data.email, redirectTo: "/reinitialiser" },
      headers: await headers(),
    });
  } catch (e) {
    console.error("password_reset_request_failed", { code: errorCode(e) });
  }
  // Same answer whether or not the account exists (EF-AUTH-04 CA1).
  return { ok: true };
}

export async function resetPasswordAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };

  try {
    await getAuth().api.resetPassword({
      body: { token: parsed.data.token, newPassword: parsed.data.password },
    });
  } catch {
    return { ok: false, formError: "Ce lien est invalide ou a expiré. Refais une demande." };
  }
  redirect("/connexion?reinitialise=1");
}

export async function signOutAction(): Promise<void> {
  await getAuth().api.signOut({ headers: await headers() });
  redirect("/connexion");
}

export async function resendVerificationAction(): Promise<ActionResult> {
  const user = await requireUser("settings");
  if (user.emailVerified) return { ok: true };
  try {
    await getAuth().api.sendVerificationEmail({
      body: { email: user.email, callbackURL: VERIFIED_CALLBACK },
      headers: await headers(),
    });
  } catch (e) {
    const code = errorCode(e);
    if (code === "429") return { ok: false, formError: "Patiente un peu avant de renvoyer l'email." };
    console.error("verification_resend_failed", { code });
    return { ok: false, formError: GENERIC_ERROR };
  }
  return { ok: true };
}

export async function acceptConsentsAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser("consent");
  const parsed = consentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };

  await recordConsents(getDb(), user.userId);
  redirect("/onboarding");
}
```

- [ ] **Étape 5 : composants de formulaire**

`src/components/ui/checkbox.tsx` :
```tsx
import type { ReactNode } from "react";

export function Checkbox({ name, label, error }: { name: string; label: ReactNode; error?: string }) {
  const errorId = error ? `${name}-error` : undefined;
  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-start gap-3 text-[13px] leading-snug text-fg-2">
        <input
          type="checkbox"
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className="mt-0.5 size-5 shrink-0 accent-fg"
        />
        <span>{label}</span>
      </label>
      {error && (
        <p id={errorId} className="pl-8 text-xs font-medium text-fg">
          {error}
        </p>
      )}
    </div>
  );
}
```

`src/features/auth/components/google-button.tsx` :
```tsx
"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

export function GoogleButton({ next }: { next: string }) {
  return (
    <Button
      type="button"
      variant="secondary"
      className="w-full"
      onClick={() => authClient.signIn.social({ provider: "google", callbackURL: next })}
    >
      Continuer avec Google
    </Button>
  );
}
```

`src/features/auth/components/consent-checkboxes.tsx` (texte de `specs/07` §2, partagé entre l'inscription et la page de consentement) :
```tsx
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { fieldError, type ActionResult } from "@/lib/action-result";

export function ConsentCheckboxes({ state }: { state: ActionResult | null }) {
  return (
    <>
      <Checkbox
        name="consentHealth"
        error={fieldError(state, "consentHealth")}
        label={
          <>
            J&apos;accepte que my-body traite mes données de santé (poids, mensurations, masse grasse,
            objectif) dans le seul but de me fournir le suivi de ma progression. Ces données ne sont ni
            vendues ni partagées. Je peux les exporter ou les supprimer à tout moment.{" "}
            <Link href="/confidentialite" className="underline">
              En savoir plus
            </Link>
          </>
        }
      />
      <Checkbox
        name="consentTerms"
        error={fieldError(state, "consentTerms")}
        label={
          <>
            J&apos;accepte les{" "}
            <Link href="/cgu" className="underline">
              conditions générales d&apos;utilisation
            </Link>
            .
          </>
        }
      />
    </>
  );
}
```

`src/features/auth/components/sign-up-form.tsx` :
```tsx
"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fieldError, fieldValue } from "@/lib/action-result";
import { signUpAction } from "../actions";
import { ConsentCheckboxes } from "./consent-checkboxes";

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUpAction, null);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={fieldValue(state, "email")}
        error={fieldError(state, "email")}
      />
      <Input
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="Au moins 10 caractères"
        error={fieldError(state, "password")}
      />
      <ConsentCheckboxes state={state} />
      {state && !state.ok && state.formError && <p role="alert" className="text-sm text-fg">{state.formError}</p>}
      <Button type="submit" loading={pending} className="w-full">
        Créer mon compte
      </Button>
    </form>
  );
}
```

`src/features/auth/components/sign-in-form.tsx` :
```tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fieldError, fieldValue } from "@/lib/action-result";
import { signInAction } from "../actions";

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signInAction, null);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={fieldValue(state, "email")}
        error={fieldError(state, "email")}
      />
      <Input
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={fieldError(state, "password")}
      />
      <Link href="/mot-de-passe-oublie" className="self-end text-xs text-fg-2 underline">
        Mot de passe oublié ?
      </Link>
      {state && !state.ok && state.formError && <p role="alert" className="text-sm text-fg">{state.formError}</p>}
      <Button type="submit" loading={pending} className="w-full">
        Se connecter
      </Button>
    </form>
  );
}
```

`src/features/auth/components/forgot-password-form.tsx` :
```tsx
"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fieldError, fieldValue } from "@/lib/action-result";
import { requestPasswordResetAction } from "../actions";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, null);
  if (state?.ok) {
    return (
      <p role="status" className="text-sm text-fg-2">
        Si un compte vérifié existe avec cet email, tu vas recevoir un lien pour choisir un nouveau mot de
        passe. Il est valable 1 heure.
      </p>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={fieldValue(state, "email")}
        error={fieldError(state, "email")}
      />
      <Button type="submit" loading={pending} className="w-full">
        Recevoir le lien
      </Button>
    </form>
  );
}
```

`src/features/auth/components/reset-password-form.tsx` :
```tsx
"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fieldError } from "@/lib/action-result";
import { resetPasswordAction } from "../actions";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, null);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <Input
        label="Nouveau mot de passe"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="Au moins 10 caractères"
        error={fieldError(state, "password")}
      />
      <Input
        label="Confirme le mot de passe"
        name="confirm"
        type="password"
        autoComplete="new-password"
        error={fieldError(state, "confirm")}
      />
      {state && !state.ok && state.formError && <p role="alert" className="text-sm text-fg">{state.formError}</p>}
      <Button type="submit" loading={pending} className="w-full">
        Enregistrer
      </Button>
    </form>
  );
}
```

`src/features/auth/components/consent-form.tsx` :
```tsx
"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { acceptConsentsAction } from "../actions";
import { ConsentCheckboxes } from "./consent-checkboxes";

export function ConsentForm() {
  const [state, action, pending] = useActionState(acceptConsentsAction, null);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <ConsentCheckboxes state={state} />
      <Button type="submit" loading={pending} className="w-full">
        Continuer
      </Button>
    </form>
  );
}
```

- [ ] **Étape 6 : pages**

`src/app/(auth)/layout.tsx` :
```tsx
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 py-12">
      <Link href="/" className="text-[17px] font-bold tracking-tight">
        <span aria-hidden className="mr-2 inline-block size-2.5 rounded-full bg-fg" />
        my-body
      </Link>
      {children}
    </main>
  );
}
```

`src/app/(auth)/inscription/page.tsx` :
```tsx
import Link from "next/link";
import { GoogleButton } from "@/features/auth/components/google-button";
import { SignUpForm } from "@/features/auth/components/sign-up-form";

export default function SignUpPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Créer un compte</h1>
      <GoogleButton next="/onboarding" />
      <p className="text-center text-xs text-muted">ou</p>
      <SignUpForm />
      <p className="text-center text-sm text-fg-2">
        Déjà un compte ? <Link href="/connexion" className="underline">Se connecter</Link>
      </p>
    </>
  );
}
```

`src/app/(auth)/connexion/page.tsx` :
```tsx
import Link from "next/link";
import { GoogleButton } from "@/features/auth/components/google-button";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { safeNext } from "@/lib/access";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reinitialise?: string }>;
}) {
  const { next, reinitialise } = await searchParams;
  const target = safeNext(next);
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Se connecter</h1>
      {reinitialise && (
        <p role="status" className="text-sm text-positive">
          Mot de passe modifié. Tu peux te connecter.
        </p>
      )}
      <GoogleButton next={target} />
      <p className="text-center text-xs text-muted">ou</p>
      <SignInForm next={target} />
      <p className="text-center text-sm text-fg-2">
        Pas encore de compte ? <Link href="/inscription" className="underline">Créer un compte</Link>
      </p>
    </>
  );
}
```

`src/app/(auth)/mot-de-passe-oublie/page.tsx` :
```tsx
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Mot de passe oublié</h1>
      <ForgotPasswordForm />
    </>
  );
}
```

`src/app/(auth)/reinitialiser/page.tsx` :
```tsx
import Link from "next/link";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Nouveau mot de passe</h1>
      {token && !error ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="text-sm text-fg-2">
          Ce lien est invalide ou a expiré.{" "}
          <Link href="/mot-de-passe-oublie" className="underline">
            Refaire une demande
          </Link>
        </p>
      )}
    </>
  );
}
```

`src/app/consentement/page.tsx` :
```tsx
import { ConsentForm } from "@/features/auth/components/consent-form";
import { requireUser } from "@/lib/session";

export default async function ConsentPage() {
  await requireUser("consent");
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Avant de commencer</h1>
      <p className="text-sm text-fg-2">my-body a besoin de ton accord pour enregistrer tes données.</p>
      <ConsentForm />
    </main>
  );
}
```

Créer aussi les pages légales minimales pour que les liens ne soient pas cassés (le contenu définitif arrive en L6, BODY-56) :

`src/app/cgu/page.tsx`, `src/app/confidentialite/page.tsx`, `src/app/mentions-legales/page.tsx`, chacune sur ce modèle (adapter le titre) :
```tsx
export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Conditions générales d&apos;utilisation</h1>
      <p className="mt-4 text-sm text-fg-2">Version provisoire. Le texte définitif sera publié avant l&apos;ouverture publique.</p>
    </main>
  );
}
```

- [ ] **Étape 7 : vérifier et commit**

Run : `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Attendu : tout passe.

```bash
git add -A && git commit -m "feat(auth): add sign-up, sign-in, password reset and consent screens

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 11 : layout de l'app, navigation, bandeau email, Réglages et E2E-9 (BODY-18, BODY-21)

**Fichiers :**
- Créer : `src/components/app-shell/{app-shell,nav-links,email-banner}.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/{accueil,progres,corps,objectif}/page.tsx`, `src/app/(settings)/layout.tsx`, `src/app/(settings)/reglages/page.tsx`, `tests/e2e/access.spec.ts`

**Interfaces :**
- Consomme : `requireUser`, `signOutAction`, `resendVerificationAction`, `Button`.
- Produit : `<AppShell emailVerified: boolean>{children}</AppShell>`.

- [ ] **Étape 1 : écrire le test E2E qui échoue** — `tests/e2e/access.spec.ts`

```ts
import { expect, test } from "@playwright/test";

test("E2E-9: a visitor without session is sent to sign-in with the target page", async ({ page }) => {
  await page.goto("/accueil");
  await expect(page).toHaveURL(/\/connexion\?next=%2Faccueil$/);
  await expect(page.getByRole("heading", { name: "Se connecter" })).toBeVisible();
});

test("protected settings page also requires a session", async ({ page }) => {
  await page.goto("/reglages");
  await expect(page).toHaveURL(/\/connexion\?next=%2Freglages$/);
});
```

- [ ] **Étape 2 : lancer, vérifier l'échec**

Run : `pnpm test:e2e tests/e2e/access.spec.ts`
Attendu : le 1er test peut déjà passer grâce au proxy ; le second échoue tant que `/reglages` n'existe pas (404). Si les deux passent, continuer : ils protègent contre une régression du `matcher`.

- [ ] **Étape 3 : AppShell**

```bash
pnpm add lucide-react
```

`src/components/app-shell/nav-links.tsx` :
```tsx
"use client";

import { ChartLine, House, PersonStanding, Settings, Target } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/accueil", label: "Accueil", Icon: House },
  { href: "/progres", label: "Progrès", Icon: ChartLine },
  { href: "/corps", label: "Corps", Icon: PersonStanding },
  { href: "/objectif", label: "Objectif", Icon: Target },
] as const;

export function SideNav() {
  const pathname = usePathname();
  const all = [...items, { href: "/reglages", label: "Réglages", Icon: Settings }] as const;
  return (
    <nav aria-label="Navigation principale" className="flex flex-col gap-0.5">
      {all.map(({ href, label, Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13.5px] font-medium ${active ? "bg-surface font-semibold text-fg" : "text-muted"}`}
          >
            <Icon size={18} strokeWidth={1.7} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 flex justify-around border-t border-line bg-bg px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      {items.map(({ href, label, Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-w-11 flex-col items-center gap-1 text-[10px] ${active ? "text-fg" : "text-subtle"}`}
          >
            <Icon size={22} strokeWidth={1.7} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
```
(Le bouton central « + » de saisie de pesée arrive avec le lot L2, BODY-23.)

`src/components/app-shell/email-banner.tsx` :
```tsx
"use client";

import { useState, useTransition } from "react";
import { resendVerificationAction } from "@/features/auth/actions";

export function EmailBanner() {
  const [hidden, setHidden] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(false);
  const [pending, startTransition] = useTransition();
  if (hidden) return null;

  const resend = () =>
    startTransition(async () => {
      const result = await resendVerificationAction();
      setMessage(result.ok ? "Email renvoyé." : (result.formError ?? null));
      setCooldown(true);
      setTimeout(() => setCooldown(false), 60_000); // EF-AUTH-01 CA5: 60 s between sends
    });

  return (
    <div role="status" className="flex items-center gap-3 border-b border-line bg-surface px-5 py-2.5 text-xs text-fg-2">
      <span className="flex-1">{message ?? "Confirme ton email pour pouvoir récupérer ton compte."}</span>
      <button type="button" onClick={resend} disabled={pending || cooldown} className="font-semibold text-fg underline disabled:opacity-50">
        Renvoyer
      </button>
      <button type="button" onClick={() => setHidden(true)} aria-label="Masquer" className="text-fg">
        ✕
      </button>
    </div>
  );
}
```

`src/components/app-shell/app-shell.tsx` :
```tsx
import { EmailBanner } from "./email-banner";
import { BottomNav, SideNav } from "./nav-links";

export function AppShell({ emailVerified, children }: { emailVerified: boolean; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-[210px] shrink-0 flex-col border-r border-line px-4 py-6 lg:flex">
        <p className="px-2.5 pb-6 text-[17px] font-bold tracking-tight">
          <span aria-hidden className="mr-2 inline-block size-2.5 rounded-full bg-fg" />
          my-body
        </p>
        <SideNav />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {!emailVerified && <EmailBanner />}
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-[22px] pt-8 pb-28 lg:px-10 lg:pb-10">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
```

- [ ] **Étape 4 : layouts et pages**

`src/app/(app)/layout.tsx` :
```tsx
import { AppShell } from "@/components/app-shell/app-shell";
import { requireUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("app");
  return <AppShell emailVerified={user.emailVerified}>{children}</AppShell>;
}
```

`src/app/(settings)/layout.tsx` :
```tsx
import { AppShell } from "@/components/app-shell/app-shell";
import { requireUser } from "@/lib/session";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("settings");
  return <AppShell emailVerified={user.emailVerified}>{children}</AppShell>;
}
```

`src/app/(app)/accueil/page.tsx` :
```tsx
export default async function HomePage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight lg:text-[28px]">Bonjour</h1>
      {email === "verifie" && (
        <p role="status" className="mt-3 text-sm text-positive">
          Email confirmé.
        </p>
      )}
      <p className="mt-6 text-sm text-fg-2">Ton tableau de bord arrive bientôt.</p>
    </>
  );
}
```

`src/app/(app)/progres/page.tsx` (et sur le même modèle `corps/page.tsx` avec le titre « Corps », `objectif/page.tsx` avec « Mon objectif ») :
```tsx
export default function ProgressPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight lg:text-[28px]">Progrès</h1>
      <p className="mt-6 text-sm text-fg-2">Bientôt disponible.</p>
    </>
  );
}
```

`src/app/(settings)/reglages/page.tsx` :
```tsx
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/features/auth/actions";
import { requireUser } from "@/lib/session";

export default async function SettingsPage() {
  const user = await requireUser("settings");
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight lg:text-[28px]">Réglages</h1>
      <section className="mt-8 flex flex-col gap-4 border-t border-line pt-6">
        <h2 className="text-[15px] font-semibold tracking-tight">Compte</h2>
        <p className="text-sm text-fg-2">{user.email}</p>
        <form action={signOutAction}>
          <Button type="submit" variant="secondary">
            Se déconnecter
          </Button>
        </form>
      </section>
    </>
  );
}
```

- [ ] **Étape 5 : lancer**

Run : `pnpm test:e2e tests/e2e/access.spec.ts`
Attendu : PASS (4 tests : 2 × mobile/desktop).

- [ ] **Étape 6 : commit**

```bash
git add -A && git commit -m "feat(app): add app shell, navigation, email banner and settings sign-out

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 12 : onboarding étapes 1 et 2 (BODY-19, BODY-20)

**Fichiers :**
- Créer : `src/lib/units.ts`, `src/lib/units.test.ts`, `src/features/profile/schemas.ts`, `src/features/profile/schemas.test.ts`, `src/features/profile/onboarding.ts`, `src/features/profile/onboarding.test.ts`, `src/features/profile/actions.ts`, `src/features/profile/components/{sex-step,body-step,onboarding-progress}.tsx`, `src/app/onboarding/page.tsx`, `tests/e2e/auth-onboarding.spec.ts`

**Interfaces :**
- Consomme : `today`, `ageOn`, `isValidTimezone`, `getProfile`, `saveSex`, `saveBodyInfo`, `markOnboardingCompleted`, `Profile`, `requireUser`, `fieldErrorsFrom`, `ActionResult`.
- Produit :
  - `round1(v: number): number`, `inToCm(inches: number): number`, `cmToIn(cm: number): number`
  - `sexStepSchema`, `bodyStepSchema(todayDate: LocalDate)`
  - `ONBOARDING_STEPS = ["sex", "body"] as const`, `type OnboardingStep`, `nextOnboardingStep(profile: Profile | null): OnboardingStep | null`
  - `saveSexAction`, `saveBodyAction` (`(prev, formData) => Promise<ActionResult>`)

- [ ] **Étape 1 : écrire les tests unitaires qui échouent**

`src/lib/units.test.ts` :
```ts
import { describe, expect, it } from "vitest";
import { cmToIn, inToCm, round1 } from "./units";

describe("units", () => {
  it("converts inches to centimetres with the exact factor", () => {
    expect(inToCm(70)).toBe(177.8);
  });

  it("round-trips at storage precision", () => {
    expect(inToCm(cmToIn(177.8))).toBe(177.8);
  });

  it("rounds half away from zero to one decimal, despite floating point", () => {
    expect(round1(168.45)).toBe(168.5);
    expect(round1(168.44)).toBe(168.4);
    expect(round1(-3.25)).toBe(-3.3);
  });
});
```

`src/features/profile/schemas.test.ts` :
```ts
import { describe, expect, it } from "vitest";
import { bodyStepSchema, sexStepSchema } from "./schemas";

const TODAY = "2026-10-01";
const body = (o: Record<string, string>) =>
  bodyStepSchema(TODAY).safeParse({ height: "178", lengthUnit: "cm", birthDate: "1995-05-12", ...o });

describe("bodyStepSchema", () => {
  it("accepts a valid adult profile", () => {
    const r = body({});
    expect(r.success && r.data).toEqual({ heightCm: 178, lengthUnit: "cm", birthDate: "1995-05-12" });
  });

  it("converts inches to centimetres", () => {
    const r = body({ height: "70", lengthUnit: "in" });
    expect(r.success && r.data.heightCm).toBe(177.8);
  });

  it("enforces the 100-250 cm range", () => {
    expect(body({ height: "99.9" }).success).toBe(false);
    expect(body({ height: "250.1" }).success).toBe(false);
    expect(body({ height: "abc" }).success).toBe(false);
  });

  it("refuses users younger than 16", () => {
    expect(body({ birthDate: "2010-10-02" }).success).toBe(false);
    expect(body({ birthDate: "2010-10-01" }).success).toBe(true);
  });

  it("explains the age limit", () => {
    const r = body({ birthDate: "2012-01-01" });
    expect(!r.success && r.error.issues[0].message).toBe("my-body est réservé aux 16 ans et plus");
  });
});

describe("sexStepSchema", () => {
  it("requires a silhouette and falls back to Europe/Paris for an invalid timezone", () => {
    expect(sexStepSchema.safeParse({ timezone: "Europe/Paris" }).success).toBe(false);
    const r = sexStepSchema.safeParse({ sex: "female", timezone: "Nowhere/Land" });
    expect(r.success && r.data).toEqual({ sex: "female", timezone: "Europe/Paris" });
  });
});
```

`src/features/profile/onboarding.test.ts` :
```ts
import { describe, expect, it } from "vitest";
import { nextOnboardingStep } from "./onboarding";
import type { Profile } from "./queries";

const profile = (p: Partial<Profile>): Profile => ({
  userId: "u",
  sex: "female",
  heightCm: null,
  birthDate: null,
  weightUnit: "kg",
  lengthUnit: "cm",
  timezone: "Europe/Paris",
  reminderWeekday: null,
  onboardingCompletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...p,
});

describe("nextOnboardingStep", () => {
  it("starts with the silhouette when there is no profile", () => {
    expect(nextOnboardingStep(null)).toBe("sex");
  });

  it("asks for height and birth date next", () => {
    expect(nextOnboardingStep(profile({}))).toBe("body");
    expect(nextOnboardingStep(profile({ heightCm: 170 }))).toBe("body");
  });

  it("is done once every implemented step is filled", () => {
    expect(nextOnboardingStep(profile({ heightCm: 170, birthDate: "1990-01-01" }))).toBeNull();
  });
});
```

- [ ] **Étape 2 : lancer, vérifier l'échec**

Run : `pnpm test src/lib/units.test.ts src/features/profile`
Attendu : FAIL.

- [ ] **Étape 3 : implémenter**

`src/lib/units.ts` :
```ts
const CM_PER_INCH = 2.54; // specs/03 §8

/**
 * One decimal, half away from zero (storage and display precision).
 * Shifts the decimal point in the string form ("168.45e1" = 1684.5 exactly)
 * because 168.45 * 10 is 1684.4999… in binary floating point.
 * Valid for the app's ranges (no exponent notation below 1e-6 or above 1e21).
 */
export function round1(value: number): number {
  const rounded = Math.round(Number(`${Math.abs(value)}e1`)) / 10;
  return value < 0 ? -rounded : rounded;
}

export const inToCm = (inches: number) => round1(inches * CM_PER_INCH);
export const cmToIn = (cm: number) => round1(cm / CM_PER_INCH);
```

`src/features/profile/schemas.ts` :
```ts
import { z } from "zod";
import { ageOn, isValidTimezone, type LocalDate } from "@/lib/dates";
import { inToCm, round1 } from "@/lib/units";

export const sexStepSchema = z.object({
  sex: z.enum(["male", "female"], { error: "Choisis une silhouette" }),
  timezone: z.string().refine(isValidTimezone).catch("Europe/Paris"),
});

export function bodyStepSchema(todayDate: LocalDate) {
  return z
    .object({
      height: z.coerce.number({ error: "Taille invalide" }),
      lengthUnit: z.enum(["cm", "in"]),
      birthDate: z.iso.date({ error: "Date invalide" }),
    })
    .transform((v) => ({
      heightCm: v.lengthUnit === "in" ? inToCm(v.height) : round1(v.height),
      lengthUnit: v.lengthUnit,
      birthDate: v.birthDate,
    }))
    .superRefine((v, ctx) => {
      if (v.heightCm < 100 || v.heightCm > 250) {
        ctx.addIssue({ code: "custom", path: ["height"], message: "Taille entre 100 et 250 cm" });
      }
      const age = ageOn(v.birthDate, todayDate);
      if (age < 16) {
        ctx.addIssue({ code: "custom", path: ["birthDate"], message: "my-body est réservé aux 16 ans et plus" });
      } else if (age > 120) {
        ctx.addIssue({ code: "custom", path: ["birthDate"], message: "Date invalide" });
      }
    });
}
```

`src/features/profile/onboarding.ts` :
```ts
import type { Profile } from "./queries";

/**
 * Steps implemented so far. L2 appends "weight" and L3 "goal";
 * onboarding is complete when nextOnboardingStep returns null.
 */
export const ONBOARDING_STEPS = ["sex", "body"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export function nextOnboardingStep(profile: Profile | null): OnboardingStep | null {
  if (!profile) return "sex";
  if (profile.heightCm === null || profile.birthDate === null) return "body";
  return null;
}
```

Run : `pnpm test src/lib/units.test.ts src/features/profile`
Attendu : PASS (12 tests : 3 unités, 6 schémas, 3 onboarding).

- [ ] **Étape 4 : actions** — `src/features/profile/actions.ts`

```ts
"use server";

import { redirect } from "next/navigation";
import { fieldErrorsFrom, keepValues, type ActionResult } from "@/lib/action-result";
import { today } from "@/lib/dates";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/session";
import { nextOnboardingStep } from "./onboarding";
import { getProfile, markOnboardingCompleted, saveBodyInfo, saveSex } from "./queries";
import { bodyStepSchema, sexStepSchema } from "./schemas";

export async function saveSexAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await requireUser("onboarding");
  const parsed = sexStepSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };

  await saveSex(getDb(), user.userId, parsed.data.sex, parsed.data.timezone);
  redirect("/onboarding");
}

export async function saveBodyAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await requireUser("onboarding");
  if (!user.profile) redirect("/onboarding");

  const parsed = bodyStepSchema(today(user.profile.timezone)).safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: fieldErrorsFrom(parsed.error),
      values: keepValues(formData, "height", "birthDate"),
    };
  }

  const db = getDb();
  await saveBodyInfo(db, user.userId, parsed.data);
  if (nextOnboardingStep(await getProfile(db, user.userId)) === null) {
    await markOnboardingCompleted(db, user.userId);
    redirect("/accueil");
  }
  redirect("/onboarding");
}
```

- [ ] **Étape 5 : composants et page**

`src/features/profile/components/onboarding-progress.tsx` :
```tsx
export function OnboardingProgress({ step, total }: { step: number; total: number }) {
  return (
    <div
      role="progressbar"
      aria-label="Progression de l'inscription"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={step}
      className="h-[3px] w-full rounded-full bg-line"
    >
      <div className="h-full rounded-full bg-fg" style={{ width: `${(step / total) * 100}%` }} />
    </div>
  );
}
```

`src/features/profile/components/sex-step.tsx` :
```tsx
"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { fieldError } from "@/lib/action-result";
import { saveSexAction } from "../actions";

export function SexStep({ current }: { current: "male" | "female" | null }) {
  const [state, action, pending] = useActionState(saveSexAction, null);
  const [timezone, setTimezone] = useState("Europe/Paris");
  useEffect(() => setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone), []);
  const error = fieldError(state, "sex");

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="timezone" value={timezone} />
      <fieldset className="flex flex-col gap-3" aria-describedby={error ? "sex-error" : undefined}>
        <legend className="mb-3 text-sm text-fg-2">Pour afficher la bonne silhouette.</legend>
        {(
          [
            ["female", "Femme"],
            ["male", "Homme"],
          ] as const
        ).map(([value, label]) => (
          <label
            key={value}
            className="flex h-14 items-center gap-3 rounded-xl border border-line px-4 text-[15px] font-medium has-[:checked]:border-fg"
          >
            <input type="radio" name="sex" value={value} defaultChecked={current === value} className="accent-fg" />
            {label}
          </label>
        ))}
      </fieldset>
      {error && (
        <p id="sex-error" className="text-xs font-medium text-fg">
          {error}
        </p>
      )}
      <Button type="submit" loading={pending} className="w-full">
        Continuer
      </Button>
    </form>
  );
}
```

`src/features/profile/components/body-step.tsx` :
```tsx
"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fieldError, fieldValue } from "@/lib/action-result";
import { saveBodyAction } from "../actions";

export function BodyStep({ defaults }: { defaults: { heightCm: number | null; birthDate: string | null } }) {
  const [state, action, pending] = useActionState(saveBodyAction, null);
  const [unit, setUnit] = useState<"cm" | "in">("cm");

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="lengthUnit" value={unit} />
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Input
            label={`Taille (${unit})`}
            name="height"
            inputMode="decimal"
            defaultValue={fieldValue(state, "height") ?? defaults.heightCm ?? ""}
            error={fieldError(state, "height")}
          />
        </div>
        <div role="group" aria-label="Unité de longueur" className="flex h-11 rounded-xl bg-surface p-1 text-xs">
          {(["cm", "in"] as const).map((u) => (
            <button
              key={u}
              type="button"
              aria-pressed={unit === u}
              onClick={() => setUnit(u)}
              className={`rounded-lg px-3 ${unit === u ? "bg-bg font-semibold text-fg" : "text-subtle"}`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>
      <Input
        label="Date de naissance"
        name="birthDate"
        type="date"
        defaultValue={fieldValue(state, "birthDate") ?? defaults.birthDate ?? ""}
        error={fieldError(state, "birthDate")}
      />
      <div className="flex gap-3">
        <Link href="/onboarding?etape=sex" className="flex h-11 flex-1 items-center justify-center rounded-full border border-fg text-[13px] font-semibold">
          Retour
        </Link>
        <Button type="submit" loading={pending} className="flex-[1.4]">
          Continuer
        </Button>
      </div>
    </form>
  );
}
```

`src/app/onboarding/page.tsx` :
```tsx
import { BodyStep } from "@/features/profile/components/body-step";
import { OnboardingProgress } from "@/features/profile/components/onboarding-progress";
import { SexStep } from "@/features/profile/components/sex-step";
import { ONBOARDING_STEPS, nextOnboardingStep, type OnboardingStep } from "@/features/profile/onboarding";
import { requireUser } from "@/lib/session";

const titles: Record<OnboardingStep, string> = {
  sex: "Quelle silhouette afficher ?",
  body: "Parle-nous un peu de toi",
};

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ etape?: string }> }) {
  const { profile } = await requireUser("onboarding");
  const { etape } = await searchParams;
  const next = nextOnboardingStep(profile) ?? "body";
  // Going back is allowed, skipping ahead is not.
  const requested = ONBOARDING_STEPS.find((s) => s === etape);
  const step =
    requested && ONBOARDING_STEPS.indexOf(requested) <= ONBOARDING_STEPS.indexOf(next) ? requested : next;
  const index = ONBOARDING_STEPS.indexOf(step) + 1;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col gap-8 px-6 py-10">
      <OnboardingProgress step={index} total={ONBOARDING_STEPS.length} />
      <h1 className="text-2xl font-semibold tracking-tight">{titles[step]}</h1>
      {step === "sex" ? (
        <SexStep current={profile?.sex ?? null} />
      ) : (
        <BodyStep defaults={{ heightCm: profile?.heightCm ?? null, birthDate: profile?.birthDate ?? null }} />
      )}
    </main>
  );
}
```

- [ ] **Étape 6 : E2E du parcours L1** — `tests/e2e/auth-onboarding.spec.ts`

```ts
import { expect, test } from "@playwright/test";

const PASSWORD = "correct-horse-battery";

test("sign up, consent, onboarding, sign out and sign in again", async ({ page }, testInfo) => {
  const email = `e2e-${Date.now()}-${testInfo.project.name}@example.com`;

  await page.goto("/inscription");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  // Consents are unticked by default: the form must refuse.
  await expect(page.getByText("Ce consentement est nécessaire pour suivre ta progression")).toBeVisible();
  // The email is kept after an error; the password is never sent back, so it is typed again.
  await expect(page.getByLabel("Email")).toHaveValue(email);
  await page.getByLabel("Mot de passe").fill(PASSWORD);

  await page.getByLabel(/données de santé/).check();
  await page.getByLabel(/conditions générales/).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();

  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel("Femme").check();
  await page.getByRole("button", { name: "Continuer" }).click();

  await page.getByLabel(/Taille/).fill("168");
  await page.getByLabel("Date de naissance").fill("1990-04-12");
  await page.getByRole("button", { name: "Continuer" }).click();

  await expect(page).toHaveURL(/\/accueil$/);
  await expect(page.getByRole("heading", { name: "Bonjour" })).toBeVisible();
  await expect(page.getByText("Confirme ton email pour pouvoir récupérer ton compte.")).toBeVisible();

  await page.goto("/reglages");
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/connexion$/);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/accueil$/);
});

test("refuses users younger than 16 at onboarding", async ({ page }, testInfo) => {
  const email = `e2e-young-${Date.now()}-${testInfo.project.name}@example.com`;
  await page.goto("/inscription");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(PASSWORD);
  await page.getByLabel(/données de santé/).check();
  await page.getByLabel(/conditions générales/).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.getByLabel("Homme").check();
  await page.getByRole("button", { name: "Continuer" }).click();

  await page.getByLabel(/Taille/).fill("170");
  await page.getByLabel("Date de naissance").fill("2015-01-01");
  await page.getByRole("button", { name: "Continuer" }).click();

  await expect(page.getByText("my-body est réservé aux 16 ans et plus")).toBeVisible();
  await expect(page).toHaveURL(/\/onboarding$/);
});
```

Prérequis local : `.env.local` avec `DATABASE_URL` (Neon dev ou Postgres local migré), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=http://localhost:3000`, `AUTH_RATE_LIMIT=off`.

Run : `pnpm test:e2e`
Attendu : tous les tests E2E passent (smoke, access, auth-onboarding) sur mobile et desktop.

- [ ] **Étape 7 : vérifier et commit**

Run : `pnpm lint && pnpm typecheck && pnpm format:check && pnpm test && pnpm build`
Attendu : tout passe.

```bash
git add -A && git commit -m "feat(onboarding): add silhouette and body steps with age and height validation

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 13 : clôture des lots L0 et L1

**Fichiers :**
- Modifier : `specs/01-parcours-et-ecrans.md`, `specs/02-exigences-fonctionnelles.md`, `specs/04-modele-de-donnees.md`, `specs/05-architecture-technique.md`, `specs/07-securite-et-rgpd.md`, `specs/README.md`

- [ ] **Étape 1 : reporter les écarts assumés dans la spec**

- `specs/01` §1, tableau des routes : remplacer la ligne `/verifier-email` par
  `| /api/auth/verify-email | Lien de confirmation d'email (Better Auth), redirige vers /accueil?email=verifie | Public |`
  et ajouter `| /consentement | Consentement (comptes Google) | Connecté sans consentement |`.
- `specs/02` EF-AUTH-01 CA6 : remplacer par « Le lien de vérification (`/api/auth/verify-email?token=…`) confirme l'adresse puis redirige vers `/accueil?email=verifie`, qui affiche « Email confirmé ». »
- `specs/04` table `profile` : `height_cm` et `birth_date` deviennent « null jusqu'à l'étape 2 de l'onboarding » (CHECK 100–250 si non null).
- `specs/05` : remplacer `middleware.ts` par `src/proxy.ts` (Next.js 16) ; driver `node-postgres` ; schéma dans `src/lib/db/schema/` ; domaines `features/auth` et `features/consent` ; contrôle d'accès par groupes de routes `(app)`, `(settings)`, `onboarding`, `consentement` via `requireUser(area)` ; emails « gabarits texte/HTML (React Email optionnel plus tard) ».
- `specs/07` §5 Limitation de débit : « par IP et par route (natif Better Auth) ; limite par email : backlog ».
- `specs/README.md` : version 1.2 et ligne d'historique « 1.2 · 01/10/2026 · Ajustements issus du plan L0-L1 (proxy Next 16, groupes de routes, lien de vérification Better Auth, profil nullable pendant l'onboarding, rate limit par IP) ».

- [ ] **Étape 2 : vérification complète**

Run : `pnpm lint && pnpm typecheck && pnpm format:check && pnpm test && pnpm build && pnpm test:e2e`
Attendu : tout passe. Copier le récapitulatif des tests dans le compte rendu.

- [ ] **Étape 3 : commit**

```bash
git add -A && git commit -m "docs(specs): record L0-L1 implementation decisions (v1.2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Étape 4 : relecture du lot** — lancer l'agent `reviewer` sur `git diff <premier commit du lot>..HEAD` avec pour consigne : critères d'acceptation de BODY-9 à BODY-21, isolation des données (`requireUser` seule source de `userId`), aucune donnée de santé ni email dans les logs, conformité aux contraintes globales de ce plan. Corriger les points bloquants avant de déclarer le lot terminé.

- [ ] **Étape 5 : Jira** — passer BODY-9 à BODY-21 à « Terminé » une fois la relecture validée (fait par la session principale, pas par l'implementer).
