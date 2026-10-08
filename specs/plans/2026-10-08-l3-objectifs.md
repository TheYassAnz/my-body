# Lot L3 (objectifs) : plan d'implémentation

> **Pour les agents :** sous-skill requis : utiliser `superpowers:subagent-driven-development` (recommandé) ou `superpowers:executing-plans` pour exécuter ce plan tâche par tâche. Les étapes utilisent des cases à cocher (`- [ ]`). Agent d'exécution conseillé : `implementer` ; relecture : `reviewer`.

**Objectif :** permettre de définir un objectif (perte, prise, recompo, maintien), de le modifier, de le suivre (statut, projection, progression) et de le clôturer, avec l'étape 4 de l'onboarding, le bloc Objectif de l'Accueil, le bandeau « objectif atteint » et l'écran `/objectif`.

**Architecture :** les règles (rythmes visés, statut, projection, progression) sont des fonctions pures dans `src/lib/metrics/` (TDD, table de cas complète) ; elles renvoient des **codes et des nombres**, jamais de texte. `features/goals` porte la table `goal`, ses requêtes (toutes filtrées par `userId`, changement de type en transaction), le schéma Zod, les Server Actions, un constructeur de résumé pur (`buildGoalSummary`) et les textes français (`copy.ts`). Les composants se contentent de formater. Le formulaire d'objectif est un composant client partagé par `/objectif` et l'onboarding (l'action est passée en prop).

**Stack :** Next.js 16.3 (App Router, Server Actions), React 19.2, TypeScript strict, Tailwind v4, Drizzle 0.45 + PostgreSQL, Zod 4, Vitest 5 + PGlite + Testing Library, Playwright. Aucune nouvelle dépendance.

**Spec :** `specs/` v1.3, en particulier `01` §3.1 (étape 4), §3.2 (Accueil), §3.7 (Objectif) ; `02` (GOAL-01 à 05, ONB-01, ONB-02) ; `03` §2-5 et §8-9 ; `04` (`goal`, §6) ; `05` §3-4 ; `09` §2-4 (E2E-5).

**Tickets Jira :** BODY-29 à BODY-36 (epic BODY-4 = L3).

**Branche :** `feat/l3-objectifs`, créée depuis `main` (L2 fusionnée via la PR #3).

## Contraintes globales

- Toutes les contraintes globales des plans L0-L1 et L2 restent valables : TypeScript strict sans `any`, UI en français (tutoiement), code en anglais, `pnpm format` avant chaque commit, aucune donnée de santé (poids, cible, rythme), email ou jeton dans les logs, `lib/metrics` sans base, Next ni horloge, `app/*` sans requête Drizzle.
- Paramètres métier (spec 03, valeurs exactes) : `PLATEAU_WINDOW_DAYS` 21 · `PLATEAU_THRESHOLD_PCT` 0,1 · `STABLE_BAND_PCT` 1,5 · `PROJECTION_MAX_DAYS` 730 (déjà dans `config.ts`) ; `RATE_WINDOW_DAYS` 28.
- Rythmes (spec 03 §4) : **perte** 0,25 à 1,5 %/sem, zone recommandée 0,5 à 1,0, défaut 0,5 ; **prise** 0,1 à 0,75, zone recommandée 0,1 à 0,5, défaut 0,25 ; pas du curseur 0,05.
- Cible (spec 03 §9) : perte `20 kg ≤ cible < tendance` ; prise `tendance < cible ≤ 400 kg`. « Tendance » = tendance actuelle, ou **dernière pesée pendant le calibrage** (EF-GOAL-01 CA4).
- Un seul objectif actif par utilisateur (index unique partiel). Tout changement de type passe par une **transaction** (spec 05 §4.2).
- `startDate`, `endedAt` : date locale dans `profile.timezone` (jamais UTC brut).
- Les messages de statut vivent dans `features/goals/copy.ts` (formatage d'unité), pas dans `lib/metrics`.
- Couverture ≥ 95 % (lignes, branches, fonctions) sur `src/lib/metrics/**`, vérifiée en CI.
- Zones de toucher ≥ 44×44 px (ENF-14) ; aucun rouge (le vert n'indique que « favorable »).

## Écarts assumés par rapport à la spec (à reporter dans la spec à la tâche 12)

1. **Pas de redirection vers `/onboarding` quand il n'y a plus d'objectif actif** (EF-ONB-02 CA1). L'accès `(app)` reste conditionné à `onboardingCompletedAt`. Raisons : un compte qui a terminé l'onboarding en L1/L2 n'a pas d'objectif, et « Nouvel objectif » (EF-GOAL-04) termine l'objectif courant avant d'en créer un autre. `/objectif` et l'Accueil proposent alors d'en créer un. L'onboarding des **nouveaux** comptes exige bien l'objectif (étape 4).
2. **Statut sans texte dans `lib/metrics`** : codes + données ; messages dans `features/goals/copy.ts`.
3. **`ConfirmReason` gagne `"archive"`** (changement de type) ; mêmes mécanismes `confirm` / `confirmed` qu'en L2.
4. **Recompo : indicateur de taille toujours `waist_insufficient` en L3** (aucune mensuration avant L4). `goalStatus` accepte déjà un paramètre `waist` que L4 branchera.
5. **« 21 jours d'historique » du plateau** = première pesée datée au plus tard `aujourd'hui − 20` (fenêtre de 21 jours, aujourd'hui compris, comme `rateWindow`).
6. **Contraintes de base supplémentaires** : `target` et `rate` ensemble ou absents, bornes du rythme par type, poids entre 20 et 400, `ended_at` renseigné si et seulement si le statut n'est pas `active`.
7. **EF-GOAL-05 (S, historique) incluse** : le coût est faible et E2E-5 le vérifie.
8. **Page `/objectif`** : curseur en `<input type="range">` natif stylé (accessibilité clavier gratuite), pas de Radix.
9. **Rythme de l'Accueil en vert** quand il va dans le sens de l'objectif (perte ou prise) ; gris pour maintien, recompo, ou sans objectif.

## Review Focus

1. **Compte sans objectif actif** (compte L1/L2 d'avant L3, ou après « Nouvel objectif ») : `/accueil` et `/objectif` s'ouvrent sans erreur et proposent de définir un objectif. Tests : `summary.test.ts` (tâche 7), `dashboard.test.ts` (tâche 10), `goal-block.test.tsx` (tâche 10).
2. **Saisies absurdes** (« 75,5 », « 1e400 », « Infinity », « -80 », champ vide, cible égale à la tendance, cible en lb, rythme 0,37 ou 0,3 en prise, rythme vide) : erreur de champ ou arrondi au pas de 0,05, jamais de `NaN` en base. Test : `schemas.test.ts` (tâche 5).
3. **Double envoi et atomicité** : deux créations simultanées ne laissent qu'un objectif actif ; un changement de type dont l'insertion échoue laisse l'ancien objectif actif (transaction). Tests : `tests/integration/goal.test.ts` (tâche 4).
4. **« Objectif atteint » non forgeable** : `achieveGoalAction` recalcule le statut côté serveur et refuse si l'objectif n'est pas atteint ; « Passer en maintien » crée un maintien dont la référence est la tendance du jour. Test : `actions.test.ts` (tâche 6).
5. **Fuseau horaire** : à Los Angeles à 19 h (déjà le lendemain en UTC), `startDate` et `endedAt` valent la date locale. Tests : `actions.test.ts` (tâches 5 et 6).
6. **Isolation** : aucune action ne prend d'identifiant d'objectif ; A ne peut ni lire, ni modifier, ni clore l'objectif de B. Tests : `tests/integration/goal.test.ts` (tâche 4), `actions.test.ts` (tâches 5 et 6).

## Structure des fichiers

```
src/lib/
  dates.ts                      + formatShortDate
  action-result.ts              ConfirmReason + "archive"
  metrics/
    goal-rates.ts               GOAL_RATES, snapRate, isRateInBounds, exceedsRecommended, previewKgPerWeek, daysToReach, theoreticalDate
    goal-status.ts              goalReferenceKg, classifyPace, paceInGoalDirection, waistIndicator, goalStatus
    projection.ts               projectGoal, goalProgress
    index.ts                    réexports
  db/
    schema/app.ts               + goal_type, goal_status, goal
    seed-data.ts                + demoGoal
    seed.ts                     + objectif de perte
drizzle/0003_goal.sql           migration générée
src/components/ui/slider.tsx    curseur avec zone recommandée
src/app/globals.css             + style du curseur
src/features/goals/
  queries.ts                    getActiveGoal, listPastGoals, createGoal, replaceActiveGoal, finishActiveGoal, updateActiveGoalTarget
  schemas.ts                    goalInputSchema(referenceKg)
  actions.ts                    saveGoalAction, achieveGoalAction
  summary.ts                    buildGoalSummary, buildGoalHistory (purs)
  copy.ts                       libellés, messages de statut, projection, alertes
  components/
    goal-form.tsx               formulaire partagé (/objectif et onboarding)
    goal-tracking.tsx           bloc Suivi (rythme, statut, projection)
    goal-history.tsx            historique repliable
    goal-block.tsx              bloc Objectif de l'Accueil
    achieved-banner.tsx         bandeau « Objectif atteint »
src/features/profile/
  onboarding.ts                 + étape "goal", hasGoal
  actions.ts                    + saveGoalStepAction
  components/goal-step.tsx      étape 4
src/features/dashboard/
  queries.ts                    getDashboard + goal + rateTone
  pace-tone.ts                  paceTone (pur)
  components/weight-block.tsx   rythme vert
src/app/(app)/objectif/page.tsx
src/app/(app)/accueil/page.tsx
src/app/onboarding/page.tsx     étape 4
tests/integration/goal.test.ts
tests/e2e/goal.spec.ts          E2E-5
```

---

### Tâche 1 : rythmes visés, aperçu et dates courtes (BODY-29, partie rythmes)

**Fichiers :**
- Créer : `src/lib/metrics/goal-rates.ts`, `src/lib/metrics/goal-rates.test.ts`
- Modifier : `src/lib/metrics/index.ts`, `src/lib/dates.ts`, `src/lib/dates.test.ts`

**Interfaces :**
- Consomme : `addDays`, `LocalDate` (`lib/dates`), `PROJECTION_MAX_DAYS` (`config.ts`).
- Produit :
  - `type RatedGoalType = "lose" | "gain"`, `type GoalType = RatedGoalType | "maintain" | "recomp"`
  - `GOAL_RATES: Record<RatedGoalType, { min; max; recommendedMin; recommendedMax; default: number }>`, `RATE_STEP_PCT = 0.05`
  - `snapRate(pct: number): number`, `isRateInBounds(type: RatedGoalType, pct: number): boolean`, `exceedsRecommended(type: RatedGoalType, pct: number): boolean`
  - `previewKgPerWeek(pct: number, trendKg: number): number`
  - `daysToReach(distanceKg: number, kgPerDay: number): number`
  - `theoreticalDate(today: LocalDate, fromKg: number, targetKg: number, kgPerWeek: number): LocalDate | null`
  - `formatShortDate(date: LocalDate, today: LocalDate): string` (`lib/dates`)

- [ ] **Étape 1 : écrire les tests qui échouent**

`src/lib/metrics/goal-rates.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import {
  GOAL_RATES,
  daysToReach,
  exceedsRecommended,
  isRateInBounds,
  previewKgPerWeek,
  snapRate,
  theoreticalDate,
} from "./goal-rates";

describe("GOAL_RATES (specs/03 §4)", () => {
  it("holds the bounds, recommended zones and defaults", () => {
    expect(GOAL_RATES.lose).toEqual({
      min: 0.25,
      max: 1.5,
      recommendedMin: 0.5,
      recommendedMax: 1,
      default: 0.5,
    });
    expect(GOAL_RATES.gain).toEqual({
      min: 0.1,
      max: 0.75,
      recommendedMin: 0.1,
      recommendedMax: 0.5,
      default: 0.25,
    });
  });
});

describe("snapRate", () => {
  it("rounds to the 0.05 step", () => {
    expect(snapRate(0.37)).toBe(0.35);
    expect(snapRate(0.38)).toBe(0.4);
    expect(snapRate(0.5)).toBe(0.5);
  });
  it("keeps NaN as NaN", () => {
    expect(snapRate(Number.NaN)).toBeNaN();
  });
});

describe("isRateInBounds", () => {
  it.each([
    ["lose", 0.25, true],
    ["lose", 0.2, false],
    ["lose", 1.5, true],
    ["lose", 1.55, false],
    ["gain", 0.1, true],
    ["gain", 0.05, false],
    ["gain", 0.75, true],
    ["gain", 0.8, false],
  ] as const)("%s at %s %%/week → %s", (type, pct, expected) => {
    expect(isRateInBounds(type, pct)).toBe(expected);
  });
  it("rejects NaN", () => {
    expect(isRateInBounds("lose", Number.NaN)).toBe(false);
  });
});

describe("exceedsRecommended", () => {
  it("flags a loss above 1.0 and a gain above 0.5", () => {
    expect(exceedsRecommended("lose", 1)).toBe(false);
    expect(exceedsRecommended("lose", 1.05)).toBe(true);
    expect(exceedsRecommended("gain", 0.5)).toBe(false);
    expect(exceedsRecommended("gain", 0.55)).toBe(true);
  });
});

describe("previewKgPerWeek", () => {
  it("is rate / 100 × trend", () => {
    expect(previewKgPerWeek(0.5, 78)).toBeCloseTo(0.39, 10);
  });
});

describe("daysToReach", () => {
  it("rounds up to the next day", () => {
    expect(daysToReach(1, 0.3)).toBe(4);
  });
  it("is not pushed one day up by floating-point noise", () => {
    expect(daysToReach(73, 0.1)).toBe(730);
  });
});

describe("theoreticalDate", () => {
  const today = "2026-10-07";
  it("is today + |target − from| / (kg/week) × 7 days", () => {
    expect(theoreticalDate(today, 80, 76, 0.4)).toBe("2026-12-16");
  });
  it("works for a gain", () => {
    expect(theoreticalDate(today, 70, 72, 0.35)).toBe("2026-11-16");
  });
  it("is null when the pace is not positive", () => {
    expect(theoreticalDate(today, 80, 76, 0)).toBeNull();
    expect(theoreticalDate(today, 80, 76, -0.4)).toBeNull();
    expect(theoreticalDate(today, 80, 76, Number.NaN)).toBeNull();
  });
  it("is null beyond 730 days, but not at 730 exactly", () => {
    expect(theoreticalDate(today, 100, 50, 0.4)).toBeNull();
    expect(theoreticalDate(today, 100, 27, 0.7)).toBe("2028-10-06");
  });
});
```

Ajouter à `src/lib/dates.test.ts` (compléter l'import avec `formatShortDate`) :

```ts
describe("formatShortDate", () => {
  it("omits the year when it is the current one", () => {
    expect(formatShortDate("2026-11-15", "2026-10-07")).toBe("15 nov.");
    expect(formatShortDate("2026-12-16", "2026-10-07")).toBe("16 déc.");
  });
  it("adds the year when it differs", () => {
    expect(formatShortDate("2027-03-02", "2026-10-07")).toBe("2 mars 2027");
  });
});
```

- [ ] **Étape 2 : vérifier l'échec**

Run : `pnpm vitest run src/lib/metrics/goal-rates.test.ts src/lib/dates.test.ts`
Attendu : FAIL (`goal-rates` introuvable, `formatShortDate` non exporté).

- [ ] **Étape 3 : implémenter**

`src/lib/metrics/goal-rates.ts` :

```ts
import { addDays, type LocalDate } from "@/lib/dates";
import { PROJECTION_MAX_DAYS } from "./config";

export type RatedGoalType = "lose" | "gain";
export type GoalType = RatedGoalType | "maintain" | "recomp";

/** Weekly pace in % of body weight per week (specs/03 §4). */
export const GOAL_RATES = {
  lose: { min: 0.25, max: 1.5, recommendedMin: 0.5, recommendedMax: 1, default: 0.5 },
  gain: { min: 0.1, max: 0.75, recommendedMin: 0.1, recommendedMax: 0.5, default: 0.25 },
} as const satisfies Record<
  RatedGoalType,
  { min: number; max: number; recommendedMin: number; recommendedMax: number; default: number }
>;

export const RATE_STEP_PCT = 0.05;

/** Nearest multiple of the slider step (NaN stays NaN). */
export function snapRate(pct: number): number {
  return Math.round(pct / RATE_STEP_PCT) / (1 / RATE_STEP_PCT);
}

export function isRateInBounds(type: RatedGoalType, pct: number): boolean {
  const { min, max } = GOAL_RATES[type];
  return Number.isFinite(pct) && pct >= min && pct <= max;
}

/** True when the slider is in its alert zone, past the recommended range. */
export function exceedsRecommended(type: RatedGoalType, pct: number): boolean {
  return pct > GOAL_RATES[type].recommendedMax;
}

/** Live preview in kg/week: rate / 100 × current trend. */
export function previewKgPerWeek(pct: number, trendKg: number): number {
  return (pct / 100) * trendKg;
}

// 73 / 0.1 is 730.0000000000001: without this margin ceil() would add a day.
const DAY_EPSILON = 1e-9;

/** Whole days needed to cover `distanceKg` at `kgPerDay`, rounded up. */
export function daysToReach(distanceKg: number, kgPerDay: number): number {
  return Math.ceil(distanceKg / kgPerDay - DAY_EPSILON);
}

/** Date the target would be reached at the chosen pace, or null (no pace, or beyond 2 years). */
export function theoreticalDate(
  today: LocalDate,
  fromKg: number,
  targetKg: number,
  kgPerWeek: number,
): LocalDate | null {
  if (!(kgPerWeek > 0)) return null;
  const days = daysToReach(Math.abs(targetKg - fromKg), kgPerWeek / 7);
  return days > PROJECTION_MAX_DAYS ? null : addDays(today, Math.max(days, 0));
}
```

`src/lib/metrics/index.ts` : ajouter `export * from "./goal-rates";`.

`src/lib/dates.ts` : ajouter à la fin :

```ts
const shortDate = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const shortDateWithYear = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** "15 nov." ; the year is added when it differs from `today`'s (specs/03 §5.4). */
export function formatShortDate(date: LocalDate, today: LocalDate): string {
  const format = date.slice(0, 4) === today.slice(0, 4) ? shortDate : shortDateWithYear;
  return format.format(new Date(toUtc(date)));
}
```

- [ ] **Étape 4 : vérifier**

Run : `pnpm vitest run src/lib/metrics/goal-rates.test.ts src/lib/dates.test.ts`
Attendu : PASS. Si une date attendue diffère (écart d'un jour), recalculer à la main avant de toucher au code : les valeurs des tests ont été calculées pour 2026-10-07.

- [ ] **Étape 5 : commit**

```bash
pnpm format && git add src/lib && git commit -m "feat(metrics): goal rates, live preview and short dates

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Tâche 2 : statut de l'objectif (BODY-29, partie statut)

**Fichiers :**
- Créer : `src/lib/metrics/goal-status.ts`, `src/lib/metrics/goal-status.test.ts`
- Modifier : `src/lib/metrics/index.ts`

**Interfaces :**
- Consomme : `calibration`, `weeklyRate`, `sortByDate`, `currentTrend`, `WeightPoint`, `GoalType`, `config.ts`, `addDays`, `daysBetween`.
- Produit :
  - `type GoalSpec = { type: GoalType; startWeightKg: number; targetWeightKg: number | null; weeklyRatePct: number | null }`
  - `type WaistMeasure = { date: LocalDate; valueCm: number }`
  - `type WaistIndicator = "waist_insufficient" | "waist_improving" | "waist_flat"`
  - `type GoalStatusCode = "calibrating" | "achieved" | "plateau" | "wrong_direction" | "too_fast" | "too_slow" | "on_track" | "stable" | "out_of_band"`
  - `type GoalStatus = { status: GoalStatusCode; missingEntries: number; deviationKg: number | null; waist: WaistIndicator | null }`
  - `goalReferenceKg(points: readonly WeightPoint[], today: LocalDate): number | null`
  - `classifyPace(v: number, r: number): "wrong_direction" | "too_fast" | "too_slow" | "on_track"`
  - `paceInGoalDirection(type: GoalType, pctPerWeek: number): number | null`
  - `waistIndicator(measures: readonly WaistMeasure[], today: LocalDate): WaistIndicator`
  - `goalStatus(goal: GoalSpec, points: readonly WeightPoint[], today: LocalDate, waist?: readonly WaistMeasure[]): GoalStatus`

- [ ] **Étape 1 : écrire les tests qui échouent**

`src/lib/metrics/goal-status.test.ts` (table de cas : **chaque ligne** de spec 03 §5 + l'ordre de priorité + les bornes exactes) :

```ts
import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/dates";
import {
  classifyPace,
  goalReferenceKg,
  goalStatus,
  paceInGoalDirection,
  waistIndicator,
  type GoalSpec,
} from "./goal-status";
import type { WeightPoint } from "./trend";

const TODAY = "2026-10-07";

/** `days + 1` daily weighings ending today, exactly linear. */
const linear = (start: number, perDay: number, days: number): WeightPoint[] =>
  Array.from({ length: days + 1 }, (_, i) => ({
    date: addDays(TODAY, i - days),
    weightKg: start + perDay * i,
  }));

const lose = (rate = 0.5, target = 75): GoalSpec => ({
  type: "lose",
  startWeightKg: 90,
  targetWeightKg: target,
  weeklyRatePct: rate,
});
const gain = (rate = 0.25, target = 90): GoalSpec => ({
  type: "gain",
  startWeightKg: 80,
  targetWeightKg: target,
  weeklyRatePct: rate,
});
const hold = (type: "maintain" | "recomp", startWeightKg: number): GoalSpec => ({
  type,
  startWeightKg,
  targetWeightKg: null,
  weeklyRatePct: null,
});

describe("classifyPace (exact bounds)", () => {
  it("is wrong_direction below zero", () => {
    expect(classifyPace(-0.01, 0.5)).toBe("wrong_direction");
  });
  it("is too_slow below 0.5 × r", () => {
    expect(classifyPace(0.2499, 0.5)).toBe("too_slow");
  });
  it("is on_track at exactly 0.5 × r and at exactly 1.5 × r", () => {
    expect(classifyPace(0.25, 0.5)).toBe("on_track");
    expect(classifyPace(0.75, 0.5)).toBe("on_track");
  });
  it("is too_fast just above 1.5 × r", () => {
    expect(classifyPace(0.75 + 1e-9, 0.5)).toBe("too_fast");
  });
  it("has no absolute ceiling", () => {
    expect(classifyPace(1.3, 1.2)).toBe("on_track");
    expect(classifyPace(0.9, 0.7)).toBe("on_track");
  });
});

describe("paceInGoalDirection", () => {
  it("is −pct for a loss, +pct for a gain, null otherwise", () => {
    expect(paceInGoalDirection("lose", -0.4)).toBe(0.4);
    expect(paceInGoalDirection("gain", 0.4)).toBe(0.4);
    expect(paceInGoalDirection("maintain", 0.4)).toBeNull();
    expect(paceInGoalDirection("recomp", 0.4)).toBeNull();
  });
});

describe("goalReferenceKg", () => {
  it("is null without any weighing", () => {
    expect(goalReferenceKg([], TODAY)).toBeNull();
  });
  it("is the latest weighing while calibrating", () => {
    expect(goalReferenceKg(linear(80, 0.5, 2), TODAY)).toBe(81);
  });
  it("is the trend once calibrated", () => {
    expect(goalReferenceKg(linear(90, -0.05, 30), TODAY)).toBeCloseTo(88.93, 2);
  });
  it("ignores weighings dated after today", () => {
    const points = [...linear(80, 0, 10), { date: addDays(TODAY, 3), weightKg: 120 }];
    expect(goalReferenceKg(points, TODAY)).toBe(80);
  });
});

describe("waistIndicator (specs/03 §5.3)", () => {
  const m = (offset: number, valueCm: number) => ({ date: addDays(TODAY, offset), valueCm });
  it("needs two measurements", () => {
    expect(waistIndicator([], TODAY)).toBe("waist_insufficient");
    expect(waistIndicator([m(-3, 84)], TODAY)).toBe("waist_insufficient");
  });
  it("improves when the waist drops by at least 0.5 cm", () => {
    expect(waistIndicator([m(-20, 84.5), m(-2, 84)], TODAY)).toBe("waist_improving");
  });
  it("is flat for a smaller drop or a rise", () => {
    expect(waistIndicator([m(-20, 84.3), m(-2, 84)], TODAY)).toBe("waist_flat");
    expect(waistIndicator([m(-20, 84), m(-2, 85)], TODAY)).toBe("waist_flat");
  });
  it("compares with the last measurement before the 28-day window", () => {
    expect(waistIndicator([m(-60, 90), m(-40, 86), m(-2, 85.4)], TODAY)).toBe("waist_improving");
  });
  it("ignores measurements dated after today", () => {
    expect(waistIndicator([m(-2, 84), m(3, 80)], TODAY)).toBe("waist_insufficient");
  });
});

describe("goalStatus: lose", () => {
  it("1 · calibrating, with the number of missing weighings", () => {
    const s = goalStatus(lose(), linear(80, 0, 2), TODAY);
    expect(s).toMatchObject({ status: "calibrating", missingEntries: 4 });
  });
  it("1 · calibrating on span alone needs at least one more weighing", () => {
    const s = goalStatus(lose(), linear(80, 0, 6), TODAY);
    expect(s).toMatchObject({ status: "calibrating", missingEntries: 1 });
  });
  it("1 · calibrating beats every other status", () => {
    expect(goalStatus(lose(0.5, 90), linear(80, 0, 2), TODAY).status).toBe("calibrating");
  });
  it("1 · no weighing at all is calibrating", () => {
    expect(goalStatus(lose(), [], TODAY).status).toBe("calibrating");
  });
  it("2 · achieved when the trend is at or under the target", () => {
    expect(goalStatus(lose(0.5, 90), linear(90, -0.05, 30), TODAY).status).toBe("achieved");
  });
  it("2 · achieved beats wrong_direction", () => {
    expect(goalStatus(lose(0.5, 90), linear(80, 0.05, 30), TODAY).status).toBe("achieved");
  });
  it("3 · plateau after 21 days of flat weight", () => {
    expect(goalStatus(lose(), linear(80, 0, 25), TODAY).status).toBe("plateau");
  });
  it("3 · plateau needs 21 days of history: exactly 21 yes, 20 no", () => {
    expect(goalStatus(lose(), linear(80, 0, 20), TODAY).status).toBe("plateau");
    expect(goalStatus(lose(), linear(80, 0, 19), TODAY).status).toBe("too_slow");
  });
  it("3 · plateau beats too_slow", () => {
    expect(goalStatus(lose(), linear(80, -0.002, 25), TODAY).status).toBe("plateau");
  });
  it("4 · wrong_direction when the weight climbs", () => {
    expect(goalStatus(lose(), linear(80, 0.05, 30), TODAY).status).toBe("wrong_direction");
  });
  it("5 · too_fast", () => {
    expect(goalStatus(lose(), linear(90, -0.1, 30), TODAY).status).toBe("too_fast");
  });
  it("6 · too_slow", () => {
    expect(goalStatus(lose(), linear(90, -0.02, 30), TODAY).status).toBe("too_slow");
  });
  it("7 · on_track", () => {
    expect(goalStatus(lose(), linear(90, -0.05, 30), TODAY).status).toBe("on_track");
  });
  it("accepts an aggressive chosen pace without an absolute ceiling", () => {
    expect(goalStatus(lose(0.45), linear(90, -0.1, 30), TODAY).status).toBe("on_track");
  });
  it("throws on a loss goal without target or rate", () => {
    const broken: GoalSpec = { ...lose(), targetWeightKg: null };
    expect(() => goalStatus(broken, linear(90, -0.05, 30), TODAY)).toThrow();
  });
});

describe("goalStatus: gain", () => {
  it("2 · achieved when the trend reaches the target", () => {
    expect(goalStatus(gain(0.25, 75), linear(80, 0.03, 30), TODAY).status).toBe("achieved");
  });
  it("3 · plateau", () => {
    expect(goalStatus(gain(), linear(80, 0, 25), TODAY).status).toBe("plateau");
  });
  it("4 · wrong_direction when the weight drops", () => {
    expect(goalStatus(gain(), linear(80, -0.05, 30), TODAY).status).toBe("wrong_direction");
  });
  it("5 · too_fast", () => {
    expect(goalStatus(gain(), linear(80, 0.08, 30), TODAY).status).toBe("too_fast");
  });
  it("6 · too_slow", () => {
    expect(goalStatus(gain(0.5), linear(80, 0.02, 30), TODAY).status).toBe("too_slow");
  });
  it("7 · on_track", () => {
    expect(goalStatus(gain(), linear(80, 0.03, 30), TODAY).status).toBe("on_track");
  });
});

describe("goalStatus: maintain and recomp", () => {
  const flat = (kg: number) => linear(kg, 0, 10);
  it("calibrating comes first", () => {
    expect(goalStatus(hold("maintain", 80), linear(80, 0, 2), TODAY).status).toBe("calibrating");
  });
  it("stable inside ±1.5 % of the reference, bounds included", () => {
    expect(goalStatus(hold("maintain", 100), flat(101.5), TODAY)).toMatchObject({
      status: "stable",
      deviationKg: 1.5,
    });
    expect(goalStatus(hold("maintain", 100), flat(98.5), TODAY).status).toBe("stable");
  });
  it("out_of_band beyond 1.5 %", () => {
    expect(goalStatus(hold("maintain", 100), flat(101.6), TODAY)).toMatchObject({
      status: "out_of_band",
    });
    expect(goalStatus(hold("maintain", 80), flat(82), TODAY)).toMatchObject({
      status: "out_of_band",
      deviationKg: 2,
    });
  });
  it("maintain carries no waist indicator", () => {
    expect(goalStatus(hold("maintain", 80), flat(80), TODAY).waist).toBeNull();
  });
  it("recomp combines the weight status with each waist state", () => {
    const m = (offset: number, valueCm: number) => ({ date: addDays(TODAY, offset), valueCm });
    const recomp = hold("recomp", 80);
    expect(goalStatus(recomp, flat(80), TODAY)).toMatchObject({
      status: "stable",
      waist: "waist_insufficient",
    });
    expect(goalStatus(recomp, flat(80), TODAY, [m(-20, 85), m(-1, 84)])).toMatchObject({
      status: "stable",
      waist: "waist_improving",
    });
    expect(goalStatus(recomp, flat(83), TODAY, [m(-20, 84), m(-1, 84.1)])).toMatchObject({
      status: "out_of_band",
      waist: "waist_flat",
    });
  });
});
```

- [ ] **Étape 2 : vérifier l'échec**

Run : `pnpm vitest run src/lib/metrics/goal-status.test.ts`
Attendu : FAIL (`goal-status` introuvable).

- [ ] **Étape 3 : implémenter**

`src/lib/metrics/goal-status.ts` :

```ts
import { addDays, type LocalDate } from "@/lib/dates";
import {
  PLATEAU_THRESHOLD_PCT,
  PLATEAU_WINDOW_DAYS,
  RATE_WINDOW_DAYS,
  STABLE_BAND_PCT,
} from "./config";
import type { GoalType } from "./goal-rates";
import { calibration, weeklyRate } from "./rate";
import { currentTrend, sortByDate, type WeightPoint } from "./trend";

export type GoalSpec = {
  type: GoalType;
  startWeightKg: number;
  targetWeightKg: number | null;
  weeklyRatePct: number | null;
};
export type WaistMeasure = { date: LocalDate; valueCm: number };
export type WaistIndicator = "waist_insufficient" | "waist_improving" | "waist_flat";
export type GoalStatusCode =
  | "calibrating"
  | "achieved"
  | "plateau"
  | "wrong_direction"
  | "too_fast"
  | "too_slow"
  | "on_track"
  | "stable"
  | "out_of_band";
export type GoalStatus = {
  status: GoalStatusCode;
  /** Weighings still needed, while calibrating (at least 1); 0 otherwise. */
  missingEntries: number;
  /** Maintain and recomp: trend − reference, in kg. */
  deviationKg: number | null;
  /** Recomp only. */
  waist: WaistIndicator | null;
};

/** Tolerance on the ±1.5 % band, so a deviation of exactly 1.5 % stays inside. */
const BAND_EPSILON = 1e-9;
const WAIST_IMPROVING_CM = -0.5;

/**
 * What a goal is measured against today: the trend, or the latest weighing while
 * calibrating (EF-GOAL-01 CA4). Null without any weighing.
 */
export function goalReferenceKg(points: readonly WeightPoint[], today: LocalDate): number | null {
  const past = sortByDate(points.filter((p) => p.date <= today));
  if (past.length === 0) return null;
  return calibration(past).calibrating ? past[past.length - 1].weightKg : currentTrend(past);
}

/** Pace in the goal's direction (positive = good) against the chosen rate r (specs/03 §5.1, rows 4-7). */
export function classifyPace(
  v: number,
  r: number,
): "wrong_direction" | "too_fast" | "too_slow" | "on_track" {
  if (v < 0) return "wrong_direction";
  if (v > 1.5 * r) return "too_fast";
  if (v < 0.5 * r) return "too_slow";
  return "on_track";
}

/** specs/03 §3: loss → −rate, gain → +rate; null when the goal has no direction. */
export function paceInGoalDirection(type: GoalType, pctPerWeek: number): number | null {
  if (type === "lose") return -pctPerWeek;
  if (type === "gain") return pctPerWeek;
  return null;
}

/** specs/03 §5.3: last 28 days of waist measurements plus the one just before them. */
export function waistIndicator(
  measures: readonly WaistMeasure[],
  today: LocalDate,
): WaistIndicator {
  const past = sortByDate(measures.filter((m) => m.date <= today));
  const windowStart = addDays(today, -(RATE_WINDOW_DAYS - 1));
  const inWindow = past.filter((m) => m.date >= windowStart);
  const before = past.filter((m) => m.date < windowStart);
  const set = before.length ? [before[before.length - 1], ...inWindow] : inWindow;
  if (set.length < 2) return "waist_insufficient";
  const change = Math.round((set[set.length - 1].valueCm - set[0].valueCm) * 10) / 10;
  return change <= WAIST_IMPROVING_CM ? "waist_improving" : "waist_flat";
}

/** Status of the goal, evaluated in the order of specs/03 §5 (the first true case wins). */
export function goalStatus(
  goal: GoalSpec,
  points: readonly WeightPoint[],
  today: LocalDate,
  waist: readonly WaistMeasure[] = [],
): GoalStatus {
  const past = sortByDate(points.filter((p) => p.date <= today));
  const cal = calibration(past);
  const trendKg = currentTrend(past);
  const waistState = goal.type === "recomp" ? waistIndicator(waist, today) : null;
  const result = (
    status: GoalStatusCode,
    extra: Partial<GoalStatus> = {},
  ): GoalStatus => ({ status, missingEntries: 0, deviationKg: null, waist: waistState, ...extra });

  if (cal.calibrating || trendKg === null) {
    return result("calibrating", { missingEntries: Math.max(1, cal.missingEntries) });
  }

  if (goal.type === "maintain" || goal.type === "recomp") {
    const deviationKg = trendKg - goal.startWeightKg;
    const outside =
      Math.abs(deviationKg) * 100 > goal.startWeightKg * STABLE_BAND_PCT + BAND_EPSILON;
    return result(outside ? "out_of_band" : "stable", { deviationKg });
  }

  const { targetWeightKg: target, weeklyRatePct: r } = goal;
  if (target === null || r === null) throw new Error("A loss or gain goal needs a target and a rate");

  if (goal.type === "lose" ? trendKg <= target : trendKg >= target) return result("achieved");

  const hasPlateauHistory = past[0].date <= addDays(today, -(PLATEAU_WINDOW_DAYS - 1));
  if (hasPlateauHistory) {
    const plateauRate = weeklyRate(past, today, trendKg, PLATEAU_WINDOW_DAYS);
    if (plateauRate && Math.abs(plateauRate.pctPerWeek) < PLATEAU_THRESHOLD_PCT) {
      return result("plateau");
    }
  }

  const rate = weeklyRate(past, today, trendKg);
  const v = paceInGoalDirection(goal.type, (rate as NonNullable<typeof rate>).pctPerWeek) as number;
  return result(classifyPace(v, r));
}
```

`src/lib/metrics/index.ts` : ajouter `export * from "./goal-status";`.

- [ ] **Étape 4 : vérifier**

Run : `pnpm vitest run src/lib/metrics/goal-status.test.ts`
Attendu : PASS. Les séries linéaires ont été vérifiées au préalable : tendance/rythme de `linear(90,-0.1,30)` ≈ −0,80 %/sem (trop rapide pour r = 0,5), `linear(90,-0.05,30)` ≈ −0,39 (dans le rythme), `linear(90,-0.02,30)` ≈ −0,16 (trop lent, pas un plateau), `linear(80,0.08,30)` ≈ 0,69 (trop rapide pour r = 0,25), `linear(80,0.03,30)` ≈ 0,26, `linear(80,0.02,30)` ≈ 0,17. En cas d'écart, corriger **la série du test**, jamais les seuils de la spec.

- [ ] **Étape 5 : commit**

```bash
pnpm format && git add src/lib/metrics && git commit -m "feat(metrics): goal status (lose, gain, maintain, recomp)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Tâche 3 : projection et progression (BODY-29, partie projection)

**Fichiers :**
- Créer : `src/lib/metrics/projection.ts`, `src/lib/metrics/projection.test.ts`
- Modifier : `src/lib/metrics/index.ts`

**Interfaces :**
- Consomme : `daysToReach`, `GoalType`, `GoalStatusCode`, `PROJECTION_MAX_DAYS`, `addDays`.
- Produit :
  - `type Projection = { kind: "estimated"; date: LocalDate; daysRemaining: number } | { kind: "too_far" } | { kind: "unavailable" }`
  - `projectGoal(input: { type: GoalType; targetKg: number | null; status: GoalStatusCode; trendKg: number; kgPerWeek: number | null; today: LocalDate }): Projection`
  - `goalProgress(startKg: number, trendKg: number, targetKg: number): number` (0 à 1)

- [ ] **Étape 1 : écrire les tests qui échouent**

`src/lib/metrics/projection.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { goalProgress, projectGoal } from "./projection";
import type { GoalStatusCode } from "./goal-status";

const TODAY = "2026-10-07";
const base = {
  type: "lose" as const,
  targetKg: 80,
  status: "on_track" as GoalStatusCode,
  trendKg: 88,
  kgPerWeek: -0.35,
  today: TODAY,
};

describe("projectGoal (specs/03 §5.4)", () => {
  it("estimates the date, rounded up to the next day", () => {
    expect(projectGoal(base)).toEqual({
      kind: "estimated",
      date: "2027-03-16",
      daysRemaining: 160,
    });
  });
  it("also projects for too_slow and too_fast", () => {
    expect(projectGoal({ ...base, status: "too_slow" }).kind).toBe("estimated");
    expect(projectGoal({ ...base, status: "too_fast" }).kind).toBe("estimated");
  });
  it("projects a gain", () => {
    expect(
      projectGoal({ ...base, type: "gain", targetKg: 92, trendKg: 88, kgPerWeek: 0.35 }),
    ).toMatchObject({ kind: "estimated", daysRemaining: 80 });
  });
  it("is too_far beyond 730 days", () => {
    expect(projectGoal({ ...base, trendKg: 160 })).toEqual({ kind: "too_far" });
  });
  it("is still estimated at exactly 730 days", () => {
    expect(
      projectGoal({ ...base, trendKg: 153, targetKg: 80, kgPerWeek: -0.7 }),
    ).toMatchObject({ kind: "estimated", daysRemaining: 730 });
  });
  it.each(["calibrating", "achieved", "plateau", "wrong_direction", "stable", "out_of_band"] as const)(
    "is unavailable when the status is %s",
    (status) => {
      expect(projectGoal({ ...base, status })).toEqual({ kind: "unavailable" });
    },
  );
  it("is unavailable for maintain and recomp", () => {
    expect(projectGoal({ ...base, type: "maintain", targetKg: null })).toEqual({
      kind: "unavailable",
    });
    expect(projectGoal({ ...base, type: "recomp", targetKg: null })).toEqual({
      kind: "unavailable",
    });
  });
  it("is unavailable without a pace, with a null pace or against the goal's direction", () => {
    expect(projectGoal({ ...base, kgPerWeek: null })).toEqual({ kind: "unavailable" });
    expect(projectGoal({ ...base, kgPerWeek: 0 })).toEqual({ kind: "unavailable" });
    expect(projectGoal({ ...base, kgPerWeek: 0.3 })).toEqual({ kind: "unavailable" });
  });
});

describe("goalProgress", () => {
  it("is (start − trend) / (start − target) for a loss", () => {
    expect(goalProgress(90, 88, 80)).toBeCloseTo(0.2, 10);
  });
  it("is the same ratio for a gain", () => {
    expect(goalProgress(70, 72, 80)).toBeCloseTo(0.2, 10);
  });
  it("is clamped between 0 and 1", () => {
    expect(goalProgress(90, 92, 80)).toBe(0);
    expect(goalProgress(90, 70, 80)).toBe(1);
  });
  it("is 0 when start and target coincide", () => {
    expect(goalProgress(80, 80, 80)).toBe(0);
  });
});
```

- [ ] **Étape 2 : vérifier l'échec**

Run : `pnpm vitest run src/lib/metrics/projection.test.ts`
Attendu : FAIL.

- [ ] **Étape 3 : implémenter**

`src/lib/metrics/projection.ts` :

```ts
import { addDays, type LocalDate } from "@/lib/dates";
import { PROJECTION_MAX_DAYS } from "./config";
import { daysToReach, type GoalType } from "./goal-rates";
import type { GoalStatusCode } from "./goal-status";

export type Projection =
  | { kind: "estimated"; date: LocalDate; daysRemaining: number }
  | { kind: "too_far" }
  | { kind: "unavailable" };

const PROJECTABLE: readonly GoalStatusCode[] = ["on_track", "too_slow", "too_fast"];

/**
 * specs/03 §5.4: only for loss or gain whose status is on_track, too_slow or too_fast.
 * `kgPerWeek` is the real pace from raw weighings (negative = losing).
 */
export function projectGoal(input: {
  type: GoalType;
  targetKg: number | null;
  status: GoalStatusCode;
  trendKg: number;
  kgPerWeek: number | null;
  today: LocalDate;
}): Projection {
  const { type, targetKg, status, trendKg, kgPerWeek, today } = input;
  const unavailable: Projection = { kind: "unavailable" };
  if ((type !== "lose" && type !== "gain") || targetKg === null) return unavailable;
  if (!PROJECTABLE.includes(status) || kgPerWeek === null) return unavailable;
  const towardTarget = type === "lose" ? kgPerWeek < 0 : kgPerWeek > 0;
  if (!towardTarget) return unavailable;

  const daysRemaining = daysToReach(Math.abs(targetKg - trendKg), Math.abs(kgPerWeek) / 7);
  if (daysRemaining > PROJECTION_MAX_DAYS) return { kind: "too_far" };
  return { kind: "estimated", date: addDays(today, daysRemaining), daysRemaining };
}

/** Share of the way done, between 0 and 1: (start − trend) / (start − target). */
export function goalProgress(startKg: number, trendKg: number, targetKg: number): number {
  const total = startKg - targetKg;
  if (total === 0) return 0;
  return Math.min(1, Math.max(0, (startKg - trendKg) / total));
}
```

`src/lib/metrics/index.ts` : ajouter `export * from "./projection";`.

- [ ] **Étape 4 : vérifier, avec la couverture**

Run : `pnpm vitest run src/lib/metrics src/lib/dates.test.ts --coverage`
Attendu : PASS, couverture ≥ 95 % sur `src/lib/metrics/**`. Si une branche manque, ajouter le test correspondant (pas d'exclusion de couverture).

- [ ] **Étape 5 : commit**

```bash
pnpm format && git add src/lib/metrics && git commit -m "feat(metrics): goal projection and progress

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Tâche 4 : table `goal`, migration et requêtes (BODY-30, BODY-31 : données)

**Fichiers :**
- Modifier : `src/lib/db/schema/app.ts`
- Créer : `drizzle/0003_goal.sql` (généré), `src/features/goals/queries.ts`, `tests/integration/goal.test.ts`

**Interfaces :**
- Consomme : `user`, `GoalType`, `LocalDate`, `Db`.
- Produit :
  - table `goal` (`goalTypeEnum`, `goalStatusEnum`), types `Goal = typeof goal.$inferSelect`
  - `type NewGoal = { type: GoalType; startDate: LocalDate; startWeightKg: number; targetWeightKg: number | null; weeklyRatePct: number | null }`
  - `getActiveGoal(db, userId): Promise<Goal | null>`
  - `listPastGoals(db, userId): Promise<Goal[]>` (non actifs, du plus récent au plus ancien)
  - `createGoal(db, userId, g: NewGoal): Promise<void>`
  - `replaceActiveGoal(db, userId, g: NewGoal, endAs: "archived" | "achieved", endedAt: LocalDate): Promise<void>` (transaction)
  - `finishActiveGoal(db, userId, endAs: "archived" | "achieved", endedAt: LocalDate): Promise<boolean>`
  - `updateActiveGoalTarget(db, userId, t: { targetWeightKg: number; weeklyRatePct: number }): Promise<boolean>`

- [ ] **Étape 1 : écrire le test d'intégration qui échoue**

`tests/integration/goal.test.ts` :

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createGoal,
  finishActiveGoal,
  getActiveGoal,
  listPastGoals,
  replaceActiveGoal,
  updateActiveGoalTarget,
  type NewGoal,
} from "@/features/goals/queries";
import type { Db } from "@/lib/db/types";
import { createTestDb, insertTestUser } from "../helpers/db";

const loseGoal: NewGoal = {
  type: "lose",
  startDate: "2026-09-01",
  startWeightKg: 90,
  targetWeightKg: 80,
  weeklyRatePct: 0.5,
};
const maintainGoal: NewGoal = {
  type: "maintain",
  startDate: "2026-10-03",
  startWeightKg: 84.5,
  targetWeightKg: null,
  weeklyRatePct: null,
};

describe("goals", () => {
  let db: Db;
  let close: () => Promise<void>;

  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    await insertTestUser(db, "alice");
    await insertTestUser(db, "bob");
  });
  afterEach(() => close());

  it("creates an active goal and reads it back", async () => {
    await createGoal(db, "alice", loseGoal);
    expect(await getActiveGoal(db, "alice")).toMatchObject({
      ...loseGoal,
      status: "active",
      endedAt: null,
    });
  });

  it("returns null without an active goal", async () => {
    expect(await getActiveGoal(db, "alice")).toBeNull();
  });

  it("refuses a second active goal (partial unique index)", async () => {
    await createGoal(db, "alice", loseGoal);
    await expect(createGoal(db, "alice", maintainGoal)).rejects.toThrow();
    expect(await listPastGoals(db, "alice")).toHaveLength(0);
  });

  it("lets two users each have an active goal", async () => {
    await createGoal(db, "alice", loseGoal);
    await createGoal(db, "bob", maintainGoal);
    expect((await getActiveGoal(db, "bob"))?.type).toBe("maintain");
  });

  it("replaces the active goal: the old one is archived, the new one is active", async () => {
    await createGoal(db, "alice", loseGoal);
    await replaceActiveGoal(db, "alice", maintainGoal, "archived", "2026-10-03");
    expect((await getActiveGoal(db, "alice"))?.type).toBe("maintain");
    expect(await listPastGoals(db, "alice")).toMatchObject([
      { type: "lose", status: "archived", endedAt: "2026-10-03" },
    ]);
  });

  it("replaces by marking the old goal achieved", async () => {
    await createGoal(db, "alice", loseGoal);
    await replaceActiveGoal(db, "alice", maintainGoal, "achieved", "2026-10-03");
    expect((await listPastGoals(db, "alice"))[0].status).toBe("achieved");
  });

  it("rolls back when the insert fails: the old goal stays active", async () => {
    await createGoal(db, "alice", loseGoal);
    // A maintain goal with a target breaks the target/rate CHECK.
    const broken: NewGoal = { ...maintainGoal, targetWeightKg: 80 };
    await expect(replaceActiveGoal(db, "alice", broken, "archived", "2026-10-03")).rejects.toThrow();
    expect((await getActiveGoal(db, "alice"))?.type).toBe("lose");
    expect(await listPastGoals(db, "alice")).toHaveLength(0);
  });

  it("finishes the active goal without creating another", async () => {
    await createGoal(db, "alice", loseGoal);
    expect(await finishActiveGoal(db, "alice", "achieved", "2026-10-03")).toBe(true);
    expect(await getActiveGoal(db, "alice")).toBeNull();
    expect(await finishActiveGoal(db, "alice", "achieved", "2026-10-03")).toBe(false);
  });

  it("updates the target and rate of the active goal in place", async () => {
    await createGoal(db, "alice", loseGoal);
    const before = await getActiveGoal(db, "alice");
    expect(
      await updateActiveGoalTarget(db, "alice", { targetWeightKg: 78, weeklyRatePct: 0.75 }),
    ).toBe(true);
    const after = await getActiveGoal(db, "alice");
    expect(after).toMatchObject({ id: before?.id, targetWeightKg: 78, weeklyRatePct: 0.75 });
    expect(after?.startWeightKg).toBe(90);
  });

  it("lists past goals, most recent first", async () => {
    await createGoal(db, "alice", { ...loseGoal, startDate: "2026-01-01" });
    await replaceActiveGoal(db, "alice", { ...loseGoal, startDate: "2026-05-01" }, "archived", "2026-04-30");
    await replaceActiveGoal(db, "alice", maintainGoal, "archived", "2026-10-03");
    expect((await listPastGoals(db, "alice")).map((g) => g.startDate)).toEqual([
      "2026-05-01",
      "2026-01-01",
    ]);
  });

  describe("isolation", () => {
    beforeEach(async () => {
      await createGoal(db, "bob", { ...maintainGoal, startWeightKg: 95 });
    });

    it("never reads another user's goals", async () => {
      expect(await getActiveGoal(db, "alice")).toBeNull();
      expect(await listPastGoals(db, "alice")).toEqual([]);
    });

    it("never updates or finishes another user's goal", async () => {
      expect(await updateActiveGoalTarget(db, "alice", { targetWeightKg: 70, weeklyRatePct: 0.5 })).toBe(false);
      expect(await finishActiveGoal(db, "alice", "archived", "2026-10-03")).toBe(false);
      expect(await getActiveGoal(db, "bob")).toMatchObject({ status: "active", startWeightKg: 95 });
    });
  });

  describe("database constraints", () => {
    const insert = (g: Partial<NewGoal> & { type: NewGoal["type"] }) =>
      createGoal(db, "alice", { ...loseGoal, ...g });

    it("rejects a loss goal without target or rate", async () => {
      await expect(insert({ targetWeightKg: null, weeklyRatePct: null })).rejects.toThrow();
    });
    it("rejects a target without a rate", async () => {
      await expect(insert({ type: "maintain", targetWeightKg: 80, weeklyRatePct: null })).rejects.toThrow();
    });
    it("rejects a rate outside the bounds of its type", async () => {
      await expect(insert({ type: "lose", weeklyRatePct: 1.6 })).rejects.toThrow();
      await expect(insert({ type: "gain", targetWeightKg: 95, weeklyRatePct: 0.8 })).rejects.toThrow();
    });
    it("rejects weights outside 20-400 kg", async () => {
      await expect(insert({ type: "lose", startWeightKg: 19, targetWeightKg: 15 })).rejects.toThrow();
      await expect(insert({ type: "gain", startWeightKg: 90, targetWeightKg: 401, weeklyRatePct: 0.25 })).rejects.toThrow();
    });
  });
});
```

- [ ] **Étape 2 : vérifier l'échec**

Run : `pnpm vitest run tests/integration/goal.test.ts`
Attendu : FAIL (`features/goals/queries` introuvable).

- [ ] **Étape 3 : ajouter la table**

Dans `src/lib/db/schema/app.ts`, ajouter `uniqueIndex` à l'import de `drizzle-orm/pg-core`, puis à la suite des enums et à la fin du fichier :

```ts
export const goalTypeEnum = pgEnum("goal_type", ["lose", "gain", "recomp", "maintain"]);
export const goalStatusEnum = pgEnum("goal_status", ["active", "achieved", "archived"]);
```

```ts
export const goal = pgTable(
  "goal",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: goalTypeEnum("type").notNull(),
    status: goalStatusEnum("status").default("active").notNull(),
    // Local calendar dates (profile timezone), like weight_entry.date.
    startDate: date("start_date", { mode: "string" }).notNull(),
    // Trend at creation (latest weighing while calibrating); the reference for maintain and recomp.
    startWeightKg: numeric("start_weight_kg", { precision: 5, scale: 2, mode: "number" }).notNull(),
    targetWeightKg: numeric("target_weight_kg", { precision: 5, scale: 2, mode: "number" }),
    weeklyRatePct: numeric("weekly_rate_pct", { precision: 3, scale: 2, mode: "number" }),
    endedAt: date("ended_at", { mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    // EF-GOAL-02: one active goal per user.
    uniqueIndex("goal_one_active_per_user")
      .on(t.userId)
      .where(sql`${t.status} = 'active'`),
    index("goal_user_id_idx").on(t.userId),
    check(
      "goal_target_and_rate",
      sql`(${t.type} in ('lose', 'gain')) = (${t.targetWeightKg} is not null and ${t.weeklyRatePct} is not null)`,
    ),
    check("goal_target_with_rate", sql`(${t.targetWeightKg} is null) = (${t.weeklyRatePct} is null)`),
    check(
      "goal_rate_range",
      sql`${t.weeklyRatePct} is null
        or (${t.type} = 'lose' and ${t.weeklyRatePct} between 0.25 and 1.5)
        or (${t.type} = 'gain' and ${t.weeklyRatePct} between 0.1 and 0.75)`,
    ),
    check(
      "goal_weight_range",
      sql`${t.startWeightKg} between 20 and 400
        and (${t.targetWeightKg} is null or ${t.targetWeightKg} between 20 and 400)`,
    ),
    check("goal_ended_at", sql`(${t.status} = 'active') = (${t.endedAt} is null)`),
  ],
);
```

- [ ] **Étape 4 : générer et contrôler la migration**

Run : `pnpm db:generate --name goal`
Attendu : `drizzle/0003_goal.sql` créé (et `meta/0003_snapshot.json`). Vérifier à la lecture que le SQL contient les deux `CREATE TYPE`, le `CREATE TABLE "goal"`, les six `CONSTRAINT ... CHECK` et `CREATE UNIQUE INDEX "goal_one_active_per_user" ... WHERE "goal"."status" = 'active'`. Si le nom du fichier diffère, l'adopter tel quel.

- [ ] **Étape 5 : implémenter les requêtes**

`src/features/goals/queries.ts` :

```ts
import { and, desc, eq, ne } from "drizzle-orm";
import type { LocalDate } from "@/lib/dates";
import { goal } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";
import type { GoalType } from "@/lib/metrics";

export type Goal = typeof goal.$inferSelect;
export type NewGoal = {
  type: GoalType;
  startDate: LocalDate;
  startWeightKg: number;
  targetWeightKg: number | null;
  weeklyRatePct: number | null;
};
export type EndStatus = "archived" | "achieved";

export async function getActiveGoal(db: Db, userId: string): Promise<Goal | null> {
  const [row] = await db
    .select()
    .from(goal)
    .where(and(eq(goal.userId, userId), eq(goal.status, "active")));
  return row ?? null;
}

/** Achieved and archived goals, most recent first (EF-GOAL-05). */
export async function listPastGoals(db: Db, userId: string): Promise<Goal[]> {
  return db
    .select()
    .from(goal)
    .where(and(eq(goal.userId, userId), ne(goal.status, "active")))
    .orderBy(desc(goal.startDate), desc(goal.createdAt));
}

export async function createGoal(db: Db, userId: string, g: NewGoal) {
  await db.insert(goal).values({ userId, ...g });
}

/** Ends the active goal and starts another, atomically (specs/05 §4.2). */
export async function replaceActiveGoal(
  db: Db,
  userId: string,
  g: NewGoal,
  endAs: EndStatus,
  endedAt: LocalDate,
) {
  await db.transaction(async (tx) => {
    await finishActiveGoal(tx, userId, endAs, endedAt);
    await createGoal(tx, userId, g);
  });
}

/** Ends the active goal. False when the user has none. */
export async function finishActiveGoal(
  db: Db,
  userId: string,
  endAs: EndStatus,
  endedAt: LocalDate,
): Promise<boolean> {
  const rows = await db
    .update(goal)
    .set({ status: endAs, endedAt })
    .where(and(eq(goal.userId, userId), eq(goal.status, "active")))
    .returning({ id: goal.id });
  return rows.length > 0;
}

/** EF-GOAL-02 CA2: changes target and rate in place. False when the user has no active goal. */
export async function updateActiveGoalTarget(
  db: Db,
  userId: string,
  t: { targetWeightKg: number; weeklyRatePct: number },
): Promise<boolean> {
  const rows = await db
    .update(goal)
    .set(t)
    .where(and(eq(goal.userId, userId), eq(goal.status, "active")))
    .returning({ id: goal.id });
  return rows.length > 0;
}
```

- [ ] **Étape 6 : vérifier**

Run : `pnpm vitest run tests/integration/goal.test.ts && pnpm typecheck`
Attendu : PASS.

- [ ] **Étape 7 : commit**

```bash
pnpm format && git add src/lib/db drizzle src/features/goals tests/integration/goal.test.ts && git commit -m "feat(goals): goal table, migration and user-scoped queries

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Tâche 5 : validation et action `saveGoalAction` (BODY-30, BODY-31 : serveur)

**Fichiers :**
- Créer : `src/features/goals/schemas.ts`, `src/features/goals/schemas.test.ts`, `src/features/goals/actions.ts`, `src/features/goals/actions.test.ts`
- Modifier : `src/lib/action-result.ts`, `src/lib/action-result.test.ts`

**Interfaces :**
- Consomme : `weightEntry`-like helpers (`parseDecimal`, `toStoredKg`, `round2`), `WEIGHT_MIN_KG`/`WEIGHT_MAX_KG`, `GOAL_RATES`, `isRateInBounds`, `snapRate`, `goalReferenceKg`, `today`, `requireUser`, `getDb`, `listWeights`, requêtes de la tâche 4, `confirmedReasons`, `fieldErrorsFrom`, `keepValues`.
- Produit :
  - `ConfirmReason = "replace" | "suspicious" | "archive"`
  - `goalInputSchema(referenceKg: number)` → sortie `{ type: GoalType; unit: WeightUnit; targetWeightKg: number | null; weeklyRatePct: number | null }`
  - `saveGoalAction(prev: ActionResult | null, formData: FormData): Promise<ActionResult>`
  - champs du formulaire : `type`, `target`, `rate`, `unit`, `confirm`, `confirmed`

- [ ] **Étape 1 : tests du schéma (échec attendu)**

`src/features/goals/schemas.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { goalInputSchema } from "./schemas";

const REF = 80;
const parse = (input: Record<string, string>) => goalInputSchema(REF).safeParse({ unit: "kg", ...input });
const errors = (input: Record<string, string>) => {
  const r = parse(input);
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message]));
};

describe("goalInputSchema", () => {
  it("accepts a loss goal with a French decimal", () => {
    expect(parse({ type: "lose", target: "75,5", rate: "0,5" })).toMatchObject({
      success: true,
      data: { type: "lose", targetWeightKg: 75.5, weeklyRatePct: 0.5 },
    });
  });

  it("accepts a gain goal", () => {
    expect(parse({ type: "gain", target: "85", rate: "0.25" })).toMatchObject({
      success: true,
      data: { type: "gain", targetWeightKg: 85, weeklyRatePct: 0.25 },
    });
  });

  it("converts a target typed in pounds to kilograms", () => {
    const r = goalInputSchema(REF).safeParse({ type: "lose", target: "165", rate: "0.5", unit: "lb" });
    expect(r).toMatchObject({ success: true, data: { targetWeightKg: 74.84 } });
  });

  it("snaps the rate to the 0.05 step", () => {
    expect(parse({ type: "lose", target: "75", rate: "0,37" })).toMatchObject({
      data: { weeklyRatePct: 0.35 },
    });
  });

  it("ignores target and rate for maintain and recomp", () => {
    for (const type of ["maintain", "recomp"]) {
      expect(parse({ type, target: "abc", rate: "99" })).toMatchObject({
        success: true,
        data: { type, targetWeightKg: null, weeklyRatePct: null },
      });
    }
  });

  it("rejects a loss target at or above the current weight", () => {
    expect(errors({ type: "lose", target: "80", rate: "0.5" }).target).toMatch(/inférieure/);
    expect(errors({ type: "lose", target: "81", rate: "0.5" }).target).toMatch(/inférieure/);
  });

  it("rejects a gain target at or below the current weight", () => {
    expect(errors({ type: "gain", target: "80", rate: "0.25" }).target).toMatch(/supérieure/);
    expect(errors({ type: "gain", target: "70", rate: "0.25" }).target).toMatch(/supérieure/);
  });

  it("rejects targets outside 20-400 kg", () => {
    expect(errors({ type: "lose", target: "19,9", rate: "0.5" }).target).toBeDefined();
    expect(errors({ type: "gain", target: "400,1", rate: "0.25" }).target).toBeDefined();
  });

  it("rejects absurd, negative and empty targets without producing NaN", () => {
    for (const target of ["1e400", "Infinity", "-80", "", "abc", "NaN"]) {
      expect(errors({ type: "lose", target, rate: "0.5" }).target, target).toBeDefined();
    }
  });

  it("rejects a rate outside the bounds of the type", () => {
    expect(errors({ type: "lose", target: "75", rate: "0,2" }).rate).toBeDefined();
    expect(errors({ type: "lose", target: "75", rate: "1,6" }).rate).toBeDefined();
    expect(errors({ type: "gain", target: "85", rate: "0,05" }).rate).toBeDefined();
    expect(errors({ type: "gain", target: "85", rate: "0,3" }).rate).toBeUndefined();
    expect(errors({ type: "gain", target: "85", rate: "0,8" }).rate).toBeDefined();
  });

  it("rejects absurd and empty rates", () => {
    for (const rate of ["", "abc", "1e400", "-0.5"]) {
      expect(errors({ type: "lose", target: "75", rate }).rate, rate).toBeDefined();
    }
  });

  it("rejects an unknown type", () => {
    expect(errors({ type: "bulk" }).type).toBeDefined();
    expect(errors({}).type).toBeDefined();
  });
});
```

Run : `pnpm vitest run src/features/goals/schemas.test.ts` → FAIL.

- [ ] **Étape 2 : implémenter le schéma**

`src/features/goals/schemas.ts` :

```ts
import { z } from "zod";
import { WEIGHT_MAX_KG, WEIGHT_MIN_KG } from "@/features/weight/limits";
import { GOAL_RATES, isRateInBounds, snapRate } from "@/lib/metrics";
import { parseDecimal, toStoredKg } from "@/lib/units";

const comma = (n: number) => String(n).replace(".", ",");

/**
 * A goal as typed in the form (specs/03 §4 and §9). `referenceKg` is the current
 * trend, or the latest weighing while calibrating. Typed pounds become kilograms.
 */
export function goalInputSchema(referenceKg: number) {
  return z
    .object({
      type: z.enum(["lose", "gain", "recomp", "maintain"], { error: "Choisis un type d'objectif" }),
      unit: z.enum(["kg", "lb"]),
      target: z.string().optional(),
      rate: z.string().optional(),
    })
    .transform((v, ctx) => {
      const { type, unit } = v;
      if (type === "maintain" || type === "recomp") {
        return { type, unit, targetWeightKg: null, weeklyRatePct: null };
      }

      let invalid = false;
      const fail = (path: string, message: string) => {
        invalid = true;
        ctx.addIssue({ code: "custom", path: [path], message });
      };

      const targetWeightKg = toStoredKg(parseDecimal(v.target), unit);
      if (
        !Number.isFinite(targetWeightKg) ||
        targetWeightKg < WEIGHT_MIN_KG ||
        targetWeightKg > WEIGHT_MAX_KG
      ) {
        fail("target", `Cible entre ${WEIGHT_MIN_KG} et ${WEIGHT_MAX_KG} kg`);
      } else if (type === "lose" && targetWeightKg >= referenceKg) {
        fail("target", "La cible doit être inférieure à ton poids actuel");
      } else if (type === "gain" && targetWeightKg <= referenceKg) {
        fail("target", "La cible doit être supérieure à ton poids actuel");
      }

      const weeklyRatePct = snapRate(parseDecimal(v.rate));
      if (!isRateInBounds(type, weeklyRatePct)) {
        const { min, max } = GOAL_RATES[type];
        fail("rate", `Rythme entre ${comma(min)} et ${comma(max)} % par semaine`);
      }

      if (invalid) return z.NEVER;
      return { type, unit, targetWeightKg, weeklyRatePct };
    });
}
```

Run : `pnpm vitest run src/features/goals/schemas.test.ts` → PASS.

- [ ] **Étape 3 : étendre `ConfirmReason`**

Dans `src/lib/action-result.ts` :

```ts
export type ConfirmReason = "replace" | "suspicious" | "archive";
const CONFIRM_REASONS: readonly ConfirmReason[] = ["replace", "suspicious", "archive"];
```

et mettre à jour le commentaire (« Writes that need an explicit yes (EF-WGT-02, EF-WGT-03, EF-GOAL-02) »). Dans `src/lib/action-result.test.ts`, ajouter un cas : `confirmedReasons` d'un `FormData` avec `confirmed=replace,archive` et `confirm=suspicious` renvoie les trois raisons. Run : `pnpm vitest run src/lib/action-result.test.ts` → PASS.

- [ ] **Étape 4 : tests de l'action (échec attendu)**

`src/features/goals/actions.test.ts` (même squelette de mocks que `src/features/weight/actions.test.ts`) :

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@/features/profile/queries";
import { insertWeights } from "@/features/weight/queries";
import type { Db } from "@/lib/db/types";
import { createTestDb, insertTestUser } from "../../../tests/helpers/db";
import { createGoal, getActiveGoal, listPastGoals } from "./queries";

const ctx = vi.hoisted(() => ({
  db: undefined as unknown as Db,
  requireUser: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: ctx.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("@/lib/db/client", () => ({ getDb: () => ctx.db }));
vi.mock("@/lib/session", () => ({ requireUser: ctx.requireUser }));

import { saveGoalAction } from "./actions";

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
const asUser = (userId: string, timezone = "Europe/Paris") =>
  ctx.requireUser.mockResolvedValue({
    userId,
    email: `${userId}@example.com`,
    emailVerified: true,
    profile: { ...profile(timezone), userId },
  });

/** 12 flat weighings at 80 kg: calibrated, trend 80. */
const seedWeights = (userId: string) =>
  insertWeights(
    ctx.db,
    userId,
    Array.from({ length: 12 }, (_, i) => ({
      date: `2026-09-${String(20 + i).padStart(2, "0")}`,
      weightKg: 80,
      bodyFatPct: null,
      note: null,
    })),
  );

describe("saveGoalAction", () => {
  let close: () => Promise<void>;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-03T10:00:00Z"));
    ({ db: ctx.db, close } = await createTestDb());
    await insertTestUser(ctx.db, "alice");
    await insertTestUser(ctx.db, "bob");
    await seedWeights("alice");
    asUser("alice");
  });
  afterEach(async () => {
    vi.useRealTimers();
    vi.clearAllMocks();
    await close();
  });

  it("creates a loss goal starting from the current trend, today", async () => {
    const result = await saveGoalAction(
      null,
      form({ type: "lose", target: "74,5", rate: "0,5", unit: "kg" }),
    );
    expect(result).toEqual({ ok: true });
    expect(await getActiveGoal(ctx.db, "alice")).toMatchObject({
      type: "lose",
      startDate: "2026-10-03",
      startWeightKg: 80,
      targetWeightKg: 74.5,
      weeklyRatePct: 0.5,
    });
    expect(ctx.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("uses the latest weighing as the start while calibrating", async () => {
    asUser("bob");
    await insertWeights(ctx.db, "bob", [
      { date: "2026-10-03", weightKg: 91.3, bodyFatPct: null, note: null },
    ]);
    await saveGoalAction(null, form({ type: "maintain", unit: "kg" }));
    expect(await getActiveGoal(ctx.db, "bob")).toMatchObject({
      type: "maintain",
      startWeightKg: 91.3,
      targetWeightKg: null,
    });
  });

  it("dates the goal in the profile's timezone, not in UTC", async () => {
    vi.setSystemTime(new Date("2026-10-04T02:30:00Z")); // still Oct 3 at 19:30 in Los Angeles
    asUser("alice", "America/Los_Angeles");
    await saveGoalAction(null, form({ type: "maintain", unit: "kg" }));
    expect((await getActiveGoal(ctx.db, "alice"))?.startDate).toBe("2026-10-03");
  });

  it("returns field errors and keeps the typed values", async () => {
    const result = await saveGoalAction(
      null,
      form({ type: "lose", target: "85", rate: "0,5", unit: "kg" }),
    );
    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { target: [expect.stringContaining("inférieure")] },
      values: { target: "85", rate: "0,5" },
    });
    expect(await getActiveGoal(ctx.db, "alice")).toBeNull();
  });

  it("refuses to set a goal without any weighing", async () => {
    asUser("bob");
    const result = await saveGoalAction(null, form({ type: "maintain", unit: "kg" }));
    expect(result).toMatchObject({ ok: false, formError: expect.stringContaining("pesée") });
  });

  it("updates target and rate in place when the type is unchanged", async () => {
    await createGoal(ctx.db, "alice", {
      type: "lose",
      startDate: "2026-09-01",
      startWeightKg: 90,
      targetWeightKg: 75,
      weeklyRatePct: 0.5,
    });
    const before = await getActiveGoal(ctx.db, "alice");
    const result = await saveGoalAction(
      null,
      form({ type: "lose", target: "72", rate: "0,75", unit: "kg" }),
    );
    expect(result).toEqual({ ok: true });
    expect(await getActiveGoal(ctx.db, "alice")).toMatchObject({
      id: before?.id,
      startWeightKg: 90,
      targetWeightKg: 72,
      weeklyRatePct: 0.75,
    });
    expect(await listPastGoals(ctx.db, "alice")).toHaveLength(0);
  });

  it("asks for confirmation before changing the type, and writes nothing", async () => {
    await createGoal(ctx.db, "alice", {
      type: "lose",
      startDate: "2026-09-01",
      startWeightKg: 90,
      targetWeightKg: 75,
      weeklyRatePct: 0.5,
    });
    const result = await saveGoalAction(
      null,
      form({ type: "gain", target: "85", rate: "0,25", unit: "kg" }),
    );
    expect(result).toMatchObject({
      ok: false,
      needsConfirmation: { reason: "archive", message: expect.stringContaining("archive") },
      values: { confirmed: "" },
    });
    expect((await getActiveGoal(ctx.db, "alice"))?.type).toBe("lose");
  });

  it("archives the old goal and creates the new one once confirmed", async () => {
    await createGoal(ctx.db, "alice", {
      type: "lose",
      startDate: "2026-09-01",
      startWeightKg: 90,
      targetWeightKg: 75,
      weeklyRatePct: 0.5,
    });
    const result = await saveGoalAction(
      null,
      form({ type: "gain", target: "85", rate: "0,25", unit: "kg", confirm: "archive" }),
    );
    expect(result).toEqual({ ok: true });
    expect(await getActiveGoal(ctx.db, "alice")).toMatchObject({ type: "gain", startWeightKg: 80 });
    expect(await listPastGoals(ctx.db, "alice")).toMatchObject([
      { type: "lose", status: "archived", endedAt: "2026-10-03" },
    ]);
  });

  it("is a no-op when saving the same maintain goal again", async () => {
    await saveGoalAction(null, form({ type: "maintain", unit: "kg" }));
    const before = await getActiveGoal(ctx.db, "alice");
    expect(await saveGoalAction(null, form({ type: "maintain", unit: "kg" }))).toEqual({ ok: true });
    expect((await getActiveGoal(ctx.db, "alice"))?.id).toBe(before?.id);
    expect(await listPastGoals(ctx.db, "alice")).toHaveLength(0);
  });

  it("only ever touches the caller's goals, whatever userId is forged", async () => {
    await createGoal(ctx.db, "bob", {
      type: "maintain",
      startDate: "2026-09-01",
      startWeightKg: 95,
      targetWeightKg: null,
      weeklyRatePct: null,
    });
    await saveGoalAction(
      null,
      form({ type: "lose", target: "75", rate: "0,5", unit: "kg", userId: "bob" }),
    );
    expect(await getActiveGoal(ctx.db, "bob")).toMatchObject({ type: "maintain", startWeightKg: 95 });
    expect((await getActiveGoal(ctx.db, "alice"))?.type).toBe("lose");
  });
});
```

Run : `pnpm vitest run src/features/goals/actions.test.ts` → FAIL.

- [ ] **Étape 5 : implémenter l'action**

Ajouter à `src/features/goals/copy.ts` (créé ici, complété en tâche 7) :

```ts
import type { GoalType } from "@/lib/metrics";

export const GOAL_LABELS: Record<GoalType, string> = {
  lose: "Perdre du poids",
  gain: "Prendre du poids",
  recomp: "Recomposition",
  maintain: "Maintien",
};

/** "Changer d'objectif archive « Perdre du poids » et en crée un nouveau. Continuer ?" */
export const archiveMessage = (from: GoalType) =>
  `Changer d'objectif archive « ${GOAL_LABELS[from]} » et en crée un nouveau. Continuer ?`;
```

`src/features/goals/actions.ts` :

```ts
"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { listWeights } from "@/features/weight/queries";
import {
  confirmedReasons,
  fieldErrorsFrom,
  keepValues,
  type ActionResult,
  type ConfirmReason,
} from "@/lib/action-result";
import { today } from "@/lib/dates";
import { getDb } from "@/lib/db/client";
import { goalReferenceKg } from "@/lib/metrics";
import { round2 } from "@/lib/units";
import { requireUser } from "@/lib/session";
import { archiveMessage } from "./copy";
import {
  createGoal,
  getActiveGoal,
  replaceActiveGoal,
  updateActiveGoalTarget,
} from "./queries";
import { goalInputSchema } from "./schemas";

const FIELDS = ["type", "target", "rate", "unit"];
const GENERIC_ERROR = "Une erreur est survenue, réessaie.";

/** EF-GOAL-01 and 02: creates the goal, updates its target and rate, or replaces it after a confirmation. */
export async function saveGoalAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { userId, profile } = await requireUser("app");
  const values = keepValues(formData, ...FIELDS);
  const todayDate = today(profile?.timezone ?? "Europe/Paris");

  try {
    const db = getDb();
    const referenceKg = goalReferenceKg(await listWeights(db, userId), todayDate);
    if (referenceKg === null) {
      return { ok: false, formError: "Ajoute d'abord une pesée pour définir un objectif.", values };
    }

    const parsed = goalInputSchema(referenceKg).safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error), values };
    const { type, targetWeightKg, weeklyRatePct } = parsed.data;

    const active = await getActiveGoal(db, userId);
    if (active && active.type !== type) {
      const confirmed = confirmedReasons(formData);
      if (!confirmed.has("archive")) {
        const reason: ConfirmReason = "archive";
        return {
          ok: false,
          needsConfirmation: { reason, message: archiveMessage(active.type) },
          values: { ...values, confirmed: [...confirmed].join(",") },
        };
      }
    }

    const next = { type, startDate: todayDate, startWeightKg: round2(referenceKg), targetWeightKg, weeklyRatePct };
    if (!active) {
      await createGoal(db, userId, next);
    } else if (active.type !== type) {
      await replaceActiveGoal(db, userId, next, "archived", todayDate);
    } else if (targetWeightKg !== null && weeklyRatePct !== null) {
      await updateActiveGoalTarget(db, userId, { targetWeightKg, weeklyRatePct });
    }
  } catch {
    // userId only: never the weights, the target or the rate (specs/07 §8).
    console.error("save_goal_failed", { userId });
    return { ok: false, formError: GENERIC_ERROR, values };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
```

- [ ] **Étape 6 : vérifier**

Run : `pnpm vitest run src/features/goals src/lib/action-result.test.ts && pnpm typecheck && pnpm lint`
Attendu : PASS.

- [ ] **Étape 7 : commit**

```bash
pnpm format && git add src && git commit -m "feat(goals): goal validation and save action with archive confirmation

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Tâche 6 : action « objectif atteint » (BODY-33 : serveur)

**Fichiers :**
- Modifier : `src/features/goals/actions.ts`, `src/features/goals/actions.test.ts`

**Interfaces :**
- Consomme : `goalStatus`, `currentTrend`, `listWeights`, `getActiveGoal`, `replaceActiveGoal`, `finishActiveGoal`.
- Produit : `achieveGoalAction(prev: ActionResult | null, formData: FormData): Promise<ActionResult>`. Champ `mode` = `"maintain"` (crée un objectif maintien) ou `"new"` (termine l'objectif puis redirige vers `/objectif`).

- [ ] **Étape 1 : tests (échec attendu)**

Compléter l'import de `actions.test.ts` : `import { achieveGoalAction, saveGoalAction } from "./actions";`, puis ajouter :

```ts
describe("achieveGoalAction", () => {
  let close: () => Promise<void>;
  const lose = (targetWeightKg: number) => ({
    type: "lose" as const,
    startDate: "2026-09-01",
    startWeightKg: 90,
    targetWeightKg,
    weeklyRatePct: 0.5,
  });

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-03T10:00:00Z"));
    ({ db: ctx.db, close } = await createTestDb());
    await insertTestUser(ctx.db, "alice");
    await insertTestUser(ctx.db, "bob");
    await seedWeights("alice"); // trend 80
    asUser("alice");
  });
  afterEach(async () => {
    vi.useRealTimers();
    vi.clearAllMocks();
    await close();
  });

  it("refuses when the goal is not reached, and changes nothing", async () => {
    await createGoal(ctx.db, "alice", lose(75)); // trend 80 > target 75
    const result = await achieveGoalAction(null, form({ mode: "maintain" }));
    expect(result).toMatchObject({ ok: false, formError: expect.any(String) });
    expect((await getActiveGoal(ctx.db, "alice"))?.type).toBe("lose");
    expect(await listPastGoals(ctx.db, "alice")).toHaveLength(0);
  });

  it("refuses when there is no active goal", async () => {
    expect(await achieveGoalAction(null, form({ mode: "maintain" }))).toMatchObject({ ok: false });
  });

  it("moves to maintenance: the old goal is achieved, the new reference is today's trend", async () => {
    await createGoal(ctx.db, "alice", lose(82)); // trend 80 ≤ target 82
    expect(await achieveGoalAction(null, form({ mode: "maintain" }))).toEqual({ ok: true });
    expect(await getActiveGoal(ctx.db, "alice")).toMatchObject({
      type: "maintain",
      startDate: "2026-10-03",
      startWeightKg: 80,
      targetWeightKg: null,
    });
    expect(await listPastGoals(ctx.db, "alice")).toMatchObject([
      { type: "lose", status: "achieved", endedAt: "2026-10-03" },
    ]);
    expect(ctx.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("'new' marks the goal achieved and sends the user to /objectif", async () => {
    await createGoal(ctx.db, "alice", lose(82));
    await expect(achieveGoalAction(null, form({ mode: "new" }))).rejects.toThrow("REDIRECT:/objectif");
    expect(await getActiveGoal(ctx.db, "alice")).toBeNull();
    expect((await listPastGoals(ctx.db, "alice"))[0].status).toBe("achieved");
  });

  it("dates the end in the profile's timezone", async () => {
    vi.setSystemTime(new Date("2026-10-04T02:30:00Z"));
    asUser("alice", "America/Los_Angeles");
    await createGoal(ctx.db, "alice", lose(82));
    await achieveGoalAction(null, form({ mode: "maintain" }));
    expect((await listPastGoals(ctx.db, "alice"))[0].endedAt).toBe("2026-10-03");
  });

  it("rejects an unknown mode", async () => {
    await createGoal(ctx.db, "alice", lose(82));
    expect(await achieveGoalAction(null, form({ mode: "delete" }))).toMatchObject({ ok: false });
    expect((await getActiveGoal(ctx.db, "alice"))?.type).toBe("lose");
  });

  it("never closes another user's goal", async () => {
    await createGoal(ctx.db, "bob", lose(82));
    await achieveGoalAction(null, form({ mode: "maintain", userId: "bob" }));
    expect(await getActiveGoal(ctx.db, "bob")).toMatchObject({ type: "lose", status: "active" });
  });
});
```

Run : `pnpm vitest run src/features/goals/actions.test.ts` → FAIL (`achieveGoalAction` absent).

- [ ] **Étape 2 : implémenter**

Dans `src/features/goals/actions.ts`, ajouter `import { redirect } from "next/navigation";`, importer `finishActiveGoal` et `goalStatus`, `currentTrend` (depuis `@/lib/metrics`), puis :

```ts
/**
 * EF-GOAL-04: closes a reached goal. The server recomputes the status itself:
 * the banner is only a hint. "maintain" starts a maintenance goal at today's trend,
 * "new" just ends the goal and lets the user pick another one.
 */
export async function achieveGoalAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { userId, profile } = await requireUser("app");
  const mode = String(formData.get("mode") ?? "");
  if (mode !== "maintain" && mode !== "new") return { ok: false, formError: GENERIC_ERROR };
  const todayDate = today(profile?.timezone ?? "Europe/Paris");

  try {
    const db = getDb();
    const [active, points] = await Promise.all([getActiveGoal(db, userId), listWeights(db, userId)]);
    if (!active || goalStatus(active, points, todayDate).status !== "achieved") {
      return { ok: false, formError: "Ton objectif n'est pas encore atteint." };
    }
    if (mode === "maintain") {
      await replaceActiveGoal(
        db,
        userId,
        {
          type: "maintain",
          startDate: todayDate,
          startWeightKg: round2(currentTrend(points.filter((p) => p.date <= todayDate)) as number),
          targetWeightKg: null,
          weeklyRatePct: null,
        },
        "achieved",
        todayDate,
      );
    } else {
      await finishActiveGoal(db, userId, "achieved", todayDate);
    }
  } catch {
    console.error("achieve_goal_failed", { userId });
    return { ok: false, formError: GENERIC_ERROR };
  }

  revalidatePath("/", "layout");
  if (mode === "new") redirect("/objectif");
  return { ok: true };
}
```

`redirect` lève une exception : il est appelé **hors** du `try`.

- [ ] **Étape 3 : vérifier**

Run : `pnpm vitest run src/features/goals && pnpm typecheck && pnpm lint`
Attendu : PASS.

- [ ] **Étape 4 : commit**

```bash
pnpm format && git add src/features/goals && git commit -m "feat(goals): close a reached goal (maintenance or new goal)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Tâche 7 : résumés d'objectif et textes (BODY-32, BODY-34 : données d'affichage)

**Fichiers :**
- Créer : `src/features/goals/summary.ts`, `src/features/goals/summary.test.ts`, `src/features/goals/copy.test.ts`
- Modifier : `src/features/goals/copy.ts`

**Interfaces :**
- Consomme : `Goal`, `GoalSpec`, `goalStatus`, `goalReferenceKg`, `projectGoal`, `goalProgress`, `weeklyRate`, `currentTrend`, `formatDelta`, `formatShortDate`, `formatWeight`, `toDisplayWeight`.
- Produit :
  - `type ActiveGoalSummary = { state: "active"; type: GoalType; targetKg: number | null; weeklyRatePct: number | null; startKg: number; startDate: LocalDate; referenceKg: number; status: GoalStatus; progress: { doneKg: number; totalKg: number; ratio: number } | null; projection: Projection; rate: WeeklyRate | null }`
  - `type GoalSummary = { state: "none" } | ActiveGoalSummary`
  - `buildGoalSummary(goal: (GoalSpec & { startDate: LocalDate }) | null, points: readonly WeightPoint[], today: LocalDate, waist?: readonly WaistMeasure[]): GoalSummary`
  - `type PastGoalSummary = { id: string; type: GoalType; status: "achieved" | "archived"; startDate: LocalDate; endedAt: LocalDate; startKg: number; endKg: number | null }`
  - `buildGoalHistory(goals: readonly Goal[], points: readonly WeightPoint[]): PastGoalSummary[]`
  - `copy.ts` : `GOAL_LABELS`, `GOAL_DESCRIPTIONS`, `archiveMessage` (tâche 5), `RATE_ALERTS`, `statusMessage(summary: ActiveGoalSummary, unit: WeightUnit): string`, `projectionLabel(p: Projection, today: LocalDate): string`, `GOAL_DISCLAIMER`, `HISTORY_STATUS_LABELS` (historique)

- [ ] **Étape 1 : tests de `buildGoalSummary` et `buildGoalHistory` (échec attendu)**

`src/features/goals/summary.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/dates";
import type { Goal } from "./queries";
import { buildGoalHistory, buildGoalSummary } from "./summary";

const TODAY = "2026-10-07";
const linear = (start: number, perDay: number, days: number) =>
  Array.from({ length: days + 1 }, (_, i) => ({
    date: addDays(TODAY, i - days),
    weightKg: start + perDay * i,
  }));
const lose = {
  type: "lose" as const,
  startDate: "2026-09-01",
  startWeightKg: 90,
  targetWeightKg: 80,
  weeklyRatePct: 0.5,
};

describe("buildGoalSummary", () => {
  it("is 'none' without an active goal, whatever the weighings", () => {
    expect(buildGoalSummary(null, linear(80, 0, 20), TODAY)).toEqual({ state: "none" });
    expect(buildGoalSummary(null, [], TODAY)).toEqual({ state: "none" });
  });

  it("describes an on-track loss: status, progress, projection, rate", () => {
    const s = buildGoalSummary(lose, linear(90, -0.05, 30), TODAY);
    expect(s).toMatchObject({
      state: "active",
      type: "lose",
      targetKg: 80,
      startKg: 90,
      status: { status: "on_track" },
      projection: { kind: "estimated" },
    });
    if (s.state !== "active") throw new Error("unreachable");
    expect(s.referenceKg).toBeCloseTo(88.93, 2);
    expect(s.progress?.doneKg).toBeCloseTo(1.07, 2);
    expect(s.progress?.totalKg).toBe(10);
    expect(s.progress?.ratio).toBeCloseTo(0.107, 3);
    expect(s.rate?.pctPerWeek).toBeCloseTo(-0.394, 2);
  });

  it("while calibrating: latest weighing as reference, no rate, no projection", () => {
    const s = buildGoalSummary(lose, linear(88, 0, 2), TODAY);
    expect(s).toMatchObject({
      state: "active",
      referenceKg: 88,
      rate: null,
      status: { status: "calibrating", missingEntries: 4 },
      projection: { kind: "unavailable" },
    });
  });

  it("clamps the done distance at zero when the weight moved the wrong way", () => {
    const s = buildGoalSummary(lose, linear(92, 0, 20), TODAY);
    if (s.state !== "active") throw new Error("unreachable");
    expect(s.progress).toMatchObject({ doneKg: 0, ratio: 0 });
  });

  it("has no progress bar for maintain and recomp", () => {
    const s = buildGoalSummary(
      { type: "maintain", startDate: "2026-09-01", startWeightKg: 80, targetWeightKg: null, weeklyRatePct: null },
      linear(80, 0, 10),
      TODAY,
    );
    expect(s).toMatchObject({ state: "active", progress: null, status: { status: "stable" } });
  });

  it("works for a goal whose start weight is missing from the weighings (no weighing at all)", () => {
    expect(buildGoalSummary(lose, [], TODAY)).toMatchObject({
      state: "active",
      referenceKg: 90,
      status: { status: "calibrating" },
    });
  });
});

describe("buildGoalHistory", () => {
  const past = (over: Partial<Goal>): Goal => ({
    id: "g1",
    userId: "alice",
    type: "lose",
    status: "archived",
    startDate: "2026-09-01",
    startWeightKg: 90,
    targetWeightKg: 80,
    weeklyRatePct: 0.5,
    endedAt: "2026-09-30",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  });

  it("reports the trend at the end date, ignoring later weighings", () => {
    const points = [...linear(90, 0, 20), { date: addDays(TODAY, 5), weightKg: 120 }];
    const history = buildGoalHistory([past({ endedAt: TODAY })], points);
    expect(history).toEqual([
      {
        id: "g1",
        type: "lose",
        status: "archived",
        startDate: "2026-09-01",
        endedAt: TODAY,
        startKg: 90,
        endKg: 90,
      },
    ]);
  });

  it("has no end weight when nothing was weighed by then", () => {
    expect(buildGoalHistory([past({ endedAt: "2026-01-01" })], linear(90, 0, 5))[0].endKg).toBeNull();
  });

  it("skips an active goal if one slips in", () => {
    expect(buildGoalHistory([past({ status: "active", endedAt: null })], [])).toEqual([]);
  });
});
```

Run : `pnpm vitest run src/features/goals/summary.test.ts` → FAIL.

- [ ] **Étape 2 : implémenter `summary.ts`**

```ts
import type { LocalDate } from "@/lib/dates";
import {
  currentTrend,
  goalProgress,
  goalReferenceKg,
  goalStatus,
  projectGoal,
  weeklyRate,
  type GoalSpec,
  type GoalStatus,
  type GoalType,
  type Projection,
  type WaistMeasure,
  type WeeklyRate,
  type WeightPoint,
} from "@/lib/metrics";
import type { Goal } from "./queries";

export type ActiveGoalSummary = {
  state: "active";
  type: GoalType;
  targetKg: number | null;
  weeklyRatePct: number | null;
  startKg: number;
  startDate: LocalDate;
  /** Trend, or latest weighing while calibrating. */
  referenceKg: number;
  status: GoalStatus;
  /** Loss and gain only: "3,6 / 7,0 kg" and the bar. */
  progress: { doneKg: number; totalKg: number; ratio: number } | null;
  projection: Projection;
  /** Real pace over 4 weeks, null while calibrating. */
  rate: WeeklyRate | null;
};
export type GoalSummary = { state: "none" } | ActiveGoalSummary;

/** Everything the goal blocks show, already computed (specs/01 §3.2 and §3.7). */
export function buildGoalSummary(
  goal: (GoalSpec & { startDate: LocalDate }) | null,
  points: readonly WeightPoint[],
  today: LocalDate,
  waist: readonly WaistMeasure[] = [],
): GoalSummary {
  if (!goal) return { state: "none" };
  const past = points.filter((p) => p.date <= today);
  const referenceKg = goalReferenceKg(past, today) ?? goal.startWeightKg;
  const status = goalStatus(goal, past, today, waist);
  const rate = status.status === "calibrating" ? null : weeklyRate(past, today, referenceKg);

  const rated = goal.targetWeightKg !== null;
  const progress = rated
    ? {
        doneKg: Math.max(
          0,
          goal.type === "lose" ? goal.startWeightKg - referenceKg : referenceKg - goal.startWeightKg,
        ),
        totalKg: Math.abs(goal.startWeightKg - (goal.targetWeightKg as number)),
        ratio: goalProgress(goal.startWeightKg, referenceKg, goal.targetWeightKg as number),
      }
    : null;

  return {
    state: "active",
    type: goal.type,
    targetKg: goal.targetWeightKg,
    weeklyRatePct: goal.weeklyRatePct,
    startKg: goal.startWeightKg,
    startDate: goal.startDate,
    referenceKg,
    status,
    progress,
    projection: projectGoal({
      type: goal.type,
      targetKg: goal.targetWeightKg,
      status: status.status,
      trendKg: referenceKg,
      kgPerWeek: rate?.kgPerWeek ?? null,
      today,
    }),
    rate,
  };
}

export type PastGoalSummary = {
  id: string;
  type: GoalType;
  status: "achieved" | "archived";
  startDate: LocalDate;
  endedAt: LocalDate;
  startKg: number;
  /** Trend on the last day of the goal, null if nothing was weighed by then. */
  endKg: number | null;
};

/** EF-GOAL-05: type, period, start weight, end trend (computed at read time) and status. */
export function buildGoalHistory(
  goals: readonly Goal[],
  points: readonly WeightPoint[],
): PastGoalSummary[] {
  return goals.flatMap((g) =>
    g.status === "active" || g.endedAt === null
      ? []
      : [
          {
            id: g.id,
            type: g.type,
            status: g.status,
            startDate: g.startDate,
            endedAt: g.endedAt,
            startKg: g.startWeightKg,
            endKg: currentTrend(points.filter((p) => p.date <= (g.endedAt as string))),
          },
        ],
  );
}
```

Run : `pnpm vitest run src/features/goals/summary.test.ts` → PASS. (Si `ratio` ou `doneKg` diffèrent de la 3ᵉ décimale, ajuster l'attendu du test d'après la tendance réelle `88,93`, pas la formule.)

- [ ] **Étape 3 : tests des textes (échec attendu)**

`src/features/goals/copy.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { ActiveGoalSummary } from "./summary";
import { projectionLabel, statusMessage } from "./copy";

const NNBSP = " ";
const MINUS = "−";
const summary = (over: Partial<ActiveGoalSummary> & { status: ActiveGoalSummary["status"] }): ActiveGoalSummary => ({
  state: "active",
  type: "lose",
  targetKg: 75,
  weeklyRatePct: 0.5,
  startKg: 80,
  startDate: "2026-09-01",
  referenceKg: 78,
  progress: null,
  projection: { kind: "unavailable" },
  rate: null,
  ...over,
});
const st = (status: ActiveGoalSummary["status"]["status"], extra = {}) => ({
  status,
  missingEntries: 0,
  deviationKg: null,
  waist: null,
  ...extra,
});

describe("statusMessage (specs/03 §5)", () => {
  it.each([
    ["achieved", "lose", "Objectif atteint !"],
    ["wrong_direction", "lose", "Ta tendance remonte."],
    ["wrong_direction", "gain", "Ta tendance baisse."],
    ["too_fast", "lose", "Trop rapide : risque de perte musculaire."],
    ["too_fast", "gain", "Trop rapide : prise de gras probable."],
    ["too_slow", "lose", "Plus lent que prévu."],
    ["on_track", "gain", "Dans le rythme."],
    ["stable", "maintain", "Stable, dans ta zone (± 1,5 %)."],
  ] as const)("%s (%s)", (status, type, expected) => {
    expect(statusMessage(summary({ type, status: st(status) }), "kg")).toBe(expected);
  });

  it("explains the plateau", () => {
    expect(statusMessage(summary({ status: st("plateau") }), "kg")).toBe(
      "Plateau depuis 3 semaines. C'est normal de temps en temps. Si ça dure, ajuste ton alimentation ou ton activité.",
    );
  });

  it("counts the missing weighings, singular and plural", () => {
    expect(statusMessage(summary({ status: st("calibrating", { missingEntries: 4 }) }), "kg")).toBe(
      "Encore 4 pesées pour calculer ton rythme.",
    );
    expect(statusMessage(summary({ status: st("calibrating", { missingEntries: 1 }) }), "kg")).toBe(
      "Encore 1 pesée pour calculer ton rythme.",
    );
  });

  it("gives the gap out of the maintenance band, in the display unit", () => {
    const s = summary({ type: "maintain", status: st("out_of_band", { deviationKg: 2.5 }) });
    expect(statusMessage(s, "kg")).toBe(`Hors de ta zone : +2,5${NNBSP}kg`);
    expect(statusMessage({ ...s, status: st("out_of_band", { deviationKg: -1.2 }) }, "kg")).toBe(
      `Hors de ta zone : ${MINUS}1,2${NNBSP}kg`,
    );
    expect(statusMessage(s, "lb")).toBe(`Hors de ta zone : +5,5${NNBSP}lb`);
  });

  it("combines weight and waist for a recomposition", () => {
    const r = (status: "stable" | "out_of_band", waist: "waist_improving" | "waist_flat" | "waist_insufficient") =>
      statusMessage(summary({ type: "recomp", status: st(status, { waist, deviationKg: 2 }) }), "kg");
    expect(r("stable", "waist_improving")).toBe("Poids stable · Tour de taille en baisse");
    expect(r("stable", "waist_flat")).toBe("Poids stable · Tour de taille stable : patience, la recompo est lente.");
    expect(r("out_of_band", "waist_insufficient")).toBe(
      `Poids hors zone : +2${NNBSP}kg · Mesure ta taille régulièrement pour suivre ta recompo.`,
    );
  });
});

describe("projectionLabel", () => {
  const today = "2026-10-07";
  it("shows the estimated date", () => {
    expect(projectionLabel({ kind: "estimated", date: "2026-11-15", daysRemaining: 39 }, today)).toBe(
      "Atteinte estimée : ~ 15 nov.",
    );
  });
  it("adds the year when it differs", () => {
    expect(projectionLabel({ kind: "estimated", date: "2027-03-02", daysRemaining: 146 }, today)).toBe(
      "Atteinte estimée : ~ 2 mars 2027",
    );
  });
  it("handles the far and unavailable cases", () => {
    expect(projectionLabel({ kind: "too_far" }, today)).toBe("Plus de 2 ans au rythme actuel");
    expect(projectionLabel({ kind: "unavailable" }, today)).toBe("Non estimable pour l'instant");
  });
});
```

Run : `pnpm vitest run src/features/goals/copy.test.ts` → FAIL.

- [ ] **Étape 4 : compléter `copy.ts`**

Ajouter à `src/features/goals/copy.ts` (en plus de `GOAL_LABELS` et `archiveMessage`) :

```ts
import type { LocalDate } from "@/lib/dates";
import type { Projection, RatedGoalType, WaistIndicator } from "@/lib/metrics";
import { formatDelta, toDisplayWeight, type WeightUnit } from "@/lib/units";
import { formatShortDate } from "@/lib/dates";
import type { ActiveGoalSummary } from "./summary";

const NNBSP = " ";

export const GOAL_DESCRIPTIONS: Record<GoalType, string> = {
  lose: "Perdre du poids à un rythme choisi, jusqu'à une cible.",
  gain: "Prendre du poids progressivement, jusqu'à une cible.",
  recomp: "Garder le même poids en perdant du gras et en gagnant du muscle.",
  maintain: "Rester dans ta zone actuelle (± 1,5 %).",
};

/** Alert shown by the slider past the recommended zone (specs/03 §4). */
export const RATE_ALERTS: Record<RatedGoalType, string> = {
  lose: "Rythme agressif : risque accru de perte musculaire et de fatigue.",
  gain: "Rythme rapide : une part importante de la prise sera du gras.",
};

export const GOAL_DISCLAIMER =
  "my-body ne fournit pas de conseil médical. Consulte un professionnel de santé avant de débuter un régime.";

export const HISTORY_STATUS_LABELS = { achieved: "Atteint", archived: "Archivé" } as const;

const WAIST_MESSAGES: Record<WaistIndicator, string> = {
  waist_insufficient: "Mesure ta taille régulièrement pour suivre ta recompo.",
  waist_improving: "Tour de taille en baisse",
  waist_flat: "Tour de taille stable : patience, la recompo est lente.",
};

const signedKg = (deviationKg: number, unit: WeightUnit) =>
  `${formatDelta(toDisplayWeight(deviationKg, unit))}${NNBSP}${unit}`;

/** Message of the goal status (specs/03 §5), with the amounts in the user's unit. */
export function statusMessage(s: ActiveGoalSummary, unit: WeightUnit): string {
  const { status, missingEntries, deviationKg, waist } = s.status;
  switch (status) {
    case "calibrating":
      return `Encore ${missingEntries} ${missingEntries > 1 ? "pesées" : "pesée"} pour calculer ton rythme.`;
    case "achieved":
      return "Objectif atteint !";
    case "plateau":
      return "Plateau depuis 3 semaines. C'est normal de temps en temps. Si ça dure, ajuste ton alimentation ou ton activité.";
    case "wrong_direction":
      return s.type === "lose" ? "Ta tendance remonte." : "Ta tendance baisse.";
    case "too_fast":
      return s.type === "lose"
        ? "Trop rapide : risque de perte musculaire."
        : "Trop rapide : prise de gras probable.";
    case "too_slow":
      return "Plus lent que prévu.";
    case "on_track":
      return "Dans le rythme.";
    case "stable":
    case "out_of_band": {
      const gap = signedKg(deviationKg ?? 0, unit);
      if (s.type === "recomp" && waist) {
        const weight = status === "stable" ? "Poids stable" : `Poids hors zone : ${gap}`;
        return `${weight} · ${WAIST_MESSAGES[waist]}`;
      }
      return status === "stable" ? "Stable, dans ta zone (± 1,5 %)." : `Hors de ta zone : ${gap}`;
    }
  }
}

export function projectionLabel(p: Projection, today: LocalDate): string {
  if (p.kind === "estimated") return `Atteinte estimée : ~ ${formatShortDate(p.date, today)}`;
  if (p.kind === "too_far") return "Plus de 2 ans au rythme actuel";
  return "Non estimable pour l'instant";
}
```

Note : « Poids stable · Tour de taille en baisse » est le message de la spec ; pour `waist_improving` on garde donc le libellé court, et la spec 03 §5.3 (« Tour de taille en baisse : ta recompo fonctionne. ») est réservée au bloc Suivi de la page Objectif (L4 y rattachera les mesures). Ne pas ajouter ce second texte en L3.

- [ ] **Étape 5 : vérifier**

Run : `pnpm vitest run src/features/goals && pnpm typecheck && pnpm lint`
Attendu : PASS.

- [ ] **Étape 6 : commit**

```bash
pnpm format && git add src/features/goals && git commit -m "feat(goals): goal summary, history and French status messages

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Tâche 8 : curseur, formulaire d'objectif et page `/objectif` (BODY-30, BODY-31, BODY-32, BODY-34 : UI)

**Fichiers :**
- Créer : `src/components/ui/slider.tsx`, `src/features/goals/components/goal-form.tsx`, `src/features/goals/components/goal-form.test.tsx`, `src/features/goals/components/goal-tracking.tsx`, `src/features/goals/components/goal-history.tsx`
- Modifier : `src/app/globals.css`, `src/app/(app)/objectif/page.tsx`, `src/components/ui/ui.test.tsx`

**Interfaces :**
- Consomme : `NumberStepper` (props `label`, `name`, `unit`, `value`, `onChange`, `min`, `max`, `fallback`, `error`), `Input`, `Button`, `useToast`, `saveGoalAction`, `GOAL_RATES`, `exceedsRecommended`, `previewKgPerWeek`, `theoreticalDate`, `snapRate`, `formatShortDate`, `fieldError`, `fieldValue`.
- Produit :
  - `Slider` : `{ label: string; name: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; zone?: { from: number; to: number }; format: (v: number) => string; describedBy?: string }`
  - `GoalForm` : `{ action: (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>; unit: WeightUnit; referenceKg: number; today: LocalDate; active: { type: GoalType; targetKg: number | null; weeklyRatePct: number | null } | null; submitLabel: string; extra?: ReactNode }` (le slot `extra` reçoit les boutons de l'onboarding)
  - `GoalTracking` : `{ summary: ActiveGoalSummary; unit: WeightUnit; today: LocalDate }`
  - `GoalHistory` : `{ items: PastGoalSummary[]; unit: WeightUnit }`

- [ ] **Étape 1 : test du curseur et du formulaire (échec attendu)**

Ajouter à `src/components/ui/ui.test.tsx` :

```tsx
describe("Slider", () => {
  it("is a range input with a label, a value and the step", () => {
    const onChange = vi.fn();
    render(
      <Slider label="Rythme" name="rate" value={0.5} onChange={onChange} min={0.25} max={1.5} step={0.05} format={(v) => `${v} %/sem`} />,
    );
    const input = screen.getByLabelText("Rythme") as HTMLInputElement;
    expect(input.type).toBe("range");
    expect(input).toHaveAttribute("step", "0.05");
    expect(input).toHaveValue("0.5");
    expect(screen.getByText("0.5 %/sem")).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "0.75" } });
    expect(onChange).toHaveBeenCalledWith(0.75);
  });
});
```

(Ajouter `Slider` à l'imports ; réutiliser les imports `render`, `screen`, `fireEvent`, `vi` déjà présents dans le fichier, sinon les ajouter.)

`src/features/goals/components/goal-form.test.tsx` :

```tsx
// @vitest-environment jsdom
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast";
import { GoalForm } from "./goal-form";

const NNBSP = " ";
const setup = (over: Partial<Parameters<typeof GoalForm>[0]> = {}) =>
  render(
    <ToastProvider>
      <GoalForm
        action={vi.fn(async () => ({ ok: true as const }))}
        unit="kg"
        referenceKg={78}
        today="2026-10-07"
        active={null}
        submitLabel="Enregistrer"
        {...over}
      />
    </ToastProvider>,
  );

describe("GoalForm", () => {
  it("offers the four goal types and shows the current trend read-only", () => {
    setup();
    for (const name of [/Perdre du poids/, /Prendre du poids/, /Recomposition/, /Maintien/]) {
      expect(screen.getByRole("radio", { name })).toBeInTheDocument();
    }
    expect(screen.getByLabelText("Actuel (tendance)")).toHaveValue("78,0");
    expect(screen.getByLabelText("Actuel (tendance)")).toHaveAttribute("readonly");
  });

  it("hides target and rate for a maintenance goal", () => {
    setup();
    fireEvent.click(screen.getByRole("radio", { name: /Maintien/ }));
    expect(screen.queryByLabelText("Cible")).toBeNull();
    expect(screen.queryByLabelText(/Rythme/)).toBeNull();
  });

  it("previews the weekly pace and the theoretical date", () => {
    setup();
    fireEvent.change(screen.getByLabelText("Cible"), { target: { value: "74" } });
    // 0.5 % × 78 kg = 0.39 kg/week; 4 kg / 0.39 × 7 = 72 days from 2026-10-07 → 2026-12-18
    expect(screen.getByText(/≈ 0,4 kg\/sem · atteinte vers le 18 déc\./)).toBeInTheDocument();
  });

  it("shows the aggressive-pace alert past the recommended zone", () => {
    setup();
    fireEvent.change(screen.getByLabelText(/Rythme/), { target: { value: "1.25" } });
    expect(screen.getByText(/Rythme agressif/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Rythme/), { target: { value: "0.75" } });
    expect(screen.queryByText(/Rythme agressif/)).toBeNull();
  });

  it("resets the rate to the default of the new type", () => {
    setup();
    fireEvent.click(screen.getByRole("radio", { name: /Prendre du poids/ }));
    expect(screen.getByLabelText(/Rythme/)).toHaveValue("0.25");
  });

  it("asks to confirm an archive, with a Confirmer button carrying the reason", async () => {
    const action = vi.fn(async () => ({
      ok: false as const,
      needsConfirmation: { reason: "archive" as const, message: "Changer d'objectif archive « Perdre du poids ». Continuer ?" },
      values: { type: "gain", target: "85", rate: "0.25", unit: "kg", confirmed: "" },
    }));
    setup({ action, active: { type: "lose", targetKg: 74, weeklyRatePct: 0.5 } });
    fireEvent.click(screen.getByRole("radio", { name: /Prendre du poids/ }));
    fireEvent.change(screen.getByLabelText("Cible"), { target: { value: "85" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("archive");
    expect(screen.getByRole("button", { name: "Confirmer" })).toHaveAttribute("value", "archive");
  });
});
```

(La date théorique attendue vient de `theoreticalDate("2026-10-07", 78, 74, 0.39)` : 4 / 0,39 × 7 = 71,79 → 72 jours → 18 décembre. Si le test de la tâche 1 est vert, ce calcul l'est aussi.)

Run : `pnpm vitest run src/components/ui/ui.test.tsx src/features/goals/components` → FAIL.

- [ ] **Étape 2 : implémenter le curseur**

`src/components/ui/slider.tsx` :

```tsx
"use client";

import { useId } from "react";

export type SliderProps = {
  label: string;
  name: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  /** Recommended range, highlighted on the track. */
  zone?: { from: number; to: number };
  format: (value: number) => string;
  describedBy?: string;
};

/** Native range input over a track that highlights the recommended zone (specs/01 §3.7). */
export function Slider({
  label,
  name,
  value,
  onChange,
  min,
  max,
  step,
  zone,
  format,
  describedBy,
}: SliderProps) {
  const id = useId();
  const pct = (v: number) => `${((v - min) / (max - min)) * 100}%`;
  const track = zone
    ? `linear-gradient(to right, var(--line) 0 ${pct(zone.from)}, var(--positive) ${pct(zone.from)} ${pct(zone.to)}, var(--line) ${pct(zone.to)} 100%)`
    : "var(--line)";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-xs font-medium text-fg-2">
          {label}
        </label>
        <output htmlFor={id} className="text-sm font-semibold tabular-nums">
          {format(value)}
        </output>
      </div>
      <div className="relative flex h-11 items-center">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 h-1.5 rounded-full"
          style={{ background: track }}
        />
        <input
          id={id}
          name={name}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-describedby={describedBy}
          onChange={(e) => onChange(Number(e.target.value))}
          className="slider relative h-11 w-full"
        />
      </div>
    </div>
  );
}
```

Ajouter à la fin de `src/app/globals.css` :

```css
/* Range input: the track is drawn by the Slider component, here only the thumb. */
.slider {
  appearance: none;
  background: transparent;
  cursor: pointer;
}
.slider::-webkit-slider-runnable-track {
  background: transparent;
  height: 44px;
}
.slider::-moz-range-track {
  background: transparent;
  height: 44px;
}
.slider::-webkit-slider-thumb {
  appearance: none;
  width: 24px;
  height: 24px;
  margin-top: 10px;
  border-radius: 9999px;
  background: var(--fg);
  border: 3px solid var(--bg);
  box-shadow: 0 0 0 1px var(--fg);
}
.slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 9999px;
  background: var(--fg);
  border: 3px solid var(--bg);
  box-shadow: 0 0 0 1px var(--fg);
}
.slider:focus-visible {
  outline: 2px solid var(--fg);
  outline-offset: 2px;
  border-radius: 9999px;
}
```

Vérifier que `--fg`, `--bg`, `--line`, `--positive` existent bien dans `:root` de `globals.css` (c'est le cas : `--positive` est défini).

- [ ] **Étape 3 : implémenter le formulaire**

`src/features/goals/components/goal-form.tsx` :

```tsx
"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberStepper } from "@/components/ui/number-stepper";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/components/ui/toast";
import { fieldError, fieldValue, type ActionResult } from "@/lib/action-result";
import { formatShortDate, type LocalDate } from "@/lib/dates";
import {
  GOAL_RATES,
  exceedsRecommended,
  previewKgPerWeek,
  theoreticalDate,
  type GoalType,
  type RatedGoalType,
} from "@/lib/metrics";
import {
  formatDecimal,
  formatInputDecimal,
  parseDecimal,
  toDisplayWeight,
  toStoredKg,
  type WeightUnit,
} from "@/lib/units";
import { WEIGHT_MAX_KG, WEIGHT_MIN_KG } from "@/features/weight/limits";
import { GOAL_DESCRIPTIONS, GOAL_LABELS, RATE_ALERTS } from "../copy";

const TYPES: GoalType[] = ["lose", "gain", "recomp", "maintain"];
const isRated = (t: GoalType): t is RatedGoalType => t === "lose" || t === "gain";
/** "0,25 %/sem": two decimals, the step of the slider is 0,05. */
const pctLabel = (v: number) => `${String(v).replace(".", ",")} %/sem`;

export type GoalFormProps = {
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  unit: WeightUnit;
  /** Current trend (latest weighing while calibrating), in kilograms. */
  referenceKg: number;
  today: LocalDate;
  active: { type: GoalType; targetKg: number | null; weeklyRatePct: number | null } | null;
  submitLabel: string;
  /** Extra buttons next to the submit button (onboarding: back link, "Juste suivre mon poids"). */
  extra?: ReactNode;
};

/** Goal editor shared by /objectif and onboarding step 4 (specs/01 §3.1 and §3.7). */
export function GoalForm({ action, unit, referenceKg, today, active, submitLabel, extra }: GoalFormProps) {
  const toast = useToast();
  // A confirmation only covers what was submitted: editing anything voids it.
  const [edited, setEdited] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: ActionResult | null, formData: FormData) => {
      setEdited(false);
      const result = await action(prev, formData);
      if (result.ok) toast("Objectif enregistré");
      return result;
    },
    null,
  );

  const [type, setType] = useState<GoalType>(active?.type ?? "lose");
  const [target, setTarget] = useState(
    active?.targetKg ? formatInputDecimal(toDisplayWeight(active.targetKg, unit)) : "",
  );
  const [rate, setRate] = useState(active?.weeklyRatePct ?? GOAL_RATES.lose.default);

  const rated = isRated(type);
  const targetKg = toStoredKg(parseDecimal(target), unit);
  const kgPerWeek = previewKgPerWeek(rate, referenceKg);
  const reachedOn = rated && Number.isFinite(targetKg) ? theoreticalDate(today, referenceKg, targetKg, kgPerWeek) : null;
  const confirmation = !edited && state && !state.ok ? state.needsConfirmation : undefined;
  const alert = rated && exceedsRecommended(type, rate) ? RATE_ALERTS[type] : null;

  const pickType = (next: GoalType) => {
    setType(next);
    setEdited(true);
    if (isRated(next)) setRate(GOAL_RATES[next].default);
  };

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="unit" value={unit} />
      <input type="hidden" name="confirmed" value={edited ? "" : (fieldValue(state, "confirmed") ?? "")} />

      <fieldset className="grid grid-cols-2 gap-3">
        <legend className="mb-2 text-xs font-medium text-fg-2">Type d&apos;objectif</legend>
        {TYPES.map((t) => (
          <label
            key={t}
            className="flex min-h-24 cursor-pointer flex-col gap-1 rounded-xl border border-line p-3 has-[:checked]:border-fg has-[:checked]:bg-fg has-[:checked]:text-white"
          >
            <input
              type="radio"
              name="type"
              value={t}
              checked={type === t}
              onChange={() => pickType(t)}
              className="sr-only"
            />
            <span className="text-[15px] font-semibold">{GOAL_LABELS[t]}</span>
            <span className="text-xs opacity-80">{GOAL_DESCRIPTIONS[t]}</span>
          </label>
        ))}
      </fieldset>
      {fieldError(state, "type") && (
        <p role="alert" className="text-xs font-medium text-fg">
          {fieldError(state, "type")}
        </p>
      )}

      <Input
        label="Actuel (tendance)"
        value={formatInputDecimal(toDisplayWeight(referenceKg, unit))}
        readOnly
      />

      {rated ? (
        <>
          <NumberStepper
            label="Cible"
            name="target"
            unit={unit}
            value={target}
            onChange={(v) => {
              setTarget(v);
              setEdited(true);
            }}
            min={toDisplayWeight(WEIGHT_MIN_KG, unit)}
            max={toDisplayWeight(WEIGHT_MAX_KG, unit)}
            fallback={toDisplayWeight(referenceKg, unit)}
            error={fieldError(state, "target")}
          />
          <Slider
            label="Rythme"
            name="rate"
            value={rate}
            onChange={(v) => {
              setRate(v);
              setEdited(true);
            }}
            min={GOAL_RATES[type].min}
            max={GOAL_RATES[type].max}
            step={0.05}
            zone={{ from: GOAL_RATES[type].recommendedMin, to: GOAL_RATES[type].recommendedMax }}
            format={pctLabel}
            describedBy="rate-preview"
          />
          {fieldError(state, "rate") && (
            <p role="alert" className="text-xs font-medium text-fg">
              {fieldError(state, "rate")}
            </p>
          )}
          {alert && <p className="rounded-xl bg-surface p-3 text-xs font-medium text-fg">{alert}</p>}
          <p id="rate-preview" className="text-sm text-fg-2">
            ≈ {formatDecimal(toDisplayWeight(kgPerWeek, unit))}
            {" "}
            {unit}/sem ·{" "}
            {reachedOn ? `atteinte vers le ${formatShortDate(reachedOn, today)}` : "atteinte dans plus de 2 ans"}
          </p>
        </>
      ) : (
        <p className="rounded-xl bg-surface p-3 text-sm text-fg-2">
          Référence : ta tendance actuelle, {formatDecimal(toDisplayWeight(referenceKg, unit))}
          {" "}
          {unit}. Aucune cible ni rythme à choisir.
        </p>
      )}

      {confirmation ? (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-fg p-3">
          <p className="text-sm font-medium">{confirmation.message}</p>
          <Button type="submit" name="confirm" value={confirmation.reason} loading={pending}>
            Confirmer
          </Button>
        </div>
      ) : (
        <div className="flex gap-3">
          {extra}
          <Button type="submit" loading={pending} className="flex-[1.4]">
            {submitLabel}
          </Button>
        </div>
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

**Aperçu à deux décimales.** La spec 01 montre « ≈ 0,39 kg/sem » : `formatDecimal` (une décimale) ne convient pas. Dans `goal-form.tsx`, ajouter `const twoDecimals = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });` et remplacer `formatDecimal(toDisplayWeight(kgPerWeek, unit))` par `twoDecimals.format(toDisplayWeight(kgPerWeek, unit))` dans l'aperçu. Le test « previews » de l'étape 1 doit alors attendre `/≈ 0,39 kg\/sem · atteinte vers le 18 déc\./` (corriger l'expression écrite plus haut : `0,4` → `0,39`). Seule exception à « 1 décimale partout », reportée dans la spec à la tâche 12.
Attention : `toDisplayWeight` arrondit à une décimale (0,39 → 0,4) ; pour l'aperçu en kg, calculer `kgPerWeek` en kg et ne convertir que si `unit === "lb"` (`unit === "lb" ? kgPerWeek / 0.45359237 : kgPerWeek`), sans passer par `toDisplayWeight`.

- [ ] **Étape 4 : suivi, historique et page**

`src/features/goals/components/goal-tracking.tsx` :

```tsx
import { formatWeeklyRate } from "@/lib/units";
import type { LocalDate } from "@/lib/dates";
import type { WeightUnit } from "@/lib/units";
import { projectionLabel, statusMessage } from "../copy";
import type { ActiveGoalSummary } from "../summary";

/** "Suivi" block of /objectif: real pace over 4 weeks, status, explanation and projection (specs/01 §3.7). */
export function GoalTracking({
  summary,
  unit,
  today,
}: {
  summary: ActiveGoalSummary;
  unit: WeightUnit;
  today: LocalDate;
}) {
  return (
    <section aria-labelledby="tracking-title" className="rounded-xl border border-line p-4">
      <h2 id="tracking-title" className="text-[15px] font-semibold tracking-tight">
        Suivi
      </h2>
      <dl className="mt-3 flex flex-col gap-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-fg-2">Rythme sur 4 semaines</dt>
          <dd className="font-semibold tabular-nums">
            {summary.rate ? formatWeeklyRate(summary.rate.kgPerWeek, unit) : "—"}
          </dd>
        </div>
        {summary.targetKg !== null && (
          <div className="flex justify-between gap-4">
            <dt className="text-fg-2">Projection</dt>
            <dd className="text-right">{projectionLabel(summary.projection, today)}</dd>
          </div>
        )}
      </dl>
      <p data-testid="goal-status" className="mt-3 text-sm font-medium">
        {statusMessage(summary, unit)}
      </p>
    </section>
  );
}
```

`src/features/goals/components/goal-history.tsx` :

```tsx
import { formatLongDate } from "@/lib/dates";
import { formatWeight, type WeightUnit } from "@/lib/units";
import { GOAL_LABELS, HISTORY_STATUS_LABELS } from "../copy";
import type { PastGoalSummary } from "../summary";

/** Collapsible list of achieved and archived goals (EF-GOAL-05). */
export function GoalHistory({ items, unit }: { items: PastGoalSummary[]; unit: WeightUnit }) {
  if (items.length === 0) return null;
  return (
    <details className="rounded-xl border border-line p-4">
      <summary className="min-h-11 cursor-pointer text-[15px] font-semibold">
        Historique des objectifs
      </summary>
      <ul data-testid="goal-history" className="mt-3 flex flex-col gap-3">
        {items.map((g) => (
          <li key={g.id} className="text-sm">
            <p className="font-medium">
              {GOAL_LABELS[g.type]} · {HISTORY_STATUS_LABELS[g.status]}
            </p>
            <p className="text-fg-2">
              Du {formatLongDate(g.startDate)} au {formatLongDate(g.endedAt)}
            </p>
            <p className="text-fg-2">
              {formatWeight(g.startKg, unit)} → {g.endKg === null ? "—" : formatWeight(g.endKg, unit)}
            </p>
          </li>
        ))}
      </ul>
    </details>
  );
}
```

Pour que E2E-5 (tâche 11) trouve « Perte » / « Prise » dans l'historique, le libellé de type de l'historique doit contenir ce mot : ajouter à `copy.ts` `export const HISTORY_TYPE_LABELS: Record<GoalType, string> = { lose: "Perte", gain: "Prise", recomp: "Recomposition", maintain: "Maintien" };` et l'utiliser dans `goal-history.tsx` à la place de `GOAL_LABELS`.

`src/app/(app)/objectif/page.tsx` :

```tsx
import { GoalForm } from "@/features/goals/components/goal-form";
import { GoalHistory } from "@/features/goals/components/goal-history";
import { GoalTracking } from "@/features/goals/components/goal-tracking";
import { GOAL_DISCLAIMER } from "@/features/goals/copy";
import { saveGoalAction } from "@/features/goals/actions";
import { getActiveGoal, listPastGoals } from "@/features/goals/queries";
import { buildGoalHistory, buildGoalSummary } from "@/features/goals/summary";
import { listWeights } from "@/features/weight/queries";
import { today } from "@/lib/dates";
import { getDb } from "@/lib/db/client";
import { goalReferenceKg } from "@/lib/metrics";
import { requireUser } from "@/lib/session";

export default async function GoalPage() {
  const { userId, profile } = await requireUser("app");
  const todayDate = today(profile?.timezone ?? "Europe/Paris");
  const unit = profile?.weightUnit ?? "kg";
  const db = getDb();
  const [points, active, past] = await Promise.all([
    listWeights(db, userId),
    getActiveGoal(db, userId),
    listPastGoals(db, userId),
  ]);
  const referenceKg = goalReferenceKg(points, todayDate);
  const summary = buildGoalSummary(active, points, todayDate);

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight lg:text-[28px]">Mon objectif</h1>
      <div className="mt-6 flex flex-col gap-6">
        {referenceKg === null ? (
          <p className="text-sm text-fg-2">Ajoute une première pesée pour définir ton objectif.</p>
        ) : (
          <>
            {!active && (
              <p className="rounded-xl bg-surface p-3 text-sm text-fg-2">
                Tu n&apos;as pas d&apos;objectif en cours. Choisis-en un.
              </p>
            )}
            <GoalForm
              action={saveGoalAction}
              unit={unit}
              referenceKg={referenceKg}
              today={todayDate}
              active={
                active && {
                  type: active.type,
                  targetKg: active.targetWeightKg,
                  weeklyRatePct: active.weeklyRatePct,
                }
              }
              submitLabel="Enregistrer"
            />
          </>
        )}
        {summary.state === "active" && <GoalTracking summary={summary} unit={unit} today={todayDate} />}
        <GoalHistory items={buildGoalHistory(past, points)} unit={unit} />
        <p className="text-xs text-muted">{GOAL_DISCLAIMER}</p>
      </div>
    </>
  );
}
```

- [ ] **Étape 5 : vérifier**

Run : `pnpm vitest run src/components src/features/goals && pnpm typecheck && pnpm lint && pnpm build`
Attendu : PASS. Ouvrir ensuite `/objectif` avec `pnpm dev` (compte de démo) et contrôler à 390 px et 1440 px : cartes 2×2, curseur avec zone verte, aperçu qui bouge, historique replié.

- [ ] **Étape 6 : commit**

```bash
pnpm format && git add src && git commit -m "feat(goals): goal screen with rate slider, live preview, tracking and history

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Tâche 9 : onboarding, étape 4 « Objectif » (BODY-35)

**Fichiers :**
- Modifier : `src/features/profile/onboarding.ts`, `src/features/profile/onboarding.test.ts`, `src/features/profile/actions.ts`, `src/features/profile/actions.test.ts`, `src/app/onboarding/page.tsx`, `tests/e2e/auth-onboarding.spec.ts`
- Créer : `src/features/profile/components/goal-step.tsx`

**Interfaces :**
- Consomme : `GoalForm`, `goalInputSchema`, `createGoal`, `getActiveGoal`, `goalReferenceKg`, `listWeights`, `nextOnboardingStep`, `continueOnboarding`.
- Produit :
  - `ONBOARDING_STEPS = ["sex", "body", "weight", "goal"]`
  - `OnboardingProgress = { profile: Profile | null; hasWeight: boolean; hasGoal: boolean }`
  - `saveGoalStepAction(prev, formData): Promise<ActionResult>` : crée l'objectif (ou n'en crée pas s'il existe déjà), puis termine l'onboarding. `type=maintain` (bouton « Juste suivre mon poids ») ne demande rien d'autre.

- [ ] **Étape 1 : tests (échec attendu)**

Dans `src/features/profile/onboarding.test.ts`, passer `hasGoal` à **tous** les appels existants (`hasGoal: false` partout où le test attendait une étape antérieure, et adapter celui qui attendait `null`) puis ajouter :

```ts
it("asks for the goal once the first weighing exists", () => {
  expect(
    nextOnboardingStep({ profile: profile({ heightCm: 170, birthDate: "1990-01-01" }), hasWeight: true, hasGoal: false }),
  ).toBe("goal");
});

it("is complete once profile, weighing and goal exist", () => {
  expect(
    nextOnboardingStep({ profile: profile({ heightCm: 170, birthDate: "1990-01-01" }), hasWeight: true, hasGoal: true }),
  ).toBeNull();
});

it("does not skip ahead to the goal without a weighing", () => {
  expect(
    nextOnboardingStep({ profile: profile({ heightCm: 170, birthDate: "1990-01-01" }), hasWeight: false, hasGoal: true }),
  ).toBe("weight");
});
```

Dans `src/features/profile/actions.test.ts` (ouvrir le fichier et reprendre son squelette de mocks ; y ajouter le mock `next/navigation` si absent), ajouter un `describe("saveGoalStepAction")` :

```ts
it("'Juste suivre mon poids' creates a maintenance goal and completes onboarding", async () => {
  // user "alice" with a profile and one weighing of 78.2 kg, onboarding not completed
  await expect(saveGoalStepAction(null, form({ type: "maintain", unit: "kg" }))).rejects.toThrow("REDIRECT:/accueil");
  expect(await getActiveGoal(ctx.db, "alice")).toMatchObject({ type: "maintain", startWeightKg: 78.2 });
  expect((await getProfile(ctx.db, "alice"))?.onboardingCompletedAt).not.toBeNull();
});

it("a loss goal starts at the weight typed at step 3", async () => {
  await expect(
    saveGoalStepAction(null, form({ type: "lose", target: "70", rate: "0,5", unit: "kg" })),
  ).rejects.toThrow("REDIRECT:/accueil");
  expect(await getActiveGoal(ctx.db, "alice")).toMatchObject({
    type: "lose",
    startWeightKg: 78.2,
    targetWeightKg: 70,
    startDate: "2026-10-03",
  });
});

it("rejects a target above the current weight and creates nothing", async () => {
  const result = await saveGoalStepAction(null, form({ type: "lose", target: "80", rate: "0,5", unit: "kg" }));
  expect(result).toMatchObject({ ok: false, fieldErrors: { target: expect.any(Array) } });
  expect(await getActiveGoal(ctx.db, "alice")).toBeNull();
});

it("a second submission does not create a second goal", async () => {
  await expect(saveGoalStepAction(null, form({ type: "maintain", unit: "kg" }))).rejects.toThrow("REDIRECT");
  await expect(saveGoalStepAction(null, form({ type: "lose", target: "70", rate: "0,5", unit: "kg" }))).rejects.toThrow("REDIRECT");
  expect((await getActiveGoal(ctx.db, "alice"))?.type).toBe("maintain");
});
```

(Adapter les noms `ctx`, `form`, `getProfile` à ceux que le fichier utilise déjà ; le jeu de données attendu : profil avec `heightCm` et `birthDate`, une pesée datée du jour de 78,2 kg, horloge figée au 2026-10-03.)

Run : `pnpm vitest run src/features/profile` → FAIL.

- [ ] **Étape 2 : implémenter**

`src/features/profile/onboarding.ts` :

```ts
/**
 * Steps implemented so far. L4 appends "measure" (step 5, optional);
 * onboarding is complete when nextOnboardingStep returns null.
 */
export const ONBOARDING_STEPS = ["sex", "body", "weight", "goal"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export type OnboardingProgress = { profile: Profile | null; hasWeight: boolean; hasGoal: boolean };

export function nextOnboardingStep({
  profile,
  hasWeight,
  hasGoal,
}: OnboardingProgress): OnboardingStep | null {
  if (!profile) return "sex";
  if (profile.heightCm === null || profile.birthDate === null) return "body";
  if (!hasWeight) return "weight";
  if (!hasGoal) return "goal";
  return null;
}
```

`src/features/profile/actions.ts` : dans `continueOnboarding`, charger aussi `getActiveGoal` :

```ts
const [profile, weighed, goal] = await Promise.all([
  getProfile(db, userId),
  hasWeight(db, userId),
  getActiveGoal(db, userId),
]);
if (nextOnboardingStep({ profile, hasWeight: weighed, hasGoal: goal !== null }) === null) {
```

puis ajouter (imports : `getActiveGoal`, `createGoal` de `@/features/goals/queries`, `goalInputSchema` de `@/features/goals/schemas`, `listWeights`, `goalReferenceKg`, `round2`) :

```ts
/** Step 4: first goal. "Juste suivre mon poids" posts type=maintain with nothing else (EF-GOAL-01 CA1). */
export async function saveGoalStepAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser("onboarding");
  if (!user.profile) redirect("/onboarding");

  const db = getDb();
  const todayDate = today(user.profile.timezone);
  const referenceKg = goalReferenceKg(await listWeights(db, user.userId), todayDate);
  if (referenceKg === null) redirect("/onboarding");

  const parsed = goalInputSchema(referenceKg).safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: fieldErrorsFrom(parsed.error),
      values: keepValues(formData, "type", "target", "rate", "unit"),
    };
  }

  // Idempotent: a double submit or a back-and-forth never creates a second goal.
  if ((await getActiveGoal(db, user.userId)) === null) {
    const { type, targetWeightKg, weeklyRatePct } = parsed.data;
    await createGoal(db, user.userId, {
      type,
      startDate: todayDate,
      startWeightKg: round2(referenceKg),
      targetWeightKg,
      weeklyRatePct,
    });
  }
  return continueOnboarding(db, user.userId);
}
```

`src/features/profile/components/goal-step.tsx` :

```tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";
import { GoalForm, type GoalFormProps } from "@/features/goals/components/goal-form";
import { saveGoalStepAction } from "../actions";

type Props = Omit<GoalFormProps, "action" | "active" | "submitLabel" | "extra">;

/** Step 4: the goal form plus the discreet "Juste suivre mon poids" shortcut (specs/01 §3.1). */
export function GoalStep(props: Props) {
  return (
    <div className="flex flex-col gap-4">
      <GoalForm
        {...props}
        action={saveGoalStepAction}
        active={null}
        submitLabel="Terminer"
        extra={
          <Link
            href="/onboarding?etape=weight"
            className="flex h-11 flex-1 items-center justify-center rounded-full border border-fg text-[13px] font-semibold"
          >
            Retour
          </Link>
        }
      />
      <SkipForm />
    </div>
  );
}

function SkipForm() {
  const [, action, pending] = useActionState(saveGoalStepAction, null);
  return (
    <form action={action} className="flex justify-center">
      <input type="hidden" name="type" value="maintain" />
      <input type="hidden" name="unit" value="kg" />
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 px-3 text-sm text-fg-2 underline underline-offset-4 disabled:opacity-50"
      >
        Juste suivre mon poids
      </button>
    </form>
  );
}
```

`src/app/onboarding/page.tsx` : ajouter le titre `goal: "Quel est ton objectif ?"`, charger `getActiveGoal` (`hasGoal`) et la liste des pesées pour le `referenceKg` :

```tsx
const [latest, goal] = profile
  ? await Promise.all([getLatestWeight(db, userId), getActiveGoal(db, userId)])
  : [null, null];
const next = nextOnboardingStep({ profile, hasWeight: latest !== null, hasGoal: goal !== null }) ?? "goal";
...
{step === "goal" && referenceKg !== null && (
  <GoalStep unit={profile?.weightUnit ?? "kg"} referenceKg={referenceKg} today={todayDate} />
)}
```

où `referenceKg = goalReferenceKg(await listWeights(db, userId), todayDate)` n'est calculé que si `step === "goal"`. Garder le reste (retour autorisé, saut en avant interdit) tel quel : `ONBOARDING_STEPS` fait maintenant 4 entrées, la barre de progression passe à 4.

`tests/e2e/auth-onboarding.spec.ts` (E2E-1) : lire le fichier, repérer le clic « Continuer » de l'étape 3, puis ajouter après lui :

```ts
await expect(page.getByRole("heading", { name: "Quel est ton objectif ?" })).toBeVisible();
await page.getByRole("button", { name: "Juste suivre mon poids" }).click();
```

avant l'assertion d'arrivée sur `/accueil`. Faire de même dans tout autre test qui termine l'onboarding (`grep -rn "Continuer" tests/e2e`).

- [ ] **Étape 3 : vérifier**

Run : `pnpm vitest run src/features/profile && pnpm typecheck && pnpm lint && pnpm build`
Attendu : PASS. Vérification manuelle (390 px) : inscription d'un compte neuf → étapes 1 à 4 → « Juste suivre mon poids » → Accueil ; puis un second compte avec un objectif de perte.

- [ ] **Étape 4 : commit**

```bash
pnpm format && git add src tests && git commit -m "feat(onboarding): step 4, first goal (or just track my weight)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Tâche 10 : Accueil, bloc Objectif, bandeau « atteint » et rythme en vert (BODY-32, BODY-33, BODY-36 : UI)

**Fichiers :**
- Créer : `src/features/dashboard/pace-tone.ts`, `src/features/dashboard/pace-tone.test.ts`, `src/features/goals/components/goal-block.tsx`, `src/features/goals/components/achieved-banner.tsx`, `src/features/goals/components/goal-block.test.tsx`
- Modifier : `src/features/dashboard/queries.ts`, `src/features/dashboard/components/weight-block.tsx`, `src/features/dashboard/components/dashboard.test.tsx`, `src/app/(app)/accueil/page.tsx`, `tests/integration/dashboard.test.ts`

**Interfaces :**
- Consomme : `ActiveGoalSummary`, `GoalSummary`, `buildGoalSummary`, `getActiveGoal`, `achieveGoalAction`, `WeightSummary`, `paceInGoalDirection`, `statusMessage`, `projectionLabel`, `formatWeight`, `GOAL_LABELS`.
- Produit :
  - `Dashboard = { weight: WeightSummary; goal: GoalSummary; rateTone: "positive" | "neutral" }`
  - `paceTone(goal: GoalSummary, weight: WeightSummary): "positive" | "neutral"`
  - `<GoalBlock summary unit today />`, `<AchievedBanner />`
  - `WeightBlock` gagne la prop `rateTone: "positive" | "neutral"`

- [ ] **Étape 1 : tests (échec attendu)**

`src/features/dashboard/pace-tone.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { GoalSummary } from "@/features/goals/summary";
import { paceTone } from "./pace-tone";
import type { WeightSummary } from "./weight-summary";

const sparkline = { from: "2026-07-10", to: "2026-10-07", dots: [], trend: [] };
const ready = (pctPerWeek: number): WeightSummary => ({
  state: "ready",
  trendKg: 80,
  todayKg: null,
  rate: { kgPerWeek: (pctPerWeek / 100) * 80, pctPerWeek },
  sparkline,
});
const goal = (type: "lose" | "gain" | "maintain" | "recomp"): GoalSummary => ({
  state: "active",
  type,
  targetKg: type === "lose" || type === "gain" ? 75 : null,
  weeklyRatePct: null,
  startKg: 80,
  startDate: "2026-09-01",
  referenceKg: 80,
  status: { status: "on_track", missingEntries: 0, deviationKg: null, waist: null },
  progress: null,
  projection: { kind: "unavailable" },
  rate: null,
});

describe("paceTone", () => {
  it("is positive when the pace goes the way of the goal", () => {
    expect(paceTone(goal("lose"), ready(-0.4))).toBe("positive");
    expect(paceTone(goal("gain"), ready(0.3))).toBe("positive");
  });
  it("is neutral when it goes the other way or does not move", () => {
    expect(paceTone(goal("lose"), ready(0.4))).toBe("neutral");
    expect(paceTone(goal("lose"), ready(0))).toBe("neutral");
    expect(paceTone(goal("gain"), ready(-0.3))).toBe("neutral");
  });
  it("is neutral for maintain, recomp and without a goal", () => {
    expect(paceTone(goal("maintain"), ready(-0.4))).toBe("neutral");
    expect(paceTone(goal("recomp"), ready(-0.4))).toBe("neutral");
    expect(paceTone({ state: "none" }, ready(-0.4))).toBe("neutral");
  });
  it("is neutral while calibrating or without a rate", () => {
    expect(paceTone(goal("lose"), { state: "empty" })).toBe("neutral");
    expect(paceTone(goal("lose"), { ...ready(-0.4), rate: null } as WeightSummary)).toBe("neutral");
  });
});
```

`src/features/goals/components/goal-block.test.tsx` :

```tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ActiveGoalSummary } from "../summary";
import { GoalBlock } from "./goal-block";

vi.mock("../actions", () => ({ achieveGoalAction: vi.fn() }));

const NNBSP = " ";
const active = (over: Partial<ActiveGoalSummary> = {}): ActiveGoalSummary => ({
  state: "active",
  type: "lose",
  targetKg: 75,
  weeklyRatePct: 0.5,
  startKg: 82,
  startDate: "2026-09-01",
  referenceKg: 78.4,
  status: { status: "on_track", missingEntries: 0, deviationKg: null, waist: null },
  progress: { doneKg: 3.6, totalKg: 7, ratio: 3.6 / 7 },
  projection: { kind: "estimated", date: "2026-11-15", daysRemaining: 39 },
  rate: { kgPerWeek: -0.4, pctPerWeek: -0.5 },
  ...over,
});

describe("GoalBlock", () => {
  it("shows target, projection, progress and status for a loss goal", () => {
    render(<GoalBlock summary={active()} unit="kg" today="2026-10-07" />);
    expect(screen.getByText(`75,0${NNBSP}kg`)).toBeInTheDocument();
    expect(screen.getByText(/Atteinte estimée : ~ 15 nov\./)).toBeInTheDocument();
    expect(screen.getByText(`3,6 / 7,0${NNBSP}kg`)).toBeInTheDocument();
    expect(screen.getByText("Dans le rythme.")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "51");
  });

  it("shows the calibration message and no projection while calibrating", () => {
    render(
      <GoalBlock
        summary={active({
          status: { status: "calibrating", missingEntries: 3, deviationKg: null, waist: null },
          projection: { kind: "unavailable" },
        })}
        unit="kg"
        today="2026-10-07"
      />,
    );
    expect(screen.getByText("Encore 3 pesées pour calculer ton rythme.")).toBeInTheDocument();
    expect(screen.queryByText(/Atteinte estimée/)).toBeNull();
  });

  it("shows the reference and no bar for a maintenance goal", () => {
    render(
      <GoalBlock
        summary={active({
          type: "maintain",
          targetKg: null,
          progress: null,
          projection: { kind: "unavailable" },
          status: { status: "stable", missingEntries: 0, deviationKg: 0.2, waist: null },
        })}
        unit="kg"
        today="2026-10-07"
      />,
    );
    expect(screen.getByText("Maintien")).toBeInTheDocument();
    expect(screen.getByText("Stable, dans ta zone (± 1,5 %).")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("offers to set a goal when there is none (account created before L3, or after 'Nouvel objectif')", () => {
    render(<GoalBlock summary={{ state: "none" }} unit="kg" today="2026-10-07" />);
    expect(screen.getByRole("link", { name: "Définir mon objectif" })).toHaveAttribute("href", "/objectif");
  });

  it("shows the banner with both choices when the goal is reached", () => {
    render(
      <GoalBlock
        summary={active({ status: { status: "achieved", missingEntries: 0, deviationKg: null, waist: null } })}
        unit="kg"
        today="2026-10-07"
      />,
    );
    expect(screen.getByText(/Objectif atteint !/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Passer en maintien" })).toHaveAttribute("value", "maintain");
    expect(screen.getByRole("button", { name: "Nouvel objectif" })).toHaveAttribute("value", "new");
  });
});
```

Dans `src/features/dashboard/components/dashboard.test.tsx`, adapter les rendus de `WeightBlock` (nouvelle prop `rateTone`) et ajouter : avec `rateTone="positive"` la ligne de rythme porte la classe `text-positive`, avec `"neutral"` la classe `text-fg-2`.

Dans `tests/integration/dashboard.test.ts`, ajouter :

```ts
it("has no goal for an account created before L3", async () => {
  await insertWeights(db, "alice", /* 8 weighings as in the first test */);
  expect((await getDashboard(db, "alice", "2026-10-03")).goal).toEqual({ state: "none" });
});

it("summarises the caller's active goal only", async () => {
  await createGoal(db, "alice", { type: "lose", startDate: "2026-09-01", startWeightKg: 82, targetWeightKg: 75, weeklyRatePct: 0.5 });
  await createGoal(db, "bob", { type: "gain", startDate: "2026-09-01", startWeightKg: 60, targetWeightKg: 70, weeklyRatePct: 0.25 });
  const { goal } = await getDashboard(db, "alice", "2026-10-03");
  expect(goal).toMatchObject({ state: "active", type: "lose", targetKg: 75 });
});
```

(reprendre l'insertion de pesées du premier test du fichier ; importer `createGoal`.)

Run : `pnpm vitest run src/features/dashboard src/features/goals tests/integration/dashboard.test.ts` → FAIL.

- [ ] **Étape 2 : implémenter**

`src/features/dashboard/pace-tone.ts` :

```ts
import type { GoalSummary } from "@/features/goals/summary";
import { paceInGoalDirection } from "@/lib/metrics";
import type { WeightSummary } from "./weight-summary";

/** Green only when the real pace goes the way of a loss or gain goal (specs/01 §3.2). */
export function paceTone(goal: GoalSummary, weight: WeightSummary): "positive" | "neutral" {
  if (goal.state !== "active" || weight.state !== "ready" || !weight.rate) return "neutral";
  const v = paceInGoalDirection(goal.type, weight.rate.pctPerWeek);
  return v !== null && v > 0 ? "positive" : "neutral";
}
```

`src/features/dashboard/queries.ts` :

```ts
import { getActiveGoal } from "@/features/goals/queries";
import { buildGoalSummary, type GoalSummary } from "@/features/goals/summary";
import { listWeights } from "@/features/weight/queries";
import type { LocalDate } from "@/lib/dates";
import type { Db } from "@/lib/db/types";
import { paceTone } from "./pace-tone";
import { buildWeightSummary, type WeightSummary } from "./weight-summary";

/** Accueil data, computed server-side. L4 adds the measurements. */
export type Dashboard = {
  weight: WeightSummary;
  goal: GoalSummary;
  rateTone: "positive" | "neutral";
};

export async function getDashboard(db: Db, userId: string, todayDate: LocalDate): Promise<Dashboard> {
  const [points, active] = await Promise.all([listWeights(db, userId), getActiveGoal(db, userId)]);
  const weight = buildWeightSummary(points, todayDate);
  const goal = buildGoalSummary(active, points, todayDate);
  return { weight, goal, rateTone: paceTone(goal, weight) };
}
```

`WeightBlock` : ajouter la prop `rateTone` et appliquer la classe sur la ligne de rythme : `className={`mt-3 text-sm ${rateTone === "positive" ? "text-positive" : "text-fg-2"}`}` (la ligne de calibrage reste en `text-fg-2` : `rateTone` est `neutral` dans ce cas).

`src/features/goals/components/achieved-banner.tsx` :

```tsx
"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { achieveGoalAction } from "../actions";

/** EF-GOAL-04: "Passer en maintien" or "Nouvel objectif"; both end the current goal. */
export function AchievedBanner() {
  const [state, action, pending] = useActionState(achieveGoalAction, null);
  return (
    <form action={action} className="flex flex-col gap-3 rounded-xl border border-fg p-4">
      <p className="text-[15px] font-semibold">🎯 Objectif atteint !</p>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" name="mode" value="maintain" loading={pending}>
          Passer en maintien
        </Button>
        <Button type="submit" name="mode" value="new" variant="secondary" loading={pending}>
          Nouvel objectif
        </Button>
      </div>
      {state && !state.ok && state.formError && (
        <p role="alert" className="text-xs font-medium text-fg">
          {state.formError}
        </p>
      )}
    </form>
  );
}
```

`src/features/goals/components/goal-block.tsx` :

```tsx
import Link from "next/link";
import type { LocalDate } from "@/lib/dates";
import { formatDecimal, formatWeight, toDisplayWeight, type WeightUnit } from "@/lib/units";
import { GOAL_LABELS, projectionLabel, statusMessage } from "../copy";
import type { GoalSummary } from "../summary";
import { AchievedBanner } from "./achieved-banner";

/** Accueil "Objectif" block (specs/01 §3.2). Formatting only: values come computed. */
export function GoalBlock({
  summary,
  unit,
  today,
}: {
  summary: GoalSummary;
  unit: WeightUnit;
  today: LocalDate;
}) {
  if (summary.state === "none") {
    return (
      <section aria-labelledby="goal-title" className="mt-8">
        <h2 id="goal-title" className="text-[15px] font-semibold tracking-tight">
          Objectif
        </h2>
        <p className="mt-2 text-sm text-fg-2">Tu n&apos;as pas d&apos;objectif en cours.</p>
        <Link
          href="/objectif"
          className="mt-4 inline-flex h-11 items-center rounded-full bg-fg px-5 text-[13px] font-semibold text-white"
        >
          Définir mon objectif
        </Link>
      </section>
    );
  }

  const percent = summary.progress ? Math.round(summary.progress.ratio * 100) : null;
  return (
    <section aria-labelledby="goal-title" className="mt-8 flex flex-col gap-3">
      {summary.status.status === "achieved" && <AchievedBanner />}
      <h2 id="goal-title" className="text-xs font-medium text-fg-2">
        Objectif · {GOAL_LABELS[summary.type]}
      </h2>
      {summary.targetKg !== null ? (
        <p className="flex items-baseline gap-2">
          <span className="text-[28px] font-semibold tracking-tight tabular-nums">
            {formatWeight(summary.targetKg, unit)}
          </span>
          <span className="text-sm text-fg-2">{projectionLabel(summary.projection, today)}</span>
        </p>
      ) : (
        <p className="text-sm text-fg-2">
          Référence : {formatWeight(summary.startKg, unit)}
        </p>
      )}
      {summary.progress && percent !== null && (
        <>
          <div
            role="progressbar"
            aria-label="Progression vers l'objectif"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="h-[3px] w-full rounded-full bg-line"
          >
            <div className="h-full rounded-full bg-fg" style={{ width: `${percent}%` }} />
          </div>
          <p className="text-sm text-fg-2 tabular-nums">
            {formatDecimal(toDisplayWeight(summary.progress.doneKg, unit))} /{" "}
            {formatWeight(summary.progress.totalKg, unit)}
          </p>
        </>
      )}
      <p data-testid="goal-status" className="text-sm font-medium">
        {statusMessage(summary, unit)}
      </p>
    </section>
  );
}
```

L'avancement s'affiche « 3,6 / 7,0 kg » (spec 01), comme le test l'attend (`3,6 / 7,0` + espace fine insécable + `kg`).

`src/app/(app)/accueil/page.tsx` : destructurer `{ weight, goal, rateTone }`, passer `rateTone` à `WeightBlock` et ajouter sous lui `<GoalBlock summary={goal} unit={profile?.weightUnit ?? "kg"} today={todayDate} />`.

- [ ] **Étape 3 : vérifier**

Run : `pnpm vitest run src && pnpm vitest run tests/integration && pnpm typecheck && pnpm lint && pnpm build`
Attendu : PASS. Relever dans la sortie du build la taille « First Load JS » de `/accueil` (cible < 180 ko gzip, ENF-03) : le bandeau est le seul composant client ajouté.

- [ ] **Étape 4 : commit**

```bash
pnpm format && git add src tests && git commit -m "feat(dashboard): goal block, achieved banner and green pace toward the goal

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Tâche 11 : seed de démonstration, E2E-5 et CI (BODY-30, BODY-31 : parcours)

**Fichiers :**
- Modifier : `src/lib/db/seed-data.ts`, `src/lib/db/seed-data.test.ts`, `src/lib/db/seed.ts`
- Créer : `tests/e2e/goal.spec.ts`

**Interfaces :**
- Consomme : `NewGoal`, `createGoal`, `currentTrend`, `demoWeights`, `addDays`, `round2`.
- Produit : `demoGoal(todayDate: LocalDate, weights: readonly NewWeight[]): NewGoal`

- [ ] **Étape 1 : test de `demoGoal` (échec attendu)**

Ajouter à `src/lib/db/seed-data.test.ts` :

```ts
describe("demoGoal", () => {
  const today = "2026-10-03";
  const weights = demoWeights(today);

  it("is a loss goal started 30 days ago, from the trend of that day", () => {
    const goal = demoGoal(today, weights);
    expect(goal).toMatchObject({
      type: "lose",
      startDate: "2026-09-03",
      targetWeightKg: 75,
      weeklyRatePct: 0.5,
    });
    const upToStart = weights.filter((w) => w.date <= "2026-09-03");
    expect(goal.startWeightKg).toBe(round2(currentTrend(upToStart) as number));
  });

  it("has a target below the current weight and a rate within the bounds", () => {
    const goal = demoGoal(today, weights);
    expect(goal.targetWeightKg as number).toBeLessThan(weights[weights.length - 1].weightKg);
    expect(isRateInBounds("lose", goal.weeklyRatePct as number)).toBe(true);
  });
});
```

(importer `demoGoal`, `round2`, `currentTrend`, `isRateInBounds`.) Run : `pnpm vitest run src/lib/db/seed-data.test.ts` → FAIL.

- [ ] **Étape 2 : implémenter**

`src/lib/db/seed-data.ts` :

```ts
import type { NewGoal } from "@/features/goals/queries";
import { currentTrend } from "@/lib/metrics";

/** A loss goal started 30 days ago at the trend of that day: on track with the demo weighings. */
export function demoGoal(todayDate: LocalDate, weights: readonly NewWeight[]): NewGoal {
  const startDate = addDays(todayDate, -30);
  const trend = currentTrend(weights.filter((w) => w.date <= startDate)) ?? weights[0].weightKg;
  return {
    type: "lose",
    startDate,
    startWeightKg: round2(trend),
    targetWeightKg: 75,
    weeklyRatePct: 0.5,
  };
}
```

`src/lib/db/seed.ts` : mettre à jour le commentaire d'en-tête (« L4 adds the measurement sessions »), importer `createGoal` et `demoGoal`, et remplacer la ligne d'insertion des pesées par :

```ts
const weights = demoWeights(today("Europe/Paris"));
await insertWeights(db, demo.id, weights);
await createGoal(db, demo.id, demoGoal(today("Europe/Paris"), weights));
await markOnboardingCompleted(db, demo.id);
```

- [ ] **Étape 3 : E2E-5**

`tests/e2e/goal.spec.ts` :

```ts
import { expect, test } from "@playwright/test";

const DEMO_EMAIL = "demo@my-body.test";

test("E2E-5: switching goal type asks for confirmation and keeps the old goal in the history", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "E2E-5 runs on desktop only (specs/09 §4)");
  const password = process.env.SEED_DEMO_PASSWORD;
  test.skip(!password, "SEED_DEMO_PASSWORD is not set: run pnpm db:seed first");

  await page.goto("/connexion");
  await page.getByLabel("Email").fill(DEMO_EMAIL);
  await page.getByLabel("Mot de passe").fill(password as string);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/accueil$/);

  await page.goto("/objectif");
  const lose = page.getByRole("radio", { name: /Perdre du poids/ });
  const gain = page.getByRole("radio", { name: /Prendre du poids/ });
  // The demo goal is a loss; on a re-run without re-seeding it may already be a gain: switch to the other one.
  const wasLose = await lose.isChecked();
  const [next, previous] = wasLose ? [gain, "Perte"] : [lose, "Prise"];

  await next.check();
  const trend = Number((await page.getByLabel("Actuel (tendance)").inputValue()).replace(",", "."));
  const target = (wasLose ? trend + 4 : trend - 4).toFixed(1).replace(".", ",");
  await page.getByLabel("Cible", { exact: true }).fill(target);
  await page.getByRole("button", { name: "Enregistrer" }).click();

  const confirmation = page.getByRole("alert").filter({ hasText: "archive" });
  await expect(confirmation).toBeVisible();
  await page.getByRole("button", { name: "Confirmer" }).click();
  await expect(page.getByText("Objectif enregistré")).toBeVisible();

  await page.reload();
  await expect(next).toBeChecked();
  await page.getByText("Historique des objectifs").click();
  await expect(page.getByTestId("goal-history")).toContainText(previous);
});
```

- [ ] **Étape 4 : vérification complète**

Run : `pnpm db:seed && pnpm lint && pnpm typecheck && pnpm format:check && pnpm test --coverage && pnpm build && pnpm test:e2e`
Attendu : tout passe, y compris E2E-1 (onboarding avec l'étape 4), E2E-2 (inchangé) et E2E-5 ; couverture ≥ 95 % sur `src/lib/metrics`. Le workflow `.github/workflows/ci.yml` lance déjà `pnpm db:seed` avant les E2E : vérifier que l'étape existe, sinon l'ajouter (le compte de démo doit avoir un objectif).

- [ ] **Étape 5 : commit**

```bash
pnpm format && git add src tests && git commit -m "test(e2e): E2E-5 goal change with confirmation; seed a loss goal

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Tâche 12 : clôture du lot L3

**Fichiers :**
- Modifier : `specs/02-exigences-fonctionnelles.md`, `specs/03-regles-metier-et-calculs.md`, `specs/04-modele-de-donnees.md`, `specs/05-architecture-technique.md`, `specs/01-parcours-et-ecrans.md`, `specs/10-planning-et-jalons.md`, `specs/README.md`

- [ ] **Étape 1 : reporter les écarts assumés dans la spec**

- `specs/02` EF-ONB-02 CA1 : « Tant que le profil, une pesée et un objectif actif n'existent pas **à la fin de l'onboarding**, … ». Ajouter un CA2 : « Un compte onboardé sans objectif actif (avant L3, ou après « Nouvel objectif ») n'est pas renvoyé vers `/onboarding` : `/accueil` et `/objectif` proposent d'en définir un. »
- `specs/03` §5.1 ligne 3 : préciser « Il faut au moins 21 jours d'historique » = « première pesée datée au plus tard `aujourd'hui − 20` ». §5.3 : « Tant que L4 n'est pas livrée, l'indicateur de taille est `waist_insufficient`. » §4 : l'aperçu du curseur affiche **2 décimales** (« ≈ 0,39 kg/sem »), seule exception à la règle d'une décimale.
- `specs/04` `goal` : lister les CHECK ajoutés (`target`/`rate` ensemble, bornes du rythme par type, poids 20-400, `ended_at` ⇔ statut ≠ `active`). §6 : « En L3, le seed ajoute un objectif de perte (cible 75 kg, 0,5 %/sem, démarré 30 jours plus tôt). Les séances de mesure (L4) y seront ajoutées. »
- `specs/05` §4.2 : `reason: 'replace' | 'suspicious' | 'archive'`. §3 : `lib/metrics/` détaille `goal-rates.ts`, `goal-status.ts`, `projection.ts` ; les messages de statut vivent dans `features/goals/copy.ts`.
- `specs/01` §3.7 : curseur natif stylé, bloc Suivi, historique repliable ; mention légale en bas de l'écran.
- `specs/10` L3 : « **Terminé quand :** l'onboarding est complet (hors étape 5) et E2E-5 passe » reste ; ajouter « Historique des objectifs (EF-GOAL-05) ».
- `specs/README.md` : version 1.4, date du jour, ligne d'historique « 1.4 · <date> · Ajustements issus du plan L3 (compte sans objectif non redirigé, statut sans texte dans `lib/metrics`, confirmation `archive`, CHECK supplémentaires, aperçu à 2 décimales) ».

- [ ] **Étape 2 : vérification complète**

Run : `pnpm lint && pnpm typecheck && pnpm format:check && pnpm test --coverage && pnpm build && pnpm db:seed && pnpm test:e2e`
Attendu : tout passe. Copier le récapitulatif (tests, couverture de `src/lib/metrics`, « First Load JS » de `/accueil`) dans le compte rendu.

- [ ] **Étape 3 : commit**

```bash
pnpm format && git add specs && git commit -m "docs(specs): record L3 implementation decisions (v1.4)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

- [ ] **Étape 4 : relecture du lot** — lancer l'agent `reviewer` sur `git diff main..HEAD` avec pour consigne : critères d'acceptation de BODY-29 à BODY-36, table de cas de la spec 03 §5 (ordre de priorité, bornes exactes 0,5 r / 1,5 r / ± 1,5 %, absence de plafond absolu, plateau à 21 jours), projection (arrondi supérieur, 730 jours), isolation des données (`requireUser` seule source de `userId`, `userId` forgé ignoré, requêtes filtrées), transaction du changement de type, aucune donnée de santé dans les logs, la section « Review Focus » de ce plan, et les contraintes globales. Corriger les points bloquants avant de déclarer le lot terminé.

- [ ] **Étape 5 : PR et Jira** — ouvrir la PR `feat/l3-objectifs` → `main`, E2E en CI, puis (session principale, via l'agent `jira-updater`) passer BODY-29 à BODY-36 et l'epic BODY-4 à « Terminé » une fois la PR fusionnée.
