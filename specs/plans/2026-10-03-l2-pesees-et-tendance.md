# Lot L2 (pesées et tendance) : plan d'implémentation

> **Pour les agents :** sous-skill requis : utiliser `superpowers:subagent-driven-development` (recommandé) ou `superpowers:executing-plans` pour exécuter ce plan tâche par tâche. Les étapes utilisent des cases à cocher (`- [ ]`). Agent d'exécution conseillé : `implementer` ; relecture : `reviewer`.

**Objectif :** premier usage réel de my-body : saisir sa pesée (onboarding étape 3, puis bouton `+`) et voir sur l'Accueil sa tendance lissée, son rythme, ses états de calibrage et une mini-courbe sur 3 mois, avec un compte de démonstration pour E2E-2.

**Architecture :** les calculs (tendance, calibrage, rythme, valeur suspecte) sont des fonctions pures dans `src/lib/metrics/`, sans base ni horloge. `features/weight` porte la table `weight_entry`, ses requêtes (filtrées par `userId`), son schéma Zod et la Server Action `saveWeightAction`, qui renvoie `needsConfirmation` pour le remplacement du jour et la valeur suspecte. `features/dashboard` agrège les pesées en un objet d'affichage déjà calculé (`WeightSummary`) ; les composants se contentent de formater. Le panneau de saisie est une `Dialog` Radix (panneau bas en mobile, modale en desktop) ouverte par un contexte client posé dans `AppShell`.

**Stack :** Next.js 16.3 (App Router, Server Actions), React 19.2, TypeScript strict, Tailwind v4, Drizzle 0.45 + PostgreSQL, Zod 4, `@radix-ui/react-dialog` (nouveau), Vitest 5 + PGlite + Testing Library, Playwright, `tsx` (nouveau, pour le seed).

**Spec :** `specs/` v1.2, en particulier `01` §3.1-3.3, `02` (WGT, ONB-01), `03` §1-3 et §8-9, `04` (`weight_entry`, §6), `05` §3-4, `06` §3-4, `08` (ENF-03, ENF-04, ENF-13, ENF-14), `09` §2-4.

**Tickets Jira :** BODY-22 à BODY-28 (epic BODY-3 = L2).

**Branche :** `feat/l2-pesees-tendance`, créée depuis `main` à jour.

## Contraintes globales

- Toutes les contraintes globales du plan L0-L1 (`specs/plans/2026-10-01-l0-l1-socle-et-auth.md`) restent valables : TypeScript strict sans `any`, UI en français (tutoiement), code en anglais, `pnpm format` avant chaque commit, jamais de donnée de santé, d'email ou de jeton dans les logs.
- Paramètres métier (spec 03, valeurs exactes) : `TREND_ALPHA` 0,1 · `TREND_SEED_ENTRIES` 3 · `RATE_WINDOW_DAYS` 28 · `RATE_MIN_ENTRIES` 5 · `CALIBRATION_MIN_ENTRIES` 7 · `CALIBRATION_MIN_SPAN_DAYS` 10 · `SUSPICIOUS_DELTA_PCT` 5.
- Bornes (spec 03 §9) : poids **20 à 400 kg** ; % MG **2 à 70** (optionnel) ; note **≤ 140 caractères**, espaces retirés, vide → `null` ; date **≤ aujourd'hui dans `profile.timezone`** et **≥ 1900-01-01**.
- Conversions exactes : **1 lb = 0,45359237 kg**, 1 in = 2,54 cm. Stockage : kg à **2 décimales**, % MG à 1 décimale. Affichage : **1 décimale**, virgule décimale, signe moins `−` (U+2212), espace fine insécable (U+202F) avant l'unité ; écarts signés sans zéro inutile (« −3,5 », « +1 », « 0 »).
- `lib/metrics` ne dépend d'aucun module à effet (base, Next, horloge). Il peut importer les helpers **purs** de `lib/dates` (`addDays`, `daysBetween`, type `LocalDate`), jamais `today()`.
- `app/*` n'écrit aucune requête Drizzle : il appelle `features/*/queries.ts` en leur passant `getDb()`.
- Couverture ≥ 95 % (lignes, branches, fonctions) sur `src/lib/metrics/**` et `src/lib/units.ts`, vérifiée en CI.
- Zones de toucher ≥ 44×44 px (ENF-14) : les boutons − / + du stepper font 44 px (la spec 06 dit 40 px ; ENF-14 l'emporte).

## Écarts assumés par rapport à la spec (à reporter dans la spec à la tâche 10)

1. **Mini-courbe de l'Accueil en SVG rendu côté serveur**, pas en Recharts : aucun JavaScript client pour ce graphique (ENF-03 : < 180 ko sur l'Accueil). Recharts arrive avec les grands graphiques (L5, L7).
2. **Seed L2 sans objectif ni séances** : les tables `goal` et `measurement_*` n'existent pas encore. L3 et L4 compléteront `pnpm db:seed`.
3. **Rythme affiché en gris neutre** sur l'Accueil : la couleur verte « dans le sens de l'objectif » dépend de l'objectif (L3).
4. **Fermeture du panneau bas par glissement** reportée à L7 ; en L2 : Échap, toucher du fond ou bouton « Fermer ».
5. **Rafraîchissement** : `revalidatePath("/", "layout")` (toutes les pages sont dynamiques) au lieu de `'/(app)'`.
6. **Confirmations successives** : `ActionResult.needsConfirmation = { reason, message }` ; le client renvoie le formulaire avec `confirm=<reason>` et la liste des raisons déjà acceptées dans le champ caché `confirmed` (remplacement puis valeur suspecte peuvent s'enchaîner).
7. **Taille à l'onboarding** : la virgule décimale est désormais acceptée (« 168,5 »), comme pour le poids.

## Review Focus

1. **Virgule décimale** (clavier français, « 78,4 ») dans le panneau, à l'onboarding et pour la taille : la valeur est acceptée et vaut 78,4. Tests : `features/weight/schemas.test.ts` (tâche 4), `number-stepper.test.tsx` (tâche 5), `features/profile/schemas.test.ts` (tâche 7).
2. **Fuseau horaire** : un utilisateur à Los Angeles à 19 h, alors qu'il est déjà le lendemain en UTC, ne peut pas saisir « demain », et un utilisateur à Paris peut saisir sa date du jour. Test : `features/weight/actions.test.ts` (tâche 4).
3. **Compte L1 sans pesée** : un compte dont l'onboarding a été terminé en L1 (avant l'étape 3) ouvre `/accueil` sans erreur et voit « Aucune pesée pour l'instant » avec un bouton d'ajout. Tests : `weight-summary.test.ts` et `dashboard.test.tsx` (tâche 8).
4. **Saisies absurdes** (« 1e400 », « Infinity », « -80 », champ vide, 141 caractères ou 141 emoji) : erreur de champ, jamais de `NaN` en base ni de plantage ; un rythme minuscule (1e-17) s'affiche « 0 » et pas « NaN ». Tests : `features/weight/schemas.test.ts` (tâche 4), `units.test.ts` (tâche 1).
5. **Aller-retour lb ↔ kg** : 172 lb deviennent 78,02 kg et s'affichent de nouveau 172,0 lb ; basculer kg → lb → kg à l'onboarding ne fait pas dériver la valeur. Tests : `units.test.ts` (tâche 1).

## Structure des fichiers

```
src/lib/
  units.ts                    + roundTo, round2, parseDecimal, conversions lb, formatage fr-FR
  dates.ts                    + addDays, daysBetween, formatLongDate
  action-result.ts            + needsConfirmation, confirmedReasons
  session.ts                  requireUser mémoïsé par requête (React cache)
  metrics/
    config.ts                 paramètres de la spec 03
    trend.ts                  computeTrend, currentTrend, dailyTrendSeries, sortByDate
    rate.ts                   calibration, rateWindow, slopePerDay, weeklyRate
    suspicious.ts             suspiciousDeviation
    index.ts                  réexports
  db/
    schema/app.ts             + table weight_entry
    seed-data.ts              demoWeights (pur, testé)
    seed.ts                   script pnpm db:seed (dev uniquement)
drizzle/0002_weight_entry.sql migration générée
src/components/ui/
  number-stepper.tsx          grand chiffre + boutons − / + (appui long)
  sheet.tsx                   panneau bas / modale (Radix Dialog)
  toast.tsx                   ToastProvider + useToast
src/features/weight/
  limits.ts                   bornes sans dépendance (utilisables côté client)
  copy.ts                     textes et messages de confirmation
  schemas.ts                  weightEntrySchema(today)
  queries.ts                  listWeights, getWeightOn, getLatestWeight, hasWeight, upsertWeight, insertWeights
  actions.ts                  saveWeightAction
  components/
    weight-form.tsx           contenu du panneau « Nouvelle pesée »
    weight-sheet-provider.tsx contexte d'ouverture + panneau
    new-weight-button.tsx     bouton « + Nouvelle pesée »
src/features/profile/         + étape « weight » (onboarding.ts, actions.ts, queries.ts, components/weight-step.tsx)
src/features/dashboard/
  weight-summary.ts           buildWeightSummary (pur)
  sparkline.ts                sparklineGeometry (pur)
  queries.ts                  getDashboard
  components/                 home-header.tsx, weight-block.tsx, sparkline.tsx
src/app/(app)/layout.tsx      valeurs par défaut du panneau
src/app/(app)/accueil/page.tsx
src/app/onboarding/page.tsx   étape 3
tests/integration/            weight.test.ts, dashboard.test.ts
tests/e2e/weight.spec.ts      E2E-2
```

---

### Tâche 1 : unités, arrondis et dates (BODY-22, partie `units` et `dates`)

**Fichiers :**
- Modifier : `src/lib/units.ts`, `src/lib/units.test.ts`, `src/lib/dates.ts`, `src/lib/dates.test.ts`

**Interfaces :**
- Consomme : `round1`, `inToCm`, `cmToIn`, `today`, `ageOn`, `isValidTimezone` (existants, signatures inchangées).
- Produit :
  - `roundTo(value: number, decimals: number): number`, `round2(value: number): number`
  - `type WeightUnit = "kg" | "lb"`
  - `parseDecimal(raw: unknown): number` (NaN si invalide)
  - `toStoredKg(value: number, unit: WeightUnit): number`, `toDisplayWeight(kg: number, unit: WeightUnit): number`
  - `formatDecimal(value: number): string`, `formatDelta(value: number): string`, `formatWeight(kg: number, unit: WeightUnit): string`, `formatWeeklyRate(kgPerWeek: number, unit: WeightUnit): string`, `formatInputDecimal(value: number): string`
  - `addDays(date: LocalDate, days: number): LocalDate`, `daysBetween(from: LocalDate, to: LocalDate): number`, `formatLongDate(date: LocalDate): string`

- [ ] **Étape 1 : écrire les tests qui échouent**

