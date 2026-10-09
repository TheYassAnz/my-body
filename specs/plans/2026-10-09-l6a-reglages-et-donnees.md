# Lot L6a (Réglages, export et suppression du compte) : plan d'implémentation

> **Pour les agents :** sous-skill requis : utiliser `superpowers:subagent-driven-development` (recommandé) ou `superpowers:executing-plans`. Les étapes utilisent des cases à cocher (`- [ ]`). Agent d'exécution conseillé : `implementer` ; relecture : `reviewer`. Les tâches 3 et 6 touchent à l'UI : l'agent invoque `web-design-guidelines` (voir `.claude/agents/`).

**Objectif :** remplir `/reglages` : modifier le profil (sexe, taille, date de naissance), les unités d'affichage, le jour de mesure conseillé ; exporter les pesées et les mensurations en CSV ; supprimer son compte (saisie de `SUPPRIMER`, suppression en cascade, révocation des sessions, email de confirmation). Les pages légales et la page d'accueil publique sont dans le plan **L6b**, livré ensuite.

**Architecture :** pas de migration (les colonnes `weight_unit`, `length_unit`, `reminder_weekday` existent). Réglages : trois Server Actions fines dans `features/profile/settings-actions.ts` qui réutilisent les schémas Zod et les requêtes de l'onboarding ; chaque écriture invalide tout le layout (`revalidatePath("/", "layout")`) car les unités sont lues partout. Export : sérialisation CSV pure (`features/export/csv.ts`, TDD) servie par un Route Handler authentifié. Suppression : **API `deleteUser` de Better Auth appelée depuis le navigateur** (`authClient`), comme la connexion, pour que sa limite de débit HTTP s'applique ; l'email de confirmation part dans le hook `afterDelete`.

**Stack :** Next.js 16.3, React 19.2, Drizzle, Zod 4, Better Auth 1.7.7, Vitest + PGlite, Playwright. **Aucune dépendance ajoutée.**

**Spec :** `02` EF-SET-01 à 05 ; `03` §8 (unités, arrondis) ; `07` §3 (droits RGPD), §6 (injection CSV), §8 (journalisation) ; `09` E2E-6, E2E-7, E2E-8 ; `10` L6.

**Tickets Jira :** epic BODY-7 (= L6) ; ses sous-tickets sont à lire dans Jira avant de démarrer (non récupérés ici).

