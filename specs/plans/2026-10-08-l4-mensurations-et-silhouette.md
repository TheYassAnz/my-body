# Lot L4 (mensurations et silhouette) : plan d'implémentation

> **Pour les agents :** sous-skill requis : utiliser `superpowers:subagent-driven-development` (recommandé) ou `superpowers:executing-plans` pour exécuter ce plan tâche par tâche. Les étapes utilisent des cases à cocher (`- [ ]`). Agent d'exécution conseillé : `implementer` ; relecture : `reviewer`.

**Objectif :** permettre de saisir ses mensurations (8 zones) par séance guidée ou zone par zone depuis une silhouette annotée, de lire la dernière valeur et l'écart par zone sur une période (7 j, 30 j, 90 j, Début), avec l'étape 5 de l'onboarding, le bloc Mensurations de l'Accueil, les rappels de mesure, et l'indicateur de taille de la recompo (branché sur `goalStatus`).

**Architecture :** les écarts (référence, sens favorable, seuil de 0,3 cm) sont des fonctions pures dans `src/lib/metrics/deltas.ts` (TDD), qui renvoient des nombres et des codes, jamais de texte. `features/measurements` porte les tables `measurement_session` / `measurement`, leurs requêtes (toutes filtrées par `userId` via la séance), le schéma Zod, deux Server Actions (zone isolée avec confirmation de remplacement ; zone de la séance guidée, toujours datée du jour), un constructeur de résumé pur (`summary.ts`) et les textes français (`copy.ts`). La silhouette est un SVG décoratif (`aria-hidden`) sur lequel on superpose de vrais `<button>` de 44 px (ENF-12) ; la séance guidée est un composant client qui enregistre chaque zone au passage à la suivante.

**Stack :** Next.js 16.3 (App Router, Server Actions), React 19.2, TypeScript strict, Tailwind v4, Drizzle 0.45 + PostgreSQL, Zod 4, Vitest 5 + PGlite + Testing Library, Playwright. Aucune nouvelle dépendance.

**Spec :** `specs/` v1.4, en particulier `01` §3.1 (étape 5), §3.2 (Accueil), §3.4 (Corps), §3.5 (séance guidée) ; `02` (MEA-01 à 03, MEA-05, BODY-01, ONB-01) ; `03` §6-9 ; `04` (`measurement_session`, `measurement`) ; `05` §3-4 ; `06` §5 (silhouette) ; `09` §2-4 (E2E-3, E2E-4).

**Tickets Jira :** BODY-37 à BODY-44 (epic BODY-5 = L4). EF-MEA-04 (édition et suppression) appartient à L5 : elle n'est **pas** dans ce lot.