Ajouter à la fin de `src/lib/units.test.ts` (et compléter l'import : `import { cmToIn, formatDecimal, formatDelta, formatInputDecimal, formatWeeklyRate, formatWeight, inToCm, parseDecimal, round1, round2, toDisplayWeight, toStoredKg } from "./units";`) :

```ts
describe("parseDecimal", () => {
  it("reads French and English decimals", () => {
    expect(parseDecimal("78,4")).toBe(78.4);
    expect(parseDecimal("78.4")).toBe(78.4);
    expect(parseDecimal(" 80 ")).toBe(80);
  });

  it("returns NaN for anything that is not a plain positive decimal", () => {
    for (const raw of ["", "abc", "1e400", "Infinity", "-5", "1,2,3", "12345", undefined, 42]) {
      expect(parseDecimal(raw)).toBeNaN();
    }
  });
});

describe("rounding", () => {
  it("rounds stored kilograms to two decimals, despite floating point", () => {
    expect(round2(78.015)).toBe(78.02);
    expect(round2(1.005)).toBe(1.01);
  });

  it("returns 0 rather than NaN for tiny values (regression slopes)", () => {
    expect(round1(1e-17)).toBe(0);
    expect(round2(-1e-9)).toBe(0);
  });

  it("keeps NaN as NaN", () => {
    expect(round1(Number.NaN)).toBeNaN();
  });
});

describe("weight conversions", () => {
  it("converts pounds to stored kilograms and back without drift", () => {
    expect(toStoredKg(172, "lb")).toBe(78.02);
    expect(toDisplayWeight(78.02, "lb")).toBe(172);
    expect(toDisplayWeight(78.4, "lb")).toBe(172.8);
    expect(toStoredKg(172.8, "lb")).toBe(78.38);
    expect(toDisplayWeight(78.38, "kg")).toBe(78.4);
  });

  it("rounds kilograms to storage precision", () => {
    expect(toStoredKg(78.456, "kg")).toBe(78.46);
  });
});

describe("fr-FR formatting", () => {
  it("shows one decimal with a comma and a true minus sign", () => {
    expect(formatDecimal(78.4)).toBe("78,4");
    expect(formatDecimal(78)).toBe("78,0");
    expect(formatDecimal(-3.46)).toBe("−3,5");
    expect(formatDecimal(-0.01)).toBe("0,0");
  });

  it("signs differences without a useless zero", () => {
    expect(formatDelta(-3.5)).toBe("−3,5");
    expect(formatDelta(1)).toBe("+1");
    expect(formatDelta(0.04)).toBe("0");
    expect(formatDelta(-0.04)).toBe("0");
  });

  it("formats weights and weekly rates in the display unit", () => {
    expect(formatWeight(78.4, "kg")).toBe("78,4 kg");
    expect(formatWeight(78.4, "lb")).toBe("172,8 lb");
    expect(formatWeeklyRate(-0.35, "kg")).toBe("−0,4 kg/sem");
  });

  it("formats a number field value", () => {
    expect(formatInputDecimal(78)).toBe("78,0");
    expect(formatInputDecimal(172.84)).toBe("172,8");
  });
});
```

Ajouter à `src/lib/dates.test.ts` (import : `import { addDays, ageOn, daysBetween, formatLongDate, isValidTimezone, today } from "./dates";`) :

```ts
describe("calendar arithmetic", () => {
  it("adds days across months, years and leap days", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("counts whole days, ignoring daylight saving time", () => {
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
    expect(daysBetween("2026-01-10", "2026-01-01")).toBe(-9);
  });

  it("formats a long French date", () => {
    expect(formatLongDate("2026-10-03")).toBe("samedi 3 octobre");
  });
});
```

- [ ] **Étape 2 : lancer, vérifier l'échec**

Run : `pnpm test src/lib/units.test.ts src/lib/dates.test.ts`
Attendu : FAIL (fonctions non exportées).

- [ ] **Étape 3 : implémenter**

Remplacer `src/lib/units.ts` par :

```ts
const CM_PER_INCH = 2.54; // specs/03 §8
const KG_PER_LB = 0.45359237; // specs/03 §8
const MINUS = "−";
const NNBSP = " "; // narrow no-break space before units (specs/06 §7)

/**
 * Rounds half away from zero to `decimals` places.
 * Shifts the decimal point in the string form ("168.45e1" = 1684.5 exactly)
 * because 168.45 * 10 is 1684.4999… in binary floating point.
 * Tiny values return 0: their string form uses exponent notation ("1e-7e1" is NaN).
 */
export function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return value;
  if (Math.abs(value) < 1e-6) return 0;
  const rounded = Math.round(Number(`${Math.abs(value)}e${decimals}`)) / 10 ** decimals;
  return value < 0 ? -rounded : rounded;
}

/** One decimal: centimetres, percentages and every displayed value. */
export const round1 = (value: number) => roundTo(value, 1);
/** Two decimals: stored kilograms. */
export const round2 = (value: number) => roundTo(value, 2);

export const inToCm = (inches: number) => round1(inches * CM_PER_INCH);
export const cmToIn = (cm: number) => round1(cm / CM_PER_INCH);

export type WeightUnit = "kg" | "lb";

// At most 4 integer digits: keeps values far from exponent notation.
const DECIMAL = /^\d{1,4}([.,]\d{1,3})?$/;

/** Parses a typed decimal ("78,4" or "78.4"); NaN for anything else. */
export function parseDecimal(raw: unknown): number {
  if (typeof raw !== "string") return Number.NaN;
  const s = raw.trim();
  return DECIMAL.test(s) ? Number(s.replace(",", ".")) : Number.NaN;
}

/** Typed weight → stored kilograms (2 decimals). */
export const toStoredKg = (value: number, unit: WeightUnit) =>
  round2(unit === "lb" ? value * KG_PER_LB : value);

/** Stored kilograms → display unit (1 decimal). */
export const toDisplayWeight = (kg: number, unit: WeightUnit) =>
  round1(unit === "lb" ? kg / KG_PER_LB : kg);

const oneDecimal = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const upToOneDecimal = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

/** "78,4": one decimal, French separator (specs/03 §8). */
export function formatDecimal(value: number): string {
  const r = round1(value);
  return (r < 0 ? MINUS : "") + oneDecimal.format(Math.abs(r));
}

/** Signed difference without a useless zero: "−3,5", "+1", "0". */
export function formatDelta(value: number): string {
  const r = round1(value);
  if (r === 0) return "0";
  return (r < 0 ? MINUS : "+") + upToOneDecimal.format(Math.abs(r));
}

/** "78,4 kg" or "172,8 lb" from stored kilograms. */
export function formatWeight(kg: number, unit: WeightUnit): string {
  return `${formatDecimal(toDisplayWeight(kg, unit))}${NNBSP}${unit}`;
}

/** "−0,4 kg/sem" from a weekly rate in kilograms. */
export function formatWeeklyRate(kgPerWeek: number, unit: WeightUnit): string {
  return `${formatDelta(toDisplayWeight(kgPerWeek, unit))}${NNBSP}${unit}/sem`;
}

/** Value written into a number field: "78,4" (no sign, no thousands separator). */
export function formatInputDecimal(value: number): string {
  return round1(value).toFixed(1).replace(".", ",");
}
```

Ajouter à la fin de `src/lib/dates.ts` :

```ts
const DAY_MS = 86_400_000;

function toUtc(date: LocalDate): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return new Date(toUtc(date) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

const longDate = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/** "samedi 3 octobre" */
export function formatLongDate(date: LocalDate): string {
  return longDate.format(new Date(toUtc(date)));
}
```

- [ ] **Étape 4 : lancer, vérifier le succès**

Run : `pnpm test src/lib`
Attendu : PASS (y compris les anciens tests de `units` et `dates`, et `features/profile/schemas.test.ts` via `pnpm test`).

- [ ] **Étape 5 : commit**

```bash
pnpm format && git add src/lib/units.ts src/lib/units.test.ts src/lib/dates.ts src/lib/dates.test.ts && git commit -m "feat(lib): add weight units, fr-FR formatting and calendar helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 2 : `lib/metrics` : tendance, calibrage, rythme, valeur suspecte (BODY-22)

**Fichiers :**
- Créer : `src/lib/metrics/config.ts`, `trend.ts`, `trend.test.ts`, `rate.ts`, `rate.test.ts`, `suspicious.ts`, `suspicious.test.ts`, `perf.test.ts`, `index.ts`
- Modifier : `vitest.config.mts`, `.github/workflows/ci.yml`

**Interfaces :**
- Consomme : `addDays`, `daysBetween`, `LocalDate` (tâche 1).
- Produit :
  - `type WeightPoint = { date: LocalDate; weightKg: number }`, `type TrendPoint = WeightPoint & { trendKg: number }`
  - `sortByDate<T extends { date: LocalDate }>(points: readonly T[]): T[]`
  - `computeTrend(points: readonly WeightPoint[]): TrendPoint[]`, `currentTrend(points: readonly WeightPoint[]): number | null`
  - `dailyTrendSeries(trend: readonly TrendPoint[], from: LocalDate, to: LocalDate): { date: LocalDate; trendKg: number }[]`
  - `type Calibration = { calibrating: boolean; missingEntries: number }`, `calibration(points): Calibration`
  - `rateWindow(points, today, windowDays = RATE_WINDOW_DAYS, minEntries = RATE_MIN_ENTRIES): WeightPoint[]`
  - `slopePerDay(points: readonly WeightPoint[]): number | null`
  - `type WeeklyRate = { kgPerWeek: number; pctPerWeek: number }`, `weeklyRate(points, today, currentTrendKg, windowDays = RATE_WINDOW_DAYS): WeeklyRate | null`
  - `suspiciousDeviation(points: readonly WeightPoint[], weightKg: number): number | null` (écart signé en kg, ou `null`)
  - tout est réexporté par `@/lib/metrics`.

Les fonctions acceptent des objets qui ont **au moins** `date` et `weightKg` (par exemple des lignes `WeightEntry`) grâce au typage structurel.

- [ ] **Étape 1 : écrire les tests qui échouent**

`src/lib/metrics/trend.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { computeTrend, currentTrend, dailyTrendSeries } from "./trend";

const p = (date: string, weightKg: number) => ({ date, weightKg });

describe("computeTrend", () => {
  it("equals the weighing when there is only one", () => {
    expect(computeTrend([p("2026-01-01", 80)])).toEqual([
      { date: "2026-01-01", weightKg: 80, trendKg: 80 },
    ]);
  });

  it("follows the worked example of specs/03 §1", () => {
    const t = computeTrend([
      p("2026-01-01", 80),
      p("2026-01-02", 79),
      p("2026-01-03", 79.6),
      p("2026-01-06", 79.2),
    ]).map((x) => x.trendKg);
    expect(t[0]).toBe(80);
    expect(t[1]).toBeCloseTo(79.5, 10);
    expect(t[2]).toBeCloseTo(79.5333, 4);
    expect(t[3]).toBeCloseTo(79.443, 3);
  });

  it("uses alpha = 0.1 between consecutive days after the seed", () => {
    const t = computeTrend([
      p("2026-01-01", 80),
      p("2026-01-02", 80),
      p("2026-01-03", 80),
      p("2026-01-04", 70),
    ]);
    expect(t[3].trendKg).toBeCloseTo(79, 10);
  });

  it("adjusts alpha to missing days: 1 − 0.9³ = 0.271 after a 3-day gap", () => {
    const t = computeTrend([
      p("2026-01-01", 80),
      p("2026-01-02", 80),
      p("2026-01-03", 80),
      p("2026-01-06", 70),
    ]);
    expect(t[3].trendKg).toBeCloseTo(80 - 2.71, 10);
  });

  it("sorts weighings by date and leaves the input untouched", () => {
    const input = [p("2026-01-03", 79.6), p("2026-01-01", 80), p("2026-01-02", 79)];
    expect(computeTrend(input).map((x) => x.date)).toEqual([
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
    ]);
    expect(input[0].date).toBe("2026-01-03");
  });
});

describe("currentTrend", () => {
  it("is the trend of the latest weighing, or null without any", () => {
    expect(currentTrend([])).toBeNull();
    expect(currentTrend([p("2026-01-02", 79), p("2026-01-01", 80)])).toBeCloseTo(79.5, 10);
  });
});

describe("dailyTrendSeries", () => {
  const trend = computeTrend([p("2026-01-02", 80), p("2026-01-04", 78)]);

  it("repeats the last known trend on days without weighing", () => {
    expect(dailyTrendSeries(trend, "2026-01-02", "2026-01-05")).toEqual([
      { date: "2026-01-02", trendKg: 80 },
      { date: "2026-01-03", trendKg: 80 },
      { date: "2026-01-04", trendKg: 79 },
      { date: "2026-01-05", trendKg: 79 },
    ]);
  });

  it("starts at the first weighing and carries a trend from before the range", () => {
    expect(dailyTrendSeries(trend, "2026-01-01", "2026-01-02")).toEqual([
      { date: "2026-01-02", trendKg: 80 },
    ]);
    expect(dailyTrendSeries(trend, "2026-01-05", "2026-01-05")).toEqual([
      { date: "2026-01-05", trendKg: 79 },
    ]);
  });
});
```

`src/lib/metrics/rate.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/dates";
import { calibration, rateWindow, slopePerDay, weeklyRate } from "./rate";
import { computeTrend } from "./trend";

const TODAY = "2026-10-03";
/** Weighings on the given day offsets before TODAY (0 = today), oldest first if offsets decrease. */
const at = (offsets: number[], weight: (offset: number) => number = () => 80) =>
  offsets.map((o) => ({ date: addDays(TODAY, -o), weightKg: weight(o) }));
/** Offsets n−1 … 0: one weighing per day for n days ending today. */
const days = (n: number) => Array.from({ length: n }, (_, i) => n - 1 - i);
/** −0.1 kg per day. */
const linear = (o: number) => 80 - 0.1 * (40 - o);

describe("calibration", () => {
  it("needs 7 weighings: 6 over 20 days miss one", () => {
    expect(calibration(at([20, 16, 12, 8, 4, 0]))).toEqual({ calibrating: true, missingEntries: 1 });
  });

  it("counts every missing weighing", () => {
    expect(calibration([])).toEqual({ calibrating: true, missingEntries: 7 });
    expect(calibration(at([2, 1, 0]))).toEqual({ calibrating: true, missingEntries: 4 });
  });

  it("needs 10 days between the first and last weighing: 7 over 8 days miss one", () => {
    expect(calibration(at([8, 7, 6, 5, 4, 3, 0]))).toEqual({ calibrating: true, missingEntries: 1 });
  });

  it("ends once 10 days separate the first and last weighing", () => {
    expect(calibration(at([9, 8, 7, 6, 5, 4, 0])).calibrating).toBe(true);
    expect(calibration(at([10, 8, 7, 6, 5, 4, 0]))).toEqual({
      calibrating: false,
      missingEntries: 0,
    });
  });
});

describe("weekly rate", () => {
  it("measures a perfectly linear loss exactly", () => {
    const r = weeklyRate(at(days(40), linear), TODAY, 76);
    expect(r?.kgPerWeek).toBeCloseTo(-0.7, 10);
    expect(r?.pctPerWeek).toBeCloseTo((-0.7 / 76) * 100, 10);
  });

  it("has no lag after a change of pace, unlike a regression on the trend", () => {
    // 60 flat days, then 28 days at −0.1 kg/day ending today.
    const points = at(days(88), (o) => (o >= 28 ? 80 : 80 - 0.1 * (28 - o)));
    expect(weeklyRate(points, TODAY, 77.5)?.kgPerWeek).toBeCloseTo(-0.7, 10);

    const trendPoints = computeTrend(points).map((t) => ({ date: t.date, weightKg: t.trendKg }));
    expect((slopePerDay(rateWindow(trendPoints, TODAY)) ?? 0) * 7).toBeGreaterThan(-0.6);
  });

  it("uses the whole history when it is shorter than 28 days", () => {
    const points = at(days(10), linear);
    expect(rateWindow(points, TODAY)).toHaveLength(10);
    expect(weeklyRate(points, TODAY, 80)?.kgPerWeek).toBeCloseTo(-0.7, 10);
  });

  it("keeps only the last 28 days when they hold enough weighings", () => {
    expect(rateWindow(at([40, ...days(6)]), TODAY)).toHaveLength(6);
    expect(rateWindow(at(days(40)), TODAY)).toHaveLength(28);
  });

  it("extends the window to the last 5 weighings when the 28 days hold fewer", () => {
    const points = at([60, 50, 40, 30, 3], linear);
    expect(rateWindow(points, TODAY).map((p) => p.date)).toEqual(points.map((p) => p.date));
    expect(weeklyRate(points, TODAY, 80)?.kgPerWeek).toBeCloseTo(-0.7, 10);
  });

  it("accepts another window length (plateau detection, L3)", () => {
    expect(rateWindow(at(days(40)), TODAY, 21)).toHaveLength(21);
  });

  it("ignores weighings dated after today", () => {
    const points = [...at(days(10), linear), { date: addDays(TODAY, 1), weightKg: 200 }];
    expect(weeklyRate(points, TODAY, 80)?.kgPerWeek).toBeCloseTo(-0.7, 10);
  });

  it("returns null without two distinct days", () => {
    expect(slopePerDay([])).toBeNull();
    expect(slopePerDay(at([0]))).toBeNull();
    expect(slopePerDay([...at([0]), ...at([0], () => 81)])).toBeNull();
    expect(weeklyRate(at([0]), TODAY, 80)).toBeNull();
  });
});
```

`src/lib/metrics/suspicious.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { suspiciousDeviation } from "./suspicious";

const p = (date: string, weightKg: number) => ({ date, weightKg });
const three = [p("2026-01-01", 78.4), p("2026-01-02", 78.4), p("2026-01-03", 78.4)];

describe("suspiciousDeviation", () => {
  it("needs a trend: fewer than 3 weighings never warn", () => {
    expect(suspiciousDeviation(three.slice(0, 2), 50)).toBeNull();
  });

  it("returns the signed gap in kg beyond 5 % (specs/01 §3.3 example)", () => {
    expect(suspiciousDeviation(three, 72)).toBeCloseTo(-6.4, 10);
    expect(suspiciousDeviation(three, 82.4)).toBeCloseTo(4, 10);
  });

  it("accepts values within 5 % of the trend", () => {
    expect(suspiciousDeviation(three, 82.3)).toBeNull();
    expect(suspiciousDeviation(three, 74.5)).toBeNull();
  });
});
```

`src/lib/metrics/perf.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/dates";
import { calibration, computeTrend, dailyTrendSeries, weeklyRate } from ".";

const TODAY = "2026-10-03";
const fiveYears = Array.from({ length: 5 * 365 + 1 }, (_, i) => ({
  date: addDays(TODAY, -i),
  weightKg: 80 + Math.sin(i / 9),
}));

function indicators() {
  const trend = computeTrend(fiveYears);
  calibration(fiveYears);
  weeklyRate(fiveYears, TODAY, trend[trend.length - 1].trendKg);
  dailyTrendSeries(trend, addDays(TODAY, -89), TODAY);
}

describe("ENF-04", () => {
  it("computes every weight indicator for 5 years of history in under 20 ms", () => {
    indicators(); // warm-up
    const start = performance.now();
    indicators();
    expect(performance.now() - start).toBeLessThan(20);
  });
});
```

- [ ] **Étape 2 : lancer, vérifier l'échec**

Run : `pnpm test src/lib/metrics`
Attendu : FAIL (modules introuvables).

- [ ] **Étape 3 : implémenter**

`src/lib/metrics/config.ts` :

```ts
/** Business parameters of specs/03, gathered for easy tuning. */
export const TREND_ALPHA = 0.1;
export const TREND_SEED_ENTRIES = 3;
export const RATE_WINDOW_DAYS = 28;
export const RATE_MIN_ENTRIES = 5;
export const CALIBRATION_MIN_ENTRIES = 7;
export const CALIBRATION_MIN_SPAN_DAYS = 10;
export const PLATEAU_WINDOW_DAYS = 21;
export const PLATEAU_THRESHOLD_PCT = 0.1;
export const STABLE_BAND_PCT = 1.5;
export const SUSPICIOUS_DELTA_PCT = 5;
export const MEASURE_STALE_DAYS = 14;
export const PROJECTION_MAX_DAYS = 730;
```

`src/lib/metrics/trend.ts` :

```ts
import { addDays, daysBetween, type LocalDate } from "@/lib/dates";
import { TREND_ALPHA, TREND_SEED_ENTRIES } from "./config";

export type WeightPoint = { date: LocalDate; weightKg: number };
export type TrendPoint = WeightPoint & { trendKg: number };

export function sortByDate<T extends { date: LocalDate }>(points: readonly T[]): T[] {
  // ISO dates sort lexically.
  return [...points].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Exponential moving average adjusted to missing days (specs/03 §1),
 * seeded on the running mean of the first TREND_SEED_ENTRIES weighings.
 */
export function computeTrend(points: readonly WeightPoint[]): TrendPoint[] {
  const out: TrendPoint[] = [];
  let seedSum = 0;
  for (const { date, weightKg } of sortByDate(points)) {
    const i = out.length;
    let trendKg: number;
    if (i < TREND_SEED_ENTRIES) {
      seedSum += weightKg;
      trendKg = seedSum / (i + 1);
    } else {
      const prev = out[i - 1];
      const gap = Math.max(1, daysBetween(prev.date, date));
      const alpha = 1 - (1 - TREND_ALPHA) ** gap;
      trendKg = prev.trendKg + alpha * (weightKg - prev.trendKg);
    }
    out.push({ date, weightKg, trendKg });
  }
  return out;
}

/** Trend of the latest weighing (never extrapolated), or null without any. */
export function currentTrend(points: readonly WeightPoint[]): number | null {
  const trend = computeTrend(points);
  return trend.length ? trend[trend.length - 1].trendKg : null;
}

/**
 * One value per day from `from` to `to` for charts: days without weighing repeat
 * the last known trend. `trend` must be sorted (output of computeTrend).
 */
export function dailyTrendSeries(
  trend: readonly TrendPoint[],
  from: LocalDate,
  to: LocalDate,
): { date: LocalDate; trendKg: number }[] {
  const out: { date: LocalDate; trendKg: number }[] = [];
  let i = 0;
  let current: number | null = null;
  for (let day = from; day <= to; day = addDays(day, 1)) {
    while (i < trend.length && trend[i].date <= day) {
      current = trend[i].trendKg;
      i++;
    }
    if (current !== null) out.push({ date: day, trendKg: current });
  }
  return out;
}
```

`src/lib/metrics/rate.ts` :

```ts
import { addDays, daysBetween, type LocalDate } from "@/lib/dates";
import {
  CALIBRATION_MIN_ENTRIES,
  CALIBRATION_MIN_SPAN_DAYS,
  RATE_MIN_ENTRIES,
  RATE_WINDOW_DAYS,
} from "./config";
import { sortByDate, type WeightPoint } from "./trend";

export type Calibration = { calibrating: boolean; missingEntries: number };
export type WeeklyRate = { kgPerWeek: number; pctPerWeek: number };

/** specs/03 §2: at least 7 weighings, and 10 days between the first and the last. */
export function calibration(points: readonly WeightPoint[]): Calibration {
  const sorted = sortByDate(points);
  const n = sorted.length;
  const span = n ? daysBetween(sorted[0].date, sorted[n - 1].date) : 0;
  const missingEntries =
    n < CALIBRATION_MIN_ENTRIES
      ? CALIBRATION_MIN_ENTRIES - n
      : span < CALIBRATION_MIN_SPAN_DAYS
        ? 1
        : 0;
  return { calibrating: missingEntries > 0, missingEntries };
}

/**
 * Raw weighings of the last `windowDays` days (today included), extended to the
 * last `minEntries` weighings when the window holds fewer (specs/03 §3).
 */
export function rateWindow(
  points: readonly WeightPoint[],
  today: LocalDate,
  windowDays = RATE_WINDOW_DAYS,
  minEntries = RATE_MIN_ENTRIES,
): WeightPoint[] {
  const past = sortByDate(points).filter((p) => p.date <= today);
  const start = addDays(today, -(windowDays - 1));
  const inWindow = past.filter((p) => p.date >= start);
  return inWindow.length >= minEntries ? inWindow : past.slice(-minEntries);
}

/** Least-squares slope of weight against day number, in kg/day. */
export function slopePerDay(points: readonly WeightPoint[]): number | null {
  if (points.length < 2) return null;
  const origin = points[0].date;
  const xs = points.map((p) => daysBetween(origin, p.date));
  const meanX = xs.reduce((s, x) => s + x, 0) / xs.length;
  const meanY = points.reduce((s, p) => s + p.weightKg, 0) / points.length;
  let num = 0;
  let den = 0;
  points.forEach((p, i) => {
    num += (xs[i] - meanX) * (p.weightKg - meanY);
    den += (xs[i] - meanX) ** 2;
  });
  return den === 0 ? null : num / den;
}

/** Real pace from raw weighings (no trend lag). Negative = losing. */
export function weeklyRate(
  points: readonly WeightPoint[],
  today: LocalDate,
  currentTrendKg: number,
  windowDays = RATE_WINDOW_DAYS,
): WeeklyRate | null {
  const slope = slopePerDay(rateWindow(points, today, windowDays));
  if (slope === null) return null;
  const kgPerWeek = slope * 7;
  return { kgPerWeek, pctPerWeek: (kgPerWeek / currentTrendKg) * 100 };
}
```

`src/lib/metrics/suspicious.ts` :

```ts
import { SUSPICIOUS_DELTA_PCT, TREND_SEED_ENTRIES } from "./config";
import { currentTrend, type WeightPoint } from "./trend";

/**
 * EF-WGT-03: signed gap in kg between `weightKg` and the current trend when it
 * exceeds SUSPICIOUS_DELTA_PCT, else null. `points` excludes the weighing being
 * replaced. No trend (fewer than 3 weighings) means no warning.
 */
export function suspiciousDeviation(
  points: readonly WeightPoint[],
  weightKg: number,
): number | null {
  if (points.length < TREND_SEED_ENTRIES) return null;
  const trendKg = currentTrend(points) as number;
  const delta = weightKg - trendKg;
  return (Math.abs(delta) / trendKg) * 100 > SUSPICIOUS_DELTA_PCT ? delta : null;
}
```

`src/lib/metrics/index.ts` :

```ts
export * from "./config";
export * from "./rate";
export * from "./suspicious";
export * from "./trend";
```

Dans `vitest.config.mts`, remplacer la ligne `coverage` par :

```ts
    coverage: {
      provider: "v8",
      include: ["src/lib/**"],
      // ENF-42: business rules and unit conversions are fully tested.
      thresholds: {
        "src/lib/metrics/**": { lines: 95, branches: 95, functions: 95, statements: 95 },
        "src/lib/units.ts": { lines: 95, branches: 95, functions: 95, statements: 95 },
      },
    },
```

Dans `.github/workflows/ci.yml`, job `checks`, remplacer `- run: pnpm test` par `- run: pnpm test --coverage`.

- [ ] **Étape 4 : lancer, vérifier le succès**

Run : `pnpm test --coverage`
Attendu : PASS, et le rapport indique ≥ 95 % sur `src/lib/metrics` et `src/lib/units.ts` (sinon ajouter le cas de test manquant, pas d'exclusion).

- [ ] **Étape 5 : commit**

```bash
pnpm format && git add src/lib/metrics vitest.config.mts .github/workflows/ci.yml && git commit -m "feat(metrics): add trend, calibration, weekly rate and suspicious value rules

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 3 : table `weight_entry` et requêtes (BODY-23, BODY-24 : données)

**Fichiers :**
- Modifier : `src/lib/db/schema/app.ts`
- Créer : `drizzle/0002_weight_entry.sql` (généré), `drizzle/meta/*` (généré), `src/features/weight/queries.ts`, `tests/integration/weight.test.ts`

**Interfaces :**
- Consomme : `Db`, `user`, `LocalDate`.
- Produit :
  - table `weightEntry` (exportée par `@/lib/db/schema`)
  - `type WeightEntry = typeof weightEntry.$inferSelect` (`{ id, userId, date: string, weightKg: number, bodyFatPct: number | null, note: string | null, createdAt, updatedAt }`)
  - `type NewWeight = { date: LocalDate; weightKg: number; bodyFatPct: number | null; note: string | null }`
  - `listWeights(db, userId): Promise<WeightEntry[]>` (plus ancienne d'abord)
  - `getWeightOn(db, userId, date): Promise<WeightEntry | null>`
  - `getLatestWeight(db, userId): Promise<WeightEntry | null>`
  - `hasWeight(db, userId): Promise<boolean>`
  - `upsertWeight(db, userId, w: NewWeight): Promise<void>`
  - `insertWeights(db, userId, rows: NewWeight[]): Promise<void>`

- [ ] **Étape 1 : écrire le test d'intégration qui échoue**

`tests/integration/weight.test.ts` :

```ts
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getLatestWeight,
  getWeightOn,
  hasWeight,
  insertWeights,
  listWeights,
  upsertWeight,
} from "@/features/weight/queries";
import { user, weightEntry } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";
import { createTestDb, insertTestUser } from "../helpers/db";

const w = (date: string, weightKg: number) => ({ date, weightKg, bodyFatPct: null, note: null });

describe("weight entries", () => {
  let db: Db;
  let close: () => Promise<void>;

  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    await insertTestUser(db, "alice");
    await insertTestUser(db, "bob");
  });
  afterEach(() => close());

  it("creates a weighing, then replaces it on the same date (one per day)", async () => {
    await upsertWeight(db, "alice", { date: "2026-10-03", weightKg: 78.2, bodyFatPct: 20.1, note: "sel" });
    await upsertWeight(db, "alice", { date: "2026-10-03", weightKg: 78.9, bodyFatPct: null, note: null });
    const rows = await listWeights(db, "alice");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ date: "2026-10-03", weightKg: 78.9, bodyFatPct: null, note: null });
  });

  it("lists only the caller's weighings, oldest first", async () => {
    await insertWeights(db, "alice", [w("2026-10-02", 79), w("2026-10-01", 80)]);
    await upsertWeight(db, "bob", w("2026-10-01", 95));
    expect((await listWeights(db, "alice")).map((r) => r.date)).toEqual(["2026-10-01", "2026-10-02"]);
    expect(await listWeights(db, "bob")).toHaveLength(1);
  });

  it("finds the weighing of a date and the latest one, per user", async () => {
    await insertWeights(db, "alice", [w("2026-10-01", 80), w("2026-10-02", 79)]);
    expect((await getWeightOn(db, "alice", "2026-10-01"))?.weightKg).toBe(80);
    expect(await getWeightOn(db, "bob", "2026-10-01")).toBeNull();
    expect((await getLatestWeight(db, "alice"))?.date).toBe("2026-10-02");
    expect(await getLatestWeight(db, "bob")).toBeNull();
    expect(await hasWeight(db, "alice")).toBe(true);
    expect(await hasWeight(db, "bob")).toBe(false);
  });

  it("never touches another user's weighing of the same date", async () => {
    await upsertWeight(db, "bob", w("2026-10-03", 95));
    await upsertWeight(db, "alice", w("2026-10-03", 60));
    expect((await getWeightOn(db, "bob", "2026-10-03"))?.weightKg).toBe(95);
  });

  it("enforces the ranges at the database level", async () => {
    await expect(upsertWeight(db, "alice", w("2026-10-03", 19.99))).rejects.toThrow();
    await expect(upsertWeight(db, "alice", w("2026-10-03", 400.01))).rejects.toThrow();
    await expect(
      upsertWeight(db, "alice", { ...w("2026-10-03", 80), bodyFatPct: 1.9 }),
    ).rejects.toThrow();
    await expect(
      upsertWeight(db, "alice", { ...w("2026-10-03", 80), note: "a".repeat(141) }),
    ).rejects.toThrow();
  });

  it("deletes the weighings with their user", async () => {
    await upsertWeight(db, "alice", w("2026-10-03", 80));
    await db.delete(user).where(eq(user.id, "alice"));
    expect(await db.select().from(weightEntry)).toHaveLength(0);
  });
});
```

- [ ] **Étape 2 : lancer, vérifier l'échec**

Run : `pnpm test tests/integration/weight.test.ts`
Attendu : FAIL (`weightEntry` et `@/features/weight/queries` introuvables).

- [ ] **Étape 3 : schéma et migration**

Dans `src/lib/db/schema/app.ts`, ajouter `unique` et `varchar` à l'import de `drizzle-orm/pg-core`, puis à la fin du fichier :

```ts
export const weightEntry = pgTable(
  "weight_entry",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Local calendar date of the weighing: no timestamp, so no timezone issue.
    date: date("date", { mode: "string" }).notNull(),
    weightKg: numeric("weight_kg", { precision: 5, scale: 2, mode: "number" }).notNull(),
    bodyFatPct: numeric("body_fat_pct", { precision: 4, scale: 1, mode: "number" }),
    note: varchar("note", { length: 140 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    // EF-WGT-02, and the index for chronological reads.
    unique("weight_entry_user_date_unique").on(t.userId, t.date),
    check("weight_entry_weight_range", sql`${t.weightKg} between 20 and 400`),
    check(
      "weight_entry_body_fat_range",
      sql`${t.bodyFatPct} is null or ${t.bodyFatPct} between 2 and 70`,
    ),
  ],
);
```

Run : `pnpm db:generate --name weight_entry`
Attendu : `drizzle/0002_weight_entry.sql` créé. Vérifier qu'il contient `CREATE TABLE "weight_entry"`, la contrainte `UNIQUE("user_id","date")`, les deux `CHECK` et la clé étrangère `ON DELETE cascade`, et **aucune** modification des tables existantes.

- [ ] **Étape 4 : requêtes**

`src/features/weight/queries.ts` :

```ts
import { and, asc, desc, eq } from "drizzle-orm";
import type { LocalDate } from "@/lib/dates";
import { weightEntry } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";

export type WeightEntry = typeof weightEntry.$inferSelect;
export type NewWeight = {
  date: LocalDate;
  weightKg: number;
  bodyFatPct: number | null;
  note: string | null;
};

/** Every weighing of the user, oldest first. */
export async function listWeights(db: Db, userId: string): Promise<WeightEntry[]> {
  return db
    .select()
    .from(weightEntry)
    .where(eq(weightEntry.userId, userId))
    .orderBy(asc(weightEntry.date));
}

export async function getWeightOn(
  db: Db,
  userId: string,
  date: LocalDate,
): Promise<WeightEntry | null> {
  const [row] = await db
    .select()
    .from(weightEntry)
    .where(and(eq(weightEntry.userId, userId), eq(weightEntry.date, date)));
  return row ?? null;
}

export async function getLatestWeight(db: Db, userId: string): Promise<WeightEntry | null> {
  const [row] = await db
    .select()
    .from(weightEntry)
    .where(eq(weightEntry.userId, userId))
    .orderBy(desc(weightEntry.date))
    .limit(1);
  return row ?? null;
}

export async function hasWeight(db: Db, userId: string): Promise<boolean> {
  return (await getLatestWeight(db, userId)) !== null;
}

/** Creates the weighing of that date, or replaces it (EF-WGT-02: one per day). */
export async function upsertWeight(db: Db, userId: string, w: NewWeight) {
  await db
    .insert(weightEntry)
    .values({ userId, ...w })
    .onConflictDoUpdate({
      target: [weightEntry.userId, weightEntry.date],
      set: { weightKg: w.weightKg, bodyFatPct: w.bodyFatPct, note: w.note, updatedAt: new Date() },
    });
}

/** Bulk insert, used by the demo seed. */
export async function insertWeights(db: Db, userId: string, rows: NewWeight[]) {
  if (rows.length) await db.insert(weightEntry).values(rows.map((r) => ({ userId, ...r })));
}
```

- [ ] **Étape 5 : lancer, vérifier le succès**

Run : `pnpm test tests/integration`
Attendu : PASS (nouveaux tests et tests existants).

- [ ] **Étape 6 : commit**

```bash
pnpm format && git add src/lib/db/schema/app.ts drizzle src/features/weight/queries.ts tests/integration/weight.test.ts && git commit -m "feat(db): add weight_entry table and queries

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 4 : validation et Server Action `saveWeightAction` (BODY-23, BODY-24, BODY-25 : serveur)

**Fichiers :**
- Modifier : `src/lib/action-result.ts`, `src/lib/action-result.test.ts`, `src/lib/session.ts`
- Créer : `src/features/weight/limits.ts`, `copy.ts`, `schemas.ts`, `schemas.test.ts`, `actions.ts`, `actions.test.ts`

**Interfaces :**
- Consomme : `parseDecimal`, `toStoredKg`, `toDisplayWeight`, `round1`, `formatDecimal`, `formatDelta`, `formatWeight`, `WeightUnit` (tâche 1) ; `suspiciousDeviation` (tâche 2) ; `getWeightOn`, `listWeights`, `upsertWeight` (tâche 3) ; `requireUser`, `today`, `fieldErrorsFrom`, `keepValues`.
- Produit :
  - `type ConfirmReason = "replace" | "suspicious"` ; `ActionResult` (échec) gagne `needsConfirmation?: { reason: ConfirmReason; message: string }`
  - `confirmedReasons(formData: FormData): Set<ConfirmReason>`
  - `WEIGHT_MIN_KG = 20`, `WEIGHT_MAX_KG = 400`, `BODY_FAT_MIN_PCT = 2`, `BODY_FAT_MAX_PCT = 70`, `NOTE_MAX_LENGTH = 140`, `MIN_DATE = "1900-01-01"` (`limits.ts`)
  - `WEIGHT_TIP`, `NOTE_SUGGESTIONS`, `SAVED_TOAST`, `replaceMessage(oldKg, newKg, unit)`, `suspiciousMessage(kg, deltaKg, unit)` (`copy.ts`)
  - `weightEntrySchema(todayDate: LocalDate)` → données `{ date, weightKg, bodyFatPct, note, unit }`
  - `saveWeightAction(prev: ActionResult | null, formData: FormData): Promise<ActionResult>` ; champs lus : `date`, `weight`, `unit`, `bodyFat`, `note`, `confirmed`, `confirm`
  - `requireUser` mémoïsé par requête (même signature).

- [ ] **Étape 1 : écrire les tests qui échouent**

Ajouter à `src/lib/action-result.test.ts` (compléter l'import avec `confirmedReasons`) :

```ts
describe("confirmedReasons", () => {
  const form = (values: Record<string, string>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(values)) fd.set(k, v);
    return fd;
  };

  it("merges reasons confirmed earlier with the button just pressed", () => {
    expect(confirmedReasons(form({ confirmed: "replace", confirm: "suspicious" }))).toEqual(
      new Set(["replace", "suspicious"]),
    );
  });

  it("ignores unknown or missing reasons", () => {
    expect(confirmedReasons(form({ confirmed: "hack,", confirm: "x" }))).toEqual(new Set());
    expect(confirmedReasons(new FormData())).toEqual(new Set());
  });
});
```

`src/features/weight/schemas.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { weightEntrySchema } from "./schemas";

const TODAY = "2026-10-03";
const parse = (o: Record<string, string | undefined>) =>
  weightEntrySchema(TODAY).safeParse({ date: TODAY, weight: "78,4", unit: "kg", ...o });
const firstMessage = (o: Record<string, string | undefined>) => {
  const r = parse(o);
  return r.success ? undefined : r.error.issues[0].message;
};

describe("weightEntrySchema", () => {
  it("accepts a minimal weighing and nulls the optional fields", () => {
    expect(parse({}).data).toEqual({
      date: TODAY,
      weightKg: 78.4,
      bodyFatPct: null,
      note: null,
      unit: "kg",
    });
  });

  it("accepts dot or comma decimals and rounds to storage precision", () => {
    expect(parse({ weight: "78.45" }).data?.weightKg).toBe(78.45);
    expect(parse({ weight: "78,456" }).data?.weightKg).toBe(78.46);
  });

  it("enforces 20 to 400 kg", () => {
    expect(parse({ weight: "19,9" }).success).toBe(false);
    expect(parse({ weight: "400,1" }).success).toBe(false);
    expect(parse({ weight: "20" }).success).toBe(true);
    expect(parse({ weight: "400" }).success).toBe(true);
    expect(firstMessage({ weight: "10" })).toBe("Poids entre 20 et 400 kg");
  });

  it("converts pounds before validating", () => {
    expect(parse({ weight: "172", unit: "lb" }).data?.weightKg).toBe(78.02);
    expect(parse({ weight: "44,1", unit: "lb" }).success).toBe(true);
    expect(firstMessage({ weight: "44", unit: "lb" })).toBe("Poids entre 44,1 et 881,8 lb");
  });

  it("rejects values that are not plain numbers", () => {
    for (const weight of ["", "abc", "1e400", "Infinity", "-80", undefined]) {
      const r = parse({ weight });
      expect(r.success).toBe(false);
      expect(r.error?.issues[0].path).toEqual(["weight"]);
    }
  });

  it("refuses future dates and dates before 1900", () => {
    expect(firstMessage({ date: "2026-10-04" })).toBe("La date ne peut pas être dans le futur");
    expect(parse({ date: "1899-12-31" }).success).toBe(false);
    expect(parse({ date: "1900-01-01" }).success).toBe(true);
    expect(parse({ date: "03/10/2026" }).success).toBe(false);
  });

  it("validates the optional body fat", () => {
    expect(parse({ bodyFat: "" }).data?.bodyFatPct).toBeNull();
    expect(parse({ bodyFat: "18,5" }).data?.bodyFatPct).toBe(18.5);
    expect(firstMessage({ bodyFat: "1.9" })).toBe("Masse grasse entre 2 et 70 %");
    expect(parse({ bodyFat: "70.1" }).success).toBe(false);
    expect(parse({ bodyFat: "beaucoup" }).success).toBe(false);
  });

  it("trims the note, empties it to null and counts characters like Postgres", () => {
    expect(parse({ note: "  sel  " }).data?.note).toBe("sel");
    expect(parse({ note: "   " }).data?.note).toBeNull();
    expect(parse({ note: "😀".repeat(140) }).success).toBe(true);
    expect(parse({ note: "😀".repeat(141) }).success).toBe(false);
    expect(firstMessage({ note: "a".repeat(141) })).toBe("140 caractères maximum");
  });
});
```

`src/features/weight/actions.test.ts` :

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@/features/profile/queries";
import type { Db } from "@/lib/db/types";
import { createTestDb, insertTestUser } from "../../../tests/helpers/db";
import { getWeightOn, insertWeights, listWeights, upsertWeight } from "./queries";

const ctx = vi.hoisted(() => ({
  db: undefined as unknown as Db,
  requireUser: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: ctx.revalidatePath }));
vi.mock("@/lib/db/client", () => ({ getDb: () => ctx.db }));
vi.mock("@/lib/session", () => ({ requireUser: ctx.requireUser }));

import { saveWeightAction } from "./actions";

const NNBSP = " ";
const form = (values: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
};
const profile = (timezone: string): Profile => ({
  userId: "alice",
  sex: "female",
  heightCm: 168,
  birthDate: "1990-04-12",
  weightUnit: "kg",
  lengthUnit: "cm",
  timezone,
  reminderWeekday: null,
  onboardingCompletedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
});
const asAlice = (timezone = "Europe/Paris") =>
  ctx.requireUser.mockResolvedValue({
    userId: "alice",
    email: "alice@example.com",
    emailVerified: true,
    profile: profile(timezone),
  });
const w = (date: string, weightKg: number) => ({ date, weightKg, bodyFatPct: null, note: null });
const ENTRY = { date: "2026-10-03", weight: "78,4", unit: "kg" };

describe("saveWeightAction", () => {
  let close: () => Promise<void>;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-03T10:00:00Z"));
    ({ db: ctx.db, close } = await createTestDb());
    await insertTestUser(ctx.db, "alice");
    await insertTestUser(ctx.db, "bob");
    asAlice();
  });
  afterEach(async () => {
    vi.useRealTimers();
    vi.clearAllMocks();
    await close();
  });

  it("saves a weighing for the current user and refreshes every screen", async () => {
    expect(await saveWeightAction(null, form({ ...ENTRY, bodyFat: "21", note: " sel " }))).toEqual({
      ok: true,
    });
    expect(ctx.requireUser).toHaveBeenCalledWith("app");
    expect(await getWeightOn(ctx.db, "alice", "2026-10-03")).toMatchObject({
      weightKg: 78.4,
      bodyFatPct: 21,
      note: "sel",
    });
    expect(ctx.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("converts pounds to kilograms", async () => {
    await saveWeightAction(null, form({ ...ENTRY, weight: "172", unit: "lb" }));
    expect((await getWeightOn(ctx.db, "alice", "2026-10-03"))?.weightKg).toBe(78.02);
  });

  it("rejects out-of-range weights and writes nothing", async () => {
    for (const weight of ["19,9", "400,1"]) {
      const r = await saveWeightAction(null, form({ ...ENTRY, weight }));
      expect(r).toMatchObject({ ok: false, fieldErrors: { weight: expect.any(Array) }, values: { weight } });
    }
    expect(await listWeights(ctx.db, "alice")).toHaveLength(0);
    expect(ctx.revalidatePath).not.toHaveBeenCalled();
  });

  it("computes 'today' in the profile timezone", async () => {
    // 02:00 UTC on 4 Oct: 19:00 on 3 Oct in Los Angeles, 04:00 on 4 Oct in Paris.
    vi.setSystemTime(new Date("2026-10-04T02:00:00Z"));
    asAlice("America/Los_Angeles");
    const future = await saveWeightAction(null, form({ ...ENTRY, date: "2026-10-04" }));
    expect(future).toMatchObject({ ok: false, fieldErrors: { date: expect.any(Array) } });
    expect(await saveWeightAction(null, form(ENTRY))).toEqual({ ok: true });

    asAlice("Europe/Paris");
    expect(await saveWeightAction(null, form({ ...ENTRY, date: "2026-10-04" }))).toEqual({ ok: true });
  });

  it("asks before replacing the weighing of that date, then replaces it", async () => {
    await upsertWeight(ctx.db, "alice", w("2026-10-03", 78.2));
    const asked = await saveWeightAction(null, form({ ...ENTRY, weight: "78,9" }));
    expect(asked).toMatchObject({
      ok: false,
      needsConfirmation: { reason: "replace", message: `Remplacer 78,2${NNBSP}kg par 78,9${NNBSP}kg ?` },
    });
    expect((await getWeightOn(ctx.db, "alice", "2026-10-03"))?.weightKg).toBe(78.2);

    const done = await saveWeightAction(null, form({ ...ENTRY, weight: "78,9", confirm: "replace" }));
    expect(done).toEqual({ ok: true });
    const rows = await listWeights(ctx.db, "alice");
    expect(rows).toHaveLength(1);
    expect(rows[0].weightKg).toBe(78.9);
  });

  it("asks before saving a value more than 5 % away from the trend", async () => {
    await insertWeights(ctx.db, "alice", [
      w("2026-09-30", 78.4),
      w("2026-10-01", 78.4),
      w("2026-10-02", 78.4),
    ]);
    const asked = await saveWeightAction(null, form({ ...ENTRY, weight: "72" }));
    expect(asked).toMatchObject({
      ok: false,
      needsConfirmation: {
        reason: "suspicious",
        message: `72,0${NNBSP}kg ? C'est −6,4${NNBSP}kg par rapport à ta tendance. Confirmer ?`,
      },
    });
    expect(await getWeightOn(ctx.db, "alice", "2026-10-03")).toBeNull();

    expect(await saveWeightAction(null, form({ ...ENTRY, weight: "72", confirm: "suspicious" }))).toEqual({
      ok: true,
    });
  });

  it("chains both confirmations, remembering the first one", async () => {
    await insertWeights(ctx.db, "alice", [
      w("2026-09-30", 78.4),
      w("2026-10-01", 78.4),
      w("2026-10-02", 78.4),
      w("2026-10-03", 78.4),
    ]);
    const first = await saveWeightAction(null, form({ ...ENTRY, weight: "72" }));
    expect(first).toMatchObject({ needsConfirmation: { reason: "replace" } });

    const second = await saveWeightAction(null, form({ ...ENTRY, weight: "72", confirm: "replace" }));
    expect(second).toMatchObject({
      needsConfirmation: { reason: "suspicious" },
      values: { confirmed: "replace" },
    });

    const third = await saveWeightAction(
      null,
      form({ ...ENTRY, weight: "72", confirmed: "replace", confirm: "suspicious" }),
    );
    expect(third).toEqual({ ok: true });
    expect((await getWeightOn(ctx.db, "alice", "2026-10-03"))?.weightKg).toBe(72);
  });

  it("ignores a forged userId field", async () => {
    await upsertWeight(ctx.db, "bob", w("2026-10-03", 95));
    expect(await saveWeightAction(null, form({ ...ENTRY, userId: "bob" }))).toEqual({ ok: true });
    expect((await getWeightOn(ctx.db, "bob", "2026-10-03"))?.weightKg).toBe(95);
    expect((await getWeightOn(ctx.db, "alice", "2026-10-03"))?.weightKg).toBe(78.4);
  });

  it("returns a generic error when the database fails, without health data in logs", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const realDb = ctx.db;
    ctx.db = {
      select: () => {
        throw new Error("boom");
      },
    } as unknown as Db;
    const r = await saveWeightAction(null, form(ENTRY));
    ctx.db = realDb;
    expect(r).toMatchObject({ ok: false, formError: "Une erreur est survenue, réessaie." });
    expect(JSON.stringify(error.mock.calls)).not.toContain("78");
    error.mockRestore();
  });
});
```

- [ ] **Étape 2 : lancer, vérifier l'échec**

Run : `pnpm test src/lib/action-result.test.ts src/features/weight`
Attendu : FAIL (modules et exports introuvables).

- [ ] **Étape 3 : implémenter**

Dans `src/lib/action-result.ts`, remplacer le type `ActionResult` et ajouter `confirmedReasons` :

```ts
/** Writes that need an explicit yes (EF-WGT-02, EF-WGT-03). */
export type ConfirmReason = "replace" | "suspicious";
const CONFIRM_REASONS: readonly ConfirmReason[] = ["replace", "suspicious"];