**Branche :** `feature/l6a-reglages-donnees`, créée depuis `main` (L5 fusionnée via la PR #6).

## Contraintes globales

- Celles des plans L0 à L5 : TypeScript strict sans `any`, UI en français (tutoiement), code en anglais, `pnpm format` avant commit, **aucune donnée de santé dans les logs** (ni email complet, ni jeton : `userId` et code d'erreur seulement), `lib/metrics` sans base/Next/horloge, `app/*` sans requête Drizzle, zones de toucher ≥ 44 px (ENF-14), focus visible (ENF-11).
- **Next.js 16 diffère de ce que tu connais** (`AGENTS.md`) : avant d'écrire le Route Handler (tâche 4), lire le guide correspondant dans `node_modules/next/dist/docs/`.
- Les valeurs restent **stockées en métrique** ; changer d'unité ne réécrit aucune donnée (EF-SET-02 CA2).
- Le jour de mesure suit la convention de `profile.reminder_weekday` : `0` = lundi … `6` = dimanche, `null` = aucun (`weekdayIndex` dans `lib/dates.ts`).
- Export (EF-SET-04) : colonnes exactes `date;poids_kg;masse_grasse_pct;note` et `date;zone;valeur_cm` ; UTF-8 **avec BOM**, séparateur `;`, décimale `.`, dates ISO 8601, **toujours métrique**, quelle que soit l'unité du profil. Toute cellule **texte** commençant par `=`, `+`, `-`, `@` est préfixée d'une apostrophe (spec 07 §6) ; les nombres ne le sont pas.
- Suppression (EF-SET-05) : saisie exacte de `SUPPRIMER` ; suppression immédiate et définitive, cascade sur toutes les tables, sessions révoquées, redirection vers `/`, email de confirmation **sans donnée de santé**.
- Aucun rouge sur les données (spec 06) ; le bouton destructif utilise la variante `danger` existante.

## Écarts assumés / questions à trancher avant d'implémenter

1. **Colonne `zone` de `mensurations.csv`** : la spec ne dit pas si c'est la clé (`waist`) ou le libellé (`Taille`). Proposition : la **clé** de l'enum (stable, lisible par une machine, indépendante de la langue). À confirmer.
2. **Suppression côté navigateur** : `auth.api.deleteUser` appelé depuis une Server Action ne passerait pas par la limite de débit de Better Auth (commentaire en tête de `client-actions.ts`). On appelle donc `authClient.deleteUser` et on ajoute la règle `"/delete-user": { window: 3600, max: 5 }`. La saisie de `SUPPRIMER` est une protection contre le clic malheureux, pas une frontière de sécurité : celle-ci est le mot de passe ou la session fraîche.
3. **Comptes Google (sans mot de passe)** : l'API exige une session « fraîche » (`freshAge`, 1 jour par défaut). Au-delà, l'erreur `SESSION_EXPIRED` s'affiche avec « reconnecte-toi puis recommence ». Pas de flux de ré-authentification dédié (YAGNI).
4. **Comptes email** : le champ « Mot de passe » est obligatoire dans le formulaire de suppression (le serveur vérifie le hash). Le champ est masqué pour un compte sans mot de passe.
5. **Fuseau et sexe** : changer de sexe ne touche pas au fuseau (`saveSex` n'écrit le fuseau qu'à l'insertion) ; le fuseau n'est pas modifiable dans les Réglages (hors périmètre EF-SET).
6. **Réglages avant la fin de l'onboarding** : la page reste accessible (`requireUser("settings")`). Sans profil, seules les sections Données, Compte et Légal s'affichent.
7. **Écarts constatés à l'implémentation** :
   - **Mot de passe exigé côté serveur** pour supprimer un compte email : Better Auth acceptait une session récente seule. Un hook `hooks.before` sur `/delete-user` (dans `create-auth.ts`) rejette avec le code `PASSWORD_REQUIRED` (HTTP 400) tout compte ayant un compte `credential` sans mot de passe non vide ; les comptes Google gardent la session fraîche. Le client affiche « Saisis ton mot de passe ».
   - **Toast depuis l'action** (enveloppe passée à `useActionState`) et non depuis un `useEffect` : la clé de remontage des formulaires démontait le composant avant l'effet. La clé du formulaire de profil inclut `lengthUnit`.
   - **Email de suppression non attendu** (`void … .catch`) : `getAuth()` enveloppe déjà `sendEmail` dans `after()`, qui garde la fonction vivante.
   - **E2E** : le bouton s'appelle « Nouvelle pesée » (sans « + ») ; le contrôle du 404 est dans le test d'export connecté, car une requête non connectée est redirigée vers `/connexion`. Les comptes créés par E2E-6 restent dans la base (`e2e-units-…@example.com`), comme ceux de la spec d'inscription.
   - **Export** : EF-SET-02 CA1 (« l'unité s'applique à l'export ») et EF-SET-04 CA3 (« toujours en unités métriques ») se contredisent ; l'export reste métrique (EF-SET-04), la formulation de EF-SET-02 est à corriger.
   - **Non fait** : vérification visuelle à 390 et 1440 px (aucun agent ne disposait d'une session connectée) ; la spec `weight.spec.ts` (existante) a échoué une fois en parallèle de `progress.spec.ts` sur le compte de démo partagé, et passe seule.

8. **Hors lot** : pages légales et leur contenu, liens depuis l'inscription et le pied de page public, page d'accueil publique (L6b). Les trois liens légaux de la section « Légal » des Réglages pointent vers les pages provisoires existantes.

## Review Focus

1. **Injection CSV** : une note `=HYPERLINK(...)`, `+1`, `-2`, `@x`, ou contenant `;`, `"`, retour à la ligne : neutralisée et correctement échappée ; un poids (nombre) n'est jamais préfixé. Test : `csv.test.ts` (tâche 4).
2. **Export d'un compte vide ou presque** : 0 pesée / 0 mesure → fichier avec BOM et en-tête seul ; note ou % MG absents → cellule vide, jamais `null`/`undefined`. Test : `csv.test.ts` (tâche 4).
3. **Isolation** : l'export de A ne contient jamais une ligne de B ; `/reglages/export/autre` = 404 ; une action de Réglages n'écrit que le profil de la session. Tests : `tests/integration/export.test.ts` (tâche 4), `settings-actions.test.ts` (tâche 2).
4. **Entrées absurdes** : unité `stone`, jour `9` ou `""`, taille `99`/`abc`, naissance < 16 ans : refusées sans écriture partielle. Tests : `schemas.test.ts` (tâche 1), `settings-actions.test.ts` (tâche 2).
5. **Suppression : rien ne survit** : après `deleteUser`, plus aucune ligne de l'utilisateur dans `user`, `account`, `session`, `profile`, `consent`, `weight_entry`, `goal`, `measurement_session`, `measurement` ; les données d'un autre utilisateur restent intactes. Test : `tests/integration/delete-account.test.ts` (tâche 5).
6. **Suppression refusée** : mauvais mot de passe → rien n'est supprimé ; session ancienne sans mot de passe → `SESSION_EXPIRED`, rien n'est supprimé. Test : `delete-account.test.ts` (tâche 5), `client-actions.test.ts` (tâche 6).
7. **Mot de passe jamais renvoyé ni journalisé** : le formulaire de suppression ne remet jamais le mot de passe dans `values`. Test : `client-actions.test.ts` (tâche 6).
8. **Changement d'unité partout** : kg→lb puis lb→kg ne modifie aucune valeur stockée ; Accueil, Progrès et saisie suivent. Test : `settings-actions.test.ts` (tâche 2) et E2E-6 (tâche 7).

## Structure des fichiers

```
src/features/profile/
  schemas.ts               + unitsSchema, reminderSchema, REMINDER_NONE            (+ schemas.test.ts)
  queries.ts               + saveUnits, saveReminderWeekday
  settings-actions.ts      saveProfileSettingsAction, saveUnitsAction,
                           saveReminderWeekdayAction                               (+ settings-actions.test.ts)
  components/
    settings-fields.tsx           RadioGroup (groupe de boutons radio)
    profile-settings-form.tsx     sexe, taille, date de naissance
    units-settings-form.tsx       kg/lb, cm/in
    reminder-settings-form.tsx    jour de mesure
    settings-forms.test.tsx
src/features/export/
  csv.ts                   csvCell, toCsv, weightsCsv, measuresCsv                 (+ csv.test.ts)
  build.ts                 EXPORT_FILES, isExportKind, buildExport(db, userId, kind)
src/features/auth/
  queries.ts               hasCredentialAccount(db, userId)
  schemas.ts               + deleteAccountSchema
  client-actions.ts        + deleteAccountAction                                   (+ client-actions.test.ts)
  components/delete-account-form.tsx
src/lib/auth/create-auth.ts   + user.deleteUser (enabled, afterDelete), règle de débit /delete-user
src/lib/email/templates.ts    + accountDeletedEmail
src/app/(settings)/reglages/page.tsx                    sections Profil, Affichage, Rappel, Données, Compte, Légal
src/app/(settings)/reglages/export/[kind]/route.ts      GET : pesees | mensurations
tests/integration/settings.test.ts
tests/integration/export.test.ts
tests/integration/delete-account.test.ts
tests/e2e/support.ts                                    createAccount(page, tag, testInfo)
tests/e2e/settings.spec.ts                              E2E-6, E2E-7, E2E-8
```

---

### Tâche 1 : schémas et requêtes des Réglages

**Fichiers :**
- Modifier : `src/features/profile/schemas.ts`, `src/features/profile/queries.ts`, `src/features/profile/schemas.test.ts`
- Créer : `tests/integration/settings.test.ts`

**Interfaces :**
- Produit : `unitsSchema` (`{ weightUnit: "kg" | "lb"; lengthUnit: "cm" | "in" }`), `reminderSchema` (`{ weekday: number | null }` après transformation), `REMINDER_NONE = "none"`, `saveUnits(db, userId, { weightUnit, lengthUnit })`, `saveReminderWeekday(db, userId, weekday: number | null)`.

- [ ] **Étape 1 : écrire les tests de schéma (qui échouent)**

Ajouter à la fin de `src/features/profile/schemas.test.ts` (adapter l'import en tête : `reminderSchema`, `unitsSchema`) :

```ts
describe("unitsSchema", () => {
  it("accepts every valid combination", () => {
    for (const weightUnit of ["kg", "lb"]) {
      for (const lengthUnit of ["cm", "in"]) {
        expect(unitsSchema.safeParse({ weightUnit, lengthUnit }).success).toBe(true);
      }
    }
  });

  it.each([
    [{ weightUnit: "stone", lengthUnit: "cm" }],
    [{ weightUnit: "kg", lengthUnit: "ft" }],
    [{ weightUnit: "kg" }],
    [{}],
  ])("rejects %j", (input) => {
    expect(unitsSchema.safeParse(input).success).toBe(false);
  });
});

describe("reminderSchema", () => {
  it.each([
    ["none", null],
    ["0", 0],
    ["6", 6],
  ])("reads %j as %j", (weekday, expected) => {
    expect(reminderSchema.parse({ weekday })).toEqual({ weekday: expected });
  });

  it.each(["7", "-1", "", "abc", "1.5", "00"])("rejects %j", (weekday) => {
    expect(reminderSchema.safeParse({ weekday }).success).toBe(false);
  });
});
```

- [ ] **Étape 2 : lancer les tests, constater l'échec**

Run: `pnpm test src/features/profile/schemas.test.ts`
Attendu : FAIL (`unitsSchema`/`reminderSchema` n'existent pas).

- [ ] **Étape 3 : implémenter les schémas**

Ajouter à `src/features/profile/schemas.ts` :

```ts
export const unitsSchema = z.object({
  weightUnit: z.enum(["kg", "lb"]),
  lengthUnit: z.enum(["cm", "in"]),
});

/** Select value for "no reminder day". */
export const REMINDER_NONE = "none";

// An enum, not Number(): Number("") is 0, which would silently mean Monday.
export const reminderSchema = z.object({
  weekday: z
    .enum([REMINDER_NONE, "0", "1", "2", "3", "4", "5", "6"])
    .transform((v) => (v === REMINDER_NONE ? null : Number(v))),
});
```

- [ ] **Étape 4 : lancer les tests, constater le succès**

Run: `pnpm test src/features/profile/schemas.test.ts`
Attendu : PASS.

- [ ] **Étape 5 : écrire le test d'intégration des requêtes (qui échoue)**

Créer `tests/integration/settings.test.ts` :

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getProfile, saveBodyInfo, saveReminderWeekday, saveSex, saveUnits } from "@/features/profile/queries";
import { listWeights, upsertWeight } from "@/features/weight/queries";
import type { Db } from "@/lib/db/types";
import { createTestDb, insertTestUser } from "../helpers/db";

describe("settings queries", () => {
  let db: Db;
  let close: () => Promise<void>;

  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    for (const id of ["alice", "bob"]) {
      await insertTestUser(db, id);
      await saveSex(db, id, "female", "Europe/Paris");
      await saveBodyInfo(db, id, { heightCm: 168, birthDate: "1990-04-12", lengthUnit: "cm" });
    }
  });
  afterEach(() => close());

  it("saveUnits changes only the target user", async () => {
    await saveUnits(db, "alice", { weightUnit: "lb", lengthUnit: "in" });

    expect(await getProfile(db, "alice")).toMatchObject({ weightUnit: "lb", lengthUnit: "in" });
    expect(await getProfile(db, "bob")).toMatchObject({ weightUnit: "kg", lengthUnit: "cm" });
  });

  it("changing the units rewrites no stored value", async () => {
    await upsertWeight(db, "alice", { date: "2026-10-01", weightKg: 78.4, bodyFatPct: null, note: null });
    await saveUnits(db, "alice", { weightUnit: "lb", lengthUnit: "in" });
    await saveUnits(db, "alice", { weightUnit: "kg", lengthUnit: "cm" });

    expect((await listWeights(db, "alice"))[0].weightKg).toBe(78.4);
    expect((await getProfile(db, "alice"))?.heightCm).toBe(168);
  });

  it("saveReminderWeekday sets, clears, and the database refuses a bad day", async () => {
    await saveReminderWeekday(db, "alice", 2);
    expect((await getProfile(db, "alice"))?.reminderWeekday).toBe(2);
    await saveReminderWeekday(db, "alice", null);
    expect((await getProfile(db, "alice"))?.reminderWeekday).toBeNull();
    await expect(saveReminderWeekday(db, "alice", 7)).rejects.toThrow();
  });

  it("changing the sex keeps every weighing (EF-SET-01 CA1)", async () => {
    await upsertWeight(db, "alice", { date: "2026-10-01", weightKg: 78.4, bodyFatPct: null, note: null });
    await saveSex(db, "alice", "male", "Europe/Paris");

    expect((await getProfile(db, "alice"))?.sex).toBe("male");
    expect(await listWeights(db, "alice")).toHaveLength(1);
  });
});
```

- [ ] **Étape 6 : lancer le test, constater l'échec**

Run: `pnpm test tests/integration/settings.test.ts`
Attendu : FAIL (`saveUnits`/`saveReminderWeekday` introuvables).

- [ ] **Étape 7 : implémenter les requêtes**

Ajouter à `src/features/profile/queries.ts` :

```ts
export async function saveUnits(
  db: Db,
  userId: string,
  units: { weightUnit: WeightUnit; lengthUnit: LengthUnit },
) {
  await db.update(profile).set(units).where(eq(profile.userId, userId));
}

/** 0 = Monday … 6 = Sunday, null = no reminder day (specs/04). */
export async function saveReminderWeekday(db: Db, userId: string, reminderWeekday: number | null) {
  await db.update(profile).set({ reminderWeekday }).where(eq(profile.userId, userId));
}
```

- [ ] **Étape 8 : lancer les tests, constater le succès**

Run: `pnpm test tests/integration/settings.test.ts src/features/profile/schemas.test.ts`
Attendu : PASS.

- [ ] **Étape 9 : commit**

```bash
git add src/features/profile tests/integration/settings.test.ts
git commit -m "feat(settings): add units and reminder schemas and queries"
```

---

### Tâche 2 : Server Actions des Réglages

**Fichiers :**
- Créer : `src/features/profile/settings-actions.ts`, `src/features/profile/settings-actions.test.ts`

**Interfaces :**
- Consomme : `saveSex`, `saveBodyInfo`, `saveUnits`, `saveReminderWeekday`, `sexStepSchema`, `bodyStepSchema`, `unitsSchema`, `reminderSchema` (tâche 1 et onboarding), `requireUser("settings")`.
- Produit : `saveProfileSettingsAction`, `saveUnitsAction`, `saveReminderWeekdayAction`, tous `(prev: ActionResult | null, formData: FormData) => Promise<ActionResult>` ; succès = `{ ok: true }`.
- Champs de formulaire : profil `sex`, `height`, `birthDate` ; unités `weightUnit`, `lengthUnit` ; rappel `weekday` (`none` ou `0` à `6`).

- [ ] **Étape 1 : écrire les tests (qui échouent)**

Créer `src/features/profile/settings-actions.test.ts` :

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/lib/db/types";
import { listWeights, upsertWeight } from "@/features/weight/queries";
import { createTestDb, insertTestUser } from "../../../tests/helpers/db";
import { getProfile, saveBodyInfo, saveSex, type Profile } from "./queries";

const ctx = vi.hoisted(() => ({
  db: undefined as unknown as Db,
  requireUser: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: ctx.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
vi.mock("@/lib/db/client", () => ({ getDb: () => ctx.db }));
vi.mock("@/lib/session", () => ({ requireUser: ctx.requireUser }));

import {
  saveProfileSettingsAction,
  saveReminderWeekdayAction,
  saveUnitsAction,
} from "./settings-actions";

const form = (values: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
};
const profile: Profile = {
  userId: "alice",
  sex: "female",
  heightCm: 168,
  birthDate: "1990-04-12",
  weightUnit: "kg",
  lengthUnit: "cm",
  timezone: "Europe/Paris",
  reminderWeekday: null,
  onboardingCompletedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("settings actions", () => {
  let close: () => Promise<void>;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-03T10:00:00Z"));
    ({ db: ctx.db, close } = await createTestDb());
    for (const id of ["alice", "bob"]) {
      await insertTestUser(ctx.db, id);
      await saveSex(ctx.db, id, "female", "Europe/Paris");
      await saveBodyInfo(ctx.db, id, { heightCm: 168, birthDate: "1990-04-12", lengthUnit: "cm" });
    }
    ctx.requireUser.mockResolvedValue({ userId: "alice", email: "a@b.c", profile });
  });
  afterEach(async () => {
    vi.useRealTimers();
    vi.clearAllMocks();
    await close();
  });

  describe("saveProfileSettingsAction", () => {
    it("saves sex, height and birth date, keeps the weighings and refreshes the app", async () => {
      await upsertWeight(ctx.db, "alice", { date: "2026-10-01", weightKg: 80, bodyFatPct: null, note: null });

      const result = await saveProfileSettingsAction(
        null,
        form({ sex: "male", height: "172,5", birthDate: "1991-05-02" }),
      );

      expect(result).toEqual({ ok: true });
      expect(await getProfile(ctx.db, "alice")).toMatchObject({
        sex: "male",
        heightCm: 172.5,
        birthDate: "1991-05-02",
      });
      expect(await listWeights(ctx.db, "alice")).toHaveLength(1);
      expect(ctx.revalidatePath).toHaveBeenCalledWith("/", "layout");
    });

    it("reads the height in inches when the profile displays inches", async () => {
      ctx.requireUser.mockResolvedValue({
        userId: "alice",
        email: "a@b.c",
        profile: { ...profile, lengthUnit: "in" },
      });

      await saveProfileSettingsAction(null, form({ sex: "female", height: "66", birthDate: "1990-04-12" }));

      expect((await getProfile(ctx.db, "alice"))?.heightCm).toBe(167.6);
    });

    it.each([
      ["a height out of range", { sex: "female", height: "99", birthDate: "1990-04-12" }, "height"],
      ["a non-numeric height", { sex: "female", height: "abc", birthDate: "1990-04-12" }, "height"],
      ["a user under 16", { sex: "female", height: "168", birthDate: "2015-01-01" }, "birthDate"],
      ["an unknown sex", { sex: "other", height: "168", birthDate: "1990-04-12" }, "sex"],
    ])("refuses %s and writes nothing", async (_, input, field) => {
      const result = await saveProfileSettingsAction(null, form(input));

      expect(result).toMatchObject({ ok: false, fieldErrors: { [field]: [expect.any(String)] } });
      expect(await getProfile(ctx.db, "alice")).toMatchObject({ sex: "female", heightCm: 168 });
      expect(ctx.revalidatePath).not.toHaveBeenCalled();
    });

    it("reports a sex error and a height error together, without a partial write", async () => {
      const result = await saveProfileSettingsAction(
        null,
        form({ sex: "other", height: "99", birthDate: "1990-04-12" }),
      );

      expect(result).toMatchObject({
        ok: false,
        fieldErrors: { sex: [expect.any(String)], height: [expect.any(String)] },
      });
      expect((await getProfile(ctx.db, "alice"))?.sex).toBe("female");
    });

    it("sends a user without a profile to the onboarding", async () => {
      ctx.requireUser.mockResolvedValue({ userId: "alice", email: "a@b.c", profile: null });
      await expect(
        saveProfileSettingsAction(null, form({ sex: "male", height: "170", birthDate: "1990-04-12" })),
      ).rejects.toThrow("redirect:/onboarding");
    });
  });

  describe("saveUnitsAction", () => {
    it("saves both units for the session user only", async () => {
      const result = await saveUnitsAction(null, form({ weightUnit: "lb", lengthUnit: "in" }));

      expect(result).toEqual({ ok: true });
      expect(await getProfile(ctx.db, "alice")).toMatchObject({ weightUnit: "lb", lengthUnit: "in" });
      expect(await getProfile(ctx.db, "bob")).toMatchObject({ weightUnit: "kg", lengthUnit: "cm" });
      expect(ctx.revalidatePath).toHaveBeenCalledWith("/", "layout");
    });

    it("does not touch any stored weight or height", async () => {
      await upsertWeight(ctx.db, "alice", { date: "2026-10-01", weightKg: 78.4, bodyFatPct: null, note: null });
      await saveUnitsAction(null, form({ weightUnit: "lb", lengthUnit: "in" }));
      await saveUnitsAction(null, form({ weightUnit: "kg", lengthUnit: "cm" }));

      expect((await listWeights(ctx.db, "alice"))[0].weightKg).toBe(78.4);
      expect((await getProfile(ctx.db, "alice"))?.heightCm).toBe(168);
    });

    it("refuses an unknown unit and writes nothing", async () => {
      const result = await saveUnitsAction(null, form({ weightUnit: "stone", lengthUnit: "cm" }));

      expect(result).toMatchObject({ ok: false, formError: expect.any(String) });
      expect((await getProfile(ctx.db, "alice"))?.weightUnit).toBe("kg");
    });
  });

  describe("saveReminderWeekdayAction", () => {
    it("sets the day, then clears it with 'none'", async () => {
      expect(await saveReminderWeekdayAction(null, form({ weekday: "2" }))).toEqual({ ok: true });
      expect((await getProfile(ctx.db, "alice"))?.reminderWeekday).toBe(2);

      expect(await saveReminderWeekdayAction(null, form({ weekday: "none" }))).toEqual({ ok: true });
      expect((await getProfile(ctx.db, "alice"))?.reminderWeekday).toBeNull();
    });

    it.each(["7", "", "abc"])("refuses %j and keeps the current day", async (weekday) => {
      await saveReminderWeekdayAction(null, form({ weekday: "3" }));

      const result = await saveReminderWeekdayAction(null, form({ weekday }));

      expect(result).toMatchObject({ ok: false });
      expect((await getProfile(ctx.db, "alice"))?.reminderWeekday).toBe(3);
    });

    it("never writes another user's profile", async () => {
      await saveReminderWeekdayAction(null, form({ weekday: "4" }));
      expect((await getProfile(ctx.db, "bob"))?.reminderWeekday).toBeNull();
    });
  });
});
```

- [ ] **Étape 2 : lancer, constater l'échec**

Run: `pnpm test src/features/profile/settings-actions.test.ts`
Attendu : FAIL (module `./settings-actions` introuvable).

- [ ] **Étape 3 : implémenter les actions**

Créer `src/features/profile/settings-actions.ts` :

```ts
"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { GENERIC_ERROR } from "@/features/auth/messages";
import { fieldErrorsFrom, keepValues, type ActionResult } from "@/lib/action-result";
import { today } from "@/lib/dates";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/session";
import { saveBodyInfo, saveReminderWeekday, saveSex, saveUnits } from "./queries";
import { bodyStepSchema, reminderSchema, sexStepSchema, unitsSchema } from "./schemas";

/** Units, sex and the reminder day show up on every screen: refresh the whole app. */
const refreshApp = () => revalidatePath("/", "layout");

/** The settings sections only exist once the profile does (the onboarding creates it). */
async function requireProfile() {
  const { userId, profile } = await requireUser("settings");
  if (!profile) redirect("/onboarding");
  return { userId, profile };
}

/** EF-SET-01: sex, height and birth date, with the onboarding's own rules. */
export async function saveProfileSettingsAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { userId, profile } = await requireProfile();
  const values = keepValues(formData, "sex", "height", "birthDate");

  const sex = sexStepSchema.shape.sex.safeParse(formData.get("sex"));
  // The height is typed in the unit the profile already displays.
  const body = bodyStepSchema(today(profile.timezone)).safeParse({
    height: formData.get("height"),
    lengthUnit: profile.lengthUnit,
    birthDate: formData.get("birthDate"),
  });
  if (!sex.success || !body.success) {
    return {
      ok: false,
      values,
      fieldErrors: {
        ...(sex.success ? {} : { sex: [sex.error.issues[0].message] }),
        ...(body.success ? {} : fieldErrorsFrom(body.error)),
      },
    };
  }

  await getDb().transaction(async (tx) => {
    await saveSex(tx, userId, sex.data, profile.timezone);
    await saveBodyInfo(tx, userId, body.data);
  });
  refreshApp();
  return { ok: true };
}

/** EF-SET-02: display units only; stored values stay metric. */
export async function saveUnitsAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { userId } = await requireProfile();
  const parsed = unitsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, formError: GENERIC_ERROR };

  await saveUnits(getDb(), userId, parsed.data);
  refreshApp();
  return { ok: true };
}

/** EF-SET-03: recommended measurement day, or none. */
export async function saveReminderWeekdayAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { userId } = await requireProfile();
  const parsed = reminderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, formError: GENERIC_ERROR };

  await saveReminderWeekday(getDb(), userId, parsed.data.weekday);
  refreshApp();
  return { ok: true };
}
```

- [ ] **Étape 4 : lancer, constater le succès**

Run: `pnpm test src/features/profile/settings-actions.test.ts`
Attendu : PASS. Puis `pnpm typecheck && pnpm lint`.

- [ ] **Étape 5 : commit**

```bash
git add src/features/profile/settings-actions.ts src/features/profile/settings-actions.test.ts
git commit -m "feat(settings): add profile, units and reminder server actions"
```

---

### Tâche 3 : formulaires et page Réglages

**Fichiers :**
- Créer : `src/features/profile/components/settings-fields.tsx`, `profile-settings-form.tsx`, `units-settings-form.tsx`, `reminder-settings-form.tsx`, `settings-forms.test.tsx`, `src/features/auth/queries.ts`
- Modifier : `src/app/(settings)/reglages/page.tsx`

**Interfaces :**
- Consomme : `saveProfileSettingsAction`, `saveUnitsAction`, `saveReminderWeekdayAction` (tâche 2), `REMINDER_NONE` (tâche 1), `useToast` (`@/components/ui/toast`, `show(message)`), `fieldError`/`fieldValue` (`@/lib/action-result`), `toDisplayLength`/`formatInputDecimal` (`@/lib/units`).
- Produit : `ProfileSettingsForm({ defaults: { sex; heightCm: number | null; birthDate: string | null; lengthUnit } })`, `UnitsSettingsForm({ defaults: { weightUnit; lengthUnit } })`, `ReminderSettingsForm({ defaults: { weekday: number | null } })`, `hasCredentialAccount(db, userId): Promise<boolean>` (utilisé en tâche 6).
- Chaque `<form>` porte un `aria-label` (« Profil », « Unités », « Jour de mesure ») : les tests E2E les ciblent par rôle `form`.

- [ ] **Étape 1 : écrire les tests de composants (qui échouent)**

Créer `src/features/profile/components/settings-forms.test.tsx` :

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../settings-actions", () => ({
  saveProfileSettingsAction: vi.fn(),
  saveUnitsAction: vi.fn(),
  saveReminderWeekdayAction: vi.fn(),
}));

import { ProfileSettingsForm } from "./profile-settings-form";
import { ReminderSettingsForm } from "./reminder-settings-form";
import { UnitsSettingsForm } from "./units-settings-form";

afterEach(cleanup);

describe("settings forms", () => {
  it("profile: checks the current sex and shows the height in the display unit", () => {
    render(
      <ProfileSettingsForm
        defaults={{ sex: "male", heightCm: 167.6, birthDate: "1990-04-12", lengthUnit: "in" }}
      />,
    );

    expect(screen.getByLabelText("Homme")).toBeChecked();
    expect(screen.getByLabelText("Femme")).not.toBeChecked();
    expect(screen.getByLabelText("Taille (in)")).toHaveValue("66,0");
    expect(screen.getByLabelText("Date de naissance")).toHaveValue("1990-04-12");
  });

  it("profile: tolerates a profile without height or birth date", () => {
    render(
      <ProfileSettingsForm
        defaults={{ sex: "female", heightCm: null, birthDate: null, lengthUnit: "cm" }}
      />,
    );

    expect(screen.getByLabelText("Taille (cm)")).toHaveValue("");
    expect(screen.getByLabelText("Date de naissance")).toHaveValue("");
  });

  it("units: checks the current units", () => {
    render(<UnitsSettingsForm defaults={{ weightUnit: "lb", lengthUnit: "cm" }} />);

    expect(screen.getByLabelText("lb")).toBeChecked();
    expect(screen.getByLabelText("kg")).not.toBeChecked();
    expect(screen.getByLabelText("cm")).toBeChecked();
  });

  it("reminder: offers none and the seven days, and selects the current one", () => {
    render(<ReminderSettingsForm defaults={{ weekday: 0 }} />);

    const select = screen.getByLabelText("Jour de mesure conseillé");
    expect(select).toHaveValue("0");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Aucun",
      "Lundi",
      "Mardi",
      "Mercredi",
      "Jeudi",
      "Vendredi",
      "Samedi",
      "Dimanche",
    ]);
  });

  it("reminder: 'none' is selected when no day is set", () => {
    render(<ReminderSettingsForm defaults={{ weekday: null }} />);
    expect(screen.getByLabelText("Jour de mesure conseillé")).toHaveValue("none");
  });
});
```

- [ ] **Étape 2 : lancer, constater l'échec**

Run: `pnpm test src/features/profile/components/settings-forms.test.tsx`
Attendu : FAIL (composants introuvables).

- [ ] **Étape 3 : écrire `RadioGroup`**

Créer `src/features/profile/components/settings-fields.tsx` :

```tsx
type Option = readonly [value: string, label: string];