**Branche :** `feat/l4-mensurations`, créée depuis `main` (L3 fusionnée via la PR #4).

## Contraintes globales

- Toutes les contraintes globales des plans L0-L1, L2 et L3 restent valables : TypeScript strict sans `any`, UI en français (tutoiement), code en anglais, `pnpm format` avant chaque commit, aucune donnée de santé (poids, mensurations, cible) ni email ni jeton dans les logs, `lib/metrics` sans base, Next ni horloge, `app/*` sans requête Drizzle.
- Mensuration (spec 03 §9) : **10 à 250 cm**, validée **après** conversion depuis les pouces, stockée à 1 décimale (`numeric(4,1)`). Saisie : `parseDecimal` (virgule ou point, 4 chiffres entiers maximum).
- Zones (spec 04) : `neck, shoulders, chest, arm, waist, hips, thigh, calf`, **dans cet ordre** (cou, épaules, poitrine, bras, taille, hanches, cuisse, mollet).
- Écarts (spec 03 §6) : valeur actuelle = mesure la plus récente ; référence = première mesure (Début) ou plus récente mesure datée au plus tard `aujourd'hui − P`, à défaut la première ; pas d'écart (« — ») si actuelle et référence sont la même mesure ; **|écart| < 0,3 cm → 0, gris**.
- Sens favorable (spec 03 §6) : taille et hanches ↓ en perte et recompo ; cou ↓ en perte ; poitrine, épaules, bras, cuisse, mollet ↑ en prise et recompo ; maintien : jamais. Le vert n'indique que « favorable » ; **aucun rouge**.
- Zones mises en avant (spec 03 §6) : perte = taille, hanches, cuisse ; prise = bras, épaules, poitrine ; recompo = taille, bras, épaules ; maintien = taille, hanches, bras.
- Une séance par jour et par utilisateur (`UNIQUE (user_id, date)`), une mesure par zone et par séance (`UNIQUE (session_id, zone)`). La date d'une séance est la date locale dans `profile.timezone`.
- `MEASURE_STALE_DAYS` = 14 (déjà dans `config.ts`). `profile.reminderWeekday` : 0 = lundi … 6 = dimanche (spec 04).
- Silhouette : `viewBox="-80 0 360 440"`, ancres de la spec 06 §5.2, zone de toucher ≥ 44×44 px (ENF-14), un `<button>` par zone avec `aria-label` complet (ENF-12).
- Couverture ≥ 95 % (lignes, branches, fonctions) sur `src/lib/metrics/**` et `src/lib/units.ts`, vérifiée en CI.

## Écarts assumés par rapport à la spec (à reporter dans la spec à la tâche 13)

1. **L'étape 5 termine l'onboarding** par deux actions (« Plus tard » → `/accueil`, « Commencer » → `/corps/seance`). « Commencer » termine aussi l'onboarding **avant** d'ouvrir la séance, car `/corps/seance` vit dans `(app)` qui exige l'onboarding terminé (EF-ONB-01 CA4 ne parle que de « Plus tard »). `continueOnboarding` ne termine plus rien : seule l'étape 5 le fait, et seulement si profil, pesée et objectif existent.
2. **Séance guidée hors `AppShell`** : route group `(session)` avec sa propre garde `requireUser("app")`, pour respecter « écran plein, sans barre d'onglets » (spec 01 §3.5). L'URL reste `/corps/seance`.
3. **Boutons HTML superposés au SVG** plutôt que des cercles SVG pour la zone de toucher : seul le point (44 px) est cliquable, pas l'étiquette. Le SVG est `aria-hidden`.
4. **« Zone suivante » enregistre la valeur affichée** (pré-remplie avec la valeur précédente ou celle du jour). Pour ne rien enregistrer : « Passer cette zone ». Champ vidé + « Zone suivante » = passer.
5. **Pas de confirmation de remplacement dans la séance guidée** : elle ré-édite sa propre séance du jour. La confirmation reste dans la saisie d'une zone isolée (EF-MEA-03 CA2).
6. **Reprise d'une séance** : la séance guidée reprend à la première zone sans valeur **datée du jour** ; une nouvelle ouverture le même jour pré-remplit les valeurs déjà saisies.
7. **Pas de contrôle de valeur « suspecte »** pour les mensurations (la spec n'en prévoit pas).
8. **Écran d'introduction** de la séance : affiché tant que l'utilisateur n'a **aucune** mesure (« premier lancement »), sans stockage navigateur.
9. **Hors lot** : silhouette et tableau de mensurations de l'Accueil desktop (L7), édition et suppression d'une mesure (L5, EF-MEA-04), jour de mesure dans les Réglages (L6, le rappel lit `reminderWeekday` s'il est défini).
10. **Recompo** : l'indicateur de taille (écart n° 4 du lot L3) est branché sur `goalStatus` via les mesures de la zone `waist`.

## Review Focus

1. **Compte jamais mesuré** (tous les comptes d'avant L4) : `/corps`, `/corps/seance` et l'Accueil s'ouvrent sans erreur (point creux et « — », appel à l'action, écran d'introduction). Tests : `summary.test.ts` (tâche 6), `measure-block.test.tsx` (tâche 11), `measure-session.test.tsx` (tâche 9).
2. **Saisies absurdes** (« 9,9 », « 250,1 », « abc », « 1e3 », champ vide, zone inconnue, date future, pouces à la limite : 3,9 in = 9,9 cm rejeté) : erreur de champ, jamais de `NaN` en base. Test : `schemas.test.ts` (tâche 5).
3. **Double envoi** : deux zones enregistrées en parallèle le même jour ne créent qu'**une** séance ; deux envois de la même zone n'en laissent qu'une. Test : `tests/integration/measurement.test.ts` (tâche 4).
4. **Fuseau horaire** : à Los Angeles à 19 h (déjà le lendemain en UTC), la séance guidée est datée de la date locale et ignore toute date envoyée par le client. Test : `actions.test.ts` (tâche 5).
5. **Isolation** : aucune action ne prend d'identifiant de séance ou de mesure ; A ne lit pas, n'écrase pas les mesures de B, y compris à la même date. Tests : `tests/integration/measurement.test.ts` (tâche 4), `actions.test.ts` (tâche 5).
6. **Étape 5 non forgeable** : appeler l'action de l'étape 5 sans objectif actif ne termine pas l'onboarding ; un compte déjà onboardé n'est pas renvoyé sur `/onboarding`. Test : `src/features/profile/actions.test.ts` (tâche 10).

## Structure des fichiers

```
src/lib/
  units.ts                       + LengthUnit, toStoredCm, toDisplayLength, formatLength, formatLengthDelta
  dates.ts                       + weekdayIndex
  metrics/
    config.ts                    + MEASURE_NEGLIGIBLE_DELTA_CM
    deltas.ts                    ZONES, zoneDelta, measureDelta, deltaTone, featuredZones
    index.ts                     + export deltas
  db/
    schema/app.ts                + zone, measurement_session, measurement
    seed-data.ts                 + demoMeasurements
    seed.ts                      + séances de démonstration
drizzle/0004_measurements.sql    migration générée
src/features/measurements/
  limits.ts                      MEASURE_MIN_CM, MEASURE_MAX_CM
  queries.ts                     listMeasures, getMeasureOn, countSessions, upsertMeasure
  schemas.ts                     measureSchema(today)
  copy.ts                        ZONE_LABELS, PROTOCOLS, GENERAL_RULES, messages
  actions.ts                     saveZoneAction, saveSessionZoneAction
  summary.ts                     parsePeriod, buildBodySummary, buildSessionData, measureReminder, buildMeasureBlock, waistSeries
  silhouette-geometry.ts         tracés, ancres, bandes de surbrillance
  components/
    silhouette.tsx               SVG + boutons accessibles
    body-view.tsx                silhouette + panneau de saisie d'une zone
    zone-form.tsx                formulaire du panneau
    period-tabs.tsx              7 j · 30 j · 90 j · Début
    measure-session.tsx          séance guidée (intro, zones, récapitulatif)
    measure-block.tsx            bloc Mensurations de l'Accueil
src/features/profile/
  onboarding.ts                  + étape "measure"
  actions.ts                     continueOnboarding simplifié, + finishOnboardingAction
  components/measure-step.tsx    étape 5
src/features/dashboard/queries.ts  + measures, + taille de la recompo
src/app/(app)/corps/page.tsx
src/app/(session)/layout.tsx
src/app/(session)/corps/seance/page.tsx
src/app/(app)/accueil/page.tsx
src/app/(app)/objectif/page.tsx  taille de la recompo
src/app/onboarding/page.tsx      étape 5
tests/integration/measurement.test.ts
tests/e2e/measure.spec.ts        E2E-3 et E2E-4
```

---

### Tâche 0 : branche

- [ ] **Étape 1 : créer la branche depuis `main` à jour**

```bash
git switch main && git pull --ff-only
git switch -c feat/l4-mensurations
```

Attendu : `git log --oneline -1` montre le merge de la PR #4 (`a406ea3`).

- [ ] **Étape 2 : vérifier que la base de départ est verte**

Run : `pnpm lint && pnpm typecheck && pnpm test`
Attendu : tout passe.

---

### Tâche 1 : unités de longueur (BODY-37, partie unités)

**Fichiers :**
- Modifier : `src/lib/units.ts`, `src/lib/units.test.ts`

**Interfaces :**
- Consomme : `round1`, `inToCm`, `cmToIn`, `formatDecimal`, `formatDelta`, constante interne `NNBSP`.
- Produit :
  - `type LengthUnit = "cm" | "in"`
  - `toStoredCm(value: number, unit: LengthUnit): number` (1 décimale)
  - `toDisplayLength(cm: number, unit: LengthUnit): number` (1 décimale)
  - `formatLength(cm: number, unit: LengthUnit): string` → `"84,5 cm"` (espace fine insécable)
  - `formatLengthDelta(cm: number, unit: LengthUnit): string` → `"−3,5 cm"`, `"+1 cm"`, `"0 cm"`

- [ ] **Étape 1 : écrire les tests qui échouent** (à la suite de `src/lib/units.test.ts`)

```ts
import {
  formatLength,
  formatLengthDelta,
  formatWeight,
  toDisplayLength,
  toStoredCm,
} from "./units";

describe("length units", () => {
  it("stores centimetres as typed and converts inches with the exact factor (1 decimal)", () => {
    expect(toStoredCm(84.5, "cm")).toBe(84.5);
    expect(toStoredCm(33.3, "in")).toBe(84.6); // 33.3 × 2.54 = 84.582
    expect(toStoredCm(3.9, "in")).toBe(9.9);
  });

  it("round-trips cm → in → cm without drifting past the storage precision", () => {
    for (const cm of [10, 33.3, 84.5, 100, 249.9, 250]) {
      expect(toStoredCm(toDisplayLength(cm, "in"), "in")).toBeCloseTo(cm, 0);
    }
  });

  it("displays in the profile unit", () => {
    expect(toDisplayLength(84.5, "cm")).toBe(84.5);
    expect(toDisplayLength(84.5, "in")).toBe(33.3);
  });

  it("formats a length like a weight: one decimal, French separator, narrow no-break space", () => {
    expect(formatLength(84.5, "cm")).toBe(formatWeight(84.5, "kg").replace("kg", "cm"));
    expect(formatLength(84.5, "cm")).toMatch(/^84,5\s?cm$/);
    expect(formatLength(84.5, "in")).toMatch(/^33,3\s?in$/);
  });

  it("formats a signed difference without a useless zero", () => {
    expect(formatLengthDelta(-3.5, "cm")).toMatch(/^−3,5\s?cm$/);
    expect(formatLengthDelta(1, "cm")).toMatch(/^\+1\s?cm$/);
    expect(formatLengthDelta(0, "cm")).toMatch(/^0\s?cm$/);
    expect(formatLengthDelta(2.54, "in")).toMatch(/^\+1\s?in$/);
  });
});
```

- [ ] **Étape 2 : voir les tests échouer**

Run : `pnpm vitest run src/lib/units.test.ts`
Attendu : FAIL (`toStoredCm` n'est pas exporté).

- [ ] **Étape 3 : implémenter** (dans `src/lib/units.ts`, après `toDisplayWeight`)

```ts
export type LengthUnit = "cm" | "in";

/** Typed length → stored centimetres (1 decimal). */
export const toStoredCm = (value: number, unit: LengthUnit) =>
  unit === "in" ? inToCm(value) : round1(value);

/** Stored centimetres → display unit (1 decimal). */
export const toDisplayLength = (cm: number, unit: LengthUnit) =>
  unit === "in" ? cmToIn(cm) : round1(cm);
```

et, après `formatWeeklyRate` :

```ts
/** "84,5 cm" or "33,3 in" from stored centimetres. */
export function formatLength(cm: number, unit: LengthUnit): string {
  return `${formatDecimal(toDisplayLength(cm, unit))}${NNBSP}${unit}`;
}

/** "−3,5 cm", "+1 cm", "0 cm": a difference of stored centimetres, in the display unit. */
export function formatLengthDelta(cm: number, unit: LengthUnit): string {
  return `${formatDelta(toDisplayLength(cm, unit))}${NNBSP}${unit}`;
}
```

- [ ] **Étape 4 : voir les tests passer**

Run : `pnpm vitest run src/lib/units.test.ts`
Attendu : PASS.

- [ ] **Étape 5 : commit**

```bash
pnpm format
git add src/lib/units.ts src/lib/units.test.ts
git commit -m "feat(units): length conversion and formatting for measurements"
```

---

### Tâche 2 : écarts des mensurations, TDD (BODY-38)

**Fichiers :**
- Créer : `src/lib/metrics/deltas.ts`, `src/lib/metrics/deltas.test.ts`
- Modifier : `src/lib/metrics/config.ts`, `src/lib/metrics/index.ts`

**Interfaces :**
- Consomme : `addDays`, `LocalDate` (`lib/dates`), `GoalType` (`goal-rates`).
- Produit :
  - `ZONES: readonly ["neck","shoulders","chest","arm","waist","hips","thigh","calf"]`, `type Zone`
  - `type DeltaPeriod = 7 | 30 | 90 | "start"`, `type ZoneMeasure = { date: LocalDate; valueCm: number }`, `type DeltaTone = "positive" | "neutral"`
  - `measureDelta(fromCm: number, toCm: number): number` (arrondi à 1 décimale ; |écart| < 0,3 → 0)
  - `deltaTone(zone: Zone, deltaCm: number | null, goal: GoalType | null): DeltaTone`
  - `zoneDelta(zone: Zone, measures: readonly ZoneMeasure[], period: DeltaPeriod, today: LocalDate, goal: GoalType | null): ZoneDelta` avec `ZoneDelta = { current: ZoneMeasure | null; reference: ZoneMeasure | null; deltaCm: number | null; tone: DeltaTone }`
  - `featuredZones(goal: GoalType | null): readonly Zone[]` (3 zones ; `null` = maintien)

- [ ] **Étape 1 : écrire les tests qui échouent**

`src/lib/metrics/deltas.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { deltaTone, featuredZones, measureDelta, zoneDelta, ZONES } from "./deltas";

const TODAY = "2026-10-03";
const m = (date: string, valueCm: number) => ({ date, valueCm });

describe("ZONES", () => {
  it("keeps the fixed session order (specs/04, specs/01 §3.5)", () => {
    expect([...ZONES]).toEqual([
      "neck",
      "shoulders",
      "chest",
      "arm",
      "waist",
      "hips",
      "thigh",
      "calf",
    ]);
  });
});

describe("measureDelta", () => {
  it("rounds to one decimal", () => {
    expect(measureDelta(84.4, 84.7)).toBe(0.3); // 84.7 − 84.4 = 0.29999999999999716
    expect(measureDelta(88, 84.5)).toBe(-3.5);
  });
  it("treats a change below 0.3 cm as zero, 0.3 itself as a change", () => {
    expect(measureDelta(84, 84.2)).toBe(0);
    expect(measureDelta(84, 83.8)).toBe(0);
    expect(measureDelta(84, 84.3)).toBe(0.3);
    expect(measureDelta(84, 83.7)).toBe(-0.3);
  });
  it("never returns negative zero", () => {
    expect(Object.is(measureDelta(84, 83.9), 0)).toBe(true);
  });
});

describe("deltaTone (specs/03 §6 matrix)", () => {
  const T = "positive";
  const N = "neutral";
  it.each([
    // zone, goal, delta, expected
    ["waist", "lose", -1, T],
    ["waist", "lose", 1, N],
    ["waist", "recomp", -1, T],
    ["waist", "gain", -1, N],
    ["waist", "maintain", -1, N],
    ["hips", "lose", -1, T],
    ["hips", "recomp", -1, T],
    ["hips", "gain", -1, N],
    ["neck", "lose", -1, T],
    ["neck", "recomp", -1, N],
    ["neck", "gain", 1, N],
    ["chest", "gain", 1, T],
    ["chest", "recomp", 1, T],
    ["chest", "lose", 1, N],
    ["chest", "gain", -1, N],
    ["shoulders", "gain", 1, T],
    ["arm", "recomp", 1, T],
    ["thigh", "gain", 1, T],
    ["thigh", "lose", 1, N],
    ["calf", "recomp", 1, T],
    ["calf", "maintain", 1, N],
  ] as const)("%s · %s · %s cm → %s", (zone, goal, delta, expected) => {
    expect(deltaTone(zone, delta, goal)).toBe(expected);
  });

  it("is neutral without goal, without delta, and for a zero delta", () => {
    expect(deltaTone("waist", -2, null)).toBe(N);
    expect(deltaTone("waist", null, "lose")).toBe(N);
    expect(deltaTone("waist", 0, "lose")).toBe(N);
  });
});

describe("zoneDelta (specs/03 §6)", () => {
  const waist = [m("2026-08-20", 90), m("2026-09-10", 88), m("2026-10-01", 86.5)];

  it("has nothing for a zone that was never measured", () => {
    expect(zoneDelta("waist", [], 30, TODAY, "lose")).toEqual({
      current: null,
      reference: null,
      deltaCm: null,
      tone: "neutral",
    });
  });

  it("current = latest measure; reference = latest measure at most today − P", () => {
    // 30 d → limit 2026-09-03 → 2026-08-20 (90 cm)
    expect(zoneDelta("waist", waist, 30, TODAY, "lose")).toEqual({
      current: m("2026-10-01", 86.5),
      reference: m("2026-08-20", 90),
      deltaCm: -3.5,
      tone: "positive",
    });
    // 7 d → limit 2026-09-26 → 2026-09-10 (88 cm)
    expect(zoneDelta("waist", waist, 7, TODAY, "lose").deltaCm).toBe(-1.5);
  });

  it("a measure dated exactly today − P is a valid reference", () => {
    const edge = [m("2026-09-03", 90), m("2026-10-01", 86)];
    expect(zoneDelta("waist", edge, 30, TODAY, "lose").reference).toEqual(m("2026-09-03", 90));
  });

  it("falls back to the first measure when none is old enough", () => {
    const recent = [m("2026-09-25", 90), m("2026-10-01", 88)];
    expect(zoneDelta("waist", recent, 30, TODAY, "lose")).toMatchObject({
      reference: m("2026-09-25", 90),
      deltaCm: -2,
    });
  });

  it("'start' compares with the very first measure", () => {
    expect(zoneDelta("waist", waist, "start", TODAY, "lose")).toMatchObject({
      reference: m("2026-08-20", 90),
      deltaCm: -3.5,
    });
  });

  it("shows no delta when current and reference are the same measure", () => {
    expect(zoneDelta("waist", [m("2026-10-01", 86)], 30, TODAY, "lose")).toEqual({
      current: m("2026-10-01", 86),
      reference: null,
      deltaCm: null,
      tone: "neutral",
    });
    expect(zoneDelta("waist", [m("2026-10-01", 86)], "start", TODAY, "lose").deltaCm).toBeNull();
  });

  it("ignores measures dated after today and sorts unsorted input", () => {
    const shuffled = [m("2026-10-01", 86.5), m("2026-12-01", 10), m("2026-08-20", 90)];
    expect(zoneDelta("waist", shuffled, 30, TODAY, "lose")).toMatchObject({
      current: m("2026-10-01", 86.5),
      deltaCm: -3.5,
    });
  });

  it("flattens a change below 0.3 cm to 0, grey", () => {
    const flat = [m("2026-08-20", 90), m("2026-10-01", 89.8)];
    expect(zoneDelta("waist", flat, 30, TODAY, "lose")).toMatchObject({
      deltaCm: 0,
      tone: "neutral",
    });
  });

  it("is grey when the change goes against the goal, and without goal", () => {
    const up = [m("2026-08-20", 86), m("2026-10-01", 90)];
    expect(zoneDelta("waist", up, 30, TODAY, "lose").tone).toBe("neutral");
    expect(zoneDelta("waist", waist, 30, TODAY, null).tone).toBe("neutral");
  });
});

describe("featuredZones (specs/03 §6)", () => {
  it("returns the three zones of each goal type", () => {
    expect(featuredZones("lose")).toEqual(["waist", "hips", "thigh"]);
    expect(featuredZones("gain")).toEqual(["arm", "shoulders", "chest"]);
    expect(featuredZones("recomp")).toEqual(["waist", "arm", "shoulders"]);
    expect(featuredZones("maintain")).toEqual(["waist", "hips", "arm"]);
  });
  it("falls back to the maintenance zones without a goal", () => {
    expect(featuredZones(null)).toEqual(["waist", "hips", "arm"]);
  });
});
```

- [ ] **Étape 2 : voir les tests échouer**

Run : `pnpm vitest run src/lib/metrics/deltas.test.ts`
Attendu : FAIL (module introuvable).

- [ ] **Étape 3 : implémenter**

Dans `src/lib/metrics/config.ts`, ajouter :

```ts
export const MEASURE_NEGLIGIBLE_DELTA_CM = 0.3;
```

`src/lib/metrics/deltas.ts` :

```ts
import { addDays, type LocalDate } from "@/lib/dates";
import { MEASURE_NEGLIGIBLE_DELTA_CM } from "./config";
import type { GoalType } from "./goal-rates";

/** Fixed session order, top to bottom (specs/01 §3.5). */
export const ZONES = [
  "neck",
  "shoulders",
  "chest",
  "arm",
  "waist",
  "hips",
  "thigh",
  "calf",
] as const;
export type Zone = (typeof ZONES)[number];
export type DeltaPeriod = 7 | 30 | 90 | "start";
export type ZoneMeasure = { date: LocalDate; valueCm: number };
export type DeltaTone = "positive" | "neutral";
export type ZoneDelta = {
  current: ZoneMeasure | null;
  reference: ZoneMeasure | null;
  deltaCm: number | null;
  tone: DeltaTone;
};

/** specs/03 §6: which way is favourable, per zone and goal. A missing entry is never green. */
const FAVOURABLE: Record<Zone, Partial<Record<GoalType, "down" | "up">>> = {
  neck: { lose: "down" },
  shoulders: { gain: "up", recomp: "up" },
  chest: { gain: "up", recomp: "up" },
  arm: { gain: "up", recomp: "up" },
  waist: { lose: "down", recomp: "down" },
  hips: { lose: "down", recomp: "down" },
  thigh: { gain: "up", recomp: "up" },
  calf: { gain: "up", recomp: "up" },
};

const FEATURED: Record<GoalType, readonly Zone[]> = {
  lose: ["waist", "hips", "thigh"],
  gain: ["arm", "shoulders", "chest"],
  recomp: ["waist", "arm", "shoulders"],
  maintain: ["waist", "hips", "arm"],
};

const round1 = (value: number) => Math.round(value * 10) / 10;
const byDate = (a: ZoneMeasure, b: ZoneMeasure) => a.date.localeCompare(b.date);

/** Difference to 1 decimal; a change below 0.3 cm counts as no change (specs/03 §6). */
export function measureDelta(fromCm: number, toCm: number): number {
  const delta = round1(toCm - fromCm);
  return Math.abs(delta) < MEASURE_NEGLIGIBLE_DELTA_CM ? 0 : delta;
}

export function deltaTone(zone: Zone, deltaCm: number | null, goal: GoalType | null): DeltaTone {
  if (deltaCm === null || deltaCm === 0 || goal === null) return "neutral";
  const way = FAVOURABLE[zone][goal];
  if (!way) return "neutral";
  return (way === "down" ? deltaCm < 0 : deltaCm > 0) ? "positive" : "neutral";
}

export function zoneDelta(
  zone: Zone,
  measures: readonly ZoneMeasure[],
  period: DeltaPeriod,
  today: LocalDate,
  goal: GoalType | null,
): ZoneDelta {
  const past = measures.filter((m) => m.date <= today).sort(byDate);
  if (past.length === 0) return { current: null, reference: null, deltaCm: null, tone: "neutral" };

  const current = past[past.length - 1];
  const limit = period === "start" ? null : addDays(today, -period);
  const reference =
    limit === null ? past[0] : ([...past].reverse().find((m) => m.date <= limit) ?? past[0]);
  if (reference.date === current.date) {
    return { current, reference: null, deltaCm: null, tone: "neutral" };
  }
  const deltaCm = measureDelta(reference.valueCm, current.valueCm);
  return { current, reference, deltaCm, tone: deltaTone(zone, deltaCm, goal) };
}

/** The three zones highlighted on the Accueil; no goal behaves like maintenance. */
export function featuredZones(goal: GoalType | null): readonly Zone[] {
  return FEATURED[goal ?? "maintain"];
}
```

Dans `src/lib/metrics/index.ts`, ajouter `export * from "./deltas";`.

- [ ] **Étape 4 : voir les tests passer, avec la couverture**

Run : `pnpm vitest run src/lib/metrics/deltas.test.ts --coverage --coverage.include=src/lib/metrics/deltas.ts`
Attendu : PASS, 100 % de lignes et de branches (`deltaTone` : toutes les branches sont dans la table).

- [ ] **Étape 5 : commit**

```bash
pnpm format
git add src/lib/metrics
git commit -m "feat(metrics): measurement deltas, favourable direction and featured zones"
```

---

### Tâche 3 : tables `measurement_session` et `measurement` (BODY-37)

**Fichiers :**
- Modifier : `src/lib/db/schema/app.ts`
- Créer : `drizzle/0004_measurements.sql` (générée), `tests/integration/measurement.test.ts` (début)

**Interfaces :**
- Produit : `zoneEnum`, `measurementSession`, `measurement` (exportés par `@/lib/db/schema`).

- [ ] **Étape 1 : écrire le test d'intégration qui échoue**

`tests/integration/measurement.test.ts` :

```ts
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { measurement, measurementSession } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";
import { createTestDb, insertTestUser } from "../helpers/db";

describe("measurement tables", () => {
  let db: Db;
  let close: () => Promise<void>;

  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    await insertTestUser(db, "alice");
  });
  afterEach(() => close());

  const newSession = async (date = "2026-10-03") => {
    const [s] = await db
      .insert(measurementSession)
      .values({ userId: "alice", date })
      .returning({ id: measurementSession.id });
    return s.id;
  };

  it("allows one session per user and day", async () => {
    await newSession();
    await expect(newSession()).rejects.toThrow();
  });

  it("allows one value per zone and session", async () => {
    const sessionId = await newSession();
    await db.insert(measurement).values({ sessionId, zone: "waist", valueCm: 84.5 });
    await expect(
      db.insert(measurement).values({ sessionId, zone: "waist", valueCm: 85 }),
    ).rejects.toThrow();
  });

  it("rejects values outside 10-250 cm and keeps the bounds", async () => {
    const sessionId = await newSession();
    for (const valueCm of [9.9, 250.1]) {
      await expect(
        db.insert(measurement).values({ sessionId, zone: "neck", valueCm }),
      ).rejects.toThrow();
    }
    await db.insert(measurement).values([
      { sessionId, zone: "neck", valueCm: 10 },
      { sessionId, zone: "calf", valueCm: 250 },
    ]);
    expect(await db.select().from(measurement)).toHaveLength(2);
  });

  it("rejects an unknown zone", async () => {
    const sessionId = await newSession();
    await expect(
      // @ts-expect-error: the enum only knows the eight zones
      db.insert(measurement).values({ sessionId, zone: "ankle", valueCm: 20 }),
    ).rejects.toThrow();
  });

  it("deletes the measures with their session", async () => {
    const sessionId = await newSession();
    await db.insert(measurement).values({ sessionId, zone: "waist", valueCm: 84.5 });
    await db.delete(measurementSession).where(eq(measurementSession.id, sessionId));
    expect(await db.select().from(measurement)).toHaveLength(0);
  });
});
```

- [ ] **Étape 2 : voir le test échouer**

Run : `pnpm vitest run tests/integration/measurement.test.ts`
Attendu : FAIL (`measurement` n'est pas exporté).

- [ ] **Étape 3 : ajouter le schéma** (à la suite de `src/lib/db/schema/app.ts`)

```ts
export const zoneEnum = pgEnum("zone", [
  "neck",
  "shoulders",
  "chest",
  "arm",
  "waist",
  "hips",
  "thigh",
  "calf",
]);

export const measurementSession = pgTable(
  "measurement_session",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Local calendar date of the session (profile timezone), like weight_entry.date.
    date: date("date", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  // One session per day, completed as measures come in (specs/04).
  (t) => [unique("measurement_session_user_date_unique").on(t.userId, t.date)],
);

export const measurement = pgTable(
  "measurement",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => measurementSession.id, { onDelete: "cascade" }),
    zone: zoneEnum("zone").notNull(),
    valueCm: numeric("value_cm", { precision: 4, scale: 1, mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    unique("measurement_session_zone_unique").on(t.sessionId, t.zone),
    check("measurement_value_range", sql`${t.valueCm} between 10 and 250`),
  ],
);
```

- [ ] **Étape 4 : générer la migration**

Run : `pnpm db:generate --name measurements`
Attendu : `drizzle/0004_measurements.sql` créé (`CREATE TYPE "zone"`, deux `CREATE TABLE`, les contraintes `UNIQUE` et `CHECK`) et `drizzle/meta/_journal.json` mis à jour. Relire le SQL : aucune ligne `DROP`.

- [ ] **Étape 5 : voir le test passer**

Run : `pnpm vitest run tests/integration/measurement.test.ts`
Attendu : PASS.

- [ ] **Étape 6 : commit**

```bash
pnpm format
git add src/lib/db/schema/app.ts drizzle tests/integration/measurement.test.ts
git commit -m "feat(db): measurement_session and measurement tables"
```

---

### Tâche 4 : requêtes des mensurations (BODY-37)

**Fichiers :**
- Créer : `src/features/measurements/queries.ts`
- Modifier : `tests/integration/measurement.test.ts`

**Interfaces :**
- Consomme : `Db` (`lib/db/types`), `Zone` (`lib/metrics`), `LocalDate`.
- Produit :
  - `type MeasureRow = { id: string; sessionId: string; date: LocalDate; zone: Zone; valueCm: number }`
  - `listMeasures(db, userId): Promise<MeasureRow[]>` (plus ancienne d'abord, puis ordre des zones)
  - `getMeasureOn(db, userId, date, zone): Promise<MeasureRow | null>`
  - `countSessions(db, userId): Promise<number>`
  - `upsertMeasure(db, userId, m: { date: LocalDate; zone: Zone; valueCm: number }): Promise<void>` (crée la séance du jour si besoin, transaction)

- [ ] **Étape 1 : ajouter les tests qui échouent** (à la suite de `tests/integration/measurement.test.ts`)

```ts
import {
  countSessions,
  getMeasureOn,
  listMeasures,
  upsertMeasure,
} from "@/features/measurements/queries";

describe("measurement queries", () => {
  let db: Db;
  let close: () => Promise<void>;

  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    await insertTestUser(db, "alice");
    await insertTestUser(db, "bob");
  });
  afterEach(() => close());

  const put = (userId: string, date: string, zone: "waist" | "neck" | "chest", valueCm: number) =>
    upsertMeasure(db, userId, { date, zone, valueCm });

  it("completes the day's session as zones come in", async () => {
    await put("alice", "2026-10-03", "neck", 38.2);
    await put("alice", "2026-10-03", "chest", 101.4);
    expect(await countSessions(db, "alice")).toBe(1);
    const rows = await listMeasures(db, "alice");
    expect(rows.map((r) => [r.zone, r.valueCm])).toEqual([
      ["neck", 38.2],
      ["chest", 101.4],
    ]);
    expect(new Set(rows.map((r) => r.sessionId)).size).toBe(1);
  });

  it("replaces the value of a zone on the same date", async () => {
    await put("alice", "2026-10-03", "waist", 84.5);
    await put("alice", "2026-10-03", "waist", 83.9);
    const rows = await listMeasures(db, "alice");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ zone: "waist", valueCm: 83.9, date: "2026-10-03" });
  });

  it("lists oldest first", async () => {
    await put("alice", "2026-10-03", "waist", 84);
    await put("alice", "2026-09-26", "waist", 85);
    expect((await listMeasures(db, "alice")).map((r) => r.date)).toEqual([
      "2026-09-26",
      "2026-10-03",
    ]);
  });

  it("two simultaneous writes the same day end up in one session", async () => {
    await Promise.all([
      put("alice", "2026-10-03", "neck", 38),
      put("alice", "2026-10-03", "chest", 101),
      put("alice", "2026-10-03", "waist", 84),
    ]);
    expect(await countSessions(db, "alice")).toBe(1);
    expect(await listMeasures(db, "alice")).toHaveLength(3);
  });

  it("finds a measure of a date and zone", async () => {
    await put("alice", "2026-10-03", "waist", 84.5);
    expect(await getMeasureOn(db, "alice", "2026-10-03", "waist")).toMatchObject({ valueCm: 84.5 });
    expect(await getMeasureOn(db, "alice", "2026-10-03", "neck")).toBeNull();
    expect(await getMeasureOn(db, "alice", "2026-10-02", "waist")).toBeNull();
  });

  it("never shows or touches another user's measures, even on the same date", async () => {
    await put("alice", "2026-10-03", "waist", 84.5);
    await put("bob", "2026-10-03", "waist", 99);
    expect((await listMeasures(db, "alice")).map((r) => r.valueCm)).toEqual([84.5]);
    expect((await listMeasures(db, "bob")).map((r) => r.valueCm)).toEqual([99]);
    expect(await getMeasureOn(db, "bob", "2026-10-03", "waist")).toMatchObject({ valueCm: 99 });
    expect(await countSessions(db, "alice")).toBe(1);
    expect(await countSessions(db, "bob")).toBe(1);
    await put("alice", "2026-10-03", "waist", 80);
    expect((await listMeasures(db, "bob")).map((r) => r.valueCm)).toEqual([99]);
  });

  it("counts no session for an account that never measured", async () => {
    expect(await countSessions(db, "alice")).toBe(0);
    expect(await listMeasures(db, "alice")).toEqual([]);
  });
});
```

- [ ] **Étape 2 : voir les tests échouer**

Run : `pnpm vitest run tests/integration/measurement.test.ts`
Attendu : FAIL (module `queries` introuvable).

- [ ] **Étape 3 : implémenter** `src/features/measurements/queries.ts`

```ts
import { and, asc, count, eq } from "drizzle-orm";
import type { LocalDate } from "@/lib/dates";
import { measurement, measurementSession } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";
import type { Zone } from "@/lib/metrics";

export type MeasureRow = {
  id: string;
  sessionId: string;
  date: LocalDate;
  zone: Zone;
  valueCm: number;
};
export type NewMeasure = { date: LocalDate; zone: Zone; valueCm: number };

const columns = {
  id: measurement.id,
  sessionId: measurement.sessionId,
  date: measurementSession.date,
  zone: measurement.zone,
  valueCm: measurement.valueCm,
};

/** Every measure of the user, oldest first. The join is what binds a measure to its owner. */
export async function listMeasures(db: Db, userId: string): Promise<MeasureRow[]> {
  return db
    .select(columns)
    .from(measurement)
    .innerJoin(measurementSession, eq(measurement.sessionId, measurementSession.id))
    .where(eq(measurementSession.userId, userId))
    .orderBy(asc(measurementSession.date), asc(measurement.zone));
}

export async function getMeasureOn(
  db: Db,
  userId: string,
  date: LocalDate,
  zone: Zone,
): Promise<MeasureRow | null> {
  const [row] = await db
    .select(columns)
    .from(measurement)
    .innerJoin(measurementSession, eq(measurement.sessionId, measurementSession.id))
    .where(
      and(
        eq(measurementSession.userId, userId),
        eq(measurementSession.date, date),
        eq(measurement.zone, zone),
      ),
    );
  return row ?? null;
}

export async function countSessions(db: Db, userId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(measurementSession)
    .where(eq(measurementSession.userId, userId));
  return row.n;
}

/**
 * Records a zone in the session of that date, creating the session if needed.
 * The conflict clause makes concurrent first writes of the day share one session.
 */
export async function upsertMeasure(db: Db, userId: string, m: NewMeasure): Promise<void> {
  await db.transaction(async (tx) => {
    const [session] = await tx
      .insert(measurementSession)
      .values({ userId, date: m.date })
      .onConflictDoUpdate({
        target: [measurementSession.userId, measurementSession.date],
        set: { updatedAt: new Date() },
      })
      .returning({ id: measurementSession.id });
    await tx
      .insert(measurement)
      .values({ sessionId: session.id, zone: m.zone, valueCm: m.valueCm })
      .onConflictDoUpdate({
        target: [measurement.sessionId, measurement.zone],
        set: { valueCm: m.valueCm, updatedAt: new Date() },
      });
  });
}
```

- [ ] **Étape 4 : voir les tests passer**

Run : `pnpm vitest run tests/integration/measurement.test.ts`
Attendu : PASS. Si le test « simultanées » échoue sous PGlite (connexion unique), remplacer `Promise.all` par trois appels séquentiels **et** garder le test d'unicité de séance : la garantie réelle vient de `ON CONFLICT` et de la contrainte, déjà testées plus haut.

- [ ] **Étape 5 : commit**

```bash
pnpm format
git add src/features/measurements/queries.ts tests/integration/measurement.test.ts
git commit -m "feat(measurements): queries bound to the user through the session"
```

---

### Tâche 5 : validation, textes et Server Actions (BODY-40, BODY-41)

**Fichiers :**
- Créer : `src/features/measurements/limits.ts`, `schemas.ts`, `schemas.test.ts`, `copy.ts`, `actions.ts`, `actions.test.ts`

**Interfaces :**
- Consomme : `Zone`, `ZONES` (`lib/metrics`), `parseDecimal`, `toStoredCm`, `toDisplayLength`, `formatLength`, `LengthUnit` (`lib/units`), `MIN_DATE` (`features/weight/limits`), `getMeasureOn`, `upsertMeasure`, `ActionResult`, `confirmedReasons`, `fieldErrorsFrom`, `keepValues`.
- Produit :
  - `MEASURE_MIN_CM = 10`, `MEASURE_MAX_CM = 250`
  - `measureSchema(todayDate): ZodType` → `{ date, zone, valueCm, unit }`
  - `ZONE_LABELS: Record<Zone, string>`, `PROTOCOLS: Record<Zone, string>`, `GENERAL_RULES: readonly string[]`, `SAVED_TOAST`, `replaceMessage(oldCm, newCm, unit)`
  - `saveZoneAction(prev, formData): Promise<ActionResult>` (champs `date`, `zone`, `value`, `unit`)
  - `saveSessionZoneAction(prev, formData): Promise<ActionResult>` (mêmes champs, `date` ignorée)

- [ ] **Étape 1 : écrire les tests du schéma** `src/features/measurements/schemas.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { measureSchema } from "./schemas";

const TODAY = "2026-10-03";
const parse = (input: Record<string, string>) =>
  measureSchema(TODAY).safeParse({ date: TODAY, zone: "waist", unit: "cm", ...input });
const errorOn = (input: Record<string, string>, field: string) => {
  const r = parse(input);
  return !r.success && r.error.issues.some((i) => i.path[0] === field);
};

describe("measureSchema (specs/03 §9)", () => {
  it("accepts a value with a comma or a point and stores 1 decimal", () => {
    expect(parse({ value: "84,5" })).toMatchObject({
      success: true,
      data: { date: TODAY, zone: "waist", valueCm: 84.5, unit: "cm" },
    });
    expect(parse({ value: "84.54" })).toMatchObject({ success: true, data: { valueCm: 84.5 } });
  });

  it("accepts the bounds 10 and 250", () => {
    expect(parse({ value: "10" }).success).toBe(true);
    expect(parse({ value: "250" }).success).toBe(true);
  });

  it.each(["9,9", "250,1", "0", "-80", "", " ", "abc", "1e3", "Infinity", "NaN", "84,5,2"])(
    "rejects the value %j",
    (value) => {
      expect(errorOn({ value }, "value")).toBe(true);
    },
  );

  it("converts inches before checking the bounds", () => {
    expect(parse({ value: "33,3", unit: "in" })).toMatchObject({ data: { valueCm: 84.6 } });
    expect(errorOn({ value: "3,9", unit: "in" }, "value")).toBe(true); // 9.9 cm
    expect(errorOn({ value: "98,5", unit: "in" }, "value")).toBe(true); // 250.2 cm
    expect(parse({ value: "98,4", unit: "in" }).success).toBe(true); // 249.9 cm
  });

  it("mentions the bounds in the user's unit", () => {
    const cm = parse({ value: "5" });
    expect(!cm.success && cm.error.issues[0].message).toBe("Mesure entre 10 et 250 cm");
    const inch = parse({ value: "1", unit: "in" });
    expect(!inch.success && inch.error.issues[0].message).toMatch(/entre 3,9 et 98,4 in/);
  });

  it("rejects an unknown zone and an unknown unit", () => {
    expect(errorOn({ value: "30", zone: "ankle" }, "zone")).toBe(true);
    expect(errorOn({ value: "30", unit: "ft" }, "unit")).toBe(true);
  });

  it("rejects a future date and a date before 1900", () => {
    expect(errorOn({ value: "30", date: "2026-10-04" }, "date")).toBe(true);
    expect(errorOn({ value: "30", date: "1899-12-31" }, "date")).toBe(true);
    expect(errorOn({ value: "30", date: "not-a-date" }, "date")).toBe(true);
    expect(parse({ value: "30", date: "2026-10-03" }).success).toBe(true);
  });
});
```

- [ ] **Étape 2 : voir les tests échouer**

Run : `pnpm vitest run src/features/measurements/schemas.test.ts`
Attendu : FAIL (module introuvable).

- [ ] **Étape 3 : implémenter limites et schéma**

`src/features/measurements/limits.ts` :

```ts
/** specs/03 §9. No dependency: safe to import from client components. */
export const MEASURE_MIN_CM = 10;
export const MEASURE_MAX_CM = 250;
```

`src/features/measurements/schemas.ts` :

```ts
import { z } from "zod";
import { MIN_DATE } from "@/features/weight/limits";
import type { LocalDate } from "@/lib/dates";
import { ZONES } from "@/lib/metrics";
import { formatDecimal, parseDecimal, toDisplayLength, toStoredCm, type LengthUnit } from "@/lib/units";
import { MEASURE_MAX_CM, MEASURE_MIN_CM } from "./limits";

function rangeMessage(unit: LengthUnit): string {
  if (unit === "cm") return `Mesure entre ${MEASURE_MIN_CM} et ${MEASURE_MAX_CM} cm`;
  const [min, max] = [MEASURE_MIN_CM, MEASURE_MAX_CM].map((cm) =>
    formatDecimal(toDisplayLength(cm, "in")),
  );
  return `Mesure entre ${min} et ${max} in`;
}

/** A measure as typed in the zone sheet or the guided session (specs/03 §9). Typed inches become centimetres. */
export function measureSchema(todayDate: LocalDate) {
  return z
    .object({
      date: z.iso
        .date({ error: "Date invalide" })
        .refine((d) => d >= MIN_DATE, { error: "Date invalide" })
        .refine((d) => d <= todayDate, { error: "La date ne peut pas être dans le futur" }),
      zone: z.enum(ZONES, { error: "Zone inconnue" }),
      value: z.string().optional(),
      unit: z.enum(["cm", "in"]),
    })
    .transform((v, ctx) => {
      const valueCm = toStoredCm(parseDecimal(v.value), v.unit);
      if (!Number.isFinite(valueCm) || valueCm < MEASURE_MIN_CM || valueCm > MEASURE_MAX_CM) {
        ctx.addIssue({ code: "custom", path: ["value"], message: rangeMessage(v.unit) });
        return z.NEVER;
      }
      return { date: v.date, zone: v.zone, valueCm, unit: v.unit };
    });
}
```

- [ ] **Étape 4 : voir les tests du schéma passer**

Run : `pnpm vitest run src/features/measurements/schemas.test.ts`
Attendu : PASS. (Si `"84,5,2"` ou `"1e3"` passent, c'est `parseDecimal` qui a changé : ne pas assouplir ce test.)

- [ ] **Étape 5 : écrire `copy.ts`**

`src/features/measurements/copy.ts` :

```ts
import { formatLength, type LengthUnit } from "@/lib/units";
import type { Zone } from "@/lib/metrics";

export const ZONE_LABELS: Record<Zone, string> = {
  neck: "Cou",
  shoulders: "Épaules",
  chest: "Poitrine",
  arm: "Bras",
  waist: "Taille",
  hips: "Hanches",
  thigh: "Cuisse",
  calf: "Mollet",
};

/** specs/03 §7. */
export const PROTOCOLS: Record<Zone, string> = {
  neck: "Juste sous la pomme d'Adam, ruban légèrement incliné vers l'avant. Regard droit, épaules relâchées.",
  shoulders:
    "Tour complet au point le plus large des épaules (deltoïdes), bras relâchés le long du corps.",
  chest:
    "Au niveau des mamelons, ruban horizontal passant sous les aisselles, en fin d'expiration normale.",
  arm: "Au point le plus large du biceps, bras relâché le long du corps, non contracté.",
  waist:
    "Au niveau du nombril, ventre relâché (ne pas le rentrer), en fin d'expiration normale.",
  hips: "Au point le plus large des fessiers, pieds joints, ruban horizontal.",
  thigh:
    "Au point le plus large, juste sous le pli fessier, poids réparti sur les deux jambes.",
  calf: "Au point le plus large du mollet, debout, poids réparti sur les deux jambes.",
};

/** Introduction screen of the guided session (specs/03 §7). */
export const GENERAL_RULES = [
  "Ruban souple non extensible, posé au contact de la peau, bien à plat, sans comprimer.",
  "Le matin, à jeun, après être passé aux toilettes, avant l'entraînement.",
  "Toujours le même côté du corps (par exemple le droit) pour les bras, cuisses et mollets.",
  "Muscles relâchés et posture droite. En cas de doute, mesure deux fois et garde la moyenne.",
  "Une fois toutes les 1 à 2 semaines, le même jour.",
] as const;

export const SAVED_TOAST = "Mesure enregistrée";

export function replaceMessage(oldCm: number, newCm: number, unit: LengthUnit): string {
  return `Remplacer ${formatLength(oldCm, unit)} par ${formatLength(newCm, unit)} ?`;
}
```

- [ ] **Étape 6 : écrire les tests des actions** `src/features/measurements/actions.test.ts`

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@/features/profile/queries";
import type { Db } from "@/lib/db/types";
import { createTestDb, insertTestUser } from "../../../tests/helpers/db";
import { getMeasureOn, listMeasures, upsertMeasure } from "./queries";

const ctx = vi.hoisted(() => ({
  db: undefined as unknown as Db,
  requireUser: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: ctx.revalidatePath }));
vi.mock("@/lib/db/client", () => ({ getDb: () => ctx.db }));
vi.mock("@/lib/session", () => ({ requireUser: ctx.requireUser }));

import { saveSessionZoneAction, saveZoneAction } from "./actions";

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
const ENTRY = { date: "2026-10-03", zone: "waist", value: "84,5", unit: "cm" };

describe("measure actions", () => {
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

  describe("saveZoneAction (zone sheet)", () => {
    it("saves a measure for the current user and refreshes every screen", async () => {
      expect(await saveZoneAction(null, form(ENTRY))).toEqual({ ok: true });
      expect(ctx.requireUser).toHaveBeenCalledWith("app");
      expect(await getMeasureOn(ctx.db, "alice", "2026-10-03", "waist")).toMatchObject({
        valueCm: 84.5,
      });
      expect(ctx.revalidatePath).toHaveBeenCalledWith("/", "layout");
    });

    it("converts inches to centimetres", async () => {
      await saveZoneAction(null, form({ ...ENTRY, value: "33,3", unit: "in" }));
      expect((await getMeasureOn(ctx.db, "alice", "2026-10-03", "waist"))?.valueCm).toBe(84.6);
    });

    it("rejects out-of-range values and writes nothing", async () => {
      for (const value of ["9,9", "250,1", "abc", ""]) {
        const r = await saveZoneAction(null, form({ ...ENTRY, value }));
        expect(r).toMatchObject({
          ok: false,
          fieldErrors: { value: expect.any(Array) },
          values: { value },
        });
      }
      expect(await listMeasures(ctx.db, "alice")).toHaveLength(0);
      expect(ctx.revalidatePath).not.toHaveBeenCalled();
    });

    it("rejects a future date and an unknown zone", async () => {
      expect(await saveZoneAction(null, form({ ...ENTRY, date: "2026-10-04" }))).toMatchObject({
        ok: false,
        fieldErrors: { date: expect.any(Array) },
      });
      expect(await saveZoneAction(null, form({ ...ENTRY, zone: "ankle" }))).toMatchObject({
        ok: false,
        fieldErrors: { zone: expect.any(Array) },
      });
      expect(await listMeasures(ctx.db, "alice")).toHaveLength(0);
    });

    it("asks before replacing the zone of that date, then replaces with the confirmation", async () => {
      await upsertMeasure(ctx.db, "alice", { date: "2026-10-03", zone: "waist", valueCm: 84.5 });
      const ask = await saveZoneAction(null, form({ ...ENTRY, value: "83,9" }));
      expect(ask).toMatchObject({
        ok: false,
        needsConfirmation: { reason: "replace" },
        values: { value: "83,9", confirmed: "" },
      });
      expect(ask.ok === false && ask.needsConfirmation?.message).toMatch(/Remplacer 84,5.cm par 83,9.cm \?/);
      expect((await getMeasureOn(ctx.db, "alice", "2026-10-03", "waist"))?.valueCm).toBe(84.5);

      expect(
        await saveZoneAction(null, form({ ...ENTRY, value: "83,9", confirm: "replace" })),
      ).toEqual({ ok: true });
      expect((await getMeasureOn(ctx.db, "alice", "2026-10-03", "waist"))?.valueCm).toBe(83.9);
    });

    it("does not ask when the zone is empty on that date", async () => {
      await upsertMeasure(ctx.db, "alice", { date: "2026-09-26", zone: "waist", valueCm: 85 });
      expect(await saveZoneAction(null, form(ENTRY))).toEqual({ ok: true });
    });

    it("ignores any user id sent by the client", async () => {
      await saveZoneAction(null, form({ ...ENTRY, userId: "bob" }));
      expect(await listMeasures(ctx.db, "bob")).toHaveLength(0);
      expect(await listMeasures(ctx.db, "alice")).toHaveLength(1);
    });

    it("never touches another user's measure of the same date and zone", async () => {
      await upsertMeasure(ctx.db, "bob", { date: "2026-10-03", zone: "waist", valueCm: 99 });
      expect(await saveZoneAction(null, form(ENTRY))).toEqual({ ok: true }); // no confirmation: Bob's is not hers
      expect((await getMeasureOn(ctx.db, "bob", "2026-10-03", "waist"))?.valueCm).toBe(99);
      expect((await getMeasureOn(ctx.db, "alice", "2026-10-03", "waist"))?.valueCm).toBe(84.5);
    });

    it("reports a failure without logging the measure", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      ctx.requireUser.mockResolvedValueOnce({
        userId: "ghost", // no such user: the foreign key fails
        email: "g@example.com",
        emailVerified: true,
        profile: profile("Europe/Paris"),
      });
      const r = await saveZoneAction(null, form(ENTRY));
      expect(r).toMatchObject({ ok: false, formError: expect.any(String), values: { value: "84,5" } });
      expect(JSON.stringify(spy.mock.calls)).not.toContain("84");
      spy.mockRestore();
    });
  });

  describe("saveSessionZoneAction (guided session)", () => {
    it("is always dated today in the user's timezone, whatever the client sends", async () => {
      asAlice("America/Los_Angeles");
      vi.setSystemTime(new Date("2026-10-04T02:00:00Z")); // 19:00 on 2026-10-03 in Los Angeles
      await saveSessionZoneAction(null, form({ ...ENTRY, date: "2020-01-01" }));
      expect(await getMeasureOn(ctx.db, "alice", "2026-10-03", "waist")).toMatchObject({
        valueCm: 84.5,
      });
      expect(await listMeasures(ctx.db, "alice")).toHaveLength(1);
    });

    it("re-edits the zone of its own session without asking", async () => {
      await saveSessionZoneAction(null, form(ENTRY));
      expect(await saveSessionZoneAction(null, form({ ...ENTRY, value: "83,9" }))).toEqual({
        ok: true,
      });
      const rows = await listMeasures(ctx.db, "alice");
      expect(rows).toHaveLength(1);
      expect(rows[0].valueCm).toBe(83.9);
    });

    it("rejects an invalid value", async () => {
      expect(await saveSessionZoneAction(null, form({ ...ENTRY, value: "5" }))).toMatchObject({
        ok: false,
        fieldErrors: { value: expect.any(Array) },
      });
    });
  });
});
```

- [ ] **Étape 7 : voir les tests échouer**

Run : `pnpm vitest run src/features/measurements/actions.test.ts`
Attendu : FAIL (module `actions` introuvable).

- [ ] **Étape 8 : implémenter** `src/features/measurements/actions.ts`

```ts
"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import {
  confirmedReasons,
  fieldErrorsFrom,
  keepValues,
  type ActionResult,
} from "@/lib/action-result";
import { today } from "@/lib/dates";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/session";
import { replaceMessage } from "./copy";
import { getMeasureOn, upsertMeasure } from "./queries";
import { measureSchema } from "./schemas";

const FIELDS = ["date", "zone", "value", "unit"];

/**
 * "sheet": EF-MEA-03, any past date, confirmation before replacing.
 * "session": EF-MEA-02, always today's session, which re-edits its own values freely.
 */
async function save(formData: FormData, mode: "sheet" | "session"): Promise<ActionResult> {
  const { userId, profile } = await requireUser("app");
  const todayDate = today(profile?.timezone ?? "Europe/Paris");
  const values = keepValues(formData, ...FIELDS);
  const parsed = measureSchema(todayDate).safeParse({
    ...Object.fromEntries(formData),
    ...(mode === "session" ? { date: todayDate } : {}),
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error), values };

  const { date, zone, valueCm, unit } = parsed.data;
  const confirmed = confirmedReasons(formData);
  try {
    const db = getDb();
    if (mode === "sheet" && !confirmed.has("replace")) {
      const existing = await getMeasureOn(db, userId, date, zone);
      if (existing) {
        return {
          ok: false,
          needsConfirmation: {
            reason: "replace",
            message: replaceMessage(existing.valueCm, valueCm, unit),
          },
          values: { ...values, confirmed: [...confirmed].join(",") },
        };
      }
    }
    await upsertMeasure(db, userId, { date, zone, valueCm });
  } catch {
    // userId and action only: never the measure (specs/07 §8).
    console.error("save_measure_failed", { userId });
    return { ok: false, formError: "Une erreur est survenue, réessaie.", values };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveZoneAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return save(formData, "sheet");
}

export async function saveSessionZoneAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return save(formData, "session");
}
```

- [ ] **Étape 9 : voir les tests passer**

Run : `pnpm vitest run src/features/measurements`
Attendu : PASS.

- [ ] **Étape 10 : commit**

```bash
pnpm format
git add src/features/measurements
git commit -m "feat(measurements): measure schema, French copy and save actions"
```

---

### Tâche 6 : résumés d'affichage et rappels (BODY-39, BODY-42, BODY-44)

**Fichiers :**
- Modifier : `src/lib/dates.ts`, `src/lib/dates.test.ts`
- Créer : `src/features/measurements/summary.ts`, `src/features/measurements/summary.test.ts`

**Interfaces :**
- Consomme : `zoneDelta`, `featuredZones`, `deltaTone`, `measureDelta`, `ZONES`, `Zone`, `DeltaPeriod`, `GoalType`, `MEASURE_STALE_DAYS` (`lib/metrics`) ; `MeasureRow` ; `ZONE_LABELS`, `PROTOCOLS` ; `formatLength`, `formatLengthDelta`, `toDisplayLength`, `formatInputDecimal`, `LengthUnit`.
- Produit :
  - `weekdayIndex(date: LocalDate): number` (`lib/dates`, 0 = lundi … 6 = dimanche)
  - `parsePeriod(raw: string | undefined): DeltaPeriod` (défaut 30 ; `"7" | "30" | "90" | "debut"`), `periodParam(p: DeltaPeriod): string`, `PERIOD_OPTIONS: readonly { value: DeltaPeriod; param: string; label: string }[]`
  - `type ZoneView = { zone: Zone; label: string; valueText: string | null; deltaText: string | null; tone: DeltaTone; ariaLabel: string }`
  - `type SheetData = { label: string; protocol: string; prefill: string | null; previousText: string | null }`
  - `buildBodySummary(input: { measures: readonly MeasureRow[]; goal: GoalType | null; period: DeltaPeriod; unit: LengthUnit; today: LocalDate }): { zones: ZoneView[]; sheet: Record<Zone, SheetData>; lastSessionDate: LocalDate | null }`
  - `type SessionZone = { zone: Zone; label: string; protocol: string; previousCm: number | null; previousText: string | null; todayCm: number | null; prefill: string }`
  - `buildSessionData(measures, unit, today): { zones: SessionZone[]; startIndex: number; firstTime: boolean }`
  - `measureReminder(input: { lastSessionDate: LocalDate | null; reminderWeekday: number | null; today: LocalDate }): MeasureReminder`
  - `buildMeasureBlock(input: { measures; goal; unit; today; reminderWeekday }): MeasureBlockData`
  - `waistSeries(measures: readonly MeasureRow[]): ZoneMeasure[]`

- [ ] **Étape 1 : test de `weekdayIndex`** (à la suite de `src/lib/dates.test.ts`)

```ts
import { weekdayIndex } from "./dates";

describe("weekdayIndex", () => {
  it("counts from Monday = 0 (specs/04 reminder_weekday)", () => {
    expect(weekdayIndex("2026-10-05")).toBe(0); // Monday
    expect(weekdayIndex("2026-10-03")).toBe(5); // Saturday
    expect(weekdayIndex("2026-10-04")).toBe(6); // Sunday
    expect(weekdayIndex("2026-01-01")).toBe(3); // Thursday
  });
});
```

Run : `pnpm vitest run src/lib/dates.test.ts` → FAIL, puis ajouter à `src/lib/dates.ts` :

```ts
/** 0 = Monday … 6 = Sunday, like profile.reminder_weekday (specs/04). */
export function weekdayIndex(date: LocalDate): number {
  return (new Date(toUtc(date)).getUTCDay() + 6) % 7;
}
```

Run : `pnpm vitest run src/lib/dates.test.ts` → PASS.

- [ ] **Étape 2 : écrire les tests de `summary.ts`** `src/features/measurements/summary.test.ts`

```ts
import { describe, expect, it } from "vitest";
import type { MeasureRow } from "./queries";
import {
  buildBodySummary,
  buildMeasureBlock,
  buildSessionData,
  measureReminder,
  parsePeriod,
  periodParam,
  waistSeries,
} from "./summary";

const NNBSP = " ";
const MINUS = "−";
const TODAY = "2026-10-03";
let n = 0;
const row = (date: string, zone: MeasureRow["zone"], valueCm: number): MeasureRow => ({
  id: `m${n++}`,
  sessionId: `s-${date}`,
  date,
  zone,
  valueCm,
});
const WAIST = [
  row("2026-08-20", "waist", 90),
  row("2026-09-10", "waist", 88),
  row("2026-10-01", "waist", 86.5),
];

describe("period parameter", () => {
  it("defaults to 30 days and rejects anything unknown", () => {
    expect(parsePeriod(undefined)).toBe(30);
    expect(parsePeriod("7")).toBe(7);
    expect(parsePeriod("90")).toBe(90);
    expect(parsePeriod("debut")).toBe("start");
    for (const bad of ["", "15", "-7", "start", "30; drop"]) expect(parsePeriod(bad)).toBe(30);
  });
  it("round-trips", () => {
    for (const p of [7, 30, 90, "start"] as const) expect(parsePeriod(periodParam(p))).toBe(p);
  });
});

describe("buildBodySummary", () => {
  const summary = (measures: MeasureRow[], over = {}) =>
    buildBodySummary({ measures, goal: "lose", period: 30, unit: "cm", today: TODAY, ...over });

  it("describes a never-measured account with hollow zones", () => {
    const s = summary([]);
    expect(s.zones).toHaveLength(8);
    expect(s.zones[0]).toMatchObject({
      zone: "neck",
      label: "Cou",
      valueText: null,
      deltaText: null,
      ariaLabel: "Cou : pas encore mesurée",
    });
    expect(s.lastSessionDate).toBeNull();
  });

  it("gives the value, the delta, the tone and a complete accessible label", () => {
    const waist = summary(WAIST).zones.find((z) => z.zone === "waist");
    expect(waist).toMatchObject({
      valueText: `86,5${NNBSP}cm`,
      deltaText: `${MINUS}3,5${NNBSP}cm`,
      tone: "positive",
      ariaLabel: `Taille : 86,5${NNBSP}cm, moins 3,5${NNBSP}cm sur 30 jours`,
    });
  });

  it("words the period in the label", () => {
    const label = (period: 7 | 30 | 90 | "start") =>
      summary(WAIST, { period }).zones.find((z) => z.zone === "waist")?.ariaLabel;
    expect(label(7)).toMatch(/moins 1,5.cm sur 7 jours$/);
    expect(label(90)).toMatch(/sur 90 jours$/);
    expect(label("start")).toMatch(/moins 3,5.cm depuis le début$/);
  });

  it("says 'plus' for an increase and 'stable' below 0.3 cm", () => {
    const up = summary([row("2026-08-20", "chest", 100), row("2026-10-01", "chest", 102)], {
      goal: "gain",
    }).zones.find((z) => z.zone === "chest");
    expect(up).toMatchObject({ tone: "positive", ariaLabel: expect.stringMatching(/plus 2,0.cm sur 30 jours/) });
    const flat = summary([row("2026-08-20", "chest", 100), row("2026-10-01", "chest", 100.1)]).zones.find(
      (z) => z.zone === "chest",
    );
    expect(flat).toMatchObject({ deltaText: `0${NNBSP}cm`, tone: "neutral" });
    expect(flat?.ariaLabel).toMatch(/stable sur 30 jours/);
  });

  it("shows a value without delta when there is a single measure", () => {
    const z = summary([row("2026-10-01", "waist", 86.5)]).zones.find((x) => x.zone === "waist");
    expect(z).toMatchObject({ valueText: `86,5${NNBSP}cm`, deltaText: null });
    expect(z?.ariaLabel).toBe(`Taille : 86,5${NNBSP}cm`);
  });

  it("converts to inches", () => {
    const z = summary(WAIST, { unit: "in" }).zones.find((x) => x.zone === "waist");
    expect(z?.valueText).toBe(`34,1${NNBSP}in`);
    expect(z?.deltaText).toBe(`${MINUS}1,4${NNBSP}in`);
  });

  it("is grey without a goal", () => {
    expect(summary(WAIST, { goal: null }).zones.find((z) => z.zone === "waist")?.tone).toBe(
      "neutral",
    );
  });

  it("feeds the zone sheet: protocol, previous value with its age, pre-filled input", () => {
    const sheet = summary(WAIST).sheet.waist;
    expect(sheet.label).toBe("Taille");
    expect(sheet.protocol).toMatch(/nombril/);
    expect(sheet.previousText).toBe(`Précédente : 86,5${NNBSP}cm · il y a 2 j`);
    expect(sheet.prefill).toBe("86,5");
    expect(summary([]).sheet.waist).toMatchObject({ previousText: null, prefill: null });
  });

  it("says 'aujourd'hui' and 'hier' instead of 'il y a 0 j'", () => {
    const at = (date: string) => summary([row(date, "waist", 86)]).sheet.waist.previousText;
    expect(at(TODAY)).toMatch(/· aujourd'hui$/);
    expect(at("2026-10-02")).toMatch(/· hier$/);
  });

  it("returns the date of the most recent session", () => {
    expect(summary([...WAIST, row("2026-09-30", "neck", 38)]).lastSessionDate).toBe("2026-10-01");
  });
});

describe("buildSessionData", () => {
  it("is a first time and starts at the first zone for a never-measured account", () => {
    const s = buildSessionData([], "cm", TODAY);
    expect(s.firstTime).toBe(true);
    expect(s.startIndex).toBe(0);
    expect(s.zones.map((z) => z.zone)).toEqual([
      "neck", "shoulders", "chest", "arm", "waist", "hips", "thigh", "calf",
    ]);
    expect(s.zones[0]).toMatchObject({ previousCm: null, previousText: null, todayCm: null, prefill: "" });
  });

  it("pre-fills with the previous value and shows how long ago it was", () => {
    const s = buildSessionData(WAIST, "cm", TODAY);
    expect(s.firstTime).toBe(false);
    const waist = s.zones[4];
    expect(waist).toMatchObject({ zone: "waist", previousCm: 86.5, prefill: "86,5", todayCm: null });
    expect(waist.previousText).toBe(`Précédente : 86,5${NNBSP}cm · il y a 2 j`);
    expect(s.zones[0].prefill).toBe(""); // neck was never measured
  });

  it("resumes at the first zone without a value dated today and pre-fills today's values", () => {
    const measures = [
      row("2026-09-26", "shoulders", 120),
      row("2026-09-26", "chest", 100),
      row(TODAY, "neck", 38.2),
      row(TODAY, "chest", 101.4),
    ];
    const s = buildSessionData(measures, "cm", TODAY);
    expect(s.startIndex).toBe(1); // shoulders: skipped earlier today
    expect(s.zones[0]).toMatchObject({ todayCm: 38.2, prefill: "38,2", previousCm: null });
    expect(s.zones[2]).toMatchObject({ todayCm: 101.4, prefill: "101,4", previousCm: 100 }); // previous = before today
    expect(s.zones[1]).toMatchObject({ todayCm: null, prefill: "120,0", previousCm: 120 });
  });

  it("starts over when every zone was measured today", () => {
    const all = (["neck", "shoulders", "chest", "arm", "waist", "hips", "thigh", "calf"] as const).map(
      (z) => row(TODAY, z, 50),
    );
    expect(buildSessionData(all, "cm", TODAY).startIndex).toBe(0);
  });
});

describe("measureReminder (EF-MEA-05)", () => {
  it("asks for a first measure when there is none", () => {
    expect(measureReminder({ lastSessionDate: null, reminderWeekday: null, today: TODAY })).toEqual({
      lastSessionDate: null,
      daysSince: null,
      stale: true,
      nextLabel: null,
    });
  });
  it("is stale after more than 14 days, not at exactly 14", () => {
    const at = (d: string) => measureReminder({ lastSessionDate: d, reminderWeekday: null, today: TODAY });
    expect(at("2026-09-19")).toMatchObject({ daysSince: 14, stale: false });
    expect(at("2026-09-18")).toMatchObject({ daysSince: 15, stale: true });
  });
  it("names the next measure day, or 'aujourd'hui'", () => {
    const next = (reminderWeekday: number | null) =>
      measureReminder({ lastSessionDate: "2026-09-30", reminderWeekday, today: TODAY }).nextLabel;
    expect(next(null)).toBeNull();
    expect(next(0)).toBe("lundi");
    expect(next(5)).toBe("aujourd'hui"); // 2026-10-03 is a Saturday
    expect(next(6)).toBe("dimanche");
  });
});

describe("buildMeasureBlock (Accueil)", () => {
  const block = (measures: MeasureRow[], over = {}) =>
    buildMeasureBlock({ measures, goal: "lose", unit: "cm", today: TODAY, reminderWeekday: null, ...over });

  it("is an empty state for an account that never measured", () => {
    expect(block([])).toEqual({ state: "empty" });
  });

  it("shows the three featured zones of the goal with their 30-day delta", () => {
    const b = block([...WAIST, row("2026-10-01", "hips", 100), row("2026-08-20", "hips", 102)]);
    expect(b.state).toBe("ready");
    if (b.state !== "ready") return;
    expect(b.zones.map((z) => z.zone)).toEqual(["waist", "hips", "thigh"]);
    expect(b.zones[0]).toMatchObject({ label: "Taille", valueText: `86,5${NNBSP}cm`, tone: "positive" });
    expect(b.zones[2]).toMatchObject({ label: "Cuisse", valueText: null, deltaText: null });
    expect(b.reminder).toMatchObject({ daysSince: 2, stale: false });
  });

  it("uses the maintenance zones without a goal", () => {
    const b = block(WAIST, { goal: null });
    expect(b.state === "ready" && b.zones.map((z) => z.zone)).toEqual(["waist", "hips", "arm"]);
  });
});

describe("waistSeries", () => {
  it("keeps only the waist, as dated values", () => {
    expect(waistSeries([row("2026-10-01", "neck", 38), ...WAIST])).toEqual([
      { date: "2026-08-20", valueCm: 90 },
      { date: "2026-09-10", valueCm: 88 },
      { date: "2026-10-01", valueCm: 86.5 },
    ]);
  });
});
```

- [ ] **Étape 3 : voir les tests échouer**

Run : `pnpm vitest run src/features/measurements/summary.test.ts`
Attendu : FAIL (module introuvable).

- [ ] **Étape 4 : implémenter** `src/features/measurements/summary.ts`

```ts
import { daysBetween, weekdayIndex, type LocalDate } from "@/lib/dates";
import {
  MEASURE_STALE_DAYS,
  ZONES,
  featuredZones,
  zoneDelta,
  type DeltaPeriod,
  type DeltaTone,
  type GoalType,
  type Zone,
  type ZoneMeasure,
} from "@/lib/metrics";
import {
  formatInputDecimal,
  formatLength,
  formatLengthDelta,
  toDisplayLength,
  type LengthUnit,
} from "@/lib/units";
import { PROTOCOLS, ZONE_LABELS } from "./copy";
import type { MeasureRow } from "./queries";

export const PERIOD_OPTIONS: readonly { value: DeltaPeriod; param: string; label: string }[] = [
  { value: 7, param: "7", label: "7 j" },
  { value: 30, param: "30", label: "30 j" },
  { value: 90, param: "90", label: "90 j" },
  { value: "start", param: "debut", label: "Début" },
];

export function parsePeriod(raw: string | undefined): DeltaPeriod {
  return PERIOD_OPTIONS.find((o) => o.param === raw)?.value ?? 30;
}
export const periodParam = (period: DeltaPeriod) =>
  (PERIOD_OPTIONS.find((o) => o.value === period) as (typeof PERIOD_OPTIONS)[number]).param;

const WEEKDAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"] as const;

export const seriesOf = (measures: readonly MeasureRow[], zone: Zone): ZoneMeasure[] =>
  measures.filter((m) => m.zone === zone).map((m) => ({ date: m.date, valueCm: m.valueCm }));

/** The recomposition waist indicator reads these (specs/03 §5.3). */
export const waistSeries = (measures: readonly MeasureRow[]) => seriesOf(measures, "waist");

export function agoLabel(days: number): string {
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  return `il y a ${days} j`;
}

export type ZoneView = {
  zone: Zone;
  label: string;
  valueText: string | null;
  deltaText: string | null;
  tone: DeltaTone;
  /** "Taille : 84,5 cm, moins 3,5 cm sur 30 jours" (ENF-12). */
  ariaLabel: string;
};
export type SheetData = {
  label: string;
  protocol: string;
  /** Latest value, in the input format of the display unit. */
  prefill: string | null;
  /** "Précédente : 84,5 cm · il y a 7 j" */
  previousText: string | null;
};

function deltaPhrase(deltaCm: number, unit: LengthUnit, period: DeltaPeriod): string {
  const when = period === "start" ? "depuis le début" : `sur ${period} jours`;
  if (deltaCm === 0) return `stable ${when}`;
  return `${deltaCm < 0 ? "moins" : "plus"} ${formatLength(Math.abs(deltaCm), unit)} ${when}`;
}

function zoneView(
  zone: Zone,
  measures: readonly MeasureRow[],
  goal: GoalType | null,
  period: DeltaPeriod,
  unit: LengthUnit,
  today: LocalDate,
): ZoneView {
  const label = ZONE_LABELS[zone];
  const { current, deltaCm, tone } = zoneDelta(zone, seriesOf(measures, zone), period, today, goal);
  if (!current) {
    return {
      zone,
      label,
      valueText: null,
      deltaText: null,
      tone,
      ariaLabel: `${label} : pas encore mesurée`,
    };
  }
  const valueText = formatLength(current.valueCm, unit);
  return {
    zone,
    label,
    valueText,
    deltaText: deltaCm === null ? null : formatLengthDelta(deltaCm, unit),
    tone,
    ariaLabel:
      deltaCm === null
        ? `${label} : ${valueText}`
        : `${label} : ${valueText}, ${deltaPhrase(deltaCm, unit, period)}`,
  };
}

export type BodySummary = {
  zones: ZoneView[];
  sheet: Record<Zone, SheetData>;
  lastSessionDate: LocalDate | null;
};

/** Everything /corps shows, already computed (specs/01 §3.4). */
export function buildBodySummary(input: {
  measures: readonly MeasureRow[];
  goal: GoalType | null;
  period: DeltaPeriod;
  unit: LengthUnit;
  today: LocalDate;
}): BodySummary {
  const { measures, goal, period, unit, today } = input;
  const sheet = {} as Record<Zone, SheetData>;
  for (const zone of ZONES) {
    const past = seriesOf(measures, zone).filter((m) => m.date <= today);
    const latest = past.sort((a, b) => a.date.localeCompare(b.date)).at(-1) ?? null;
    sheet[zone] = {
      label: ZONE_LABELS[zone],
      protocol: PROTOCOLS[zone],
      prefill: latest && formatInputDecimal(toDisplayLength(latest.valueCm, unit)),
      previousText:
        latest &&
        `Précédente : ${formatLength(latest.valueCm, unit)} · ${agoLabel(daysBetween(latest.date, today))}`,
    };
  }
  const dates = measures.map((m) => m.date).filter((d) => d <= today);
  return {
    zones: ZONES.map((zone) => zoneView(zone, measures, goal, period, unit, today)),
    sheet,
    lastSessionDate: dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : null,
  };
}

export type SessionZone = {
  zone: Zone;
  label: string;
  protocol: string;
  /** Latest value dated before today (reference of the recap). */
  previousCm: number | null;
  previousText: string | null;
  /** Value already saved today, if any. */
  todayCm: number | null;
  /** Input value: today's, else the previous one, else empty. */
  prefill: string;
};

export function buildSessionData(
  measures: readonly MeasureRow[],
  unit: LengthUnit,
  today: LocalDate,
): { zones: SessionZone[]; startIndex: number; firstTime: boolean } {
  const zones = ZONES.map((zone): SessionZone => {
    const series = seriesOf(measures, zone).sort((a, b) => a.date.localeCompare(b.date));
    const todayMeasure = series.find((m) => m.date === today) ?? null;
    const previous = series.filter((m) => m.date < today).at(-1) ?? null;
    const shown = todayMeasure ?? previous;
    return {
      zone,
      label: ZONE_LABELS[zone],
      protocol: PROTOCOLS[zone],
      previousCm: previous?.valueCm ?? null,
      previousText:
        previous &&
        `Précédente : ${formatLength(previous.valueCm, unit)} · ${agoLabel(daysBetween(previous.date, today))}`,
      todayCm: todayMeasure?.valueCm ?? null,
      prefill: shown ? formatInputDecimal(toDisplayLength(shown.valueCm, unit)) : "",
    };
  });
  const first = zones.findIndex((z) => z.todayCm === null);
  return { zones, startIndex: Math.max(0, first), firstTime: measures.length === 0 };
}

export type MeasureReminder = {
  lastSessionDate: LocalDate | null;
  daysSince: number | null;
  stale: boolean;
  /** "lundi", "aujourd'hui", or null when the user chose no measure day. */
  nextLabel: string | null;
};

/** EF-MEA-05. */
export function measureReminder(input: {
  lastSessionDate: LocalDate | null;
  reminderWeekday: number | null;
  today: LocalDate;
}): MeasureReminder {
  const { lastSessionDate, reminderWeekday, today } = input;
  const daysSince = lastSessionDate === null ? null : daysBetween(lastSessionDate, today);
  return {
    lastSessionDate,
    daysSince,
    stale: daysSince === null || daysSince > MEASURE_STALE_DAYS,
    nextLabel:
      reminderWeekday === null
        ? null
        : weekdayIndex(today) === reminderWeekday
          ? "aujourd'hui"
          : WEEKDAYS[reminderWeekday],
  };
}

export type MeasureBlockData =
  | { state: "empty" }
  | { state: "ready"; zones: ZoneView[]; reminder: MeasureReminder };

/** Accueil "Mensurations" block: the goal's three zones over 30 days (specs/01 §3.2). */
export function buildMeasureBlock(input: {
  measures: readonly MeasureRow[];
  goal: GoalType | null;
  unit: LengthUnit;
  today: LocalDate;
  reminderWeekday: number | null;
}): MeasureBlockData {
  const { measures, goal, unit, today, reminderWeekday } = input;
  if (measures.length === 0) return { state: "empty" };
  const { lastSessionDate } = buildBodySummary({ measures, goal, period: 30, unit, today });
  return {
    state: "ready",
    zones: featuredZones(goal).map((zone) => zoneView(zone, measures, goal, 30, unit, today)),
    reminder: measureReminder({ lastSessionDate, reminderWeekday, today }),
  };
}
```

- [ ] **Étape 5 : voir les tests passer**

Run : `pnpm vitest run src/features/measurements/summary.test.ts src/lib/dates.test.ts`
Attendu : PASS. (Le test « 34,1 in » : 86,5 / 2,54 = 34,055 → 34,1 ; l'écart −3,5 cm = −1,38 → −1,4.)

- [ ] **Étape 6 : commit**

```bash
pnpm format
git add src/lib/dates.ts src/lib/dates.test.ts src/features/measurements/summary.ts src/features/measurements/summary.test.ts
git commit -m "feat(measurements): body, session and reminder summaries"
```

---

### Tâche 7 : composant Silhouette (BODY-39)

**Fichiers :**
- Créer : `src/features/measurements/silhouette-geometry.ts`, `src/features/measurements/components/silhouette.tsx`, `src/features/measurements/components/silhouette.test.tsx`

**Interfaces :**
- Consomme : `Zone`, `ZONES` (`lib/metrics`), `ZoneView` (`summary`).
- Produit :
  - `type Sex = "male" | "female"`, `VIEW_BOX`, `HALF_PATH`, `HEAD`, `ANCHORS`, `LABEL_SIDE`, `BAND` (géométrie)
  - `<Silhouette sex zones onSelect? highlight? />` : `zones: readonly ZoneView[]` (peut être vide), `onSelect?: (zone: Zone) => void` (absent = aucun bouton), `highlight?: Zone` (mode séance : silhouette à 30 %, barre `--fg` à la hauteur de la zone, pas d'annotations)

- [ ] **Étape 1 : écrire les tests qui échouent** `src/features/measurements/components/silhouette.test.tsx`

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ZONES } from "@/lib/metrics";
import type { ZoneView } from "../summary";
import { Silhouette } from "./silhouette";

afterEach(cleanup);

const zones: ZoneView[] = ZONES.map((zone) => ({
  zone,
  label: zone,
  valueText: zone === "waist" ? "84,5 cm" : null,
  deltaText: zone === "waist" ? "−3,5 cm" : null,
  tone: zone === "waist" ? "positive" : "neutral",
  ariaLabel: zone === "waist" ? "Taille : 84,5 cm, moins 3,5 cm sur 30 jours" : `${zone} : pas encore mesurée`,
}));

describe("Silhouette", () => {
  it("renders one accessible button per zone, named with the full label (ENF-12)", () => {
    render(<Silhouette sex="male" zones={zones} onSelect={() => {}} />);
    expect(screen.getAllByRole("button")).toHaveLength(8);
    expect(
      screen.getByRole("button", { name: "Taille : 84,5 cm, moins 3,5 cm sur 30 jours" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "neck : pas encore mesurée" })).toBeTruthy();
  });

  it("calls onSelect with the zone when a point is pressed", () => {
    const onSelect = vi.fn();
    render(<Silhouette sex="female" zones={zones} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: /^Taille/ }));
    expect(onSelect).toHaveBeenCalledWith("waist");
  });

  it("makes every touch target at least 44 px (ENF-14)", () => {
    render(<Silhouette sex="male" zones={zones} onSelect={() => {}} />);
    for (const b of screen.getAllByRole("button")) expect(b.className).toContain("size-11");
  });

  it("hides the drawing from assistive technology: the buttons are the interface", () => {
    const { container } = render(<Silhouette sex="male" zones={zones} onSelect={() => {}} />);
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("draws a hollow point for a zone never measured and a filled one otherwise", () => {
    const { container } = render(<Silhouette sex="male" zones={zones} onSelect={() => {}} />);
    const dots = container.querySelectorAll("circle[data-zone]");
    expect(dots).toHaveLength(8);
    expect(container.querySelector('circle[data-zone="waist"]')?.getAttribute("data-measured")).toBe("true");
    expect(container.querySelector('circle[data-zone="neck"]')?.getAttribute("data-measured")).toBe("false");
  });

  it("shows the value and the delta of a measured zone, and a dash for the others", () => {
    render(<Silhouette sex="male" zones={zones} />);
    expect(screen.getByText("84,5 cm")).toBeTruthy();
    expect(screen.getByText("−3,5 cm")).toBeTruthy();
    expect(screen.getAllByText("—")).toHaveLength(7);
  });

  it("draws another outline for each sex", () => {
    const d = (sex: "male" | "female") => {
      const { container } = render(<Silhouette sex={sex} zones={zones} />);
      const path = container.querySelector("path")?.getAttribute("d");
      cleanup();
      return path;
    };
    expect(d("male")).not.toBe(d("female"));
  });

  it("has no buttons without onSelect", () => {
    render(<Silhouette sex="male" zones={zones} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("highlights the current zone with a bar and drops the annotations (guided session)", () => {
    const { container } = render(<Silhouette sex="male" zones={[]} highlight="waist" />);
    expect(container.querySelector('rect[data-highlight="waist"]')).toBeTruthy();
    expect(container.querySelectorAll("circle[data-zone]")).toHaveLength(0);
    expect(container.querySelector("g[data-outline]")?.getAttribute("opacity")).toBe("0.3");
  });
});
```

- [ ] **Étape 2 : voir les tests échouer**

Run : `pnpm vitest run src/features/measurements/components/silhouette.test.tsx`
Attendu : FAIL.

- [ ] **Étape 3 : écrire la géométrie** `src/features/measurements/silhouette-geometry.ts`

```ts
import type { Zone } from "@/lib/metrics";

export type Sex = "male" | "female";

/** Widened from "0 0 200 440" to leave room for the labels (specs/06 §5.1). */
export const VIEW_BOX = "-80 0 360 440";
export const VIEW_BOX_X = -80;
export const VIEW_BOX_WIDTH = 360;
export const VIEW_BOX_HEIGHT = 440;

/** Right half of the outline; the left one is its mirror (translate(200,0) scale(-1,1)). From specs/maquettes/silhouette-concepts.html. */
export const HALF_PATH: Record<Sex, string> = {
  male: "M100,62 L110,62 Q111,72 112,76 Q140,80 150,94 Q157,108 158,130 L162,170 Q165,200 166,222 Q170,238 164,248 Q156,250 156,236 L152,205 Q148,175 146,150 L140,122 Q136,150 132,172 Q128,190 131,208 Q136,225 134,245 L130,300 Q127,320 128,335 L124,395 L123,412 Q130,420 128,426 L106,426 L107,412 L106,390 L106,335 Q104,300 103,270 Q101,252 100,250",
  female:
    "M100,62 L108,62 Q109,72 110,76 Q132,80 140,94 Q146,108 147,130 L151,170 Q154,200 155,222 Q159,238 153,248 Q146,250 146,236 L142,205 Q138,175 136,150 L132,124 Q134,145 130,160 Q124,176 124,188 Q127,210 137,230 Q140,245 136,262 L130,305 Q127,322 128,337 L122,395 L121,412 Q127,420 125,426 L105,426 L106,412 L105,390 L105,337 Q103,300 102,275 Q101,262 100,260",
};

export const HEAD: Record<Sex, { cx: number; cy: number; rx: number; ry: number }> = {
  male: { cx: 100, cy: 40, rx: 22, ry: 22 },
  female: { cx: 100, cy: 40, rx: 20, ry: 23 },
};

/** specs/06 §5.2. */
export const ANCHORS: Record<Sex, Record<Zone, { x: number; y: number }>> = {
  male: {
    neck: { x: 100, y: 70 },
    shoulders: { x: 145, y: 90 },
    chest: { x: 100, y: 130 },
    arm: { x: 153, y: 140 },
    waist: { x: 100, y: 180 },
    hips: { x: 100, y: 220 },
    thigh: { x: 118, y: 280 },
    calf: { x: 116, y: 360 },
  },
  female: {
    neck: { x: 100, y: 70 },
    shoulders: { x: 135, y: 90 },
    chest: { x: 100, y: 135 },
    arm: { x: 144, y: 140 },
    waist: { x: 100, y: 185 },
    hips: { x: 100, y: 228 },
    thigh: { x: 117, y: 285 },
    calf: { x: 115, y: 360 },
  },
};

export const LABEL_SIDE: Record<Zone, "left" | "right"> = {
  neck: "left",
  chest: "left",
  waist: "left",
  hips: "left",
  shoulders: "right",
  arm: "right",
  thigh: "right",
  calf: "right",
};

/**
 * Horizontal extent of the highlight bar of the guided session, read off the outline at the
 * height of each zone (specs/06 §5.2: "largeur ajustée au corps à cette hauteur").
 * Checked by eye against the mock-up in task 7, step 6.
 */
export const BAND: Record<Sex, Record<Zone, { x1: number; x2: number }>> = {
  male: {
    neck: { x1: 88, x2: 112 },
    shoulders: { x1: 50, x2: 150 },
    chest: { x1: 44, x2: 156 },
    arm: { x1: 42, x2: 158 },
    waist: { x1: 52, x2: 148 },
    hips: { x1: 36, x2: 164 },
    thigh: { x1: 70, x2: 130 },
    calf: { x1: 72, x2: 128 },
  },
  female: {
    neck: { x1: 90, x2: 110 },
    shoulders: { x1: 60, x2: 140 },
    chest: { x1: 54, x2: 146 },
    arm: { x1: 52, x2: 148 },
    waist: { x1: 64, x2: 136 },
    hips: { x1: 44, x2: 156 },
    thigh: { x1: 70, x2: 130 },
    calf: { x1: 72, x2: 128 },
  },
};
```

- [ ] **Étape 4 : écrire le composant** `src/features/measurements/components/silhouette.tsx`

```tsx
"use client";

import type { Zone } from "@/lib/metrics";
import {
  ANCHORS,
  BAND,
  HALF_PATH,
  HEAD,
  LABEL_SIDE,
  VIEW_BOX,
  VIEW_BOX_HEIGHT,
  VIEW_BOX_WIDTH,
  VIEW_BOX_X,
  type Sex,
} from "../silhouette-geometry";
import type { ZoneView } from "../summary";

const LEFT_RULE_END = 18;
const RIGHT_RULE_START = 186;

type Props = {
  sex: Sex;
  zones: readonly ZoneView[];
  /** When absent the silhouette is a plain picture: no buttons. */
  onSelect?: (zone: Zone) => void;
  /** Guided session: the zone being measured. */
  highlight?: Zone;
};

/**
 * Line-drawn silhouette (specs/06 §5). The SVG is decorative; the real controls are the
 * 44 px buttons laid over each anchor, labelled in full (ENF-12).
 */
export function Silhouette({ sex, zones, onSelect, highlight }: Props) {
  const anchors = ANCHORS[sex];
  const head = HEAD[sex];
  const path = HALF_PATH[sex];
  const band = highlight ? BAND[sex][highlight] : null;

  return (
    <div className="relative mx-auto w-full max-w-[360px]">
      <svg viewBox={VIEW_BOX} aria-hidden="true" focusable="false" className="block h-auto w-full">
        <g
          data-outline
          fill="none"
          strokeWidth={1.25}
          className="stroke-fg"
          opacity={highlight ? 0.3 : 1}
        >
          <ellipse cx={head.cx} cy={head.cy} rx={head.rx} ry={head.ry} />
          <path d={path} />
          <path d={path} transform="translate(200,0) scale(-1,1)" />
        </g>
        {highlight && band && (
          <rect
            data-highlight={highlight}
            x={band.x1}
            y={anchors[highlight].y - 8}
            width={band.x2 - band.x1}
            height={16}
            rx={8}
            className="fill-fg"
          />
        )}
        {!highlight &&
          zones.map((z) => {
            const { x, y } = anchors[z.zone];
            const left = LABEL_SIDE[z.zone] === "left";
            const edge = left ? LEFT_RULE_END : RIGHT_RULE_START;
            const textX = left ? edge - 4 : edge + 4;
            const measured = z.valueText !== null;
            return (
              <g key={z.zone}>
                <line x1={x} y1={y} x2={edge} y2={y} strokeWidth={1} className="stroke-line" />
                <circle
                  data-zone={z.zone}
                  data-measured={measured}
                  cx={x}
                  cy={y}
                  r={3.5}
                  strokeWidth={1.2}
                  className={measured ? "fill-fg stroke-fg" : "fill-bg stroke-fg"}
                />
                <text
                  x={textX}
                  y={y - 14}
                  textAnchor={left ? "end" : "start"}
                  fontSize={10}
                  className="fill-muted"
                >
                  {z.label}
                </text>
                <text
                  x={textX}
                  y={y}
                  textAnchor={left ? "end" : "start"}
                  fontSize={12.5}
                  fontWeight={600}
                  className="fill-fg"
                >
                  {z.valueText ?? "—"}
                </text>
                {z.deltaText && (
                  <text
                    x={textX}
                    y={y + 14}
                    textAnchor={left ? "end" : "start"}
                    fontSize={11}
                    className={z.tone === "positive" ? "fill-positive" : "fill-muted"}
                  >
                    {z.deltaText}
                  </text>
                )}
              </g>
            );
          })}
      </svg>
      {onSelect &&
        !highlight &&
        zones.map((z) => {
          const { x, y } = anchors[z.zone];
          return (
            <button
              key={z.zone}
              type="button"
              aria-label={z.ariaLabel}
              onClick={() => onSelect(z.zone)}
              className="absolute size-11 -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
              style={{
                left: `${((x - VIEW_BOX_X) / VIEW_BOX_WIDTH) * 100}%`,
                top: `${(y / VIEW_BOX_HEIGHT) * 100}%`,
              }}
            />
          );
        })}
    </div>
  );
}
```

- [ ] **Étape 5 : voir les tests passer**

Run : `pnpm vitest run src/features/measurements/components/silhouette.test.tsx`
Attendu : PASS. Si `fill-bg`, `fill-muted`, `fill-positive` ou `stroke-line` ne génèrent pas de style (jetons Tailwind v4 absents), les déclarer dans `globals.css` (`@theme`) en réutilisant les variables existantes (`--bg`, `--muted`, `--positive`, `--line`) : ne pas coder de couleur en dur.

- [ ] **Étape 6 : contrôle visuel (ENF-14, maquette)**

Run : `pnpm dev`, ouvrir une page de test provisoire **non commitée** qui affiche `<Silhouette sex="male" zones={[]} highlight="waist" />` pour chaque zone et chaque sexe, à 390 px de large. Comparer la barre au corps à cette hauteur et ajuster `BAND` si elle dépasse la silhouette ou ne l'atteint pas. Supprimer la page de test.

- [ ] **Étape 7 : commit**

```bash
pnpm format
git add src/features/measurements/silhouette-geometry.ts src/features/measurements/components/silhouette.tsx src/features/measurements/components/silhouette.test.tsx src/app/globals.css
git commit -m "feat(measurements): annotated silhouette with accessible zone buttons"
```

---

### Tâche 8 : écran Corps et saisie d'une zone (BODY-39, BODY-41)

**Fichiers :**
- Créer : `src/features/measurements/components/zone-form.tsx`, `zone-form.test.tsx`, `body-view.tsx`, `period-tabs.tsx`
- Modifier : `src/app/(app)/corps/page.tsx`

**Interfaces :**
- Consomme : `saveZoneAction`, `SAVED_TOAST`, `SheetData`, `ZoneView`, `Silhouette`, `Sheet`, `NumberStepper`, `Input`, `Button`, `useToast`, `MEASURE_MIN_CM`, `MEASURE_MAX_CM`, `toDisplayLength`, `PERIOD_OPTIONS`.
- Produit :
  - `<ZoneForm zone unit today data onSaved />` (formulaire du panneau)
  - `<BodyView sex unit today zones sheet />` (silhouette + panneau)
  - `<PeriodTabs current />` (liens `?periode=`)

- [ ] **Étape 1 : écrire le test du formulaire** `src/features/measurements/components/zone-form.test.tsx`

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast";
import type { SheetData } from "../summary";

const saveZoneAction = vi.hoisted(() => vi.fn());
vi.mock("../actions", () => ({ saveZoneAction }));

import { ZoneForm } from "./zone-form";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const DATA: SheetData = {
  label: "Taille",
  protocol: "Au niveau du nombril, ventre relâché.",
  prefill: "84,5",
  previousText: "Précédente : 84,5 cm · il y a 7 j",
};
const renderForm = (data = DATA, onSaved = vi.fn(), unit: "cm" | "in" = "cm") => {
  render(
    <ToastProvider>
      <ZoneForm zone="waist" unit={unit} today="2026-10-03" data={data} onSaved={onSaved} />
    </ToastProvider>,
  );
  return onSaved;
};

describe("ZoneForm", () => {
  it("shows the previous value, the protocol, today's date and a pre-filled value", () => {
    renderForm();
    expect(screen.getByText("Précédente : 84,5 cm · il y a 7 j")).toBeTruthy();
    expect(screen.getByText(/Au niveau du nombril/)).toBeTruthy();
    expect(screen.getByLabelText("Date")).toHaveProperty("value", "2026-10-03");
    expect(screen.getByLabelText("Date").getAttribute("max")).toBe("2026-10-03");
    expect(screen.getByLabelText("Mesure")).toHaveProperty("value", "84,5");
  });

  it("starts empty for a zone never measured", () => {
    renderForm({ ...DATA, prefill: null, previousText: null });
    expect(screen.getByLabelText("Mesure")).toHaveProperty("value", "");
    expect(screen.queryByText(/Précédente/)).toBeNull();
  });

  it("sends the zone and the unit with the value", async () => {
    saveZoneAction.mockResolvedValue({ ok: true });
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(saveZoneAction).toHaveBeenCalled());
    const fd = saveZoneAction.mock.calls[0][1] as FormData;
    expect([fd.get("zone"), fd.get("unit"), fd.get("value"), fd.get("date")]).toEqual([
      "waist",
      "cm",
      "84,5",
      "2026-10-03",
    ]);
  });

  it("closes with a toast once saved", async () => {
    saveZoneAction.mockResolvedValue({ ok: true });
    const onSaved = renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(screen.getByText("Mesure enregistrée")).toBeTruthy();
  });

  it("asks for confirmation and resubmits with it", async () => {
    saveZoneAction
      .mockResolvedValueOnce({
        ok: false,
        needsConfirmation: { reason: "replace", message: "Remplacer 84,5 cm par 83,9 cm ?" },
        values: { date: "2026-10-03", zone: "waist", value: "83,9", unit: "cm", confirmed: "" },
      })
      .mockResolvedValueOnce({ ok: true });
    const onSaved = renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Remplacer 84,5 cm par 83,9 cm/);
    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const fd = saveZoneAction.mock.calls[1][1] as FormData;
    expect(fd.get("confirm")).toBe("replace");
  });

  it("shows the field error of the server", async () => {
    saveZoneAction.mockResolvedValue({
      ok: false,
      fieldErrors: { value: ["Mesure entre 10 et 250 cm"] },
      values: { date: "2026-10-03", zone: "waist", value: "5", unit: "cm" },
    });
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(await screen.findByText("Mesure entre 10 et 250 cm")).toBeTruthy();
  });

  it("pre-fills in inches for an imperial profile", () => {
    renderForm({ ...DATA, prefill: "33,3" }, vi.fn(), "in");
    expect(screen.getByLabelText("Mesure")).toHaveProperty("value", "33,3");
  });
});
```

- [ ] **Étape 2 : voir le test échouer**

Run : `pnpm vitest run src/features/measurements/components/zone-form.test.tsx`
Attendu : FAIL (module introuvable).

- [ ] **Étape 3 : implémenter le formulaire** `src/features/measurements/components/zone-form.tsx` (même schéma que `weight-form.tsx` : une confirmation ne couvre que la date et la valeur envoyées)

```tsx
"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberStepper } from "@/components/ui/number-stepper";
import { useToast } from "@/components/ui/toast";
import { fieldError, fieldValue, type ActionResult } from "@/lib/action-result";
import type { LocalDate } from "@/lib/dates";
import type { Zone } from "@/lib/metrics";
import { toDisplayLength, type LengthUnit } from "@/lib/units";
import { saveZoneAction } from "../actions";
import { SAVED_TOAST } from "../copy";
import { MEASURE_MAX_CM, MEASURE_MIN_CM } from "../limits";
import type { SheetData } from "../summary";

const FALLBACK_CM = 60;

export function ZoneForm({
  zone,
  unit,
  today,
  data,
  onSaved,
}: {
  zone: Zone;
  unit: LengthUnit;
  today: LocalDate;
  data: SheetData;
  onSaved: () => void;
}) {
  const toast = useToast();
  // A confirmation only covers the date and value that were submitted: editing either voids it.
  const [edited, setEdited] = useState(false);
  const [state, action, pending] = useActionState(
    async (prev: ActionResult | null, formData: FormData) => {
      setEdited(false);
      const result = await saveZoneAction(prev, formData);
      if (result.ok) {
        toast(SAVED_TOAST);
        onSaved();
      }
      return result;
    },
    null,
  );
  const [value, setValue] = useState(data.prefill ?? "");
  const confirmation = !edited && state && !state.ok ? state.needsConfirmation : undefined;

  return (
    <form action={action} className="mt-4 flex flex-col gap-5">
      <input type="hidden" name="zone" value={zone} />
      <input type="hidden" name="unit" value={unit} />
      <input
        type="hidden"
        name="confirmed"
        value={edited ? "" : (fieldValue(state, "confirmed") ?? "")}
      />
      {data.previousText && <p className="text-sm text-fg-2">{data.previousText}</p>}
      <Input
        label="Date"
        name="date"
        type="date"
        max={today}
        defaultValue={fieldValue(state, "date") ?? today}
        onChange={() => setEdited(true)}
        error={fieldError(state, "date")}
      />
      <NumberStepper
        label="Mesure"
        name="value"
        unit={unit}
        value={value}
        onChange={(v) => {
          setValue(v);
          setEdited(true);
        }}
        min={toDisplayLength(MEASURE_MIN_CM, unit)}
        max={toDisplayLength(MEASURE_MAX_CM, unit)}
        fallback={toDisplayLength(FALLBACK_CM, unit)}
        error={fieldError(state, "value")}
      />
      <div className="rounded-xl bg-surface p-3 text-xs text-fg-2">
        <p className="font-semibold text-fg">Comment mesurer</p>
        <p className="mt-1">{data.protocol}</p>
      </div>
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

- [ ] **Étape 4 : voir le test passer**

Run : `pnpm vitest run src/features/measurements/components/zone-form.test.tsx`
Attendu : PASS.

- [ ] **Étape 5 : écrire `body-view.tsx` et `period-tabs.tsx`**

`src/features/measurements/components/body-view.tsx` :

```tsx
"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import type { LocalDate } from "@/lib/dates";
import type { Zone } from "@/lib/metrics";
import type { LengthUnit } from "@/lib/units";
import type { Sex } from "../silhouette-geometry";
import type { SheetData, ZoneView } from "../summary";
import { Silhouette } from "./silhouette";
import { ZoneForm } from "./zone-form";

/** The silhouette plus the input sheet of the zone that was touched (EF-MEA-03). */
export function BodyView({
  sex,
  unit,
  today,
  zones,
  sheet,
}: {
  sex: Sex;
  unit: LengthUnit;
  today: LocalDate;
  zones: ZoneView[];
  sheet: Record<Zone, SheetData>;
}) {
  const [selected, setSelected] = useState<Zone | null>(null);
  return (
    <>
      <Silhouette sex={sex} zones={zones} onSelect={setSelected} />
      <Sheet
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
        title={selected ? sheet[selected].label : ""}
      >
        {selected && (
          <ZoneForm
            key={selected}
            zone={selected}
            unit={unit}
            today={today}
            data={sheet[selected]}
            onSaved={() => setSelected(null)}
          />
        )}
      </Sheet>
    </>
  );
}
```

`src/features/measurements/components/period-tabs.tsx` :

```tsx
import Link from "next/link";
import type { DeltaPeriod } from "@/lib/metrics";
import { PERIOD_OPTIONS } from "../summary";

/** 7 j · 30 j · 90 j · Début: plain links, so the choice survives a reload and needs no JS. */
export function PeriodTabs({ current }: { current: DeltaPeriod }) {
  return (
    <nav aria-label="Période" className="mt-4 flex gap-2">
      {PERIOD_OPTIONS.map((o) => {
        const active = o.value === current;
        return (
          <Link
            key={o.param}
            href={`/corps?periode=${o.param}`}
            aria-current={active ? "true" : undefined}
            className={`flex min-h-11 min-w-11 items-center justify-center rounded-full px-4 text-[13px] font-medium ${active ? "bg-fg text-white" : "border border-line text-fg-2"}`}
          >
            {o.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Étape 6 : remplacer la page** `src/app/(app)/corps/page.tsx`

```tsx
import Link from "next/link";
import { getActiveGoal } from "@/features/goals/queries";
import { BodyView } from "@/features/measurements/components/body-view";
import { PeriodTabs } from "@/features/measurements/components/period-tabs";
import { listMeasures } from "@/features/measurements/queries";
import { buildBodySummary, parsePeriod } from "@/features/measurements/summary";
import { formatLongDate, today } from "@/lib/dates";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/session";

export default async function BodyPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const { userId, profile } = await requireUser("app");
  const { periode } = await searchParams;
  const period = parsePeriod(periode);
  const todayDate = today(profile?.timezone ?? "Europe/Paris");
  const unit = profile?.lengthUnit ?? "cm";
  const db = getDb();
  const [measures, goal] = await Promise.all([listMeasures(db, userId), getActiveGoal(db, userId)]);
  const summary = buildBodySummary({
    measures,
    goal: goal?.type ?? null,
    period,
    unit,
    today: todayDate,
  });

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight lg:text-[28px]">Corps</h1>
      <PeriodTabs current={period} />
      <div className="mt-6">
        <BodyView
          sex={profile?.sex ?? "male"}
          unit={unit}
          today={todayDate}
          zones={summary.zones}
          sheet={summary.sheet}
        />
      </div>
      <p className="mt-4 text-center text-sm text-fg-2">
        {summary.lastSessionDate
          ? `Dernière séance le ${formatLongDate(summary.lastSessionDate)}`
          : "Aucune séance pour l'instant"}
      </p>
      <div className="mt-6 flex justify-center">
        <Link
          href="/corps/seance"
          className="inline-flex h-11 items-center rounded-full bg-fg px-5 text-[13px] font-semibold text-white"
        >
          Nouvelle séance de mesure
        </Link>
      </div>
    </>
  );
}
```

- [ ] **Étape 7 : vérifier**

Run : `pnpm typecheck && pnpm lint && pnpm vitest run src/features/measurements`
Attendu : PASS.

- [ ] **Étape 8 : contrôle visuel**

Run : `pnpm dev`, ouvrir `/corps` avec le compte de démo à 390 px et 1440 px : 8 points, étiquettes à gauche (cou, poitrine, taille, hanches) et à droite (épaules, bras, cuisse, mollet), changer de période met l'écart à jour, toucher « Taille » ouvre le panneau (bas de l'écran en mobile, fenêtre centrée en desktop). Les données de démo n'existent qu'après la tâche 12 : en attendant, saisir deux mesures à la main.

- [ ] **Étape 9 : commit**

```bash
pnpm format
git add src/features/measurements/components src/app/\(app\)/corps/page.tsx
git commit -m "feat(measurements): Corps screen with period selector and zone input sheet"
```

---

### Tâche 9 : séance de mesure guidée (BODY-40)

**Fichiers :**
- Créer : `src/app/(session)/layout.tsx`, `src/app/(session)/corps/seance/page.tsx`, `src/features/measurements/components/measure-session.tsx`, `src/features/measurements/components/measure-session.test.tsx`

**Interfaces :**
- Consomme : `saveSessionZoneAction`, `SessionZone`, `buildSessionData`, `GENERAL_RULES`, `Silhouette`, `NumberStepper`, `Button`, `deltaTone`, `measureDelta`, `ZONES`, `GoalType`, `parseDecimal`, `toStoredCm`, `formatLength`, `formatLengthDelta`, `toDisplayLength`, `MEASURE_MIN_CM`, `MEASURE_MAX_CM`.
- Produit : `<MeasureSession sex unit goal zones startIndex intro />`

- [ ] **Étape 1 : écrire les tests qui échouent** `src/features/measurements/components/measure-session.test.tsx`

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ZONES } from "@/lib/metrics";
import { ZONE_LABELS, PROTOCOLS } from "../copy";
import type { SessionZone } from "../summary";

const saveSessionZoneAction = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());
vi.mock("../actions", () => ({ saveSessionZoneAction }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { MeasureSession } from "./measure-session";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const zones = (over: Partial<Record<(typeof ZONES)[number], Partial<SessionZone>>> = {}): SessionZone[] =>
  ZONES.map((zone) => ({
    zone,
    label: ZONE_LABELS[zone],
    protocol: PROTOCOLS[zone],
    previousCm: null,
    previousText: null,
    todayCm: null,
    prefill: "",
    ...over[zone],
  }));
const renderSession = (props: Partial<Parameters<typeof MeasureSession>[0]> = {}) =>
  render(
    <MeasureSession
      sex="male"
      unit="cm"
      goal="lose"
      zones={zones()}
      startIndex={0}
      intro={false}
      {...props}
    />,
  );
const type = (value: string) =>
  fireEvent.change(screen.getByLabelText("Mesure"), { target: { value } });
const next = () => fireEvent.click(screen.getByRole("button", { name: /Zone suivante/ }));

describe("MeasureSession", () => {
  it("shows the general rules first for a first-time user, then the first zone", () => {
    renderSession({ intro: true });
    expect(screen.getByText(/ruban souple non extensible/i)).toBeTruthy();
    expect(screen.queryByLabelText("Mesure")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Commencer" }));
    expect(screen.getByText("1 / 8")).toBeTruthy();
    expect(screen.getByLabelText("Mesure")).toBeTruthy();
  });

  it("shows the zone, its previous value, the protocol and the progress", () => {
    renderSession({
      zones: zones({ neck: { previousCm: 38, previousText: "Précédente : 38,0 cm · il y a 7 j", prefill: "38,0" } }),
    });
    expect(screen.getByRole("heading", { name: "Cou" })).toBeTruthy();
    expect(screen.getByText("Précédente : 38,0 cm · il y a 7 j")).toBeTruthy();
    expect(screen.getByText(/Juste sous la pomme d'Adam/)).toBeTruthy();
    expect(screen.getByLabelText("Mesure")).toHaveProperty("value", "38,0");
    expect(screen.getByText("1 / 8")).toBeTruthy();
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("1");
    expect(bar.getAttribute("aria-valuemax")).toBe("8");
    expect(screen.getByRole("link", { name: /Quitter/ }).getAttribute("href")).toBe("/corps");
  });

  it("starts at the given zone (resuming a session)", () => {
    renderSession({ startIndex: 1 });
    expect(screen.getByText("2 / 8")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Épaules" })).toBeTruthy();
  });

  it("saves the zone when moving to the next one", async () => {
    saveSessionZoneAction.mockResolvedValue({ ok: true });
    renderSession();
    type("38,2");
    next();
    await waitFor(() => expect(screen.getByText("2 / 8")).toBeTruthy());
    const fd = saveSessionZoneAction.mock.calls[0][1] as FormData;
    expect([fd.get("zone"), fd.get("value"), fd.get("unit")]).toEqual(["neck", "38,2", "cm"]);
  });

  it("skips a zone without saving anything", () => {
    renderSession();
    fireEvent.click(screen.getByRole("button", { name: "Passer cette zone" }));
    expect(saveSessionZoneAction).not.toHaveBeenCalled();
    expect(screen.getByText("2 / 8")).toBeTruthy();
  });

  it("treats an emptied field as skipping", () => {
    renderSession({ zones: zones({ neck: { prefill: "38,0" } }) });
    type("");
    next();
    expect(saveSessionZoneAction).not.toHaveBeenCalled();
    expect(screen.getByText("2 / 8")).toBeTruthy();
  });

  it("goes back to the previous zone", () => {
    renderSession({ startIndex: 2 });
    fireEvent.click(screen.getByRole("button", { name: /Zone précédente/ }));
    expect(screen.getByText("2 / 8")).toBeTruthy();
  });

  it("has no previous zone before the first one", () => {
    renderSession();
    expect(screen.getByRole("button", { name: /Zone précédente/ })).toHaveProperty("disabled", true);
  });

  it("stays on the zone and shows the error when saving fails", async () => {
    saveSessionZoneAction.mockResolvedValue({
      ok: false,
      fieldErrors: { value: ["Mesure entre 10 et 250 cm"] },
    });
    renderSession();
    type("5");
    next();
    expect(await screen.findByText("Mesure entre 10 et 250 cm")).toBeTruthy();
    expect(screen.getByText("1 / 8")).toBeTruthy();
  });

  it("shows the recap after the last zone, with the delta against the previous measure", async () => {
    saveSessionZoneAction.mockResolvedValue({ ok: true });
    renderSession({
      startIndex: 7,
      zones: zones({
        waist: { previousCm: 86, todayCm: 84.5, prefill: "84,5" },
        calf: { previousCm: 38, prefill: "38,0" },
        neck: { todayCm: 38.2, prefill: "38,2" }, // never measured before
      }),
    });
    type("36,5");
    next();
    expect(await screen.findByRole("heading", { name: "Récapitulatif" })).toBeTruthy();
    const rows = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(rows.some((t) => /Taille.*84,5.cm.*−1,5.cm/.test(t ?? ""))).toBe(true);
    expect(rows.some((t) => /Mollet.*36,5.cm.*−1,5.cm/.test(t ?? ""))).toBe(true);
    expect(rows.some((t) => /Cou.*38,2.cm.*première mesure/.test(t ?? ""))).toBe(true);
    expect(rows.some((t) => /Épaules/.test(t ?? ""))).toBe(false); // nothing measured
  });

  it("leaves for the Corps screen with 'Terminer'", async () => {
    saveSessionZoneAction.mockResolvedValue({ ok: true });
    renderSession({ startIndex: 7 });
    type("36,5");
    next();
    fireEvent.click(await screen.findByRole("button", { name: "Terminer" }));
    expect(push).toHaveBeenCalledWith("/corps");
  });

  it("highlights the current zone on the silhouette", () => {
    const { container } = renderSession({ startIndex: 4 });
    expect(container.querySelector('rect[data-highlight="waist"]')).toBeTruthy();
  });
});
```

- [ ] **Étape 2 : voir les tests échouer**

Run : `pnpm vitest run src/features/measurements/components/measure-session.test.tsx`
Attendu : FAIL.

- [ ] **Étape 3 : implémenter** `src/features/measurements/components/measure-session.tsx`

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { NumberStepper } from "@/components/ui/number-stepper";
import { deltaTone, measureDelta, type GoalType } from "@/lib/metrics";
import {
  formatLength,
  formatLengthDelta,
  parseDecimal,
  toDisplayLength,
  toStoredCm,
  type LengthUnit,
} from "@/lib/units";
import { saveSessionZoneAction } from "../actions";
import { GENERAL_RULES } from "../copy";
import { MEASURE_MAX_CM, MEASURE_MIN_CM } from "../limits";
import type { Sex } from "../silhouette-geometry";
import type { SessionZone } from "../summary";
import { Silhouette } from "./silhouette";

const FALLBACK_CM = 60;

type Screen = "intro" | "zone" | "recap";

/** Guided session (EF-MEA-02): each value is saved when moving on; quitting keeps what was saved. */
export function MeasureSession({
  sex,
  unit,
  goal,
  zones,
  startIndex,
  intro,
}: {
  sex: Sex;
  unit: LengthUnit;
  goal: GoalType | null;
  zones: SessionZone[];
  startIndex: number;
  intro: boolean;
}) {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>(intro ? "intro" : "zone");
  const [index, setIndex] = useState(startIndex);
  const [values, setValues] = useState(() => zones.map((z) => z.prefill));
  const [saved, setSaved] = useState(() => zones.map((z) => z.todayCm));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const zone = zones[index];
  const total = zones.length;

  const goTo = (i: number) => {
    setError(null);
    if (i >= total) setScreen("recap");
    else setIndex(Math.max(0, i));
  };

  const next = () => {
    const raw = values[index].trim();
    if (!raw) return goTo(index + 1); // nothing typed: same as skipping
    const formData = new FormData();
    formData.set("zone", zone.zone);
    formData.set("value", raw);
    formData.set("unit", unit);
    startTransition(async () => {
      const result = await saveSessionZoneAction(null, formData);
      if (!result.ok) {
        setError(result.fieldErrors?.value?.[0] ?? result.formError ?? "Une erreur est survenue, réessaie.");
        return;
      }
      const cm = toStoredCm(parseDecimal(raw), unit);
      setSaved((s) => s.map((v, i) => (i === index ? cm : v)));
      goTo(index + 1);
    });
  };

  const shell = (children: React.ReactNode) => (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-[22px] pt-4 pb-6">
      {children}
    </div>
  );

  if (screen === "intro") {
    return shell(
      <>
        <header className="flex items-center justify-between">
          <Link href="/corps" className="flex min-h-11 items-center text-sm text-fg-2">
            ✕ Quitter
          </Link>
        </header>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Avant de commencer</h1>
        <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-sm text-fg-2">
          {GENERAL_RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
        <Button className="mt-8" onClick={() => setScreen("zone")}>
          Commencer
        </Button>
      </>,
    );
  }

  if (screen === "recap") {
    const done = zones.flatMap((z, i) => (saved[i] === null ? [] : [{ z, cm: saved[i] as number }]));
    return shell(
      <>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Récapitulatif</h1>
        {done.length === 0 ? (
          <p className="mt-4 text-sm text-fg-2">Aucune zone mesurée pour l&apos;instant.</p>
        ) : (
          <ul className="mt-4 flex flex-col divide-y divide-line">
            {done.map(({ z, cm }) => {
              const delta = z.previousCm === null ? null : measureDelta(z.previousCm, cm);
              const tone = deltaTone(z.zone, delta, goal);
              return (
                <li key={z.zone} className="flex items-baseline justify-between gap-3 py-3">
                  <span className="text-sm text-fg-2">{z.label}</span>
                  <span className="text-[15px] font-semibold tabular-nums">{formatLength(cm, unit)}</span>
                  <span className={`text-sm ${tone === "positive" ? "text-positive" : "text-muted"}`}>
                    {delta === null ? "première mesure" : formatLengthDelta(delta, unit)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <Button className="mt-8" onClick={() => router.push("/corps")}>
          Terminer
        </Button>
      </>,
    );
  }

  return shell(
    <>
      <header className="flex items-center justify-between">
        <Link href="/corps" className="flex min-h-11 items-center text-sm text-fg-2">
          ✕ Quitter
        </Link>
        <p className="text-sm font-semibold">Séance de mesure</p>
        <p className="text-sm text-fg-2 tabular-nums">
          {index + 1} / {total}
        </p>
      </header>
      <div
        role="progressbar"
        aria-label="Progression de la séance"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={index + 1}
        aria-valuetext={`Zone ${index + 1} sur ${total}`}
        className="mt-3 h-[3px] w-full rounded-full bg-line"
      >
        <div className="h-full rounded-full bg-fg" style={{ width: `${((index + 1) / total) * 100}%` }} />
      </div>
      <div className="mt-4 max-h-[34dvh]">
        <Silhouette sex={sex} zones={[]} highlight={zone.zone} />
      </div>
      <section className="mt-4 flex flex-col gap-4 rounded-t-[22px] bg-bg">
        <h2 className="text-[17px] font-semibold tracking-tight">{zone.label}</h2>
        {zone.previousText && <p className="-mt-2 text-sm text-fg-2">{zone.previousText}</p>}
        <NumberStepper
          label="Mesure"
          name="value"
          unit={unit}
          value={values[index]}
          onChange={(v) => setValues((vs) => vs.map((x, i) => (i === index ? v : x)))}
          min={toDisplayLength(MEASURE_MIN_CM, unit)}
          max={toDisplayLength(MEASURE_MAX_CM, unit)}
          fallback={toDisplayLength(FALLBACK_CM, unit)}
          error={error ?? undefined}
        />
        <div className="rounded-xl bg-surface p-3 text-xs text-fg-2">
          <p className="font-semibold text-fg">Comment mesurer</p>
          <p className="mt-1">{zone.protocol}</p>
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            disabled={index === 0 || pending}
            onClick={() => goTo(index - 1)}
          >
            ← Zone précédente
          </Button>
          <Button type="button" className="flex-1" loading={pending} onClick={next}>
            Zone suivante →
          </Button>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => goTo(index + 1)}
          className="min-h-11 text-sm text-fg-2 underline underline-offset-4 disabled:opacity-50"
        >
          Passer cette zone
        </button>
      </section>
    </>,
  );
}
```

- [ ] **Étape 4 : voir les tests passer**

Run : `pnpm vitest run src/features/measurements/components/measure-session.test.tsx`
Attendu : PASS. (Le test « récap » : la zone `calf` est la dernière ; le test saisit 36,5, l'action est mockée, `saved` reçoit 36,5 ; `waist` vient de `todayCm: 84,5`, `neck` de `todayCm: 38,2`.)

- [ ] **Étape 5 : le groupe de routes `(session)` et la page**

`src/app/(session)/layout.tsx` :

```tsx
import { requireUser } from "@/lib/session";

/** Full-screen flows (no tab bar): same access rule as (app). */
export default async function SessionLayout({ children }: { children: React.ReactNode }) {
  await requireUser("app");
  return <>{children}</>;
}
```

`src/app/(session)/corps/seance/page.tsx` :

```tsx
import { getActiveGoal } from "@/features/goals/queries";
import { MeasureSession } from "@/features/measurements/components/measure-session";
import { listMeasures } from "@/features/measurements/queries";
import { buildSessionData } from "@/features/measurements/summary";
import { today } from "@/lib/dates";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/session";

export default async function MeasureSessionPage() {
  const { userId, profile } = await requireUser("app");
  const unit = profile?.lengthUnit ?? "cm";
  const db = getDb();
  const [measures, goal] = await Promise.all([listMeasures(db, userId), getActiveGoal(db, userId)]);
  const { zones, startIndex, firstTime } = buildSessionData(
    measures,
    unit,
    today(profile?.timezone ?? "Europe/Paris"),
  );
  return (
    <MeasureSession
      sex={profile?.sex ?? "male"}
      unit={unit}
      goal={goal?.type ?? null}
      zones={zones}
      startIndex={startIndex}
      intro={firstTime}
    />
  );
}
```

- [ ] **Étape 6 : vérifier que le build accepte deux groupes sous `/corps` et que le proxy couvre l'URL**

Run : `pnpm build`
Attendu : la sortie liste `/corps` et `/corps/seance`, sans conflit de routes. `src/proxy.ts` couvre déjà `/corps/:path*` : sans cookie de session, `/corps/seance` redirige vers `/connexion?next=/corps/seance`.

- [ ] **Étape 7 : commit**

```bash
pnpm format
git add src/features/measurements/components/measure-session.tsx src/features/measurements/components/measure-session.test.tsx src/app/\(session\)
git commit -m "feat(measurements): guided measurement session"
```

---

### Tâche 10 : onboarding étape 5 (BODY-43)

**Fichiers :**
- Modifier : `src/features/profile/onboarding.ts`, `onboarding.test.ts`, `actions.ts`, `actions.test.ts`, `src/app/onboarding/page.tsx`, `tests/e2e/auth-onboarding.spec.ts`
- Créer : `src/features/profile/components/measure-step.tsx`

**Interfaces :**
- Consomme : `markOnboardingCompleted`, `getProfile`, `hasWeight`, `getActiveGoal`.
- Produit :
  - `ONBOARDING_STEPS` = `["sex","body","weight","goal","measure"]` ; `nextOnboardingStep` renvoie `"measure"` quand profil, taille/naissance, pesée et objectif existent **et** que l'onboarding n'est pas terminé, `null` sinon
  - `finishOnboardingAction(prev, formData)` : champ `next` = `"start"` (→ `/corps/seance`) ou `"later"` (→ `/accueil`)
  - `<MeasureStep />`

- [ ] **Étape 1 : adapter les tests de `onboarding.test.ts`**

Relire `src/features/profile/onboarding.test.ts`. Les cas existants qui attendent `null` pour un profil complet **sans** `onboardingCompletedAt` doivent maintenant attendre `"measure"`. Ajouter :

```ts
it("asks for the first session once profile, weight and goal exist", () => {
  expect(nextOnboardingStep({ profile: done, hasWeight: true, hasGoal: true })).toBe("measure");
});

it("is finished only when onboarding was completed", () => {
  const finished = profile({ heightCm: 170, birthDate: "1990-01-01", onboardingCompletedAt: new Date() });
  expect(nextOnboardingStep({ profile: finished, hasWeight: true, hasGoal: true })).toBeNull();
});

it("never asks for the session before the goal", () => {
  expect(nextOnboardingStep({ profile: done, hasWeight: true, hasGoal: false })).toBe("goal");
});
```

Run : `pnpm vitest run src/features/profile/onboarding.test.ts` → FAIL.

- [ ] **Étape 2 : implémenter**

`src/features/profile/onboarding.ts` :

```ts
import type { Profile } from "./queries";

/** Onboarding steps in order; step 5 is optional but is what completes the onboarding. */
export const ONBOARDING_STEPS = ["sex", "body", "weight", "goal", "measure"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export type OnboardingProgress = { profile: Profile | null; hasWeight: boolean; hasGoal: boolean };

/** The first incomplete step; null once the onboarding is completed. */
export function nextOnboardingStep({
  profile,
  hasWeight,
  hasGoal,
}: OnboardingProgress): OnboardingStep | null {
  if (!profile) return "sex";
  if (profile.heightCm === null || profile.birthDate === null) return "body";
  if (!hasWeight) return "weight";
  if (!hasGoal) return "goal";
  return profile.onboardingCompletedAt ? null : "measure";
}
```

Run : `pnpm vitest run src/features/profile/onboarding.test.ts` → PASS.

- [ ] **Étape 3 : adapter les tests des actions** (`src/features/profile/actions.test.ts`)

`continueOnboarding` ne termine plus l'onboarding. Relire le fichier et appliquer cette règle partout :

- `saveBodyAction` « completes onboarding when weight and goal already exist (user went back) » : renommer en « goes to the first session step when weight and goal already exist » ; attendre `REDIRECT /onboarding` et `onboardingCompletedAt` `null`.
- `saveGoalStepAction` (« Juste suivre mon poids », « a loss goal starts at the weight typed at step 3 », double envoi, `userId` forgé, concurrence) : attendre `REDIRECT /onboarding` au lieu de `REDIRECT /accueil`, et `onboardingCompletedAt` `null` au lieu de `toBeInstanceOf(Date)`.
- Renommer « …and completes onboarding » en « …and moves on to the first session step ».

Ajouter, à la suite, la suite de `finishOnboardingAction` (même harnais que `saveGoalStepAction` : profil complet, pesée du 2026-10-03, `asAlice(true)`, dates simulées) :

```ts
import { finishOnboardingAction } from "./actions";

describe("finishOnboardingAction (step 5)", () => {
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
    await upsertWeight(ctx.db, "alice", {
      date: "2026-10-03",
      weightKg: 78.2,
      bodyFatPct: null,
      note: null,
    });
    await createGoal(ctx.db, "alice", {
      type: "maintain",
      startDate: "2026-10-03",
      startWeightKg: 78.2,
      targetWeightKg: null,
      weeklyRatePct: null,
    });
    await asAlice(true);
  });
  afterEach(() => vi.useRealTimers());

  it("'Plus tard' completes the onboarding and opens the Accueil", async () => {
    await expect(finishOnboardingAction(null, form({ next: "later" }))).rejects.toThrow(
      "REDIRECT /accueil",
    );
    expect((await row("alice"))?.onboardingCompletedAt).toBeInstanceOf(Date);
  });

  it("'Commencer' completes the onboarding and opens the guided session", async () => {
    await expect(finishOnboardingAction(null, form({ next: "start" }))).rejects.toThrow(
      "REDIRECT /corps/seance",
    );
    expect((await row("alice"))?.onboardingCompletedAt).toBeInstanceOf(Date);
  });

  it("treats an unknown destination as 'later'", async () => {
    await expect(finishOnboardingAction(null, form({ next: "//evil.example" }))).rejects.toThrow(
      "REDIRECT /accueil",
    );
  });

  it("does not complete the onboarding without an active goal", async () => {
    await ctx.db.delete(goal);
    await expect(finishOnboardingAction(null, form({ next: "later" }))).rejects.toThrow(
      "REDIRECT /onboarding",
    );
    expect((await row("alice"))?.onboardingCompletedAt).toBeNull();
  });

  it("does not complete the onboarding without a weighing", async () => {
    await ctx.db.delete(weightEntry);
    await expect(finishOnboardingAction(null, form({ next: "start" }))).rejects.toThrow(
      "REDIRECT /onboarding",
    );
    expect((await row("alice"))?.onboardingCompletedAt).toBeNull();
  });
});
```

(Importer `goal` et `weightEntry` depuis `@/lib/db/schema` si ce n'est pas déjà fait.) Run : `pnpm vitest run src/features/profile/actions.test.ts` → FAIL.

- [ ] **Étape 4 : implémenter dans `src/features/profile/actions.ts`**

Remplacer `continueOnboarding` :

```ts
/** Shows the next incomplete step. Only step 5 completes the onboarding (finishOnboardingAction). */
async function continueOnboarding(): Promise<never> {
  redirect("/onboarding");
}
```

et mettre à jour ses appels (`return continueOnboarding();` : plus d'arguments). Supprimer les imports devenus inutiles (`hasWeight`, `getActiveGoal`, `nextOnboardingStep` s'ils ne servent plus ailleurs dans le fichier ; `markOnboardingCompleted` reste utilisé plus bas). Ajouter :

```ts
/** Step 5 (optional): completes the onboarding, then opens the first session or the Accueil. */
export async function finishOnboardingAction(
  _: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser("onboarding");
  const db = getDb();
  const [profile, weighed, goal] = await Promise.all([
    getProfile(db, user.userId),
    hasWeight(db, user.userId),
    getActiveGoal(db, user.userId),
  ]);
  // Not forgeable: steps 1 to 4 must really exist.
  if (nextOnboardingStep({ profile, hasWeight: weighed, hasGoal: goal !== null }) !== "measure") {
    redirect("/onboarding");
  }
  await markOnboardingCompleted(db, user.userId);
  redirect(formData.get("next") === "start" ? "/corps/seance" : "/accueil");
}
```

(Conserver les imports `hasWeight`, `getActiveGoal`, `nextOnboardingStep` pour cette action.)

Run : `pnpm vitest run src/features/profile` → PASS.

- [ ] **Étape 5 : l'étape 5 à l'écran**

`src/features/profile/components/measure-step.tsx` :

```tsx
"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";
import { finishOnboardingAction } from "../actions";

/** Step 5: "Mesure-toi maintenant pour voir ta progression plus tard" (specs/01 §3.1). */
export function MeasureStep() {
  const [, action, pending] = useActionState(
    (prev: ActionResult | null, formData: FormData) => finishOnboardingAction(prev, formData),
    null,
  );
  return (
    <form action={action} className="flex flex-col gap-3">
      <p className="text-sm text-fg-2">
        Une première séance de mesure, c&apos;est ton point de départ : tu verras ensuite l&apos;écart
        zone par zone.
      </p>
      <Button type="submit" name="next" value="start" loading={pending}>
        Commencer (3 min)
      </Button>
      <Button type="submit" name="next" value="later" variant="secondary" loading={pending}>
        Plus tard
      </Button>
    </form>
  );
}
```

Dans `src/app/onboarding/page.tsx` : ajouter `measure: "Mesure-toi maintenant pour voir ta progression plus tard",` à `titles`, importer `MeasureStep` et ajouter, après le bloc `goal` :

```tsx
{step === "measure" && <MeasureStep />}
```

Le calcul `next = nextOnboardingStep(...) ?? "goal"` reste valable (un compte terminé n'arrive pas ici : `requireUser("onboarding")` le redirige).

- [ ] **Étape 6 : adapter l'E2E-1** (`tests/e2e/auth-onboarding.spec.ts`)

Après `await page.getByRole("button", { name: "Juste suivre mon poids" }).click();` insérer :

```ts
await expect(
  page.getByRole("heading", { name: "Mesure-toi maintenant pour voir ta progression plus tard" }),
).toBeVisible();
await page.getByRole("button", { name: "Plus tard" }).click();
```

avant `await expect(page).toHaveURL(/\/accueil$/);`.

- [ ] **Étape 7 : vérifier**

Run : `pnpm typecheck && pnpm lint && pnpm vitest run src/features/profile tests/integration/profile-consent.test.ts`
Attendu : PASS.

- [ ] **Étape 8 : commit**

```bash
pnpm format
git add src/features/profile src/app/onboarding tests/e2e/auth-onboarding.spec.ts
git commit -m "feat(onboarding): optional step 5 completes the onboarding"
```

---

### Tâche 11 : Accueil (bloc Mensurations, rappels) et taille de la recompo (BODY-44, BODY-42)

**Fichiers :**
- Créer : `src/features/measurements/components/measure-block.tsx`, `measure-block.test.tsx`
- Modifier : `src/features/dashboard/queries.ts`, `src/app/(app)/accueil/page.tsx`, `src/app/(app)/objectif/page.tsx`, `tests/integration/dashboard.test.ts`

**Interfaces :**
- Consomme : `MeasureBlockData`, `buildMeasureBlock`, `waistSeries`, `listMeasures`, `agoLabel`, `buildGoalSummary(…, waist)`.
- Produit :
  - `getDashboard(db, userId, today, options?: { lengthUnit: LengthUnit; reminderWeekday: number | null })` renvoie en plus `measures: MeasureBlockData` ; la taille de la recompo alimente `goal.status.waist`
  - `<MeasureBlock data />`

- [ ] **Étape 1 : tests du bloc** `src/features/measurements/components/measure-block.test.tsx`

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { MeasureBlockData, ZoneView } from "../summary";
import { MeasureBlock } from "./measure-block";

afterEach(cleanup);

const view = (zone: ZoneView["zone"], label: string, valueText: string | null, deltaText: string | null, tone: ZoneView["tone"] = "neutral"): ZoneView => ({
  zone, label, valueText, deltaText, tone, ariaLabel: label,
});
const ready = (reminder: Partial<Extract<MeasureBlockData, { state: "ready" }>["reminder"]> = {}): MeasureBlockData => ({
  state: "ready",
  zones: [
    view("waist", "Taille", "86,5 cm", "−3,5 cm", "positive"),
    view("hips", "Hanches", "100,0 cm", "−2 cm", "positive"),
    view("thigh", "Cuisse", null, null),
  ],
  reminder: { lastSessionDate: "2026-09-30", daysSince: 3, stale: false, nextLabel: null, ...reminder },
});

describe("MeasureBlock", () => {
  it("invites a never-measured account to start", () => {
    render(<MeasureBlock data={{ state: "empty" }} />);
    expect(screen.getByText("Mesure-toi une première fois")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Commencer" }).getAttribute("href")).toBe("/corps/seance");
  });

  it("shows the three zones with value and delta, and a dash for an unmeasured one", () => {
    render(<MeasureBlock data={ready()} />);
    expect(screen.getByText("Taille")).toBeTruthy();
    expect(screen.getByText("86,5 cm")).toBeTruthy();
    expect(screen.getByText("−3,5 cm").className).toContain("text-positive");
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("shows when the last session was and when the next one is due", () => {
    render(<MeasureBlock data={ready({ nextLabel: "lundi" })} />);
    expect(screen.getByText("Dernière séance il y a 3 j · Prochaine mesure : lundi")).toBeTruthy();
    expect(screen.queryByText("Il est temps de te mesurer")).toBeNull();
  });

  it("says 'aujourd'hui' on the measure day", () => {
    render(<MeasureBlock data={ready({ nextLabel: "aujourd'hui" })} />);
    expect(screen.getByText(/Prochaine mesure : aujourd'hui/)).toBeTruthy();
  });

  it("omits the next measure when no day was chosen", () => {
    render(<MeasureBlock data={ready()} />);
    expect(screen.getByText("Dernière séance il y a 3 j")).toBeTruthy();
  });

  it("nudges after more than 14 days", () => {
    render(<MeasureBlock data={ready({ daysSince: 20, stale: true })} />);
    expect(screen.getByText("Il est temps de te mesurer")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Mesurer" }).getAttribute("href")).toBe("/corps/seance");
  });
});
```

Run : `pnpm vitest run src/features/measurements/components/measure-block.test.tsx` → FAIL.

- [ ] **Étape 2 : implémenter** `src/features/measurements/components/measure-block.tsx`

```tsx
import Link from "next/link";
import { agoLabel, type MeasureBlockData } from "../summary";

const cta = "inline-flex h-11 items-center rounded-full bg-fg px-5 text-[13px] font-semibold text-white";

/** Accueil "Mensurations" block (specs/01 §3.2): formatting only, values come computed. */
export function MeasureBlock({ data }: { data: MeasureBlockData }) {
  if (data.state === "empty") {
    return (
      <section aria-labelledby="measure-title" className="mt-8">
        <h2 id="measure-title" className="text-[15px] font-semibold tracking-tight">
          Mensurations
        </h2>
        <p className="mt-2 text-sm text-fg-2">Mesure-toi une première fois</p>
        <Link href="/corps/seance" className={`mt-4 ${cta}`}>
          Commencer
        </Link>
      </section>
    );
  }

  const { zones, reminder } = data;
  const last = `Dernière séance ${agoLabel(reminder.daysSince as number)}`;
  return (
    <section aria-labelledby="measure-title" className="mt-8 flex flex-col gap-3">
      <h2 id="measure-title" className="text-xs font-medium text-fg-2">
        Mensurations
      </h2>
      <ul className="flex flex-col divide-y divide-line">
        {zones.map((z) => (
          <li key={z.zone} className="flex items-baseline justify-between gap-3 py-2.5">
            <span className="text-sm text-fg-2">{z.label}</span>
            <span className="text-[15px] font-semibold tabular-nums">{z.valueText ?? "—"}</span>
            <span
              className={`min-w-16 text-right text-sm tabular-nums ${z.tone === "positive" ? "text-positive" : "text-muted"}`}
            >
              {z.deltaText}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-sm text-fg-2">
        {reminder.nextLabel ? `${last} · Prochaine mesure : ${reminder.nextLabel}` : last}
      </p>
      {reminder.stale && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-surface p-3">
          <p className="text-sm font-medium">Il est temps de te mesurer</p>
          <Link href="/corps/seance" className={cta}>
            Mesurer
          </Link>
        </div>
      )}
    </section>
  );
}
```

Run : `pnpm vitest run src/features/measurements/components/measure-block.test.tsx` → PASS.

Remarque : `agoLabel(0)` donne « aujourd'hui », donc « Dernière séance aujourd'hui » (au lieu de « il y a 0 j »).

- [ ] **Étape 3 : tests d'intégration du tableau de bord** (à la suite de `tests/integration/dashboard.test.ts`)

```ts
import { upsertMeasure } from "@/features/measurements/queries";

describe("getDashboard · measurements (L4)", () => {
  let db: Db;
  let close: () => Promise<void>;

  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    await insertTestUser(db, "alice");
    await insertTestUser(db, "bob");
  });
  afterEach(() => close());

  const measure = (userId: string, date: string, zone: "waist" | "hips", valueCm: number) =>
    upsertMeasure(db, userId, { date, zone, valueCm });

  it("is an empty block for an account that never measured", async () => {
    expect((await getDashboard(db, "alice", "2026-10-03")).measures).toEqual({ state: "empty" });
  });

  it("shows the caller's measures only", async () => {
    await measure("alice", "2026-10-01", "waist", 86.5);
    await measure("bob", "2026-10-02", "waist", 120);
    const alice = (await getDashboard(db, "alice", "2026-10-03")).measures;
    expect(alice.state === "ready" && alice.reminder.lastSessionDate).toBe("2026-10-01");
    expect((await getDashboard(db, "bob", "2026-10-03")).measures).toMatchObject({ state: "ready" });
  });

  it("applies the profile's unit and measure day", async () => {
    await measure("alice", "2026-10-01", "waist", 86.5);
    const { measures } = await getDashboard(db, "alice", "2026-10-03", {
      lengthUnit: "in",
      reminderWeekday: 0,
    });
    expect(measures.state === "ready" && measures.zones[0].valueText).toMatch(/^34,1.in$/);
    expect(measures.state === "ready" && measures.reminder.nextLabel).toBe("lundi");
  });

  it("feeds the waist indicator of a recomposition goal", async () => {
    await createGoal(db, "alice", {
      type: "recomp",
      startDate: "2026-09-01",
      startWeightKg: 80,
      targetWeightKg: null,
      weeklyRatePct: null,
    });
    expect((await getDashboard(db, "alice", "2026-10-03")).goal).toMatchObject({
      status: { waist: "waist_insufficient" },
    });
    await measure("alice", "2026-09-01", "waist", 94);
    await measure("alice", "2026-09-30", "waist", 92);
    expect((await getDashboard(db, "alice", "2026-10-03")).goal).toMatchObject({
      status: { waist: "waist_improving" },
    });
  });

  it("does not use another user's waist for the indicator", async () => {
    await createGoal(db, "alice", {
      type: "recomp",
      startDate: "2026-09-01",
      startWeightKg: 80,
      targetWeightKg: null,
      weeklyRatePct: null,
    });
    await measure("bob", "2026-09-01", "waist", 94);
    await measure("bob", "2026-09-30", "waist", 92);
    expect((await getDashboard(db, "alice", "2026-10-03")).goal).toMatchObject({
      status: { waist: "waist_insufficient" },
    });
  });
});
```

Run : `pnpm vitest run tests/integration/dashboard.test.ts` → FAIL.

- [ ] **Étape 4 : implémenter** `src/features/dashboard/queries.ts`

```ts
import { getActiveGoal } from "@/features/goals/queries";
import { buildGoalSummary, type GoalSummary } from "@/features/goals/summary";
import { listMeasures } from "@/features/measurements/queries";
import {
  buildMeasureBlock,
  waistSeries,
  type MeasureBlockData,
} from "@/features/measurements/summary";
import { listWeights } from "@/features/weight/queries";
import type { LocalDate } from "@/lib/dates";
import type { Db } from "@/lib/db/types";
import type { LengthUnit } from "@/lib/units";
import { paceTone } from "./pace-tone";
import { buildWeightSummary, type WeightSummary } from "./weight-summary";

/** Accueil data, computed server-side. */
export type Dashboard = {
  weight: WeightSummary;
  goal: GoalSummary;
  measures: MeasureBlockData;
  rateTone: "positive" | "neutral";
};

export type DashboardOptions = { lengthUnit: LengthUnit; reminderWeekday: number | null };

export async function getDashboard(
  db: Db,
  userId: string,
  todayDate: LocalDate,
  options: DashboardOptions = { lengthUnit: "cm", reminderWeekday: null },
): Promise<Dashboard> {
  const [points, active, measureRows] = await Promise.all([
    listWeights(db, userId),
    getActiveGoal(db, userId),
    listMeasures(db, userId),
  ]);
  const weight = buildWeightSummary(points, todayDate);
  const goal = buildGoalSummary(active, points, todayDate, waistSeries(measureRows));
  const measures = buildMeasureBlock({
    measures: measureRows,
    goal: active?.type ?? null,
    unit: options.lengthUnit,
    today: todayDate,
    reminderWeekday: options.reminderWeekday,
  });
  return { weight, goal, measures, rateTone: paceTone(goal, weight) };
}
```

Run : `pnpm vitest run tests/integration/dashboard.test.ts` → PASS.

- [ ] **Étape 5 : brancher les pages**

`src/app/(app)/accueil/page.tsx` : remplacer l'appel et ajouter le bloc.

```tsx
import { MeasureBlock } from "@/features/measurements/components/measure-block";
// …
const { weight, goal, measures, rateTone } = await getDashboard(getDb(), userId, todayDate, {
  lengthUnit: profile?.lengthUnit ?? "cm",
  reminderWeekday: profile?.reminderWeekday ?? null,
});
// …
<WeightBlock summary={weight} unit={unit} rateTone={rateTone} />
<GoalBlock summary={goal} unit={unit} today={todayDate} />
<MeasureBlock data={measures} />
```

`src/app/(app)/objectif/page.tsx` : charger les mesures et passer la taille.

```tsx
import { listMeasures } from "@/features/measurements/queries";
import { waistSeries } from "@/features/measurements/summary";
// …
const [points, active, past, measureRows] = await Promise.all([
  listWeights(db, userId),
  getActiveGoal(db, userId),
  listPastGoals(db, userId),
  listMeasures(db, userId),
]);
// …
const summary = buildGoalSummary(active, points, todayDate, waistSeries(measureRows));
```

Dans `src/features/goals/actions.ts:127`, `goalStatus(active, points, todayDate)` n'a pas besoin de la taille (seul un objectif de perte ou de prise peut être « atteint ») : ne pas le modifier.

- [ ] **Étape 6 : vérifier**

Run : `pnpm typecheck && pnpm lint && pnpm test`
Attendu : PASS. Le test `dashboard.test.tsx` et ceux des pages ne dépendent pas de la forme de `Dashboard` ; si un test construit un `Dashboard` à la main, y ajouter `measures: { state: "empty" }`.

- [ ] **Étape 7 : commit**

```bash
pnpm format
git add src/features/dashboard src/features/measurements/components/measure-block.tsx src/features/measurements/components/measure-block.test.tsx src/app tests/integration/dashboard.test.ts
git commit -m "feat(dashboard): measurements block, reminders and recomposition waist indicator"
```

---

### Tâche 12 : données de démonstration et E2E-3 / E2E-4

**Fichiers :**
- Modifier : `src/lib/db/seed-data.ts`, `src/lib/db/seed-data.test.ts`, `src/lib/db/seed.ts`
- Créer : `tests/e2e/measure.spec.ts`

**Interfaces :**
- Consomme : `ZONES`, `Zone` (`lib/metrics`), `upsertMeasure`, `addDays`, `round1`.
- Produit : `demoMeasurements(todayDate): DemoSession[]` avec `DemoSession = { date: LocalDate; values: Record<Zone, number> }`

- [ ] **Étape 1 : tests du seed** (à la suite de `src/lib/db/seed-data.test.ts`)

```ts
import { ZONES } from "@/lib/metrics";
import { demoMeasurements } from "./seed-data";

describe("demoMeasurements", () => {
  const sessions = demoMeasurements("2026-10-03");

  it("builds ten sessions of eight zones, none dated today", () => {
    expect(sessions).toHaveLength(10);
    for (const s of sessions) {
      expect(s.date < "2026-10-03").toBe(true);
      expect(Object.keys(s.values).sort()).toEqual([...ZONES].sort());
    }
  });

  it("stays within the stored bounds and is identical on every run", () => {
    for (const s of sessions) for (const v of Object.values(s.values)) expect(v).toBeGreaterThanOrEqual(10);
    for (const s of sessions) for (const v of Object.values(s.values)) expect(v).toBeLessThanOrEqual(250);
    expect(demoMeasurements("2026-10-03")).toEqual(sessions);
  });

  it("is chronological, with the waist going down (the demo goal is a loss)", () => {
    const dates = sessions.map((s) => s.date);
    expect([...dates].sort()).toEqual(dates);
    expect(sessions.at(-1)?.values.waist).toBeLessThan(sessions[0].values.waist);
  });

  it("keeps the last session within 14 days, so the demo is not 'stale'", () => {
    expect(sessions.at(-1)?.date).toBe("2026-10-01");
  });
});
```

Run : `pnpm vitest run src/lib/db/seed-data.test.ts` → FAIL.

- [ ] **Étape 2 : implémenter** (à la suite de `src/lib/db/seed-data.ts`)

```ts
import { ZONES, type Zone } from "@/lib/metrics";
import { round1 } from "@/lib/units";

const ZONE_BASE_CM: Record<Zone, number> = {
  neck: 39,
  shoulders: 118,
  chest: 102,
  arm: 35,
  waist: 94,
  hips: 103,
  thigh: 59,
  calf: 38,
};
/** Change per 28 days: the waist and hips go down, like the loss goal. */
const ZONE_MONTHLY_CM: Record<Zone, number> = {
  neck: -0.1,
  shoulders: 0,
  chest: -0.2,
  arm: 0.1,
  waist: -1.5,
  hips: -0.8,
  thigh: -0.3,
  calf: 0,
};
/** Days before today: ten sessions over 12 weeks, the last two days ago. */
const SESSION_OFFSETS = [84, 70, 56, 49, 42, 35, 28, 14, 7, 2];

export type DemoSession = { date: LocalDate; values: Record<Zone, number> };

/** Ten sessions of eight zones (specs/04 §6). Deterministic, never dated today (E2E-3 creates today's). */
export function demoMeasurements(todayDate: LocalDate): DemoSession[] {
  return SESSION_OFFSETS.map((offset) => ({
    date: addDays(todayDate, -offset),
    values: Object.fromEntries(
      ZONES.map((zone) => [
        zone,
        round1(ZONE_BASE_CM[zone] + ZONE_MONTHLY_CM[zone] * ((84 - offset) / 28)),
      ]),
    ) as Record<Zone, number>,
  }));
}
```

(Fusionner les imports en tête de fichier plutôt que d'en ajouter au milieu.) Run : `pnpm vitest run src/lib/db/seed-data.test.ts` → PASS.

- [ ] **Étape 3 : brancher le seed** (`src/lib/db/seed.ts`)

Mettre à jour le commentaire d'en-tête (« L3 adds a loss goal, L4 the measurement sessions » → « L3 adds a loss goal, L4 ten measurement sessions »), importer `upsertMeasure` et `ZONES`, et après la création de l'objectif :

```ts
for (const session of demoMeasurements(today("Europe/Paris"))) {
  for (const zone of ZONES) {
    await upsertMeasure(db, demo.id, { date: session.date, zone, valueCm: session.values[zone] });
  }
}
```

Run : `pnpm db:seed` (base de développement) → `Seeded demo@my-body.test`.

- [ ] **Étape 4 : écrire les E2E** `tests/e2e/measure.spec.ts`

```ts
import { expect, test, type Page } from "@playwright/test";

const DEMO_EMAIL = "demo@my-body.test";

async function signIn(page: Page) {
  const password = process.env.SEED_DEMO_PASSWORD;
  test.skip(!password, "SEED_DEMO_PASSWORD is not set: run pnpm db:seed first");
  await page.goto("/connexion");
  await page.getByLabel("Email").fill(DEMO_EMAIL);
  await page.getByLabel("Mot de passe").fill(password as string);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/accueil$/);
}

test("E2E-3: guided session, 3 zones typed, 1 skipped, quit, resume → the silhouette shows the values", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "E2E-3 runs on mobile only (specs/09 §4)");
  await signIn(page);

  await page.goto("/corps/seance");
  // A re-run the same day resumes mid-session: go back to the first zone.
  const first = page.getByText("1 / 8", { exact: true });
  while (!(await first.isVisible())) {
    await page.getByRole("button", { name: /Zone précédente/ }).click();
  }

  await expect(page.getByRole("heading", { name: "Cou" })).toBeVisible();
  await page.getByLabel("Mesure").fill("38,2");
  await page.getByRole("button", { name: /Zone suivante/ }).click();

  await expect(page.getByRole("heading", { name: "Épaules" })).toBeVisible();
  await page.getByRole("button", { name: "Passer cette zone" }).click();

  await expect(page.getByRole("heading", { name: "Poitrine" })).toBeVisible();
  await page.getByLabel("Mesure").fill("101,4");
  await page.getByRole("button", { name: /Zone suivante/ }).click();

  // Abandon on the 4th zone: what was saved stays.
  await expect(page.getByRole("heading", { name: "Bras" })).toBeVisible();
  await page.getByRole("link", { name: /Quitter/ }).click();
  await expect(page).toHaveURL(/\/corps$/);

  await expect(page.getByRole("button", { name: /^Cou : 38,2/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Poitrine : 101,4/ })).toBeVisible();

  // Resume: starts at the first zone without a value today (Épaules), values are kept.
  await page.getByRole("link", { name: "Nouvelle séance de mesure" }).click();
  await expect(page.getByText("2 / 8", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Épaules" })).toBeVisible();
  await page.getByRole("button", { name: /Zone précédente/ }).click();
  await expect(page.getByLabel("Mesure")).toHaveValue("38,2");
});

test("E2E-4: touching the waist on the silhouette opens the input, then the delta is updated", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/corps");

  await page.getByRole("button", { name: /^Taille/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Comment mesurer")).toBeVisible();
  await page.getByLabel("Mesure").fill("80,0");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  // A re-run the same day asks before replacing today's value.
  const confirm = page.getByRole("button", { name: "Confirmer" });
  if (await confirm.isVisible({ timeout: 1500 }).catch(() => false)) await confirm.click();

  await expect(page.getByText("Mesure enregistrée")).toBeVisible();
  const waist = page.getByRole("button", { name: /^Taille : 80,0.cm/ });
  await expect(waist).toBeVisible();
  // The seeded waist was ~91 cm a month ago: a clear decrease, favourable for the loss goal.
  await expect(waist).toHaveAccessibleName(/moins \d+,\d.cm sur 30 jours/);
});
```

- [ ] **Étape 5 : lancer les E2E**

Run : `pnpm db:seed && pnpm test:e2e tests/e2e/measure.spec.ts` (le script `test:e2e` existe déjà ; sinon `pnpm playwright test tests/e2e/measure.spec.ts`)
Attendu : E2E-3 (mobile) et E2E-4 (mobile et desktop) passent. Relancer une seconde fois sans re-seed : doivent encore passer (reprise du même jour).

- [ ] **Étape 6 : commit**

```bash
pnpm format
git add src/lib/db tests/e2e/measure.spec.ts
git commit -m "test(measurements): demo sessions, E2E-3 and E2E-4"
```

---

### Tâche 13 : spec, vérification finale, PR et Jira

**Fichiers :**
- Modifier : `specs/` (voir ci-dessous)

- [ ] **Étape 1 : reporter les écarts dans la spec (v1.5)**

- `specs/01-parcours-et-ecrans.md` §3.1 (étape 5) : « Commencer » termine l'onboarding puis ouvre la séance guidée ; « Plus tard » termine l'onboarding. §3.5 : écran d'introduction affiché tant qu'aucune mesure n'existe ; reprise à la première zone sans valeur du jour ; « Zone suivante » enregistre la valeur affichée.
- `specs/02-exigences-fonctionnelles.md` : EF-ONB-01 CA4 (« Commencer » et « Plus tard » terminent l'onboarding) ; EF-MEA-02 (CA4 précisé : la valeur affichée est enregistrée, vider le champ = passer) ; EF-BODY-01 CA5 (étiquette complète, formulation `Taille : 84,5 cm, moins 3,5 cm sur 30 jours`).
- `specs/05-architecture-technique.md` : arbre des routes (`(session)/corps/seance`), `features/measurements` (fichiers réels), `continueOnboarding` ne termine plus l'onboarding.
- `specs/06-design-system.md` §5.2 : zone de toucher = boutons HTML superposés, `BAND` (largeurs de la barre de surbrillance).
- `specs/03-regles-metier-et-calculs.md` §5.3 : l'indicateur de taille est branché (L4).
- `specs/10-planning-et-jalons.md` : L4 terminé quand E2E-3 et E2E-4 passent ; EF-MEA-04 reste en L5.
- En-tête de version et journal des changements : v1.5 (L4).

- [ ] **Étape 2 : vérification complète**

Run : `pnpm lint && pnpm typecheck && pnpm test --coverage && pnpm build`
Attendu : tout passe ; seuils de couverture respectés sur `src/lib/metrics/**` (dont `deltas.ts`) et `src/lib/units.ts`.

Run : `pnpm db:seed && pnpm test:e2e`
Attendu : E2E-1 à E2E-5 et E2E-9 verts avec les nouveaux E2E-3 et E2E-4.

- [ ] **Étape 3 : rendu et logs**

Vérifier à 390 px et 1440 px : `/corps` (huit points, étiquettes lisibles, période), `/corps/seance` (barre de surbrillance alignée sur le corps, homme et femme), Accueil (bloc Mensurations, état vide avec un compte neuf, message « Il est temps de te mesurer »). Vérifier qu'aucune donnée de santé n'apparaît dans les logs du serveur de développement pendant ces parcours.

- [ ] **Étape 4 : relecture par l'agent `reviewer`** sur le diff `main...feat/l4-mensurations` (règles métier, isolation, RGPD, tests, frontières d'architecture). Corriger ce qui est bloquant avant la PR.

- [ ] **Étape 5 : PR**

```bash
git push -u origin feat/l4-mensurations
gh pr create --base main --title "feat: lot L4 mensurations et silhouette" --body "<résumé, écarts assumés du plan, tickets BODY-37 à BODY-44>"
```

Puis, après relecture et fusion, passer l'epic BODY-5 et les tickets BODY-37 à BODY-44 à « Terminé » avec l'agent `jira-updater`.