export type ActionResult =
  | { ok: true }
  | {
      ok: false;
      fieldErrors?: Record<string, string[]>;
      formError?: string;
      /** Submitted values to show again: React 19 resets forms after each submission. Never passwords. */
      values?: Record<string, string>;
      /** Nothing was written: the client resubmits with `confirm=<reason>`. */
      needsConfirmation?: { reason: ConfirmReason; message: string };
    };

/**
 * Reasons the user already accepted: earlier ones (hidden `confirmed` field,
 * comma-separated) plus the confirmation button just pressed (`confirm`).
 */
export function confirmedReasons(formData: FormData): Set<ConfirmReason> {
  const raw = [
    ...String(formData.get("confirmed") ?? "").split(","),
    String(formData.get("confirm") ?? ""),
  ];
  return new Set(CONFIRM_REASONS.filter((r) => raw.includes(r)));
}
```

`src/features/weight/limits.ts` :

```ts
/** specs/03 §9. No dependency: safe to import from client components. */
export const WEIGHT_MIN_KG = 20;
export const WEIGHT_MAX_KG = 400;
export const BODY_FAT_MIN_PCT = 2;
export const BODY_FAT_MAX_PCT = 70;
export const NOTE_MAX_LENGTH = 140;
export const MIN_DATE = "1900-01-01";
```

`src/features/weight/copy.ts` :

```ts
import { formatDelta, formatWeight, toDisplayWeight, type WeightUnit } from "@/lib/units";