/** Native radios: keyboard and screen readers for free. The visible control is the label. */
export function RadioGroup({
  legend,
  name,
  options,
  defaultValue,
  error,
}: {
  legend: string;
  name: string;
  options: readonly Option[];
  defaultValue: string | undefined;
  error?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-xs font-medium text-fg-2">{legend}</legend>
      <div className="flex gap-2">
        {options.map(([value, label]) => (
          <label
            key={value}
            className="flex h-11 flex-1 cursor-pointer items-center justify-center rounded-xl border border-line bg-surface text-sm has-[:checked]:border-fg has-[:checked]:font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--focus)]"
          >
            <input
              type="radio"
              name={name}
              value={value}
              defaultChecked={value === defaultValue}
              className="sr-only"
            />
            {label}
          </label>
        ))}
      </div>
      {error && <p className="text-xs font-medium text-fg">{error}</p>}
    </fieldset>
  );
}
```

- [ ] **Étape 4 : écrire les trois formulaires**

Créer `src/features/profile/components/units-settings-form.tsx` :

```tsx
"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { LengthUnit, WeightUnit } from "@/lib/units";
import { saveUnitsAction } from "../settings-actions";
import { RadioGroup } from "./settings-fields";

export function UnitsSettingsForm({
  defaults,
}: {
  defaults: { weightUnit: WeightUnit; lengthUnit: LengthUnit };
}) {
  const [state, action, pending] = useActionState(saveUnitsAction, null);
  const show = useToast();
  useEffect(() => {
    if (state?.ok) show("Unités enregistrées");
  }, [state, show]);

  return (
    <form action={action} aria-label="Unités" className="flex flex-col gap-4">
      <RadioGroup
        legend="Poids"
        name="weightUnit"
        options={[["kg", "kg"], ["lb", "lb"]]}
        defaultValue={defaults.weightUnit}
      />
      <RadioGroup
        legend="Longueurs"
        name="lengthUnit"
        options={[["cm", "cm"], ["in", "in"]]}
        defaultValue={defaults.lengthUnit}
      />
      {state && !state.ok && state.formError && (
        <p role="alert" className="text-xs font-medium text-fg">
          {state.formError}
        </p>
      )}
      <Button type="submit" loading={pending} className="self-start">
        Enregistrer
      </Button>
    </form>
  );
}
```

Créer `src/features/profile/components/reminder-settings-form.tsx` :

```tsx
"use client";

import { useActionState, useEffect, useId } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { REMINDER_NONE } from "../schemas";
import { saveReminderWeekdayAction } from "../settings-actions";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"] as const;

export function ReminderSettingsForm({ defaults }: { defaults: { weekday: number | null } }) {
  const [state, action, pending] = useActionState(saveReminderWeekdayAction, null);
  const show = useToast();
  const id = useId();
  useEffect(() => {
    if (state?.ok) show("Jour de mesure enregistré");
  }, [state, show]);

  return (
    <form action={action} aria-label="Jour de mesure" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-xs font-medium text-fg-2">
          Jour de mesure conseillé
        </label>
        <select
          id={id}
          name="weekday"
          defaultValue={defaults.weekday === null ? REMINDER_NONE : String(defaults.weekday)}
          className="h-11 rounded-xl border border-line bg-surface px-3 text-sm text-fg"
        >
          <option value={REMINDER_NONE}>Aucun</option>
          {DAYS.map((label, index) => (
            <option key={label} value={String(index)}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {state && !state.ok && state.formError && (
        <p role="alert" className="text-xs font-medium text-fg">
          {state.formError}
        </p>
      )}
      <Button type="submit" loading={pending} className="self-start">
        Enregistrer
      </Button>
    </form>
  );
}
```

Créer `src/features/profile/components/profile-settings-form.tsx` :

```tsx
"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { fieldError, fieldValue } from "@/lib/action-result";
import { formatInputDecimal, toDisplayLength, type LengthUnit } from "@/lib/units";
import type { Sex } from "../queries";
import { saveProfileSettingsAction } from "../settings-actions";
import { RadioGroup } from "./settings-fields";

export function ProfileSettingsForm({
  defaults,
}: {
  defaults: { sex: Sex; heightCm: number | null; birthDate: string | null; lengthUnit: LengthUnit };
}) {
  const [state, action, pending] = useActionState(saveProfileSettingsAction, null);
  const show = useToast();
  useEffect(() => {
    if (state?.ok) show("Profil enregistré");
  }, [state, show]);

  const height =
    defaults.heightCm === null
      ? ""
      : formatInputDecimal(toDisplayLength(defaults.heightCm, defaults.lengthUnit));

  return (
    <form action={action} aria-label="Profil" className="flex flex-col gap-4">
      <RadioGroup
        legend="Silhouette"
        name="sex"
        options={[["female", "Femme"], ["male", "Homme"]]}
        defaultValue={fieldValue(state, "sex") ?? defaults.sex}
        error={fieldError(state, "sex")}
      />
      <Input
        label={`Taille (${defaults.lengthUnit})`}
        name="height"
        inputMode="decimal"
        defaultValue={fieldValue(state, "height") ?? height}
        error={fieldError(state, "height")}
      />
      <Input
        label="Date de naissance"
        name="birthDate"
        type="date"
        defaultValue={fieldValue(state, "birthDate") ?? defaults.birthDate ?? ""}
        error={fieldError(state, "birthDate")}
      />
      <Button type="submit" loading={pending} className="self-start">
        Enregistrer
      </Button>
    </form>
  );
}
```

- [ ] **Étape 5 : requête du type de compte**

Créer `src/features/auth/queries.ts` :

```ts
import { and, eq } from "drizzle-orm";
import { account } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";

/** True for email/password accounts; false for Google-only accounts (no password to ask for). */
export async function hasCredentialAccount(db: Db, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
    .limit(1);
  return row !== undefined;
}
```

(Son test d'intégration est dans `delete-account.test.ts`, tâche 5.)

- [ ] **Étape 6 : assembler la page**

Remplacer `src/app/(settings)/reglages/page.tsx`. Les sections « Données » (liens d'export, tâche 4) et « Compte » (formulaire de suppression, tâche 6) sont ajoutées dans leurs tâches ; ici, la page contient Profil, Affichage, Rappel, Compte (email + déconnexion) et Légal :

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/features/auth/actions";
import { ProfileSettingsForm } from "@/features/profile/components/profile-settings-form";
import { ReminderSettingsForm } from "@/features/profile/components/reminder-settings-form";
import { UnitsSettingsForm } from "@/features/profile/components/units-settings-form";
import { requireUser } from "@/lib/session";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 flex flex-col gap-4 border-t border-line pt-6">
      <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export default async function SettingsPage() {
  const { email, profile } = await requireUser("settings");
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight lg:text-[28px]">Réglages</h1>
      {profile && (
        <>
          <Section title="Profil">
            {/* The key remounts the form once the saved values come back from the server. */}
            <ProfileSettingsForm
              key={`${profile.sex}${profile.heightCm}${profile.birthDate}`}
              defaults={{
                sex: profile.sex,
                heightCm: profile.heightCm,
                birthDate: profile.birthDate,
                lengthUnit: profile.lengthUnit,
              }}
            />
          </Section>
          <Section title="Affichage">
            <UnitsSettingsForm
              key={`${profile.weightUnit}${profile.lengthUnit}`}
              defaults={{ weightUnit: profile.weightUnit, lengthUnit: profile.lengthUnit }}
            />
          </Section>
          <Section title="Rappel">
            <ReminderSettingsForm
              key={String(profile.reminderWeekday)}
              defaults={{ weekday: profile.reminderWeekday }}
            />
          </Section>
        </>
      )}
      <Section title="Compte">
        <p className="text-sm text-fg-2">{email}</p>
        <form action={signOutAction}>
          <Button type="submit" variant="secondary">
            Se déconnecter
          </Button>
        </form>
      </Section>
      <Section title="Légal">
        <nav aria-label="Pages légales" className="flex flex-col gap-2 text-sm">
          <Link href="/mentions-legales" className="underline">
            Mentions légales
          </Link>
          <Link href="/cgu" className="underline">
            Conditions générales d&apos;utilisation
          </Link>
          <Link href="/confidentialite" className="underline">
            Politique de confidentialité
          </Link>
        </nav>
      </Section>
    </>
  );
}
```

- [ ] **Étape 7 : lancer les tests, le typage et le lint**

Run: `pnpm test src/features/profile && pnpm typecheck && pnpm lint`
Attendu : PASS.

- [ ] **Étape 8 : revue visuelle et design**

L'agent invoque `web-design-guidelines` sur les fichiers de l'étape 4 et de la page, corrige les violations, puis vérifie en mobile (390 px) et desktop (1440 px) avec `pnpm dev` : focus visible sur les radios masquées, zones ≥ 44 px, toast après enregistrement. Le jeton `--focus` existe dans `globals.css` ; s'il est renommé, adapter `RadioGroup`.

- [ ] **Étape 9 : commit**

```bash
pnpm format
git add src/features/profile/components src/features/auth/queries.ts "src/app/(settings)/reglages/page.tsx"
git commit -m "feat(settings): add profile, units and reminder forms"
```

---

### Tâche 4 : export CSV

**Fichiers :**
- Créer : `src/features/export/csv.ts`, `src/features/export/csv.test.ts`, `src/features/export/build.ts`, `src/app/(settings)/reglages/export/[kind]/route.ts`, `tests/integration/export.test.ts`
- Modifier : `src/app/(settings)/reglages/page.tsx` (section « Données »)

**Interfaces :**
- Consomme : `listWeights(db, userId): WeightEntry[]`, `listMeasures(db, userId): MeasureRow[]`, `requireUser("settings")`, `getDb()`.
- Produit : `csvCell(cell: string | number | null): string`, `toCsv(header, rows): string`, `weightsCsv(entries)`, `measuresCsv(rows)`, `EXPORT_FILES = ["pesees", "mensurations"]`, `isExportKind(v: string)`, `buildExport(db, userId, kind): Promise<string>`. Le Route Handler sert `GET /reglages/export/pesees` et `/mensurations`.

- [ ] **Étape 1 : lire le guide des Route Handlers**

Lire dans `node_modules/next/dist/docs/` le guide des Route Handlers (signature de `GET`, `params` asynchrone, `Response`). Adapter l'étape 7 à ce que le guide indique.

- [ ] **Étape 2 : écrire les tests de sérialisation (qui échouent)**

Créer `src/features/export/csv.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { csvCell, measuresCsv, toCsv, weightsCsv } from "./csv";

describe("csvCell", () => {
  it("leaves plain text and numbers alone", () => {
    expect(csvCell("Après le sport")).toBe("Après le sport");
    expect(csvCell(78.4)).toBe("78.4");
    expect(csvCell(-2)).toBe("-2"); // a number, not text: never prefixed
  });

  it("writes an empty cell for null", () => {
    expect(csvCell(null)).toBe("");
  });

  it.each(["=HYPERLINK(\"http://x\")", "+1", "-2", "@cmd", "\tx", "\rx"])(
    "neutralises the formula %j",
    (text) => {
      expect(csvCell(text)).toMatch(/^"?'/);
    },
  );

  it("prefixes with an apostrophe before quoting", () => {
    expect(csvCell("=1;2")).toBe(`"'=1;2"`);
  });

  it("quotes cells containing the separator, quotes or line breaks", () => {
    expect(csvCell("a;b")).toBe(`"a;b"`);
    expect(csvCell('dit "oui"')).toBe(`"dit ""oui"""`);
    expect(csvCell("ligne1\nligne2")).toBe(`"ligne1\nligne2"`);
  });
});

describe("toCsv", () => {
  it("starts with a BOM, separates with ; and ends each line with CRLF", () => {
    expect(toCsv(["a", "b"], [[1, "x"], [2, null]])).toBe("﻿a;b\r\n1;x\r\n2;\r\n");
  });

  it("writes the header alone when there is no row", () => {
    expect(toCsv(["a", "b"], [])).toBe("﻿a;b\r\n");
  });
});

describe("weightsCsv", () => {
  it("writes date, kilograms, body fat and note, whatever the display unit", () => {
    const csv = weightsCsv([
      { date: "2026-10-01", weightKg: 78.4, bodyFatPct: 21.5, note: "Matin" },
      { date: "2026-10-02", weightKg: 78, bodyFatPct: null, note: null },
      { date: "2026-10-03", weightKg: 77.9, bodyFatPct: null, note: "=2+2" },
    ]);

    expect(csv).toBe(
      "﻿date;poids_kg;masse_grasse_pct;note\r\n" +
        "2026-10-01;78.4;21.5;Matin\r\n" +
        "2026-10-02;78;;\r\n" +
        "2026-10-03;77.9;;'=2+2\r\n",
    );
  });
});

describe("measuresCsv", () => {
  it("writes date, zone key and centimetres", () => {
    const csv = measuresCsv([
      { id: "1", sessionId: "s", date: "2026-10-01", zone: "waist", valueCm: 85.5 },
    ]);
    expect(csv).toBe("﻿date;zone;valeur_cm\r\n2026-10-01;waist;85.5\r\n");
  });
});
```

- [ ] **Étape 3 : lancer, constater l'échec**

Run: `pnpm test src/features/export/csv.test.ts`
Attendu : FAIL (module introuvable).

- [ ] **Étape 4 : implémenter la sérialisation**

Créer `src/features/export/csv.ts` :

```ts
import type { MeasureRow } from "@/features/measurements/queries";
import type { WeightEntry } from "@/features/weight/queries";

export type Cell = string | number | null;

// specs/07 §6 lists = + - @ ; tab and carriage return are the other characters spreadsheets treat as formula starts.
const FORMULA_START = /^[=+\-@\t\r]/;
const NEEDS_QUOTES = /[;"\r\n]/;

/** Text starting like a formula gets an apostrophe; numbers (typed `number`) are never touched. */
export function csvCell(cell: Cell): string {
  if (cell === null) return "";
  if (typeof cell === "number") return String(cell);
  const safe = FORMULA_START.test(cell) ? `'${cell}` : cell;
  return NEEDS_QUOTES.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/** UTF-8 BOM (Excel), `;` separator, CRLF line ends (EF-SET-04 CA3). */
export function toCsv(header: readonly string[], rows: readonly (readonly Cell[])[]): string {
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(";"));
  return `﻿${lines.join("\r\n")}\r\n`;
}

export function weightsCsv(
  entries: readonly Pick<WeightEntry, "date" | "weightKg" | "bodyFatPct" | "note">[],
): string {
  return toCsv(
    ["date", "poids_kg", "masse_grasse_pct", "note"],
    entries.map((e) => [e.date, e.weightKg, e.bodyFatPct, e.note]),
  );
}

/** The zone column holds the stable enum key (waist, hips…), not a translated label. */
export function measuresCsv(rows: readonly MeasureRow[]): string {
  return toCsv(
    ["date", "zone", "valeur_cm"],
    rows.map((m) => [m.date, m.zone, m.valueCm]),
  );
}
```

- [ ] **Étape 5 : lancer, constater le succès**

Run: `pnpm test src/features/export/csv.test.ts`
Attendu : PASS.

- [ ] **Étape 6 : test d'intégration de l'export (qui échoue)**

Créer `tests/integration/export.test.ts` :

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildExport, isExportKind } from "@/features/export/build";
import { upsertMeasure } from "@/features/measurements/queries";
import { upsertWeight } from "@/features/weight/queries";
import type { Db } from "@/lib/db/types";
import { createTestDb, insertTestUser } from "../helpers/db";

describe("export", () => {
  let db: Db;
  let close: () => Promise<void>;

  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    await insertTestUser(db, "alice");
    await insertTestUser(db, "bob");
    await upsertWeight(db, "alice", { date: "2026-10-01", weightKg: 78.4, bodyFatPct: null, note: "ok" });
    await upsertWeight(db, "bob", { date: "2026-10-01", weightKg: 95, bodyFatPct: null, note: null });
    await upsertMeasure(db, "alice", { date: "2026-10-01", zone: "waist", valueCm: 85.5 });
    await upsertMeasure(db, "bob", { date: "2026-10-01", zone: "waist", valueCm: 110 });
  });
  afterEach(() => close());

  it("exports only the user's weighings", async () => {
    const csv = await buildExport(db, "alice", "pesees");
    expect(csv).toContain("2026-10-01;78.4;;ok");
    expect(csv).not.toContain("95");
  });

  it("exports only the user's measures", async () => {
    const csv = await buildExport(db, "alice", "mensurations");
    expect(csv).toContain("2026-10-01;waist;85.5");
    expect(csv).not.toContain("110");
  });

  it("gives a header-only file to a user without data", async () => {
    await insertTestUser(db, "carol");
    expect(await buildExport(db, "carol", "pesees")).toBe(
      "﻿date;poids_kg;masse_grasse_pct;note\r\n",
    );
    expect(await buildExport(db, "carol", "mensurations")).toBe(
      "﻿date;zone;valeur_cm\r\n",
    );
  });

  it("only knows the two export files", () => {
    expect(isExportKind("pesees")).toBe(true);
    expect(isExportKind("mensurations")).toBe(true);
    for (const other of ["", "users", "../etc/passwd", "PESEES"]) {
      expect(isExportKind(other)).toBe(false);
    }
  });
});
```

Run: `pnpm test tests/integration/export.test.ts` — attendu : FAIL (`./build` introuvable).

- [ ] **Étape 7 : implémenter `build.ts` et le Route Handler**

Créer `src/features/export/build.ts` :

```ts
import { listMeasures } from "@/features/measurements/queries";
import { listWeights } from "@/features/weight/queries";
import type { Db } from "@/lib/db/types";
import { measuresCsv, weightsCsv } from "./csv";

export const EXPORT_FILES = ["pesees", "mensurations"] as const;
export type ExportKind = (typeof EXPORT_FILES)[number];

export const isExportKind = (value: string): value is ExportKind =>
  (EXPORT_FILES as readonly string[]).includes(value);

/** Queries filter by userId: one user's file never holds another user's rows. */
export async function buildExport(db: Db, userId: string, kind: ExportKind): Promise<string> {
  return kind === "pesees"
    ? weightsCsv(await listWeights(db, userId))
    : measuresCsv(await listMeasures(db, userId));
}
```

Créer `src/app/(settings)/reglages/export/[kind]/route.ts` (adapter la signature au guide lu à l'étape 1) :

```ts
import { buildExport, isExportKind } from "@/features/export/build";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/session";

export async function GET(_: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!isExportKind(kind)) return new Response("Not found", { status: 404 });

  // Redirects to /connexion when signed out; the userId comes from the session only.
  const { userId } = await requireUser("settings");
  const csv = await buildExport(getDb(), userId, kind);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${kind}.csv"`,
      // Health data: never cached by a shared cache.
      "Cache-Control": "private, no-store",
    },
  });
}
```

- [ ] **Étape 8 : section « Données » de la page**

Dans `src/app/(settings)/reglages/page.tsx`, ajouter avant la section « Compte » :

```tsx
      <Section title="Données">
        <p className="text-sm text-fg-2">
          Exporte tes données au format CSV, toujours en unités métriques (kg, cm).
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="/reglages/export/pesees"
            download
            className="inline-flex h-11 items-center rounded-full border border-fg px-5 text-[13px] font-semibold lg:h-10"
          >
            Exporter les pesées
          </a>
          <a
            href="/reglages/export/mensurations"
            download
            className="inline-flex h-11 items-center rounded-full border border-fg px-5 text-[13px] font-semibold lg:h-10"
          >
            Exporter les mensurations
          </a>
        </div>
      </Section>