export const WEIGHT_TIP =
  "Pèse-toi le matin, après les toilettes, avant de boire ou manger. Même balance, même endroit.";
export const NOTE_SUGGESTIONS = ["sel", "resto", "règles", "alcool", "mauvaise nuit"] as const;
export const SAVED_TOAST = "Pesée enregistrée";

/** "Remplacer 78,2 kg par 78,9 kg ?" (specs/01 §3.3) */
export const replaceMessage = (oldKg: number, newKg: number, unit: WeightUnit) =>
  `Remplacer ${formatWeight(oldKg, unit)} par ${formatWeight(newKg, unit)} ?`;

/** "72,0 kg ? C'est −6,4 kg par rapport à ta tendance. Confirmer ?" (specs/01 §3.3) */
export const suspiciousMessage = (kg: number, deltaKg: number, unit: WeightUnit) =>
  `${formatWeight(kg, unit)} ? C'est ${formatDelta(toDisplayWeight(deltaKg, unit))} ${unit} par rapport à ta tendance. Confirmer ?`;
```

`src/features/weight/schemas.ts` :

```ts
import { z } from "zod";
import type { LocalDate } from "@/lib/dates";
import {
  formatDecimal,
  parseDecimal,
  round1,
  toDisplayWeight,
  toStoredKg,
  type WeightUnit,
} from "@/lib/units";
import {
  BODY_FAT_MAX_PCT,
  BODY_FAT_MIN_PCT,
  MIN_DATE,
  NOTE_MAX_LENGTH,
  WEIGHT_MAX_KG,
  WEIGHT_MIN_KG,
} from "./limits";

function weightRangeMessage(unit: WeightUnit): string {
  if (unit === "kg") return `Poids entre ${WEIGHT_MIN_KG} et ${WEIGHT_MAX_KG} kg`;
  const [min, max] = [WEIGHT_MIN_KG, WEIGHT_MAX_KG].map((kg) =>
    formatDecimal(toDisplayWeight(kg, "lb")),
  );
  return `Poids entre ${min} et ${max} lb`;
}

/** A weighing as typed in the sheet or at onboarding (specs/03 §9). Typed pounds become kilograms. */
export function weightEntrySchema(todayDate: LocalDate) {
  return z
    .object({
      date: z.iso
        .date({ error: "Date invalide" })
        .refine((d) => d >= MIN_DATE, { error: "Date invalide" })
        .refine((d) => d <= todayDate, { error: "La date ne peut pas être dans le futur" }),
      weight: z.string().optional(),
      unit: z.enum(["kg", "lb"]),
      bodyFat: z.string().optional(),
      note: z.string().optional(),
    })
    .transform((v, ctx) => {
      let invalid = false;
      const fail = (path: string, message: string) => {
        invalid = true;
        ctx.addIssue({ code: "custom", path: [path], message });
      };

      const weightKg = toStoredKg(parseDecimal(v.weight), v.unit);
      if (!Number.isFinite(weightKg) || weightKg < WEIGHT_MIN_KG || weightKg > WEIGHT_MAX_KG) {
        fail("weight", weightRangeMessage(v.unit));
      }

      let bodyFatPct: number | null = null;
      if (v.bodyFat?.trim()) {
        bodyFatPct = round1(parseDecimal(v.bodyFat));
        if (
          !Number.isFinite(bodyFatPct) ||
          bodyFatPct < BODY_FAT_MIN_PCT ||
          bodyFatPct > BODY_FAT_MAX_PCT
        ) {
          fail("bodyFat", `Masse grasse entre ${BODY_FAT_MIN_PCT} et ${BODY_FAT_MAX_PCT} %`);
        }
      }

      const note = v.note?.trim() || null;
      // Code points, like Postgres varchar(140): an emoji counts once.
      if (note && [...note].length > NOTE_MAX_LENGTH) {
        fail("note", `${NOTE_MAX_LENGTH} caractères maximum`);
      }

      if (invalid) return z.NEVER;
      return { date: v.date, weightKg, bodyFatPct, note, unit: v.unit };
    });
}
```

`src/features/weight/actions.ts` :

```ts
"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import {
  confirmedReasons,
  fieldErrorsFrom,
  keepValues,
  type ActionResult,
  type ConfirmReason,
} from "@/lib/action-result";
import { today } from "@/lib/dates";
import { getDb } from "@/lib/db/client";
import { suspiciousDeviation } from "@/lib/metrics";
import { requireUser } from "@/lib/session";
import { replaceMessage, suspiciousMessage } from "./copy";
import { getWeightOn, listWeights, upsertWeight } from "./queries";
import { weightEntrySchema } from "./schemas";

const FIELDS = ["date", "weight", "unit", "bodyFat", "note"];