```

- [ ] **Étape 9 : lancer les tests, le typage, le lint**

Run: `pnpm test src/features/export tests/integration/export.test.ts && pnpm typecheck && pnpm lint`
Attendu : PASS. Vérification manuelle : `pnpm dev`, se connecter avec le compte de démo, télécharger les deux fichiers, les ouvrir dans un tableur (accents, colonnes, décimale `.`).

- [ ] **Étape 10 : commit**

```bash
pnpm format
git add src/features/export "src/app/(settings)/reglages" tests/integration/export.test.ts
git commit -m "feat(settings): export weighings and measures as CSV"
```

---

### Tâche 5 : suppression du compte côté serveur

**Fichiers :**
- Modifier : `src/lib/auth/create-auth.ts`, `src/lib/email/templates.ts`
- Créer : `tests/integration/delete-account.test.ts`

**Interfaces :**
- Consomme : `createAuth(deps)` (`deps.sendEmail`), `hasCredentialAccount` (tâche 3).
- Produit : `accountDeletedEmail(): { subject; text; html }` ; `createAuth` active `POST /api/auth/delete-user` (mot de passe ou session fraîche) et envoie l'email après suppression ; règle de débit `/delete-user` : 5 par heure.

- [ ] **Étape 1 : écrire le test d'intégration (qui échoue)**

Créer `tests/integration/delete-account.test.ts` :

```ts
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hasCredentialAccount } from "@/features/auth/queries";
import { createAuth, type Auth } from "@/lib/auth/create-auth";
import {
  account,
  consent,
  goal,
  measurement,
  measurementSession,
  profile,
  session,
  user,
  weightEntry,
} from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";
import type { EmailMessage } from "@/lib/email/types";
import { createTestDb } from "../helpers/db";