/** EF-WGT-01 to 03: saves the weighing of a date, after the needed confirmations. */
export async function saveWeightAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { userId, profile } = await requireUser("app");
  const values = keepValues(formData, ...FIELDS);
  const parsed = weightEntrySchema(today(profile?.timezone ?? "Europe/Paris")).safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error), values };

  const { unit, ...entry } = parsed.data;
  const confirmed = confirmedReasons(formData);
  const ask = (reason: ConfirmReason, message: string): ActionResult => ({
    ok: false,
    needsConfirmation: { reason, message },
    values: { ...values, confirmed: [...confirmed].join(",") },
  });

  try {
    const db = getDb();
    const existing = await getWeightOn(db, userId, entry.date);
    if (existing && !confirmed.has("replace")) {
      return ask("replace", replaceMessage(existing.weightKg, entry.weightKg, unit));
    }
    if (!confirmed.has("suspicious")) {
      const others = (await listWeights(db, userId)).filter((w) => w.date !== entry.date);
      const delta = suspiciousDeviation(others, entry.weightKg);
      if (delta !== null) return ask("suspicious", suspiciousMessage(entry.weightKg, delta, unit));
    }
    await upsertWeight(db, userId, entry);
  } catch {
    // userId and action only: never the weight (specs/07 §8).
    console.error("save_weight_failed", { userId });
    return { ok: false, formError: "Une erreur est survenue, réessaie.", values };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
```

Dans `src/lib/session.ts`, mémoïser `requireUser` pour la requête (le layout et la page l'appellent tous les deux) :

```ts
import { cache } from "react";
// …imports existants inchangés…

/** Server-side guard: the only source of userId for queries and actions. Memoized per request. */
export const requireUser = cache(async (area: Area): Promise<CurrentUser> => {
  // …corps actuel inchangé…
});
```

- [ ] **Étape 4 : lancer, vérifier le succès**

Run : `pnpm test && pnpm typecheck`
Attendu : PASS.

- [ ] **Étape 5 : commit**

```bash
pnpm format && git add src/lib/action-result.ts src/lib/action-result.test.ts src/lib/session.ts src/features/weight && git commit -m "feat(weight): validate and save weighings with replace and suspicious-value confirmations

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 5 : composants `NumberStepper`, `Sheet` et `Toast`

**Fichiers :**
- Créer : `src/components/ui/number-stepper.tsx`, `src/components/ui/number-stepper.test.tsx`, `src/components/ui/sheet.tsx`, `src/components/ui/toast.tsx`
- Modifier : `src/components/ui/ui.test.tsx`, `package.json`, `pnpm-lock.yaml`

**Interfaces :**
- Consomme : `parseDecimal`, `round1`, `formatInputDecimal` (tâche 1).
- Produit :
  - `NumberStepper(props: { label: string; name: string; value: string; onChange: (value: string) => void; unit: string; step?: number; min: number; max: number; fallback: number; error?: string })` (contrôlé)
  - `Sheet(props: { open: boolean; onOpenChange: (open: boolean) => void; title: string; children: React.ReactNode })`
  - `ToastProvider({ children })`, `useToast(): (message: string) => void`

- [ ] **Étape 1 : dépendance**

```bash
pnpm add @radix-ui/react-dialog
```

- [ ] **Étape 2 : écrire les tests qui échouent**

`src/components/ui/number-stepper.test.tsx` :

```tsx
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NumberStepper } from "./number-stepper";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function Harness({ initial, error }: { initial: string; error?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <NumberStepper
      label="Poids"
      name="weight"
      unit="kg"
      value={value}
      onChange={setValue}
      min={20}
      max={400}
      fallback={70}
      error={error}
    />
  );
}
const field = () => screen.getByLabelText("Poids") as HTMLInputElement;
const plus = () => screen.getByRole("button", { name: "Augmenter de 0,1" });
const minus = () => screen.getByRole("button", { name: "Diminuer de 0,1" });

describe("NumberStepper", () => {
  it("steps by 0.1 from a comma value with the keyboard", () => {
    render(<Harness initial="78,4" />);
    fireEvent.click(minus(), { detail: 0 });
    expect(field().value).toBe("78,3");
    fireEvent.click(plus(), { detail: 0 });
    fireEvent.click(plus(), { detail: 0 });
    expect(field().value).toBe("78,5");
  });

  it("starts from the fallback when the field is empty", () => {
    render(<Harness initial="" />);
    fireEvent.click(plus(), { detail: 0 });
    expect(field().value).toBe("70,1");
  });

  it("stays within bounds", () => {
    render(<Harness initial="400" />);
    fireEvent.click(plus(), { detail: 0 });
    expect(field().value).toBe("400,0");
  });

  it("steps once per press and repeats on a long press", () => {
    vi.useFakeTimers();
    render(<Harness initial="78,0" />);
    fireEvent.pointerDown(plus(), { button: 0 });
    fireEvent.pointerUp(plus());
    fireEvent.click(plus(), { detail: 1 }); // the click that follows a pointer press is ignored
    expect(field().value).toBe("78,1");

    fireEvent.pointerDown(plus(), { button: 0 });
    act(() => vi.advanceTimersByTime(400 + 80 * 3));
    fireEvent.pointerUp(plus());
    act(() => vi.advanceTimersByTime(1000));
    expect(field().value).toBe("78,5");
  });

  it("lets the user type, with a decimal keyboard, and announces errors", () => {
    render(<Harness initial="" error="Poids entre 20 et 400 kg" />);
    fireEvent.change(field(), { target: { value: "81,2" } });
    expect(field().value).toBe("81,2");
    expect(field().getAttribute("inputmode")).toBe("decimal");
    expect(field().getAttribute("aria-invalid")).toBe("true");
    const describedBy = field().getAttribute("aria-describedby") ?? "";
    expect(document.getElementById(describedBy)?.textContent).toBe("Poids entre 20 et 400 kg");
  });
});
```

Ajouter à `src/components/ui/ui.test.tsx` (imports : `fireEvent`, `act` depuis Testing Library ; `vi` depuis vitest ; `Sheet` ; `ToastProvider`, `useToast`) :

```tsx
describe("Sheet", () => {
  it("is a dialog named by its title that closes with Escape", () => {
    const onOpenChange = vi.fn();
    render(
      <Sheet open onOpenChange={onOpenChange} title="Nouvelle pesée">
        <p>contenu</p>
      </Sheet>,
    );
    const dialog = screen.getByRole("dialog", { name: "Nouvelle pesée" });
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.getByRole("button", { name: "Fermer" })).toBeTruthy();
  });
});

describe("Toast", () => {
  function Trigger() {
    const toast = useToast();
    return <button onClick={() => toast("Pesée enregistrée")}>go</button>;
  }

  it("announces a message, then hides it after 3 s", () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "go" }));
    expect(screen.getByRole("status").textContent).toBe("Pesée enregistrée");
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByRole("status").textContent).toBe("");
    vi.useRealTimers();
  });
});
```

- [ ] **Étape 3 : lancer, vérifier l'échec**

Run : `pnpm test src/components/ui`
Attendu : FAIL (modules introuvables).

- [ ] **Étape 4 : implémenter**

`src/components/ui/number-stepper.tsx` :

```tsx
"use client";

import { Minus, Plus } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { formatInputDecimal, parseDecimal, round1 } from "@/lib/units";

export type NumberStepperProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  unit: string;
  step?: number;
  min: number;
  max: number;
  /** Starting point for − / + when the field is empty. */
  fallback: number;
  error?: string;
};

const REPEAT_DELAY_MS = 400;
const REPEAT_EVERY_MS = 80;

/** Big centred number with − / + buttons; a long press repeats (specs/06 §3). */
export function NumberStepper({
  label,
  name,
  value,
  onChange,
  unit,
  step = 0.1,
  min,
  max,
  fallback,
  error,
}: NumberStepperProps) {
  const id = useId();
  const errorId = `${id}-error`;
  // Latest value for the repeat interval, which outlives a render.
  const valueRef = useRef(value);
  const timers = useRef<{
    delay?: ReturnType<typeof setTimeout>;
    repeat?: ReturnType<typeof setInterval>;
  }>({});

  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  useEffect(() => {
    const t = timers.current;
    return () => {
      clearTimeout(t.delay);
      clearInterval(t.repeat);
    };
  }, []);

  const bump = (direction: 1 | -1) => {
    const current = parseDecimal(valueRef.current);
    const base = Number.isNaN(current) ? fallback : current;
    const next = Math.min(max, Math.max(min, round1(base + direction * step)));
    valueRef.current = formatInputDecimal(next);
    onChange(valueRef.current);
  };
  const stop = () => {
    clearTimeout(timers.current.delay);
    clearInterval(timers.current.repeat);
  };
  const start = (direction: 1 | -1) => {
    stop();
    bump(direction);
    timers.current.delay = setTimeout(() => {
      timers.current.repeat = setInterval(() => bump(direction), REPEAT_EVERY_MS);
    }, REPEAT_DELAY_MS);
  };

  const stepButton = (direction: 1 | -1) => (
    <button
      type="button"
      aria-label={`${direction > 0 ? "Augmenter" : "Diminuer"} de ${formatInputDecimal(step)}`}
      onPointerDown={(e) => {
        if (e.button === 0) start(direction);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      // Enter / Space fire a click with detail 0; pointer presses are handled above.
      onClick={(e) => {
        if (e.detail === 0) bump(direction);
      }}
      className="flex size-11 shrink-0 items-center justify-center rounded-full border border-line text-fg"
    >
      {direction > 0 ? (
        <Plus size={18} strokeWidth={1.7} aria-hidden />
      ) : (
        <Minus size={18} strokeWidth={1.7} aria-hidden />
      )}
    </button>
  );

  return (
    <div className="flex flex-col items-center gap-2">
      <label htmlFor={id} className="text-xs font-medium text-fg-2">
        {label}
      </label>
      <div className="flex items-center gap-4">
        {stepButton(-1)}
        <div className="flex items-baseline gap-1">
          <input
            id={id}
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            inputMode="decimal"
            autoComplete="off"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="w-[5ch] bg-transparent text-center text-[44px] font-semibold tracking-[-0.05em] tabular-nums"
          />
          <span className="text-lg text-muted">{unit}</span>
        </div>
        {stepButton(1)}
      </div>
      {error && (
        <p id={errorId} className="text-xs font-medium text-fg">
          {error}
        </p>
      )}
    </div>
  );
}
```

`src/components/ui/sheet.tsx` :

```tsx
"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

/** Bottom sheet on mobile, centred 440 px modal on desktop (specs/06 §3). Radix traps and restores focus. */
export function Sheet({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgba(10,10,10,.35)]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-[22px] bg-bg px-[22px] pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,.12)] lg:inset-x-auto lg:top-1/2 lg:bottom-auto lg:left-1/2 lg:w-[440px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl lg:p-6"
        >
          <div aria-hidden className="mx-auto mb-4 h-[5px] w-10 rounded-full bg-line lg:hidden" />
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-[15px] font-semibold tracking-tight">{title}</Dialog.Title>
            <Dialog.Close
              aria-label="Fermer"
              className="-mr-2 flex size-11 items-center justify-center rounded-full text-fg-2"
            >
              <X size={20} strokeWidth={1.7} aria-hidden />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

`src/components/ui/toast.tsx` :

```tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const TOAST_MS = 3000;
const ToastContext = createContext<(message: string) => void>(() => {});

export const useToast = () => useContext(ToastContext);

/** Discreet pill at the bottom (mobile) or top right (desktop). The live region stays mounted. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const show = useCallback((next: string) => {
    setMessage(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), TOAST_MS);
  }, []);

  return (
    <ToastContext value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center lg:inset-x-auto lg:top-6 lg:right-6 lg:bottom-auto"
      >
        {message && (
          <p className="rounded-full bg-fg px-4 py-2.5 text-[13px] font-medium text-white">
            {message}
          </p>
        )}
      </div>
    </ToastContext>
  );
}
```

- [ ] **Étape 5 : lancer, vérifier le succès**

Run : `pnpm test src/components && pnpm lint`
Attendu : PASS, aucune erreur ESLint (en particulier `react-hooks`).

- [ ] **Étape 6 : commit**

```bash
pnpm format && git add package.json pnpm-lock.yaml src/components/ui && git commit -m "feat(ui): add number stepper, sheet and toast components

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 6 : panneau « Nouvelle pesée » et bouton `+` (BODY-23, BODY-24, BODY-25 : UI)

**Fichiers :**
- Créer : `src/features/weight/components/weight-form.tsx`, `weight-form.test.tsx`, `weight-sheet-provider.tsx`, `new-weight-button.tsx`
- Modifier : `src/components/app-shell/app-shell.tsx`, `src/components/app-shell/nav-links.tsx`, `src/components/app-shell/app-shell.test.tsx`, `src/app/(app)/layout.tsx`

**Interfaces :**
- Consomme : `saveWeightAction`, `NOTE_SUGGESTIONS`, `SAVED_TOAST`, `WEIGHT_TIP`, limites (tâche 4) ; `NumberStepper`, `Sheet`, `ToastProvider`, `useToast` (tâche 5) ; `getLatestWeight` (tâche 3) ; `toDisplayWeight`, `formatInputDecimal`, `WeightUnit` (tâche 1) ; `fieldError`, `fieldValue`.
- Produit :
  - `type WeightSheetDefaults = { today: LocalDate; lastWeightKg: number | null; unit: WeightUnit }`
  - `WeightSheetProvider({ defaults, children })`, `useOpenWeightSheet(): () => void`
  - `NewWeightButton({ className?, label? })` (libellé par défaut « + Nouvelle pesée »)
  - `WeightForm({ defaults, onSaved })`
  - `AppShell({ emailVerified, weightSheet, children })`

- [ ] **Étape 1 : écrire les tests qui échouent**

`src/features/weight/components/weight-form.test.tsx` :

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast";

const saveWeightAction = vi.hoisted(() => vi.fn());
vi.mock("../actions", () => ({ saveWeightAction }));

import { WeightForm } from "./weight-form";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const DEFAULTS = { today: "2026-10-03", lastWeightKg: 78.4, unit: "kg" as const };
const renderForm = (defaults = DEFAULTS, onSaved = vi.fn()) => {
  render(
    <ToastProvider>
      <WeightForm defaults={defaults} onSaved={onSaved} />
    </ToastProvider>,
  );
  return onSaved;
};

describe("WeightForm", () => {
  it("pre-fills today and the last weighing in the display unit", () => {
    renderForm({ ...DEFAULTS, unit: "lb" });
    expect(screen.getByLabelText("Poids")).toHaveProperty("value", "172,8");
    expect(screen.getByLabelText("Date")).toHaveProperty("value", "2026-10-03");
    expect(screen.getByLabelText("Date").getAttribute("max")).toBe("2026-10-03");
  });

  it("starts empty for an account without any weighing", () => {
    renderForm({ ...DEFAULTS, lastWeightKg: null });
    expect(screen.getByLabelText("Poids")).toHaveProperty("value", "");
  });

  it("asks for confirmation, resubmits with it, then closes with a toast", async () => {
    saveWeightAction
      .mockResolvedValueOnce({
        ok: false,
        needsConfirmation: { reason: "replace", message: "Remplacer 78,2 kg par 78,4 kg ?" },
        values: { date: "2026-10-03", weight: "78,4", unit: "kg", bodyFat: "", note: "", confirmed: "" },
      })
      .mockResolvedValueOnce({ ok: true });
    const onSaved = renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(await screen.findByText("Remplacer 78,2 kg par 78,4 kg ?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const second = saveWeightAction.mock.calls[1][1] as FormData;
    expect(second.get("confirm")).toBe("replace");
    expect(second.get("weight")).toBe("78,4");
    expect(second.get("unit")).toBe("kg");
    expect(screen.getByRole("status").textContent).toBe("Pesée enregistrée");
  });

  it("shows field errors returned by the server", async () => {
    saveWeightAction.mockResolvedValueOnce({
      ok: false,
      fieldErrors: { weight: ["Poids entre 20 et 400 kg"] },
      values: { date: "2026-10-03", weight: "10", unit: "kg", bodyFat: "", note: "" },
    });
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(await screen.findByText("Poids entre 20 et 400 kg")).toBeTruthy();
  });

  it("appends note suggestions", () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "sel" }));
    fireEvent.click(screen.getByRole("button", { name: "resto" }));
    expect(screen.getByLabelText("Note (optionnel)")).toHaveProperty("value", "sel, resto");
  });
});
```

Dans `src/components/app-shell/app-shell.test.tsx`, ajouter (en gardant les tests existants) :

```tsx
import { fireEvent } from "@testing-library/react";
import { AppShell } from "./app-shell";

vi.mock("next/navigation", () => ({ usePathname: () => "/accueil" }));
vi.mock("@/features/weight/actions", () => ({ saveWeightAction: vi.fn() }));

describe("AppShell", () => {
  it("opens the weighing sheet from the + tab", () => {
    render(
      <AppShell emailVerified weightSheet={{ today: "2026-10-03", lastWeightKg: 78.4, unit: "kg" }}>
        <p>page</p>
      </AppShell>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Nouvelle pesée" }));
    expect(screen.getByRole("dialog", { name: "Nouvelle pesée" })).toBeTruthy();
  });
});
```

- [ ] **Étape 2 : lancer, vérifier l'échec**

Run : `pnpm test src/features/weight/components src/components/app-shell`
Attendu : FAIL.

- [ ] **Étape 3 : implémenter le formulaire et le contexte**

`src/features/weight/components/weight-form.tsx` :

```tsx
"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberStepper } from "@/components/ui/number-stepper";
import { useToast } from "@/components/ui/toast";
import { fieldError, fieldValue, type ActionResult } from "@/lib/action-result";
import { formatInputDecimal, toDisplayWeight } from "@/lib/units";
import { saveWeightAction } from "../actions";
import { NOTE_SUGGESTIONS, SAVED_TOAST, WEIGHT_TIP } from "../copy";
import { NOTE_MAX_LENGTH, WEIGHT_MAX_KG, WEIGHT_MIN_KG } from "../limits";
import type { WeightSheetDefaults } from "./weight-sheet-provider";

const FALLBACK_KG = 70;

export function WeightForm({
  defaults,
  onSaved,
}: {
  defaults: WeightSheetDefaults;
  onSaved: () => void;
}) {
  const toast = useToast();
  const { unit } = defaults;
  const [state, action, pending] = useActionState(
    async (prev: ActionResult | null, formData: FormData) => {
      const result = await saveWeightAction(prev, formData);
      if (result.ok) {
        toast(SAVED_TOAST);
        onSaved();
      }
      return result;
    },
    null,
  );
  const [weight, setWeight] = useState(() =>
    defaults.lastWeightKg === null
      ? ""
      : formatInputDecimal(toDisplayWeight(defaults.lastWeightKg, unit)),
  );
  const [note, setNote] = useState("");
  const confirmation = state && !state.ok ? state.needsConfirmation : undefined;
  const addSuggestion = (s: string) =>
    setNote((n) => (n.trim() ? `${n.trim()}, ${s}` : s).slice(0, NOTE_MAX_LENGTH));

  return (
    <form action={action} className="mt-4 flex flex-col gap-5">
      <input type="hidden" name="unit" value={unit} />
      <input type="hidden" name="confirmed" value={fieldValue(state, "confirmed") ?? ""} />
      <Input
        label="Date"
        name="date"
        type="date"
        max={defaults.today}
        defaultValue={fieldValue(state, "date") ?? defaults.today}
        error={fieldError(state, "date")}
      />
      <NumberStepper
        label="Poids"
        name="weight"
        unit={unit}
        value={weight}
        onChange={setWeight}
        min={toDisplayWeight(WEIGHT_MIN_KG, unit)}
        max={toDisplayWeight(WEIGHT_MAX_KG, unit)}
        fallback={toDisplayWeight(FALLBACK_KG, unit)}
        error={fieldError(state, "weight")}
      />
      <Input
        label="% masse grasse (optionnel)"
        name="bodyFat"
        inputMode="decimal"
        defaultValue={fieldValue(state, "bodyFat") ?? ""}
        error={fieldError(state, "bodyFat")}
      />
      <div className="flex flex-col gap-2">
        <Input
          label="Note (optionnel)"
          name="note"
          maxLength={NOTE_MAX_LENGTH}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          error={fieldError(state, "note")}
        />
        <div className="flex flex-wrap gap-2">
          {NOTE_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addSuggestion(s)}
              className="min-h-11 rounded-full border border-line px-3 text-xs text-fg-2"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <p className="rounded-xl bg-surface p-3 text-xs text-fg-2">
        <span className="font-semibold text-fg">Conseil · </span>
        {WEIGHT_TIP}
      </p>
      {confirmation ? (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-fg p-3">
          <p className="text-sm font-medium">{confirmation.message}</p>
          <Button type="submit" name="confirm" value={confirmation.reason} loading={pending}>
            Confirmer
          </Button>
        </div>
      ) : (
        <Button type="submit" loading={pending}>
          Enregistrer
        </Button>
      )}
      {state && !state.ok && state.formError && (
        <p role="alert" className="text-xs font-medium text-fg">
          {state.formError}
        </p>
      )}
    </form>
  );
}
```

`src/features/weight/components/weight-sheet-provider.tsx` :

```tsx
"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import type { LocalDate } from "@/lib/dates";
import type { WeightUnit } from "@/lib/units";
import { WeightForm } from "./weight-form";

export type WeightSheetDefaults = { today: LocalDate; lastWeightKg: number | null; unit: WeightUnit };

const OpenContext = createContext<() => void>(() => {});

export const useOpenWeightSheet = () => useContext(OpenContext);

/** Owns the "Nouvelle pesée" sheet; any descendant can open it. The form remounts on each opening. */
export function WeightSheetProvider({
  defaults,
  children,
}: {
  defaults: WeightSheetDefaults;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const openSheet = useCallback(() => setOpen(true), []);
  return (
    <OpenContext value={openSheet}>
      {children}
      <Sheet open={open} onOpenChange={setOpen} title="Nouvelle pesée">
        <WeightForm defaults={defaults} onSaved={() => setOpen(false)} />
      </Sheet>
    </OpenContext>
  );
}
```

`src/features/weight/components/new-weight-button.tsx` :

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { useOpenWeightSheet } from "./weight-sheet-provider";

export function NewWeightButton({
  className = "",
  label = "+ Nouvelle pesée",
}: {
  className?: string;
  label?: string;
}) {
  const open = useOpenWeightSheet();
  return (
    <Button type="button" onClick={open} className={className}>
      {label}
    </Button>
  );
}
```

- [ ] **Étape 4 : brancher le shell, la barre d'onglets et le layout**

`src/components/app-shell/app-shell.tsx` : envelopper le contenu existant.

```tsx
import { ToastProvider } from "@/components/ui/toast";
import {
  WeightSheetProvider,
  type WeightSheetDefaults,
} from "@/features/weight/components/weight-sheet-provider";
import { EmailBanner } from "./email-banner";
import { BottomNav, SideNav } from "./nav-links";

export function AppShell({
  emailVerified,
  weightSheet,
  children,
}: {
  emailVerified: boolean;
  weightSheet: WeightSheetDefaults;
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <WeightSheetProvider defaults={weightSheet}>
        {/* …le <div className="flex min-h-dvh"> actuel, inchangé… */}
      </WeightSheetProvider>
    </ToastProvider>
  );
}
```

`src/components/app-shell/nav-links.tsx` : dans `BottomNav`, insérer le bouton central entre « Progrès » et « Corps » (ordre de la spec 01 §2 : Accueil · Progrès · [+] · Corps · Objectif).

```tsx
import { ChartLine, House, PersonStanding, Plus, Settings, Target } from "lucide-react";
import { useOpenWeightSheet } from "@/features/weight/components/weight-sheet-provider";
// …

export function BottomNav() {
  const pathname = usePathname();
  const openWeightSheet = useOpenWeightSheet();
  const link = ({ href, label, Icon }: (typeof items)[number]) => {
    const active = isActive(pathname, href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-11 min-w-11 flex-col items-center gap-1 text-[10px] ${active ? "text-fg" : "text-subtle"}`}
      >
        <Icon size={22} strokeWidth={1.7} aria-hidden />
        {label}
      </Link>
    );
  };
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 flex items-center justify-around border-t border-line bg-bg px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      {items.slice(0, 2).map(link)}
      <button
        type="button"
        aria-label="Nouvelle pesée"
        onClick={openWeightSheet}
        className="flex size-11 items-center justify-center rounded-full bg-fg text-white"
      >
        <Plus size={22} strokeWidth={1.5} aria-hidden />
      </button>
      {items.slice(2).map(link)}
    </nav>
  );
}
```

`src/app/(app)/layout.tsx` :

```tsx
import { AppShell } from "@/components/app-shell/app-shell";
import { getLatestWeight } from "@/features/weight/queries";
import { today } from "@/lib/dates";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("app");
  const latest = await getLatestWeight(getDb(), user.userId);
  return (
    <AppShell
      emailVerified={user.emailVerified}
      weightSheet={{
        today: today(user.profile?.timezone ?? "Europe/Paris"),
        // EF-WGT-01 CA3: pre-filled with the last weighing (the onboarding one at first).
        lastWeightKg: latest?.weightKg ?? null,
        unit: user.profile?.weightUnit ?? "kg",
      }}
    >
      {children}
    </AppShell>
  );
}
```

- [ ] **Étape 5 : lancer, vérifier le succès**

Run : `pnpm test && pnpm lint && pnpm typecheck`
Attendu : PASS.

- [ ] **Étape 6 : vérification visuelle**

Run : `pnpm dev`, se connecter avec un compte onboardé et ouvrir le panneau via `+` en 390 px (le bouton desktop « + Nouvelle pesée » arrive à la tâche 8) : vérifier le panneau bas, la poignée, le fond assombri, le focus piégé, la fermeture par Échap et le toast après enregistrement. En 1440 px, ouvrir le panneau depuis la console n'est pas nécessaire : la modale est vérifiée à la tâche 8.

- [ ] **Étape 7 : commit**

```bash
pnpm format && git add src/features/weight/components src/components/app-shell "src/app/(app)/layout.tsx" && git commit -m "feat(weight): add the new-weighing sheet and the + tab

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 7 : onboarding étape 3 « Poids actuel » (BODY-26)

**Fichiers :**
- Modifier : `src/features/profile/onboarding.ts`, `onboarding.test.ts`, `queries.ts`, `schemas.ts`, `schemas.test.ts`, `actions.ts`, `actions.test.ts`, `src/app/onboarding/page.tsx`, `tests/e2e/auth-onboarding.spec.ts`, `tests/integration/profile-consent.test.ts`
- Créer : `src/features/profile/components/weight-step.tsx`

**Interfaces :**
- Consomme : `weightEntrySchema` (tâche 4), `upsertWeight`, `hasWeight`, `getLatestWeight` (tâche 3), `NumberStepper` (tâche 5), `WEIGHT_TIP`, limites (tâche 4), `parseDecimal`, `toStoredKg`, `toDisplayWeight`, `formatInputDecimal`, `formatLongDate` (tâche 1).
- Produit :
  - `ONBOARDING_STEPS = ["sex", "body", "weight"] as const`
  - `nextOnboardingStep(progress: { profile: Profile | null; hasWeight: boolean }): OnboardingStep | null` (**signature modifiée**)
  - `saveWeightUnit(db, userId, weightUnit: "kg" | "lb"): Promise<void>`
  - `saveFirstWeightAction(prev, formData): Promise<ActionResult>` ; champs lus : `weight`, `unit`
  - `WeightStep({ today, defaultUnit, defaultKg })`

- [ ] **Étape 1 : écrire les tests qui échouent**

`src/features/profile/onboarding.test.ts` : remplacer le bloc `describe` par :

```ts
describe("nextOnboardingStep", () => {
  const done = profile({ heightCm: 170, birthDate: "1990-01-01" });

  it("starts with the silhouette when there is no profile", () => {
    expect(nextOnboardingStep({ profile: null, hasWeight: false })).toBe("sex");
  });

  it("asks for height and birth date next", () => {
    expect(nextOnboardingStep({ profile: profile({}), hasWeight: false })).toBe("body");
    expect(nextOnboardingStep({ profile: profile({ heightCm: 170 }), hasWeight: true })).toBe("body");
  });

  it("asks for the current weight once the body step is filled", () => {
    expect(nextOnboardingStep({ profile: done, hasWeight: false })).toBe("weight");
  });

  it("is done once every implemented step is filled", () => {
    expect(nextOnboardingStep({ profile: done, hasWeight: true })).toBeNull();
  });
});
```

`src/features/profile/schemas.test.ts` : ajouter dans `describe("bodyStepSchema")` :

```ts
  it("accepts a comma decimal height", () => {
    expect(body({ height: "168,5" }).data?.heightCm).toBe(168.5);
  });
```

`src/features/profile/actions.test.ts` :
1. Ajouter les imports `import { weightEntry } from "@/lib/db/schema";` et `import { upsertWeight } from "@/features/weight/queries";`, et `saveFirstWeightAction` dans l'import des actions.
2. Remplacer le test « saves the body info, completes onboarding and opens the app » par :

```ts
    it("saves the body info and moves on to the weight step", async () => {
      await expect(saveBodyAction(null, form(BODY))).rejects.toThrow("REDIRECT /onboarding");
      expect(await row("alice")).toMatchObject({
        heightCm: 170,
        birthDate: "1990-04-12",
        lengthUnit: "cm",
        onboardingCompletedAt: null,
      });
    });

    it("completes onboarding when the weight already exists (user went back)", async () => {
      await upsertWeight(ctx.db, "alice", { date: "2026-10-01", weightKg: 70, bodyFatPct: null, note: null });
      await expect(saveBodyAction(null, form(BODY))).rejects.toThrow("REDIRECT /accueil");
      expect((await row("alice"))?.onboardingCompletedAt).toBeInstanceOf(Date);
    });
```

3. Dans le test « ignores a forged userId field » de `saveBodyAction`, remplacer `"REDIRECT /accueil"` par `"REDIRECT /onboarding"`.
4. Ajouter à la fin du `describe("profile server actions")` :

```ts
  describe("saveFirstWeightAction", () => {
    const weights = () => ctx.db.select().from(weightEntry);

    beforeEach(async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-10-03T10:00:00Z"));
      await ctx.db.insert(profile).values({
        userId: "alice",
        sex: "female",
        timezone: "Europe/Paris",
        heightCm: 168,
        birthDate: "1990-04-12",
      });
      await asAlice(true);
    });
    afterEach(() => vi.useRealTimers());

    it("creates today's weighing, saves the unit, completes onboarding and opens the app", async () => {
      await expect(
        saveFirstWeightAction(null, form({ weight: "172", unit: "lb", date: "2020-01-01" })),
      ).rejects.toThrow("REDIRECT /accueil");
      expect(await weights()).toMatchObject([{ userId: "alice", date: "2026-10-03", weightKg: 78.02 }]);
      expect(await row("alice")).toMatchObject({
        weightUnit: "lb",
        onboardingCompletedAt: expect.any(Date),
      });
    });

    it("refuses an invalid weight and writes nothing", async () => {
      const r = await saveFirstWeightAction(null, form({ weight: "19,9", unit: "kg" }));
      expect(r).toMatchObject({
        ok: false,
        fieldErrors: { weight: expect.any(Array) },
        values: { weight: "19,9", unit: "kg" },
      });
      expect(await weights()).toHaveLength(0);
      expect((await row("alice"))?.weightUnit).toBe("kg");
    });

    it("replaces the weighing when the step is saved again the same day", async () => {
      await expect(saveFirstWeightAction(null, form({ weight: "70", unit: "kg" }))).rejects.toThrow();
      await expect(saveFirstWeightAction(null, form({ weight: "71", unit: "kg" }))).rejects.toThrow();
      expect(await weights()).toMatchObject([{ weightKg: 71 }]);
    });

    it("ignores a forged userId field", async () => {
      await expect(
        saveFirstWeightAction(null, form({ weight: "70", unit: "kg", userId: "bob" })),
      ).rejects.toThrow("REDIRECT /accueil");
      expect(await weights()).toMatchObject([{ userId: "alice" }]);
    });

    it("sends users without a profile row back to step 1 and writes nothing", async () => {
      await asAlice(false);
      await expect(saveFirstWeightAction(null, form({ weight: "70", unit: "kg" }))).rejects.toThrow(
        "REDIRECT /onboarding",
      );
      expect(await weights()).toHaveLength(0);
    });
  });
```

`tests/integration/profile-consent.test.ts` : ajouter `saveWeightUnit` à l'import et le test :

```ts
  it("saves the weight unit chosen at onboarding, for the caller only", async () => {
    await saveSex(db, "alice", "female", "Europe/Paris");
    await saveSex(db, "bob", "male", "Europe/Paris");
    await saveWeightUnit(db, "alice", "lb");
    expect((await getProfile(db, "alice"))?.weightUnit).toBe("lb");
    expect((await getProfile(db, "bob"))?.weightUnit).toBe("kg");
  });
```

- [ ] **Étape 2 : lancer, vérifier l'échec**

Run : `pnpm test src/features/profile tests/integration/profile-consent.test.ts`
Attendu : FAIL.

- [ ] **Étape 3 : implémenter la logique**

`src/features/profile/onboarding.ts` :

```ts
import type { Profile } from "./queries";

/**
 * Steps implemented so far. L3 appends "goal";
 * onboarding is complete when nextOnboardingStep returns null.
 */
export const ONBOARDING_STEPS = ["sex", "body", "weight"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export type OnboardingProgress = { profile: Profile | null; hasWeight: boolean };

export function nextOnboardingStep({ profile, hasWeight }: OnboardingProgress): OnboardingStep | null {
  if (!profile) return "sex";
  if (profile.heightCm === null || profile.birthDate === null) return "body";
  if (!hasWeight) return "weight";
  return null;
}
```

`src/features/profile/queries.ts` : ajouter

```ts
export type WeightUnit = Profile["weightUnit"];

export async function saveWeightUnit(db: Db, userId: string, weightUnit: WeightUnit) {
  await db.update(profile).set({ weightUnit }).where(eq(profile.userId, userId));
}
```

`src/features/profile/schemas.ts` : dans `bodyStepSchema`, remplacer le champ `height` par (et importer `parseDecimal`) :

```ts
      // "168,5" or "168.5"; parseDecimal also keeps round1 away from exponent notation.
      height: z
        .string({ error: "Taille invalide" })
        .transform(parseDecimal)
        .refine((h) => Number.isFinite(h), { error: "Taille entre 100 et 250 cm" }),
```

`src/features/profile/actions.ts` : remplacer la fin de `saveBodyAction` et ajouter l'étape 3.

```ts
import { hasWeight, upsertWeight } from "@/features/weight/queries";
import { weightEntrySchema } from "@/features/weight/schemas";
import type { Db } from "@/lib/db/types";
import { getProfile, markOnboardingCompleted, saveBodyInfo, saveSex, saveWeightUnit } from "./queries";
// …

/** Completes onboarding when every step is filled, else shows the next step. */
async function continueOnboarding(db: Db, userId: string): Promise<never> {
  const [profile, weighed] = await Promise.all([getProfile(db, userId), hasWeight(db, userId)]);
  if (nextOnboardingStep({ profile, hasWeight: weighed }) === null) {
    await markOnboardingCompleted(db, userId);
    redirect("/accueil");
  }
  redirect("/onboarding");
}

export async function saveBodyAction(/* … */) {
  // …validation inchangée…
  const db = getDb();
  await saveBodyInfo(db, user.userId, parsed.data);
  return continueOnboarding(db, user.userId);
}

/** Step 3: first weighing, dated today whatever the client sends (EF-ONB-01 CA2). */
export async function saveFirstWeightAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser("onboarding");
  if (!user.profile) redirect("/onboarding");

  const todayDate = today(user.profile.timezone);
  const parsed = weightEntrySchema(todayDate).safeParse({
    ...Object.fromEntries(formData),
    date: todayDate,
  });
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: fieldErrorsFrom(parsed.error),
      values: keepValues(formData, "weight", "unit"),
    };
  }

  const { unit, ...entry } = parsed.data;
  const db = getDb();
  await db.transaction(async (tx) => {
    await upsertWeight(tx, user.userId, entry);
    // The kg/lb toggle sets the profile's display unit (specs/01 §3.1).
    await saveWeightUnit(tx, user.userId, unit);
  });
  return continueOnboarding(db, user.userId);
}
```

Si `tsc` refuse `tx` comme `Db`, typer explicitement : `await db.transaction(async (tx) => { const t = tx as unknown as Db; … })` avec un commentaire « PgTransaction est un PgDatabase ; le cast évite de propager le HKT du driver ».

- [ ] **Étape 4 : l'écran**

`src/features/profile/components/weight-step.tsx` :

```tsx
"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { NumberStepper } from "@/components/ui/number-stepper";
import { WEIGHT_TIP } from "@/features/weight/copy";
import { WEIGHT_MAX_KG, WEIGHT_MIN_KG } from "@/features/weight/limits";
import { fieldError } from "@/lib/action-result";
import { formatLongDate, type LocalDate } from "@/lib/dates";
import {
  formatInputDecimal,
  parseDecimal,
  toDisplayWeight,
  toStoredKg,
  type WeightUnit,
} from "@/lib/units";
import { saveFirstWeightAction } from "../actions";

export function WeightStep({
  today,
  defaultUnit,
  defaultKg,
}: {
  today: LocalDate;
  defaultUnit: WeightUnit;
  defaultKg: number | null;
}) {
  const [state, action, pending] = useActionState(saveFirstWeightAction, null);
  const [unit, setUnit] = useState<WeightUnit>(defaultUnit);
  const [weight, setWeight] = useState(
    defaultKg === null ? "" : formatInputDecimal(toDisplayWeight(defaultKg, defaultUnit)),
  );

  // Converts the typed value so switching units never changes the weight.
  const switchUnit = (next: WeightUnit) => {
    if (next === unit) return;
    const typed = parseDecimal(weight);
    if (!Number.isNaN(typed)) {
      setWeight(formatInputDecimal(toDisplayWeight(toStoredKg(typed, unit), next)));
    }
    setUnit(next);
  };

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="unit" value={unit} />
      <p className="text-sm text-fg-2">Pesée du {formatLongDate(today)}</p>
      <NumberStepper
        label="Poids"
        name="weight"
        unit={unit}
        value={weight}
        onChange={setWeight}
        min={toDisplayWeight(WEIGHT_MIN_KG, unit)}
        max={toDisplayWeight(WEIGHT_MAX_KG, unit)}
        fallback={toDisplayWeight(70, unit)}
        error={fieldError(state, "weight")}
      />
      <div
        role="group"
        aria-label="Unité de poids"
        className="flex h-11 self-center rounded-xl bg-surface p-1 text-xs"
      >
        {(["kg", "lb"] as const).map((u) => (
          <button
            key={u}
            type="button"
            aria-pressed={unit === u}
            onClick={() => switchUnit(u)}
            className={`min-w-11 rounded-lg px-3 ${unit === u ? "bg-bg font-semibold text-fg" : "text-subtle"}`}
          >
            {u}
          </button>
        ))}
      </div>
      <p className="rounded-xl bg-surface p-3 text-xs text-fg-2">{WEIGHT_TIP}</p>
      <div className="flex gap-3">
        <Link
          href="/onboarding?etape=body"
          className="flex h-11 flex-1 items-center justify-center rounded-full border border-fg text-[13px] font-semibold"
        >
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

`src/app/onboarding/page.tsx` : version complète.

```tsx
import { BodyStep } from "@/features/profile/components/body-step";
import { OnboardingProgress } from "@/features/profile/components/onboarding-progress";
import { SexStep } from "@/features/profile/components/sex-step";
import { WeightStep } from "@/features/profile/components/weight-step";
import {
  ONBOARDING_STEPS,
  nextOnboardingStep,
  type OnboardingStep,
} from "@/features/profile/onboarding";
import { getLatestWeight } from "@/features/weight/queries";
import { today } from "@/lib/dates";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/session";