const PASSWORD = "correct-horse-battery";

describe("delete account", () => {
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

  async function signUp(name: string) {
    const { headers, response } = await auth.api.signUpEmail({
      body: { name, email: `${name}@example.com`, password: PASSWORD },
      returnHeaders: true,
    });
    const cookie = headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
    return { userId: response.user.id, headers: new Headers({ cookie }) };
  }

  /** One row in every table that holds the user's data. */
  async function fillData(userId: string) {
    await db.insert(profile).values({ userId, sex: "female" });
    await db.insert(consent).values({ userId, kind: "health_data", version: "1" });
    await db
      .insert(weightEntry)
      .values({ userId, date: "2026-10-01", weightKg: 78.4, bodyFatPct: null, note: null });
    await db
      .insert(goal)
      .values({ userId, type: "maintain", startDate: "2026-10-01", startWeightKg: 78.4 });
    const [s] = await db
      .insert(measurementSession)
      .values({ userId, date: "2026-10-01" })
      .returning({ id: measurementSession.id });
    await db.insert(measurement).values({ sessionId: s.id, zone: "waist", valueCm: 85.5 });
  }

  async function rowsOf(userId: string) {
    const [users, accounts, sessions, profiles, consents, weights, goals, sessionRows] =
      await Promise.all([
        db.select().from(user).where(eq(user.id, userId)),
        db.select().from(account).where(eq(account.userId, userId)),
        db.select().from(session).where(eq(session.userId, userId)),
        db.select().from(profile).where(eq(profile.userId, userId)),
        db.select().from(consent).where(eq(consent.userId, userId)),
        db.select().from(weightEntry).where(eq(weightEntry.userId, userId)),
        db.select().from(goal).where(eq(goal.userId, userId)),
        db.select().from(measurementSession).where(eq(measurementSession.userId, userId)),
      ]);
    const measures = await db.select().from(measurement);
    const own = new Set(sessionRows.map((r) => r.id));
    return {
      users: users.length,
      accounts: accounts.length,
      sessions: sessions.length,
      profiles: profiles.length,
      consents: consents.length,
      weights: weights.length,
      goals: goals.length,
      measurementSessions: sessionRows.length,
      measurements: measures.filter((m) => own.has(m.sessionId)).length,
    };
  }

  it("deletes the user and every row they own, and nobody else's", async () => {
    const alice = await signUp("alice");
    const bob = await signUp("bob");
    await fillData(alice.userId);
    await fillData(bob.userId);

    await auth.api.deleteUser({ headers: alice.headers, body: { password: PASSWORD } });

    expect(Object.values(await rowsOf(alice.userId)).every((n) => n === 0)).toBe(true);
    expect(Object.values(await rowsOf(bob.userId)).every((n) => n >= 1)).toBe(true);
  });

  it("revokes the session: the old cookie no longer works, and signing in fails", async () => {
    const alice = await signUp("alice");

    await auth.api.deleteUser({ headers: alice.headers, body: { password: PASSWORD } });

    expect(await auth.api.getSession({ headers: alice.headers })).toBeNull();
    await expect(
      auth.api.signInEmail({ body: { email: "alice@example.com", password: PASSWORD } }),
    ).rejects.toThrow();
  });

  it("sends the confirmation email after the deletion, without any health data", async () => {
    const alice = await signUp("alice");
    await fillData(alice.userId);
    sent = [];

    await auth.api.deleteUser({ headers: alice.headers, body: { password: PASSWORD } });

    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("alice@example.com");
    expect(sent[0].subject).toContain("supprimé");
    expect(sent[0].text).not.toMatch(/\d+[.,]\d+\s?(kg|cm)|78/);
  });

  it("deletes nothing and sends nothing with a wrong password", async () => {
    const alice = await signUp("alice");
    await fillData(alice.userId);
    sent = [];

    await expect(
      auth.api.deleteUser({ headers: alice.headers, body: { password: "not-the-password" } }),
    ).rejects.toThrow();

    expect((await rowsOf(alice.userId)).users).toBe(1);
    expect((await rowsOf(alice.userId)).weights).toBe(1);
    expect(sent).toHaveLength(0);
  });

  it("refuses an old session without a password (SESSION_EXPIRED)", async () => {
    const alice = await signUp("alice");
    await db
      .update(session)
      .set({ createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000) })
      .where(eq(session.userId, alice.userId));

    await expect(auth.api.deleteUser({ headers: alice.headers, body: {} })).rejects.toThrow();

    expect((await rowsOf(alice.userId)).users).toBe(1);
  });

  it("accepts a fresh session without a password (Google accounts)", async () => {
    const alice = await signUp("alice");

    await auth.api.deleteUser({ headers: alice.headers, body: {} });

    expect((await rowsOf(alice.userId)).users).toBe(0);
  });

  it("hasCredentialAccount tells an email account from a Google-only one", async () => {
    const alice = await signUp("alice");
    await db.insert(user).values({ id: "gina", name: "gina", email: "gina@example.com" });
    await db
      .insert(account)
      .values({ id: "acc-gina", accountId: "g-1", providerId: "google", userId: "gina" });

    expect(await hasCredentialAccount(db, alice.userId)).toBe(true);
    expect(await hasCredentialAccount(db, "gina")).toBe(false);
  });
});
```

Si `fillData` ou `rowsOf` échoue sur une colonne obligatoire (schéma réel), ajuster les valeurs insérées sans toucher aux assertions.

- [ ] **Étape 2 : lancer, constater l'échec**

Run: `pnpm test tests/integration/delete-account.test.ts`
Attendu : FAIL (`deleteUser` désactivé : « Delete user is disabled »).

- [ ] **Étape 3 : template de l'email**

Ajouter à `src/lib/email/templates.ts` :

```ts
/** EF-SET-05 CA3: sent after the deletion. No health data, no link. */
export function accountDeletedEmail(): Template {
  return {
    subject: "Ton compte my-body est supprimé",
    text: "Ton compte my-body et toutes tes données ont été supprimés définitivement.\n\nMerci d'avoir utilisé my-body.",
    html: "<p>Ton compte my-body et toutes tes données ont été supprimés définitivement.</p><p>Merci d'avoir utilisé my-body.</p>",
  };
}
```

- [ ] **Étape 4 : activer `deleteUser` et la limite de débit**

Dans `src/lib/auth/create-auth.ts` : importer `accountDeletedEmail` avec les deux autres templates, puis ajouter dans l'objet passé à `betterAuth` (à côté de `account:`) :

```ts
    user: {
      deleteUser: {
        enabled: true,
        // EF-SET-05 CA3: after the cascade, so a failed deletion never sends it. The row is gone: use the user passed in.
        afterDelete: async (user) => {
          void deps
            .sendEmail({ to: user.email, ...accountDeletedEmail() })
            .catch(() => console.error("email_send_failed"));
        },
      },
    },