const titles: Record<OnboardingStep, string> = {
  sex: "Quelle silhouette afficher ?",
  body: "Parle-nous un peu de toi",
  weight: "Quel est ton poids actuel ?",
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ etape?: string }>;
}) {
  const { userId, profile } = await requireUser("onboarding");
  const { etape } = await searchParams;
  const latest = profile ? await getLatestWeight(getDb(), userId) : null;
  const next = nextOnboardingStep({ profile, hasWeight: latest !== null }) ?? "weight";
  // Going back is allowed, skipping ahead is not.
  const requested = ONBOARDING_STEPS.find((s) => s === etape);
  const step =
    requested && ONBOARDING_STEPS.indexOf(requested) <= ONBOARDING_STEPS.indexOf(next)
      ? requested
      : next;
  const index = ONBOARDING_STEPS.indexOf(step) + 1;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col gap-8 px-6 py-10">
      <OnboardingProgress step={index} total={ONBOARDING_STEPS.length} />
      <h1 className="text-2xl font-semibold tracking-tight">{titles[step]}</h1>
      {step === "sex" && <SexStep current={profile?.sex ?? null} />}
      {step === "body" && (
        <BodyStep
          defaults={{ heightCm: profile?.heightCm ?? null, birthDate: profile?.birthDate ?? null }}
        />
      )}
      {step === "weight" && (
        <WeightStep
          today={today(profile?.timezone ?? "Europe/Paris")}
          defaultUnit={profile?.weightUnit ?? "kg"}
          defaultKg={latest?.weightKg ?? null}
        />
      )}
    </main>
  );
}
```

- [ ] **Étape 5 : E2E**

Dans `tests/e2e/auth-onboarding.spec.ts`, test « sign up, consent, onboarding… », remplacer les lignes entre le `Continuer` de l'étape 2 et `await expect(page).toHaveURL(/\/accueil$/);` par :

```ts
  await page.getByRole("button", { name: "Continuer" }).click();

  await expect(page.getByRole("heading", { name: "Quel est ton poids actuel ?" })).toBeVisible();
  await page.getByLabel("Poids", { exact: true }).fill("70,4");
  await page.getByRole("button", { name: "Continuer" }).click();

  await expect(page).toHaveURL(/\/accueil$/);
```

Le bloc Poids de l'Accueil (« Tendance en calibrage · encore 6 pesées ») est vérifié par E2E-2 et par ce test une fois la tâche 8 faite : ajouter alors, après la vérification du titre « Bonjour », `await expect(page.getByText("Tendance en calibrage · encore 6 pesées")).toBeVisible();`.

- [ ] **Étape 6 : lancer, vérifier le succès**

Run : `pnpm test && pnpm lint && pnpm typecheck`
Attendu : PASS. Puis, base locale migrée (`pnpm db:migrate`) : `pnpm test:e2e tests/e2e/auth-onboarding.spec.ts` → PASS.

- [ ] **Étape 7 : commit**

```bash
pnpm format && git add src/features/profile src/app/onboarding tests && git commit -m "feat(onboarding): add step 3, current weight with kg/lb toggle

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 8 : Accueil, bloc Poids et états de calibrage (BODY-27)

**Fichiers :**
- Créer : `src/features/dashboard/weight-summary.ts`, `weight-summary.test.ts`, `sparkline.ts`, `sparkline.test.ts`, `queries.ts`, `components/home-header.tsx`, `components/weight-block.tsx`, `components/sparkline.tsx`, `components/dashboard.test.tsx`, `tests/integration/dashboard.test.ts`
- Modifier : `src/app/(app)/accueil/page.tsx`, `src/components/app-shell/app-shell.test.tsx`, `tests/e2e/auth-onboarding.spec.ts`

**Interfaces :**
- Consomme : `computeTrend`, `calibration`, `weeklyRate`, `dailyTrendSeries`, `WeightPoint`, `WeeklyRate` (tâche 2) ; `listWeights` (tâche 3) ; `NewWeightButton` (tâche 6) ; `addDays`, `daysBetween`, `formatLongDate`, formatage d'unités (tâche 1).
- Produit :
  - `SPARKLINE_DAYS = 90`
  - `type Sparkline = { from: LocalDate; to: LocalDate; dots: WeightPoint[]; trend: { date: LocalDate; trendKg: number }[] }`
  - `type WeightSummary = { state: "empty" } | { state: "calibrating"; latest: WeightPoint; todayKg: number | null; missingEntries: number; sparkline: Sparkline } | { state: "ready"; trendKg: number; todayKg: number | null; rate: WeeklyRate | null; sparkline: Sparkline }`
  - `buildWeightSummary(entries: readonly WeightPoint[], todayDate: LocalDate): WeightSummary`
  - `sparklineGeometry(s: Sparkline, width: number, height: number, pad?: number): { dots: { cx: number; cy: number }[]; trendPath: string }`
  - `type Dashboard = { weight: WeightSummary }`, `getDashboard(db, userId, todayDate): Promise<Dashboard>` (L3 et L4 y ajouteront `goal` et `measurements`)
  - `HomeHeader({ date })`, `WeightBlock({ summary, unit })`, `calibrationMessage(n: number): string`

- [ ] **Étape 1 : écrire les tests qui échouent**

`src/features/dashboard/weight-summary.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/dates";
import { computeTrend } from "@/lib/metrics";
import { buildWeightSummary } from "./weight-summary";

const TODAY = "2026-10-03";
const at = (offset: number, weightKg: number) => ({ date: addDays(TODAY, -offset), weightKg });

describe("buildWeightSummary", () => {
  it("is empty without any weighing (accounts onboarded before L2)", () => {
    expect(buildWeightSummary([], TODAY)).toEqual({ state: "empty" });
  });

  it("shows the last weighing while calibrating", () => {
    const s = buildWeightSummary([at(0, 70.4)], TODAY);
    expect(s).toMatchObject({
      state: "calibrating",
      latest: { date: TODAY, weightKg: 70.4 },
      todayKg: 70.4,
      missingEntries: 6,
    });
  });

  it("shows the trend and the weekly rate once calibrated", () => {
    const entries = [12, 10, 8, 6, 4, 3, 2, 1].map((o) => at(o, 80 - 0.1 * (12 - o)));
    const s = buildWeightSummary(entries, TODAY);
    const trend = computeTrend(entries);
    expect(s).toMatchObject({ state: "ready", trendKg: trend[trend.length - 1].trendKg, todayKg: null });
    expect(s.state === "ready" && s.rate?.kgPerWeek).toBeCloseTo(-0.7, 10);
  });

  it("limits the sparkline to 90 days, carrying the older trend in", () => {
    const s = buildWeightSummary([at(100, 82), at(0, 80)], TODAY);
    if (s.state === "empty") throw new Error("unexpected");
    expect(s.sparkline.from).toBe(addDays(TODAY, -89));
    expect(s.sparkline.dots).toEqual([{ date: TODAY, weightKg: 80 }]);
    expect(s.sparkline.trend[0]).toEqual({ date: addDays(TODAY, -89), trendKg: 82 });
    expect(s.sparkline.trend).toHaveLength(90);
  });

  it("ignores weighings dated after today (timezone change)", () => {
    expect(buildWeightSummary([at(-1, 90)], TODAY)).toEqual({ state: "empty" });
  });
});
```

`src/features/dashboard/sparkline.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { sparklineGeometry } from "./sparkline";

const base = { from: "2026-07-06", to: "2026-10-03" };

describe("sparklineGeometry", () => {
  it("maps the first and last day to the padded edges and heavier to higher on screen", () => {
    const g = sparklineGeometry(
      {
        ...base,
        dots: [
          { date: "2026-07-06", weightKg: 82 },
          { date: "2026-10-03", weightKg: 78 },
        ],
        trend: [],
      },
      320,
      72,
    );
    expect(g.dots[0]).toEqual({ cx: 4, cy: 4 });
    expect(g.dots[1]).toEqual({ cx: 316, cy: 68 });
  });

  it("draws the daily trend as one path", () => {
    const g = sparklineGeometry(
      {
        ...base,
        dots: [],
        trend: [
          { date: "2026-07-06", trendKg: 80 },
          { date: "2026-10-03", trendKg: 79 },
        ],
      },
      320,
      72,
    );
    expect(g.trendPath).toBe("M4 4 L316 68");
  });

  it("centres a flat series and handles no data", () => {
    const flat = sparklineGeometry({ ...base, dots: [{ date: "2026-10-03", weightKg: 80 }], trend: [] }, 320, 72);
    expect(flat.dots[0].cy).toBe(36);
    expect(sparklineGeometry({ ...base, dots: [], trend: [] }, 320, 72)).toEqual({ dots: [], trendPath: "" });
  });
});
```

`tests/integration/dashboard.test.ts` :

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDashboard } from "@/features/dashboard/queries";
import { insertWeights, upsertWeight } from "@/features/weight/queries";
import type { Db } from "@/lib/db/types";
import { createTestDb, insertTestUser } from "../helpers/db";

describe("getDashboard", () => {
  let db: Db;
  let close: () => Promise<void>;

  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    await insertTestUser(db, "alice");
    await insertTestUser(db, "bob");
  });
  afterEach(() => close());

  it("summarises the caller's weighings only", async () => {
    await insertWeights(
      db,
      "alice",
      ["2026-09-21", "2026-09-23", "2026-09-25", "2026-09-27", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"].map(
        (date, i) => ({ date, weightKg: 80 - i * 0.2, bodyFatPct: null, note: null }),
      ),
    );
    await upsertWeight(db, "bob", { date: "2026-10-03", weightKg: 120, bodyFatPct: null, note: null });

    const { weight } = await getDashboard(db, "alice", "2026-10-03");
    expect(weight).toMatchObject({ state: "ready", todayKg: null });
    expect(weight.state === "ready" && weight.trendKg).toBeLessThan(80);
    expect((await getDashboard(db, "bob", "2026-10-03")).weight).toMatchObject({
      state: "calibrating",
      todayKg: 120,
    });
  });
});
```

`src/features/dashboard/components/dashboard.test.tsx` :

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/weight/actions", () => ({ saveWeightAction: vi.fn() }));

import type { Sparkline } from "../weight-summary";
import { HomeHeader } from "./home-header";
import { WeightBlock } from "./weight-block";

afterEach(cleanup);

const sparkline: Sparkline = {
  from: "2026-07-06",
  to: "2026-10-03",
  dots: [{ date: "2026-10-03", weightKg: 78.4 }],
  trend: [
    { date: "2026-07-06", trendKg: 82 },
    { date: "2026-10-03", trendKg: 78.4 },
  ],
};
const hero = () => screen.getByTestId("weight-hero").textContent;

describe("HomeHeader", () => {
  it("shows the date and links to Réglages so mobile users can reach sign-out", () => {
    render(<HomeHeader date="2026-10-03" />);
    expect(screen.getByText("samedi 3 octobre")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Réglages" }).getAttribute("href")).toBe("/reglages");
    expect(screen.getByRole("button", { name: "+ Nouvelle pesée" })).toBeTruthy();
  });
});

describe("WeightBlock", () => {
  it("shows the trend, the weekly rate, today's weighing and a described sparkline", () => {
    render(
      <WeightBlock
        unit="kg"
        summary={{
          state: "ready",
          trendKg: 78.43,
          todayKg: 78.9,
          rate: { kgPerWeek: -0.35, pctPerWeek: -0.45 },
          sparkline,
        }}
      />,
    );
    expect(hero()).toBe("78,4");
    expect(screen.getByText(/−0,4\skg\/sem/)).toBeTruthy();
    expect(screen.getByText(/Pesée du jour : 78,9\skg/)).toBeTruthy();
    expect(
      screen.getByRole("img", { name: /Tendance de 82,0\skg à 78,4\skg sur 3 mois/ }),
    ).toBeTruthy();
  });

  it("shows the last weighing and the remaining count while calibrating", () => {
    render(
      <WeightBlock
        unit="kg"
        summary={{
          state: "calibrating",
          latest: { date: "2026-10-02", weightKg: 70.4 },
          todayKg: null,
          missingEntries: 6,
          sparkline,
        }}
      />,
    );
    expect(hero()).toBe("70,4");
    expect(screen.getByText("Tendance en calibrage · encore 6 pesées")).toBeTruthy();
    expect(screen.getByText("Pas encore de pesée aujourd'hui")).toBeTruthy();
    expect(screen.queryByText(/kg\/sem/)).toBeNull();
  });

  it("uses the singular for the last missing weighing", () => {
    render(
      <WeightBlock
        unit="kg"
        summary={{
          state: "calibrating",
          latest: { date: "2026-10-03", weightKg: 70 },
          todayKg: 70,
          missingEntries: 1,
          sparkline,
        }}
      />,
    );
    expect(screen.getByText("Tendance en calibrage · encore 1 pesée")).toBeTruthy();
  });

  it("invites to log a first weighing when there is none", () => {
    render(<WeightBlock unit="kg" summary={{ state: "empty" }} />);
    expect(screen.getByText("Aucune pesée pour l'instant.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ajouter ma première pesée" })).toBeTruthy();
  });

  it("displays pounds when the profile uses them", () => {
    render(
      <WeightBlock
        unit="lb"
        summary={{ state: "ready", trendKg: 78.4, todayKg: null, rate: null, sparkline }}
      />,
    );
    expect(hero()).toBe("172,8");
  });
});
```

Dans `src/components/app-shell/app-shell.test.tsx`, **supprimer** le `describe("Accueil")` et l'import de `HomePage` (le lien Réglages est désormais testé dans `dashboard.test.tsx`).

- [ ] **Étape 2 : lancer, vérifier l'échec**

Run : `pnpm test src/features/dashboard tests/integration/dashboard.test.ts`
Attendu : FAIL.

- [ ] **Étape 3 : implémenter l'agrégation**

`src/features/dashboard/weight-summary.ts` :

```ts
import { addDays, type LocalDate } from "@/lib/dates";
import {
  calibration,
  computeTrend,
  dailyTrendSeries,
  weeklyRate,
  type WeeklyRate,
  type WeightPoint,
} from "@/lib/metrics";

export const SPARKLINE_DAYS = 90;

export type Sparkline = {
  from: LocalDate;
  to: LocalDate;
  dots: WeightPoint[];
  trend: { date: LocalDate; trendKg: number }[];
};

export type WeightSummary =
  | { state: "empty" }
  | {
      state: "calibrating";
      latest: WeightPoint;
      todayKg: number | null;
      missingEntries: number;
      sparkline: Sparkline;
    }
  | {
      state: "ready";
      trendKg: number;
      todayKg: number | null;
      rate: WeeklyRate | null;
      sparkline: Sparkline;
    };

/** Everything the Accueil weight block shows, already computed (specs/01 §3.2, specs/03 §1-3). */
export function buildWeightSummary(
  entries: readonly WeightPoint[],
  todayDate: LocalDate,
): WeightSummary {
  const points = entries
    .filter((e) => e.date <= todayDate)
    .map(({ date, weightKg }) => ({ date, weightKg }));
  if (points.length === 0) return { state: "empty" };

  const trend = computeTrend(points);
  const last = trend[trend.length - 1];
  const todayKg = last.date === todayDate ? last.weightKg : null;
  const from = addDays(todayDate, -(SPARKLINE_DAYS - 1));
  const sparkline: Sparkline = {
    from,
    to: todayDate,
    dots: points.filter((p) => p.date >= from),
    trend: dailyTrendSeries(trend, from, todayDate),
  };

  const { calibrating, missingEntries } = calibration(points);
  if (calibrating) {
    return {
      state: "calibrating",
      latest: { date: last.date, weightKg: last.weightKg },
      todayKg,
      missingEntries,
      sparkline,
    };
  }
  return {
    state: "ready",
    trendKg: last.trendKg,
    todayKg,
    rate: weeklyRate(points, todayDate, last.trendKg),
    sparkline,
  };
}
```

Note : `computeTrend` trie ; `points` peut ne pas l'être, d'où `points.filter` pour les points de la mini-courbe (l'ordre n'y compte pas).

`src/features/dashboard/sparkline.ts` :

```ts
import { daysBetween, type LocalDate } from "@/lib/dates";
import { round1 } from "@/lib/units";
import type { Sparkline } from "./weight-summary";

export type SparklineGeometry = { dots: { cx: number; cy: number }[]; trendPath: string };

/** SVG coordinates of the Accueil mini chart: x by day, y scaled to the visible values. */
export function sparklineGeometry(
  s: Sparkline,
  width: number,
  height: number,
  pad = 4,
): SparklineGeometry {
  const values = [...s.dots.map((d) => d.weightKg), ...s.trend.map((t) => t.trendKg)];
  if (values.length === 0) return { dots: [], trendPath: "" };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = daysBetween(s.from, s.to) || 1;
  const x = (date: LocalDate) => round1(pad + (daysBetween(s.from, date) / span) * (width - 2 * pad));
  const y = (kg: number) =>
    round1(max === min ? height / 2 : pad + ((max - kg) / (max - min)) * (height - 2 * pad));
  return {
    dots: s.dots.map((d) => ({ cx: x(d.date), cy: y(d.weightKg) })),
    trendPath: s.trend.map((t, i) => `${i ? "L" : "M"}${x(t.date)} ${y(t.trendKg)}`).join(" "),
  };
}
```

`src/features/dashboard/queries.ts` :

```ts
import { listWeights } from "@/features/weight/queries";
import type { LocalDate } from "@/lib/dates";
import type { Db } from "@/lib/db/types";
import { buildWeightSummary, type WeightSummary } from "./weight-summary";

/** Accueil data, computed server-side. L3 adds the goal, L4 the measurements. */
export type Dashboard = { weight: WeightSummary };

export async function getDashboard(db: Db, userId: string, todayDate: LocalDate): Promise<Dashboard> {
  return { weight: buildWeightSummary(await listWeights(db, userId), todayDate) };
}
```

- [ ] **Étape 4 : implémenter les composants et la page**

`src/features/dashboard/components/home-header.tsx` :

```tsx
import { User } from "lucide-react";
import Link from "next/link";
import { NewWeightButton } from "@/features/weight/components/new-weight-button";
import { formatLongDate, type LocalDate } from "@/lib/dates";

export function HomeHeader({ date }: { date: LocalDate }) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-medium text-fg-2">{formatLongDate(date)}</p>
        <h1 className="text-2xl font-semibold tracking-tight lg:text-[28px]">Bonjour</h1>
      </div>
      <NewWeightButton className="hidden lg:inline-flex" />
      <Link
        href="/reglages"
        aria-label="Réglages"
        className="flex size-11 items-center justify-center rounded-full border border-line text-fg lg:hidden"
      >
        <User size={20} strokeWidth={1.7} aria-hidden />
      </Link>
    </header>
  );
}
```

`src/features/dashboard/components/sparkline.tsx` :

```tsx
import { formatWeight, type WeightUnit } from "@/lib/units";
import { sparklineGeometry } from "../sparkline";
import type { Sparkline as SparklineData } from "../weight-summary";

const WIDTH = 320;
const HEIGHT = 72;

/** Server-rendered SVG, no client JavaScript (ENF-03). The label is the text summary (ENF-13). */
export function Sparkline({ data, unit }: { data: SparklineData; unit: WeightUnit }) {
  const g = sparklineGeometry(data, WIDTH, HEIGHT);
  const first = data.trend[0];
  const last = data.trend[data.trend.length - 1];
  const label =
    first && last
      ? `Tendance de ${formatWeight(first.trendKg, unit)} à ${formatWeight(last.trendKg, unit)} sur 3 mois`
      : "Aucune pesée sur les 3 derniers mois";
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={label} className="mt-5 h-auto w-full">
      {g.dots.map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r={2.5} className="fill-dot" />
      ))}
      {g.trendPath && (
        <path
          d={g.trendPath}
          className="fill-none stroke-fg"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
```

`src/features/dashboard/components/weight-block.tsx` :

```tsx
import { NewWeightButton } from "@/features/weight/components/new-weight-button";
import {
  formatDecimal,
  formatWeeklyRate,
  formatWeight,
  toDisplayWeight,
  type WeightUnit,
} from "@/lib/units";
import type { WeightSummary } from "../weight-summary";
import { Sparkline } from "./sparkline";

export const calibrationMessage = (n: number) =>
  `Tendance en calibrage · encore ${n} ${n > 1 ? "pesées" : "pesée"}`;

/** Accueil "Poids" block (specs/01 §3.2). Formatting only: values come computed. */
export function WeightBlock({ summary, unit }: { summary: WeightSummary; unit: WeightUnit }) {
  if (summary.state === "empty") {
    return (
      <section aria-labelledby="weight-title" className="mt-8">
        <h2 id="weight-title" className="text-[15px] font-semibold tracking-tight">
          Poids
        </h2>
        <p className="mt-2 text-sm text-fg-2">Aucune pesée pour l&apos;instant.</p>
        <NewWeightButton className="mt-4" label="Ajouter ma première pesée" />
      </section>
    );
  }

  const calibrating = summary.state === "calibrating";
  const heroKg = calibrating ? summary.latest.weightKg : summary.trendKg;
  const paceLine = calibrating
    ? calibrationMessage(summary.missingEntries)
    : summary.rate && `${formatWeeklyRate(summary.rate.kgPerWeek, unit)} · rythme sur 4 semaines`;

  return (
    <section aria-labelledby="weight-title" className="mt-8">
      <h2 id="weight-title" className="text-xs font-medium text-fg-2">
        {calibrating ? "Poids · dernière pesée" : "Poids · tendance"}
      </h2>
      <p className="mt-1 flex items-baseline gap-1.5 font-semibold tabular-nums">
        <span
          data-testid="weight-hero"
          className="text-[64px] leading-none tracking-[-0.05em] lg:text-[88px]"
        >
          {formatDecimal(toDisplayWeight(heroKg, unit))}
        </span>
        <span className="text-[22px] text-muted">{unit}</span>
      </p>
      {paceLine && <p className="mt-3 text-sm text-fg-2">{paceLine}</p>}
      <p className="mt-1 text-sm text-fg-2">
        {summary.todayKg === null
          ? "Pas encore de pesée aujourd'hui"
          : `Pesée du jour : ${formatWeight(summary.todayKg, unit)}`}
      </p>
      <Sparkline data={summary.sparkline} unit={unit} />
    </section>
  );
}
```

`src/app/(app)/accueil/page.tsx` :

```tsx
import { HomeHeader } from "@/features/dashboard/components/home-header";
import { WeightBlock } from "@/features/dashboard/components/weight-block";
import { getDashboard } from "@/features/dashboard/queries";
import { today } from "@/lib/dates";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/session";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { userId, profile } = await requireUser("app");
  const { email } = await searchParams;
  const todayDate = today(profile?.timezone ?? "Europe/Paris");
  const { weight } = await getDashboard(getDb(), userId, todayDate);

  return (
    <>
      <HomeHeader date={todayDate} />
      {email === "verifie" && (
        <p role="status" className="mt-3 text-sm text-positive">
          Email confirmé.
        </p>
      )}
      <WeightBlock summary={weight} unit={profile?.weightUnit ?? "kg"} />
    </>
  );
}
```

Ajouter dans `tests/e2e/auth-onboarding.spec.ts`, après `await expect(page.getByRole("heading", { name: "Bonjour" })).toBeVisible();` :

```ts
  await expect(page.getByText("Tendance en calibrage · encore 6 pesées")).toBeVisible();
  await expect(page.getByTestId("weight-hero")).toHaveText("70,4");
```

- [ ] **Étape 5 : lancer, vérifier le succès**

Run : `pnpm test && pnpm lint && pnpm typecheck && pnpm build`
Attendu : PASS. Dans la sortie de `pnpm build`, la route `/accueil` reste dynamique (ƒ).

- [ ] **Étape 6 : vérification visuelle**

Run : `pnpm dev` ; vérifier l'Accueil en 390 px et 1440 px : chiffre héros 64 px / 88 px, unité en gris, mini-courbe, bouton « + Nouvelle pesée » visible seulement en desktop, avatar seulement en mobile. Enregistrer une pesée : toast, puis chiffre et « Pesée du jour » mis à jour sans recharger.

- [ ] **Étape 7 : commit**

```bash
pnpm format && git add src/features/dashboard "src/app/(app)/accueil/page.tsx" src/components/app-shell/app-shell.test.tsx tests && git commit -m "feat(dashboard): add the Accueil weight block with trend, pace and calibration states

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 9 : seed de démonstration, E2E-2 et CI (BODY-28)

**Fichiers :**
- Créer : `src/lib/db/seed-data.ts`, `src/lib/db/seed-data.test.ts`, `src/lib/db/seed.ts`, `tests/e2e/weight.spec.ts`
- Modifier : `package.json`, `pnpm-lock.yaml`, `.env.example`, `playwright.config.ts`, `.github/workflows/ci.yml`

**Interfaces :**
- Consomme : `createAuth` (L1), `recordConsents`, `saveSex`, `saveBodyInfo`, `markOnboardingCompleted`, `insertWeights`, `today`, `addDays`, `round2`, `slopePerDay`.
- Produit :
  - `DEMO_EMAIL = "demo@my-body.test"`
  - `demoWeights(todayDate: LocalDate, days = 120, seed = 42): NewWeight[]`
  - script `pnpm db:seed`

- [ ] **Étape 1 : écrire le test qui échoue**

`src/lib/db/seed-data.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/dates";
import { slopePerDay } from "@/lib/metrics";
import { demoWeights } from "./seed-data";

const TODAY = "2026-10-03";

describe("demoWeights", () => {
  const weights = demoWeights(TODAY);

  it("is identical on every run", () => {
    expect(demoWeights(TODAY)).toEqual(weights);
  });

  it("covers about 120 days and ends yesterday, so today stays free for E2E-2", () => {
    expect(weights.length).toBeGreaterThan(90);
    expect(weights.length).toBeLessThanOrEqual(120);
    expect(weights[0].date >= addDays(TODAY, -120)).toBe(true);
    expect(weights[weights.length - 1].date).toBe(addDays(TODAY, -1));
    expect(weights.every((w) => w.date < TODAY)).toBe(true);
  });

  it("loses about 0.35 kg per week with realistic noise", () => {
    expect((slopePerDay(weights) ?? 0) * 7).toBeCloseTo(-0.35, 1);
    expect(weights.every((w) => w.weightKg > 78 && w.weightKg < 88)).toBe(true);
  });
});
```

- [ ] **Étape 2 : lancer, vérifier l'échec**

Run : `pnpm test src/lib/db/seed-data.test.ts`
Attendu : FAIL.

- [ ] **Étape 3 : implémenter le générateur et le script**

`src/lib/db/seed-data.ts` :

```ts
import type { NewWeight } from "@/features/weight/queries";
import { addDays, type LocalDate } from "@/lib/dates";
import { round2 } from "@/lib/units";

export const DEMO_EMAIL = "demo@my-body.test";

/** Deterministic PRNG (mulberry32): the demo account is identical on every run. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `days` days of noisy weighings ending yesterday: −0.05 kg/day from 86 kg, ~15 % of days skipped. */
export function demoWeights(todayDate: LocalDate, days = 120, seed = 42): NewWeight[] {
  const random = mulberry32(seed);
  const out: NewWeight[] = [];
  for (let offset = days; offset >= 1; offset--) {
    const skip = random() < 0.15 && offset > 1;
    const noise = (random() - 0.5) * 1.2;
    if (skip) continue;
    out.push({
      date: addDays(todayDate, -offset),
      weightKg: round2(86 - 0.05 * (days - offset) + noise),
      bodyFatPct: null,
      note: offset % 17 === 0 ? "resto" : null,
    });
  }
  return out;
}
```

`src/lib/db/seed.ts` :

```ts
/**
 * pnpm db:seed — development and CI only. Recreates demo@my-body.test with 120 days
 * of weighings (specs/04 §6). L3 adds a loss goal, L4 the measurement sessions.
 */
import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { recordConsents } from "@/features/consent/queries";
import { markOnboardingCompleted, saveBodyInfo, saveSex } from "@/features/profile/queries";
import { insertWeights } from "@/features/weight/queries";
import { createAuth } from "@/lib/auth/create-auth";
import { today } from "@/lib/dates";
import { requireEnv } from "@/lib/env";
import * as schema from "./schema";
import { user } from "./schema";
import { DEMO_EMAIL, demoWeights } from "./seed-data";

async function main() {
  loadEnvConfig(process.cwd());
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    throw new Error("db:seed refuses to run in production");
  }
  const password = requireEnv("SEED_DEMO_PASSWORD");
  const pool = new Pool({ connectionString: requireEnv("DATABASE_URL") });
  const db = drizzle(pool, { schema });

  try {
    await db.delete(user).where(eq(user.email, DEMO_EMAIL)); // cascades to every table
    const auth = createAuth({
      db,
      sendEmail: async () => {},
      baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
      secret: process.env.BETTER_AUTH_SECRET || "seed-only-secret-0123456789abcdef0123",
      rateLimitEnabled: false,
      withNextCookies: false,
    });
    const { user: demo } = await auth.api.signUpEmail({
      body: { email: DEMO_EMAIL, password, name: "Démo" },
    });
    await db.update(user).set({ emailVerified: true }).where(eq(user.id, demo.id));
    await recordConsents(db, demo.id);
    await saveSex(db, demo.id, "male", "Europe/Paris");
    await saveBodyInfo(db, demo.id, { heightCm: 178, birthDate: "1990-04-12", lengthUnit: "cm" });
    await insertWeights(db, demo.id, demoWeights(today("Europe/Paris")));
    await markOnboardingCompleted(db, demo.id);
    console.log(`Seeded ${DEMO_EMAIL}`); // no health data in logs
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "seed_failed");
  process.exit(1);
});
```

```bash
pnpm add -D tsx
```

Dans `package.json`, scripts : ajouter `"db:seed": "tsx src/lib/db/seed.ts"`.

Dans `.env.example`, remplacer la ligne `SEED_DEMO_PASSWORD=` par :

```
# Développement et CI uniquement : mot de passe du compte demo@my-body.test (pnpm db:seed)
SEED_DEMO_PASSWORD=
```

- [ ] **Étape 4 : vérifier le seed**

Run : `pnpm test src/lib/db/seed-data.test.ts` → PASS.
Puis, avec `SEED_DEMO_PASSWORD` défini dans `.env.local` et une base locale migrée : `pnpm db:seed` → affiche `Seeded demo@my-body.test`. Le relancer une seconde fois → même résultat (idempotent). Vérifier qu'avec `NODE_ENV=production pnpm db:seed` le script échoue avec « db:seed refuses to run in production ».

- [ ] **Étape 5 : écrire E2E-2**

Dans `playwright.config.ts`, ajouter en tête :

```ts
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());
```

`tests/e2e/weight.spec.ts` :

```ts
import { expect, test } from "@playwright/test";

const DEMO_EMAIL = "demo@my-body.test";

test("E2E-2: the demo account logs a weighing with + and the home trend changes", async ({
  page,
}, testInfo) => {
  const password = process.env.SEED_DEMO_PASSWORD;
  test.skip(!password, "SEED_DEMO_PASSWORD is not set: run pnpm db:seed first");

  await page.goto("/connexion");
  await page.getByLabel("Email").fill(DEMO_EMAIL);
  await page.getByLabel("Mot de passe").fill(password as string);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/accueil$/);

  const hero = page.getByTestId("weight-hero");
  const before = (await hero.textContent()) ?? "";
  const trend = Number(before.replace(",", "."));
  // 3 % away from the trend: visible effect, below the 5 % suspicious threshold.
  // Opposite directions so the mobile and desktop runs (same account, run in parallel) both move it.
  const factor = testInfo.project.name === "mobile" ? 0.97 : 1.03;
  const typed = (trend * factor).toFixed(1).replace(".", ",");

  await page.getByRole("button", { name: "Nouvelle pesée" }).click();
  const dialog = page.getByRole("dialog", { name: "Nouvelle pesée" });
  await dialog.getByLabel("Poids", { exact: true }).fill(typed);
  await dialog.getByRole("button", { name: "Enregistrer" }).click();

  // Today may already hold a weighing (other project or previous run): confirm the replacement.
  const saved = page.getByText("Pesée enregistrée");
  const confirm = dialog.getByRole("button", { name: "Confirmer" });
  await expect(saved.or(confirm)).toBeVisible();
  if (await confirm.isVisible()) await confirm.click();

  await expect(saved).toBeVisible();
  await expect(dialog).toBeHidden();
  await expect(hero).not.toHaveText(before);
  await expect(page.getByText(new RegExp(`Pesée du jour : ${typed}\\skg`))).toBeVisible();
});
```

- [ ] **Étape 6 : CI**

Dans `.github/workflows/ci.yml`, job `e2e` : ajouter `SEED_DEMO_PASSWORD: ci-demo-password-0123` dans `env`, et l'étape `- run: pnpm db:seed` juste après `- run: pnpm db:migrate`.

- [ ] **Étape 7 : lancer, vérifier le succès**

Run : `pnpm db:seed && pnpm test:e2e`
Attendu : PASS sur les projets `mobile` et `desktop` (E2E-2, E2E-9, auth-onboarding), en relançant deux fois de suite pour vérifier qu'E2E-2 reste vert quand la pesée du jour existe déjà.

- [ ] **Étape 8 : commit**

```bash
pnpm format && git add src/lib/db/seed-data.ts src/lib/db/seed-data.test.ts src/lib/db/seed.ts tests/e2e/weight.spec.ts package.json pnpm-lock.yaml .env.example playwright.config.ts .github/workflows/ci.yml && git commit -m "feat(seed): add demo account with 120 days of weighings and E2E-2

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 10 : clôture du lot L2

**Fichiers :**
- Modifier : `specs/04-modele-de-donnees.md`, `specs/05-architecture-technique.md`, `specs/06-design-system.md`, `specs/10-planning-et-jalons.md`, `specs/README.md`

- [ ] **Étape 1 : reporter les écarts assumés dans la spec**

- `specs/04` §6 : « En L2, le seed crée le compte, son profil, ses consentements et 120 jours de pesées (déterministes, jusqu'à la veille). L'objectif de perte (L3) et les séances de mesure (L4) y seront ajoutés. Script : `src/lib/db/seed.ts`, lancé avec `tsx`. »
- `specs/05` §1, ligne Graphiques : « **Recharts** pour les grands graphiques (Progrès, Accueil desktop) ; mini-courbe de l'Accueil mobile en SVG rendu côté serveur (ENF-03) ». §1, ligne Composants de base : préciser `@radix-ui/react-dialog`.
- `specs/05` §4.2 : remplacer `revalidatePath('/(app)', 'layout')` par `revalidatePath('/', 'layout')` ; décrire `needsConfirmation: { reason: 'replace' | 'suspicious'; message: string }`, le bouton `confirm=<reason>` et le champ caché `confirmed` (raisons déjà acceptées). §4.4 : idem pour `revalidatePath`.
- `specs/06` §3, Stepper : boutons ronds de **44 px** (ENF-14).
- `specs/10` L7 : ajouter « Fermeture du panneau bas par glissement vers le bas » ; L3 : ajouter « Rythme de l'Accueil en vert quand il va dans le sens de l'objectif ».
- `specs/README.md` : version 1.3, date du jour, et ligne d'historique « 1.3 · <date> · Ajustements issus du plan L2 (mini-courbe SVG serveur, confirmations successives, revalidation globale, stepper 44 px, seed sans objectif) ».

- [ ] **Étape 2 : vérification complète**

Run : `pnpm lint && pnpm typecheck && pnpm format:check && pnpm test --coverage && pnpm build && pnpm db:seed && pnpm test:e2e`
Attendu : tout passe ; couverture ≥ 95 % sur `src/lib/metrics` et `src/lib/units.ts`. Copier le récapitulatif dans le compte rendu.

- [ ] **Étape 3 : vérification du bundle (ENF-03)**

Dans la sortie de `pnpm build`, relever la taille « First Load JS » de `/accueil` et la noter dans le compte rendu (cible < 180 ko gzip ; Radix Dialog est le seul ajout client notable).

- [ ] **Étape 4 : commit**

```bash
pnpm format && git add specs && git commit -m "docs(specs): record L2 implementation decisions (v1.3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Étape 5 : relecture du lot** — lancer l'agent `reviewer` sur `git diff main..HEAD` avec pour consigne : critères d'acceptation de BODY-22 à BODY-28, formules de la spec 03 §1-3 (exemple chiffré, bornes du calibrage, fenêtre du rythme), isolation des données (`requireUser` seule source de `userId`, champ `userId` forgé ignoré), aucune donnée de santé dans les logs, la section « Review Focus » de ce plan, et les contraintes globales. Corriger les points bloquants avant de déclarer le lot terminé.

- [ ] **Étape 6 : PR et Jira** — ouvrir la PR `feat/l2-pesees-tendance` → `main` (E2E en CI), puis passer BODY-22 à BODY-28 et l'epic BODY-3 à « Terminé » une fois la PR fusionnée (fait par la session principale, pas par l'implementer).