```

et dans `rateLimit.customRules`, ajouter :

```ts
        "/delete-user": { window: 3600, max: 5 },
```

- [ ] **Étape 5 : lancer, constater le succès**

Run: `pnpm test tests/integration/delete-account.test.ts && pnpm typecheck && pnpm lint`
Attendu : PASS. Si le typage de `afterDelete` diffère (paramètres), suivre le type exposé par Better Auth 1.7.7 ; le comportement testé ne change pas.

- [ ] **Étape 6 : commit**

```bash
git add src/lib/auth/create-auth.ts src/lib/email/templates.ts tests/integration/delete-account.test.ts
git commit -m "feat(settings): enable account deletion with a confirmation email"
```

---

### Tâche 6 : suppression du compte côté interface

**Fichiers :**
- Modifier : `src/features/auth/schemas.ts`, `src/features/auth/client-actions.ts`, `src/features/auth/client-actions.test.ts`, `src/app/(settings)/reglages/page.tsx`
- Créer : `src/features/auth/components/delete-account-form.tsx`

**Interfaces :**
- Consomme : `authClient.deleteUser({ password? })` (`@/lib/auth/client`), `hasCredentialAccount` (tâche 3), `FormError` et `GENERIC_ERROR`/`TOO_MANY_ATTEMPTS` existants.
- Produit : `deleteAccountSchema`, `deleteAccountAction(prev, formData): Promise<ActionResult>` (navigue vers `/` en cas de succès), `DeleteAccountForm({ needsPassword: boolean })`.

- [ ] **Étape 1 : écrire les tests de l'action (qui échouent)**

Dans `src/features/auth/client-actions.test.ts`, ajouter `deleteUser: vi.fn()` au `vi.hoisted`, `deleteUser: m.deleteUser` à l'objet `authClient` mocké, `deleteAccountAction` à l'import, puis ce bloc à la fin (en réutilisant les helpers `form`, `ok`, `failure`, `PASSWORD` et le mock de `window.location.assign` déjà utilisé par les autres tests du fichier) :

```ts
describe("deleteAccountAction", () => {
  it("refuses anything but SUPPRIMER and calls nothing", async () => {
    for (const confirmation of ["", "supprimer", "SUPPRIMER ", "OUI"]) {
      const result = await deleteAccountAction(null, form({ confirmation, password: PASSWORD }));
      expect(result).toMatchObject({ ok: false, fieldErrors: { confirmation: [expect.any(String)] } });
    }
    expect(m.deleteUser).not.toHaveBeenCalled();
  });

  it("deletes with the password and goes back to the landing page", async () => {
    m.deleteUser.mockResolvedValue(ok);

    const result = await deleteAccountAction(
      null,
      form({ confirmation: "SUPPRIMER", password: PASSWORD }),
    );

    expect(result).toEqual({ ok: true });
    expect(m.deleteUser).toHaveBeenCalledWith({ password: PASSWORD });
    expect(m.assign).toHaveBeenCalledWith("/");
  });

  it("sends no password for an account without one", async () => {
    m.deleteUser.mockResolvedValue(ok);

    await deleteAccountAction(null, form({ confirmation: "SUPPRIMER" }));

    expect(m.deleteUser).toHaveBeenCalledWith({});
  });

  it("shows a wrong password on the field, and never sends it back", async () => {
    m.deleteUser.mockResolvedValue(failure(400, "INVALID_PASSWORD"));

    const result = await deleteAccountAction(
      null,
      form({ confirmation: "SUPPRIMER", password: "bad" }),
    );

    expect(result).toEqual({ ok: false, fieldErrors: { password: ["Mot de passe incorrect"] } });
    expect(JSON.stringify(result)).not.toContain("bad");
    expect(m.assign).not.toHaveBeenCalled();
  });

  it("asks to sign in again when the session is too old", async () => {
    m.deleteUser.mockResolvedValue(failure(400, "SESSION_EXPIRED"));

    const result = await deleteAccountAction(null, form({ confirmation: "SUPPRIMER" }));

    expect(result).toMatchObject({ ok: false, formError: expect.stringContaining("reconnecte-toi") });
    expect(m.assign).not.toHaveBeenCalled();
  });

  it("explains a rate limit, and falls back to a generic error", async () => {
    m.deleteUser.mockResolvedValue(failure(429));
    expect(await deleteAccountAction(null, form({ confirmation: "SUPPRIMER", password: PASSWORD }))).toMatchObject({
      ok: false,
      formError: expect.stringContaining("Trop de tentatives"),
    });

    m.deleteUser.mockRejectedValue(new Error("network"));
    expect(await deleteAccountAction(null, form({ confirmation: "SUPPRIMER", password: PASSWORD }))).toMatchObject({
      ok: false,
      formError: expect.any(String),
    });
  });
});
```

Si le fichier de test n'expose pas `m.assign` sous ce nom, utiliser celui qu'il définit déjà pour `window.location.assign`.

- [ ] **Étape 2 : lancer, constater l'échec**

Run: `pnpm test src/features/auth/client-actions.test.ts`
Attendu : FAIL (`deleteAccountAction` introuvable).

- [ ] **Étape 3 : schéma et action**

Ajouter à `src/features/auth/schemas.ts` :

```ts
export const deleteAccountSchema = z.object({
  confirmation: z.literal("SUPPRIMER", { error: "Saisis SUPPRIMER pour confirmer" }),
  // Absent for Google accounts; otherwise verified by Better Auth, never by us.
  password: z.string().optional(),
});
```

Ajouter à `src/features/auth/client-actions.ts` (importer `deleteAccountSchema` avec les autres schémas) :

```ts
/** EF-SET-05. Over HTTP so the /delete-user rate limit applies (a guess is a password attempt). */
export async function deleteAccountAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = deleteAccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };

  const { password } = parsed.data;
  const error = await call(() => authClient.deleteUser(password ? { password } : {}));
  if (error) {
    if (error.status === 429) return { ok: false, formError: TOO_MANY_ATTEMPTS };
    if (error.code?.startsWith("INVALID_PASSWORD")) {
      return { ok: false, fieldErrors: { password: ["Mot de passe incorrect"] } };
    }
    if (error.code?.startsWith("SESSION_EXPIRED")) {
      return { ok: false, formError: "Pour ta sécurité, reconnecte-toi puis recommence." };
    }
    return { ok: false, formError: GENERIC_ERROR };
  }
  navigate("/");
  return { ok: true };
}
```

- [ ] **Étape 4 : lancer, constater le succès**

Run: `pnpm test src/features/auth/client-actions.test.ts`
Attendu : PASS.

- [ ] **Étape 5 : formulaire**

Créer `src/features/auth/components/delete-account-form.tsx` (reprendre l'import et l'usage de `FormError` tels que dans `sign-in-form.tsx`) :

```tsx
"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fieldError } from "@/lib/action-result";
import { deleteAccountAction } from "../client-actions";
import { FormError } from "./form-error";

export function DeleteAccountForm({ needsPassword }: { needsPassword: boolean }) {
  const [state, action, pending] = useActionState(deleteAccountAction, null);

  return (
    <form action={action} aria-label="Suppression du compte" className="flex flex-col gap-4">
      <p className="text-sm text-fg-2">
        La suppression est immédiate et définitive : ton compte, tes pesées, tes mensurations et ton
        objectif sont effacés. Tu recevras un email de confirmation.
      </p>
      <Input
        label="Pour confirmer, saisis SUPPRIMER"
        name="confirmation"
        autoComplete="off"
        autoCapitalize="characters"
        error={fieldError(state, "confirmation")}
      />
      {needsPassword && (
        <Input
          label="Mot de passe"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          error={fieldError(state, "password")}
        />
      )}
      <FormError state={state} />
      <Button type="submit" variant="danger" loading={pending} className="self-start">
        Supprimer mon compte
      </Button>
    </form>
  );
}
```

Vérifier le nom de fichier et la signature réels de `FormError` dans `src/features/auth/components/` et les respecter.

- [ ] **Étape 6 : brancher dans la page**

Dans `src/app/(settings)/reglages/page.tsx` : importer `DeleteAccountForm`, `hasCredentialAccount` et `getDb` ; lire `userId` avec `requireUser` ; calculer `const needsPassword = await hasCredentialAccount(getDb(), userId);` ; ajouter après la section « Compte » :

```tsx
      <Section title="Supprimer mon compte">
        <DeleteAccountForm needsPassword={needsPassword} />
      </Section>
```

- [ ] **Étape 7 : lancer tests, typage, lint, puis revue design**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Attendu : PASS. L'agent invoque `web-design-guidelines` sur le formulaire et la page, corrige, et vérifie en 390 px et 1440 px (champ masqué pour un compte Google, message d'erreur lisible, bouton ≥ 44 px).

- [ ] **Étape 8 : commit**

```bash
pnpm format
git add src/features/auth "src/app/(settings)/reglages/page.tsx"
git commit -m "feat(settings): add the account deletion form"
```

---

### Tâche 7 : parcours E2E-6, E2E-7, E2E-8

**Fichiers :**
- Créer : `tests/e2e/support.ts`, `tests/e2e/settings.spec.ts`

**Interfaces :**
- Produit : `createAccount(page, tag, testInfo): Promise<{ email: string; password: string }>` : inscrit un compte neuf, passe l'onboarding (poids 70,4 kg, « Juste suivre mon poids », « Plus tard ») et arrive sur `/accueil`.

Les tests de suppression et de changement d'unité utilisent **un compte neuf**, jamais le compte de démo partagé (une suppression le détruirait ; un changement d'unité perturberait les autres specs). L'export (lecture seule) utilise le compte de démo.

- [ ] **Étape 1 : helper de création de compte**

Créer `tests/e2e/support.ts` (même parcours que `auth-onboarding.spec.ts`, qui n'est pas modifié) :

```ts
import { expect, type Page, type TestInfo } from "@playwright/test";

export const PASSWORD = "correct-horse-battery";

/** Fresh account through the real sign-up and onboarding; ends on /accueil with one weighing (70,4 kg). */
export async function createAccount(page: Page, tag: string, testInfo: TestInfo) {
  const email = `e2e-${tag}-${Date.now()}-${testInfo.project.name}@example.com`;
  await page.goto("/inscription");
  await page.getByLabel("Email").fill(email);
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
  await page.getByLabel("Poids", { exact: true }).fill("70,4");
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("button", { name: "Juste suivre mon poids" }).click();
  await page.getByRole("button", { name: "Plus tard" }).click();
  await expect(page).toHaveURL(/\/accueil$/);
  return { email, password: PASSWORD };
}
```

- [ ] **Étape 2 : écrire les trois parcours**

Créer `tests/e2e/settings.spec.ts` :

```ts
import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { createAccount } from "./support";

const DEMO_EMAIL = "demo@my-body.test";

test("E2E-6: switching to lb shows weights in lb on the home, the entry sheet and Progrès", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "E2E-6 runs on mobile");
  await createAccount(page, "units", testInfo);

  await page.goto("/reglages");
  const units = page.getByRole("form", { name: "Unités" });
  await units.getByRole("group", { name: "Poids" }).getByText("lb", { exact: true }).click();
  await units.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Unités enregistrées")).toBeVisible();

  // 70,4 kg stored → 155,2 lb displayed; nothing was rewritten.
  await page.goto("/accueil");
  await expect(page.getByTestId("weight-hero")).toHaveText("155,2");

  await page.getByRole("button", { name: "+ Nouvelle pesée" }).first().click();
  await expect(page.getByRole("dialog").getByText("lb", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");

  await page.goto("/progres");
  await expect(page.getByRole("region", { name: "Historique" })).toContainText(/155,2\s*lb/);
});

test("E2E-7: the CSV export downloads a non-empty file with a BOM and the right header", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "E2E-7 runs on desktop");
  const password = process.env.SEED_DEMO_PASSWORD;
  test.skip(!password, "SEED_DEMO_PASSWORD is not set: run pnpm db:seed first");
  await page.goto("/connexion");
  await page.getByLabel("Email").fill(DEMO_EMAIL);
  await page.getByLabel("Mot de passe").fill(password as string);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/accueil$/);

  await page.goto("/reglages");
  const [weights] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Exporter les pesées" }).click(),
  ]);
  expect(weights.suggestedFilename()).toBe("pesees.csv");
  const weightsText = await readFile((await weights.path()) as string, "utf8");
  expect(weightsText.startsWith("﻿date;poids_kg;masse_grasse_pct;note\r\n")).toBe(true);
  expect(weightsText.split("\r\n").length).toBeGreaterThan(10);

  const [measures] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Exporter les mensurations" }).click(),
  ]);
  expect(measures.suggestedFilename()).toBe("mensurations.csv");
  const measuresText = await readFile((await measures.path()) as string, "utf8");
  expect(measuresText.startsWith("﻿date;zone;valeur_cm\r\n")).toBe(true);
  expect(measuresText.length).toBeGreaterThan("﻿date;zone;valeur_cm\r\n".length);
});

test("E2E-7: the export refuses a signed-out visitor and an unknown file", async ({
  page,
  request,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "E2E-7 runs on desktop");
  await page.goto("/reglages/export/pesees");
  await expect(page).toHaveURL(/\/connexion/);
  expect((await request.get("/reglages/export/autre")).status()).toBe(404);
});

test("E2E-8: deleting the account signs out and the credentials stop working", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "E2E-8 runs on desktop");
  const { email, password } = await createAccount(page, "delete", testInfo);
  await page.goto("/reglages");

  const form = page.getByRole("form", { name: "Suppression du compte" });
  // A mistyped confirmation must not delete anything.
  await form.getByLabel(/saisis SUPPRIMER/).fill("supprimer");
  await form.getByLabel("Mot de passe").fill(password);
  await form.getByRole("button", { name: "Supprimer mon compte" }).click();
  await expect(form.getByText("Saisis SUPPRIMER pour confirmer")).toBeVisible();
  await page.goto("/accueil");
  await expect(page).toHaveURL(/\/accueil$/);

  await page.goto("/reglages");
  const confirm = page.getByRole("form", { name: "Suppression du compte" });
  await confirm.getByLabel(/saisis SUPPRIMER/).fill("SUPPRIMER");
  await confirm.getByLabel("Mot de passe").fill(password);
  await confirm.getByRole("button", { name: "Supprimer mon compte" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/reglages");
  await expect(page).toHaveURL(/\/connexion/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByText("Email ou mot de passe incorrect")).toBeVisible();
  await expect(page).toHaveURL(/\/connexion/);
});
```

- [ ] **Étape 3 : lancer les E2E**

Run: `pnpm test:e2e tests/e2e/settings.spec.ts` (le seed doit avoir été exécuté : `pnpm db:seed`, `SEED_DEMO_PASSWORD` défini).
Attendu : E2E-6 passe en mobile, E2E-7 et E2E-8 en desktop, les autres cas sont ignorés. Si un sélecteur ne trouve rien (nom du bouton « + Nouvelle pesée » présent plusieurs fois, libellé du dialogue), corriger le **sélecteur** d'après le rendu réel, pas l'assertion métier.

- [ ] **Étape 4 : suite complète**

Run: `pnpm test:e2e`
Attendu : tous les specs existants passent encore (le compte de démo n'a pas été modifié).

- [ ] **Étape 5 : commit**

```bash
pnpm format
git add tests/e2e
git commit -m "test(settings): cover units, export and account deletion end to end"
```

---

### Tâche 8 : clôture du lot L6a

**Fichiers :**
- Modifier : `specs/10-planning-et-jalons.md`, ce plan (écarts constatés)

- [ ] **Étape 1 : vérifications complètes**

Run : `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test --coverage && pnpm build && pnpm test:e2e`
Attendu : tout vert ; couverture ≥ 95 % sur `lib/metrics/**` et `lib/units.ts` inchangée. Vérifier à la main en 390 px et 1440 px : les six sections de `/reglages`, un export ouvert dans un tableur, la page sans profil (compte inscrit avant la fin de l'onboarding : seules Données, Compte, Légal).

- [ ] **Étape 2 : relecture**

Lancer l'agent `reviewer` sur la branche entière (règles de `specs/`, isolation, sécurité/RGPD, accessibilité via `web-design-guidelines`). Corriger tous les points **blocking**.

- [ ] **Étape 3 : mettre à jour les specs**

Dans `specs/10-planning-et-jalons.md`, sous L6, ajouter : « **L6a terminé** le JJ/MM/2026 (Réglages, export CSV, suppression du compte ; E2E-6, 7, 8). Reste : L6b (pages légales, page d'accueil publique). » Compléter la section « Écarts assumés » de ce plan avec les écarts constatés à l'implémentation (comme dans le plan L5).

- [ ] **Étape 4 : PR et Jira**

Pousser la branche, ouvrir la PR vers `main`, puis demander à l'agent `jira-updater` de commenter et de faire avancer les sous-tickets de l'epic BODY-7 couverts par L6a (l'epic reste ouvert jusqu'à L6b).
