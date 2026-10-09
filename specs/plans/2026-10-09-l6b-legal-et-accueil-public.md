# Lot L6b (Pages légales et accueil public) : plan d'implémentation

> **Pour les agents :** sous-skill requis : utiliser `superpowers:subagent-driven-development` (recommandé) ou `superpowers:executing-plans`. Les étapes utilisent des cases à cocher (`- [ ]`). Agent d'exécution conseillé : `implementer` ; relecture : `reviewer`. Toutes les tâches sauf la dernière touchent à l'UI : l'agent invoque `web-design-guidelines` (les sous-agents n'ont pas `WebFetch` : les règles récupérées sont recopiées dans le brief de l'agent par le contrôleur).

**Objectif :** publier les trois pages légales (Mentions légales, CGU, Politique de confidentialité) avec un texte de travail complet rédigé d'après la spec 07, un pied de page public lié aux pages légales, et la page d'accueil publique `/` (trois piliers, aperçu de l'app avec des données fictives, boutons « Commencer gratuitement » et « Se connecter »), qui redirige vers `/accueil` si l'on est connecté. Dernier lot fonctionnel avant L7.

**Architecture :** le texte légal est de la **donnée typée** (`features/legal/content/*.ts` : sections de paragraphes et de listes) rendue par un composant unique `LegalPage` ; les trois routes existantes deviennent des coquilles de trois lignes. Les informations d'identité de l'éditeur (nom, statut, email de contact) vivent dans **un seul fichier** (`features/legal/identity.ts`) avec des valeurs `[À renseigner : …]` bien visibles : elles ne peuvent pas être inventées. La page `/` est un composant serveur qui teste la session (`getAuth().api.getSession`) et affiche un aperçu construit avec les vrais composants `Sparkline` et `Silhouette` alimentés par des **données fictives** déterministes (`features/landing/preview-data.ts`), sans image à maintenir.

**Stack :** Next.js 16.3, React 19.2, Tailwind, Vitest + Testing Library, Playwright. **Aucune dépendance ajoutée, aucune migration.**

**Spec :** `00` §2 (trois piliers), `01` §2 (route `/`), `02` EF-LEGAL-01, EF-LEGAL-02, EF-PUB-01 ; `06` (direction « Clarté », §7 ton) ; `07` §1 à §4 et §9 (matière des textes légaux) ; `08` ENF-14 ; `10` L6.

**Tickets Jira :** epic BODY-7 (= L6) ; sous-tickets à lire dans Jira avant de démarrer (non récupérés ici).

**Branche :** `feature/l6b-legal-accueil`, créée depuis `main` (indépendante de la PR L6a : aucun fichier commun).

## Contraintes globales

- Celles des plans L0 à L6a : TypeScript strict sans `any`, UI en français (tutoiement, phrases courtes, bienveillance factuelle), code en anglais, `pnpm format` avant commit, **aucune donnée de santé dans les logs**, zones de toucher ≥ 44 px (ENF-14), focus visible (ENF-11), aucun rouge sur les données, `app/*` sans requête Drizzle.
- Les pages légales sont **publiques** : accessibles sans connexion, jamais redirigées vers `/connexion` (elles sont liées depuis l'inscription).
- L'avertissement non médical des CGU est **la même constante** que celle de l'écran Objectif : `GOAL_DISCLAIMER` (`src/features/goals/copy.ts`) : « my-body ne fournit pas de conseil médical. Consulte un professionnel de santé avant de débuter un régime. » (EF-LEGAL-02).
- La page `/` ne collecte rien : pas de cookie, pas de mesure d'audience ajoutée, pas de police ni de script externes.
- Boutons de la page `/` : exactement un lien « Commencer gratuitement » (`/inscription`) et un lien « Se connecter » (`/connexion`) (EF-PUB-01, `tests/e2e/smoke.spec.ts` les interroge par rôle).
- Les chiffres de l'aperçu suivent le format `fr-FR` du projet (`formatWeight`, `formatWeeklyRate` de `@/lib/units`) et sont **clairement présentés comme fictifs**.
- Tous les textes légaux portent le bandeau « Version provisoire, en cours de validation juridique » (spec 07 : points **[À valider juridiquement]**).

## Écarts assumés / questions à trancher avant d'implémenter

1. **Identité de l'éditeur** : nom ou raison sociale, statut (particulier ou société), email de contact (spec 07 §3 : « adresse email dédiée »). Ces informations ne sont dans aucun fichier du dépôt. Proposition : `identity.ts` avec des valeurs `[À renseigner : …]` visibles sur le site ; **le propriétaire du projet les remplace avant le lancement** (point ajouté à la checklist de lancement, tâche 4). Aucune valeur n'est inventée.
2. **Texte légal = brouillon de travail**, pas un avis juridique : il reprend les faits de la spec 07 (données, finalités, sous-traitants, durées, droits, âge minimum 16 ans) et reste signalé « à valider juridiquement ». Les points ouverts de la spec 07 (HDS, AIPD, recours à Vercel) ne sont **pas** tranchés par ce texte.
3. **Version de consentement** : `CONSENT_VERSION` (`features/consent/queries.ts`) n'est **pas** modifiée par ce lot. Elle ne doit l'être que lorsque le texte légal définitif change le fond du consentement (relecture juridique, L7).
4. **Pied de page public** : présent sur `/`, sur les trois pages légales et sur les écrans d'authentification (connexion, inscription, mot de passe oublié, réinitialisation). Pas sur l'app connectée (les Réglages ont déjà la section « Légal », livrée en L6a).
5. **Titre de la page `/`** : le `<h1>` devient l'accroche (« Comprends ce que ton poids veut dire. ») ; la marque « my-body » reste le lien de l'en-tête. `tests/e2e/smoke.spec.ts` est mis à jour en conséquence (tâche 3).
6. **`/` devient dynamique** (lecture des en-têtes pour la session). Si la recherche de session échoue (base indisponible), la page publique s'affiche quand même au lieu d'une erreur 500.
7. **Hors lot** : relecture et validation juridique du texte, domaine et email expéditeur, mesure d'audience (ENF-60, S), vraie capture d'écran, Lighthouse (L7).

## Review Focus

1. **Visiteur non connecté sur une page légale** : aucune redirection, titre, bandeau « provisoire » et pied de page présents, y compris sur mobile (390 px) sans défilement horizontal. Tests : `legal-page.test.tsx` (tâche 1), `legal.spec.ts` (tâche 2).
2. **Avertissement non médical** : le texte des CGU contient exactement `GOAL_DISCLAIMER`, donc ne peut pas diverger de l'écran Objectif. Test : `content.test.ts` (tâche 2).
3. **Contenu complet de la politique de confidentialité** : chaque sous-traitant de la spec 07 §4 (Neon, Vercel, Resend, Google), la fenêtre de sauvegarde de 7 jours, l'âge minimum de 16 ans, les droits (export, suppression), le contact, la CNIL, le cookie de session unique. Test : `content.test.ts` (tâche 2).
4. **Connecté sur `/`** : redirigé vers `/accueil` ; déconnecté : page publique ; recherche de session en échec : page publique, jamais d'erreur. Tests : `page.test.tsx` (tâche 3), `landing.spec.ts` (tâche 3).
5. **Aperçu fictif honnête** : la légende « données fictives » est présente et l'aperçu n'expose aucune donnée réelle (valeurs fixes, indépendantes de la date du jour et de l'utilisateur). Tests : `preview-data.test.ts`, `landing-preview.test.tsx` (tâche 3).
6. **Aucun défilement horizontal à 390 px** sur `/` et sur une page légale (tableaux/listes longues, SVG de la silhouette). Test : `landing.spec.ts`, `legal.spec.ts`.
7. **Une seule occurrence** de chaque bouton principal (le test smoke utilise le rôle `link` : deux « Commencer gratuitement » casseraient le mode strict de Playwright). Test : `landing.spec.ts`.

## Structure des fichiers

```
src/features/legal/
  types.ts                  LegalBlock, LegalSection, LegalDocument
  identity.ts               LEGAL_IDENTITY (à renseigner), LEGAL_UPDATED_ON
  content/
    notice.ts               NOTICE (mentions légales)
    terms.ts                TERMS (CGU)
    privacy.ts              PRIVACY (politique de confidentialité)
    content.test.ts
  components/
    legal-page.tsx          LegalPage ({ document, updatedOn })
    site-footer.tsx         SiteFooter (liens légaux)
    legal-page.test.tsx
src/features/landing/
  preview-data.ts           PREVIEW_SPARKLINE, PREVIEW_ZONES, PREVIEW_TREND_KG, PREVIEW_RATE_KG   (+ preview-data.test.ts)
  components/
    landing-preview.tsx     aperçu (figure) : poids, tendance, silhouette
    pillars.tsx             trois piliers
    landing-preview.test.tsx
src/app/page.tsx            accueil public (+ page.test.tsx)
src/app/mentions-legales/page.tsx, src/app/cgu/page.tsx, src/app/confidentialite/page.tsx
src/app/(auth)/layout.tsx   + SiteFooter
tests/e2e/legal.spec.ts, tests/e2e/landing.spec.ts, tests/e2e/smoke.spec.ts (mis à jour)
```

---

### Tâche 1 : socle légal (types, identité, `LegalPage`, `SiteFooter`)

**Fichiers :**
- Créer : `src/features/legal/types.ts`, `src/features/legal/identity.ts`, `src/features/legal/components/legal-page.tsx`, `src/features/legal/components/site-footer.tsx`, `src/features/legal/components/legal-page.test.tsx`

**Interfaces :**
- Produit :
  - `type LegalBlock = string | { list: readonly string[] }`
  - `type LegalSection = { id: string; heading: string; blocks: readonly LegalBlock[] }`
  - `type LegalDocument = { title: string; sections: readonly LegalSection[] }`
  - `LEGAL_IDENTITY: { publisher; status; contactEmail; host; database }` (chaînes), `LEGAL_UPDATED_ON: "2026-10-09"`
  - `LegalPage({ document, updatedOn }: { document: LegalDocument; updatedOn: string })`, `SiteFooter()` (liens : `/mentions-legales` « Mentions légales », `/cgu` « CGU », `/confidentialite` « Confidentialité »).

- [ ] **Étape 1 : écrire les tests (qui échouent)**

Créer `src/features/legal/components/legal-page.test.tsx` :

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { LegalDocument } from "../types";
import { LegalPage } from "./legal-page";
import { SiteFooter } from "./site-footer";

afterEach(cleanup);

const DOC: LegalDocument = {
  title: "Titre de test",
  sections: [
    { id: "un", heading: "Première partie", blocks: ["Un paragraphe.", { list: ["a", "b"] }] },
    { id: "deux", heading: "Seconde partie", blocks: ["Autre paragraphe."] },
  ],
};

describe("LegalPage", () => {
  it("renders the title, the provisional notice with a long French date, and the sections", () => {
    render(<LegalPage document={DOC} updatedOn="2026-10-09" />);

    expect(screen.getByRole("heading", { level: 1, name: "Titre de test" })).toBeTruthy();
    const note = screen.getByRole("note");
    expect(note.textContent).toContain("Version provisoire");
    expect(note.textContent).toContain("validation juridique");
    expect(note.textContent).toContain("9 octobre 2026");
    expect(screen.getByRole("heading", { level: 2, name: "Première partie" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Seconde partie" })).toBeTruthy();
    expect(screen.getByText("Un paragraphe.")).toBeTruthy();
  });

  it("renders list blocks as lists", () => {
    render(<LegalPage document={DOC} updatedOn="2026-10-09" />);
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items.map((i) => i.textContent)).toEqual(["a", "b"]);
  });

  it("links every section heading to its id and ends with the public footer", () => {
    const { container } = render(<LegalPage document={DOC} updatedOn="2026-10-09" />);
    expect(container.querySelector("#un")).toBeTruthy();
    expect(container.querySelector("#deux")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Mentions légales" })).toBeTruthy();
  });
});

describe("SiteFooter", () => {
  it("links the three legal pages", () => {
    render(<SiteFooter />);
    const nav = screen.getByRole("navigation", { name: "Pages légales" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((l) => [l.textContent, l.getAttribute("href")])).toEqual([
      ["Mentions légales", "/mentions-legales"],
      ["CGU", "/cgu"],
      ["Confidentialité", "/confidentialite"],
    ]);
  });
});
```

- [ ] **Étape 2 : lancer, constater l'échec**

Run: `pnpm test src/features/legal/components/legal-page.test.tsx`
Attendu : FAIL (modules introuvables).

- [ ] **Étape 3 : implémenter**

Créer `src/features/legal/types.ts` :

```ts
/** A paragraph, or a bulleted list. */
export type LegalBlock = string | { list: readonly string[] };
export type LegalSection = { id: string; heading: string; blocks: readonly LegalBlock[] };
export type LegalDocument = { title: string; sections: readonly LegalSection[] };
```

Créer `src/features/legal/identity.ts` :

```ts
/**
 * Facts about the publisher that only the project owner can supply (specs/07 §3).
 * Replace every "[À renseigner : …]" before the public launch (specs/10 launch checklist).
 */
export const LEGAL_IDENTITY = {
  publisher: "[À renseigner : nom de l'éditeur]",
  status: "[À renseigner : statut, particulier ou société]",
  contactEmail: "[À renseigner : email de contact]",
  host: "Vercel Inc. (États-Unis, vercel.com)",
  database: "Neon (région UE, Francfort)",
} as const;

/** ISO date of the last edit of the legal texts: shown on every legal page. */
export const LEGAL_UPDATED_ON = "2026-10-09";
```

Créer `src/features/legal/components/site-footer.tsx` :

```tsx
import Link from "next/link";

const LINKS = [
  ["/mentions-legales", "Mentions légales"],
  ["/cgu", "CGU"],
  ["/confidentialite", "Confidentialité"],
] as const;

/** Public footer: the three legal pages (EF-LEGAL-01). Tap targets are 44 px high (ENF-14). */
export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line pt-4 text-xs text-fg-2">
      <nav aria-label="Pages légales" className="flex flex-wrap gap-x-5">
        {LINKS.map(([href, label]) => (
          <Link key={href} href={href} className="inline-flex min-h-11 items-center underline">
            {label}
          </Link>
        ))}
      </nav>
      <p className="mt-1">© my-body</p>
    </footer>
  );
}
```

Créer `src/features/legal/components/legal-page.tsx` :

```tsx
import Link from "next/link";
import type { LegalBlock, LegalDocument } from "../types";
import { SiteFooter } from "./site-footer";

const longDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === "string") return <p className="text-sm leading-relaxed text-fg-2">{block}</p>;
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-fg-2">
      {block.list.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/** Public legal page: no session needed (EF-LEGAL-01). */
export function LegalPage({ document, updatedOn }: { document: LegalDocument; updatedOn: string }) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/" className="inline-flex min-h-11 items-center text-[17px] font-bold tracking-tight">
        <span aria-hidden className="mr-2 inline-block size-2.5 rounded-full bg-fg" />
        my-body
      </Link>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">{document.title}</h1>
      <p role="note" className="mt-4 rounded-xl bg-surface px-4 py-3 text-sm text-fg-2">
        Version provisoire, en cours de validation juridique. Dernière mise à jour :{" "}
        {longDate.format(new Date(updatedOn))}.
      </p>
      {document.sections.map((section) => (
        <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="mt-8 flex flex-col gap-3">
          <h2 id={`${section.id}-title`} className="text-[15px] font-semibold tracking-tight">
            {section.heading}
          </h2>
          {section.blocks.map((block, index) => (
            <Block key={index} block={block} />
          ))}
        </section>
      ))}
      <SiteFooter />
    </main>
  );
}
```

- [ ] **Étape 4 : lancer, constater le succès**

Run: `pnpm test src/features/legal/components/legal-page.test.tsx && pnpm typecheck && pnpm lint`
Attendu : PASS. Ajuster uniquement la mise en forme exigée par Prettier/ESLint.

- [ ] **Étape 5 : revue design**

Invoquer `web-design-guidelines` sur `legal-page.tsx` et `site-footer.tsx` (le contrôleur fournit les règles dans le brief), corriger. Vérifier en 390 px et 1440 px quand une session de dev est disponible.

- [ ] **Étape 6 : commit**

```bash
pnpm format
git add src/features/legal
git commit -m "feat(legal): add the legal page layout and the public footer"
```

---

### Tâche 2 : textes légaux et pages

**Fichiers :**
- Créer : `src/features/legal/content/notice.ts`, `terms.ts`, `privacy.ts`, `content.test.ts`, `tests/e2e/legal.spec.ts`
- Modifier : `src/app/mentions-legales/page.tsx`, `src/app/cgu/page.tsx`, `src/app/confidentialite/page.tsx`, `src/app/(auth)/layout.tsx`

**Interfaces :**
- Consomme : `LegalDocument` (tâche 1), `LEGAL_IDENTITY`, `LEGAL_UPDATED_ON`, `LegalPage`, `SiteFooter`, `GOAL_DISCLAIMER` (`@/features/goals/copy`).
- Produit : `NOTICE`, `TERMS`, `PRIVACY` (tous `LegalDocument`).

- [ ] **Étape 1 : écrire les tests de contenu (qui échouent)**

Créer `src/features/legal/content/content.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { GOAL_DISCLAIMER } from "@/features/goals/copy";
import type { LegalBlock, LegalDocument } from "../types";
import { NOTICE } from "./notice";
import { PRIVACY } from "./privacy";
import { TERMS } from "./terms";

const text = (doc: LegalDocument) =>
  doc.sections
    .flatMap((s) => [s.heading, ...s.blocks.flatMap((b: LegalBlock) => (typeof b === "string" ? [b] : b.list))])
    .join("\n");

describe.each([
  ["notice", NOTICE, "Mentions légales"],
  ["terms", TERMS, "Conditions générales d'utilisation"],
  ["privacy", PRIVACY, "Politique de confidentialité"],
])("%s", (_, doc, title) => {
  it("has the expected title and well-formed sections", () => {
    expect(doc.title).toBe(title);
    const ids = doc.sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of doc.sections) {
      expect(s.id).toMatch(/^[a-z-]+$/);
      expect(s.heading.length).toBeGreaterThan(0);
      expect(s.blocks.length).toBeGreaterThan(0);
    }
  });
});

describe("terms (EF-LEGAL-02)", () => {
  it("contains the exact non-medical disclaimer shown on the Objectif screen", () => {
    expect(text(TERMS)).toContain(GOAL_DISCLAIMER);
  });

  it("states the minimum age and that the service is free", () => {
    expect(text(TERMS)).toContain("16 ans");
    expect(text(TERMS)).toMatch(/gratuit/i);
  });
});

describe("privacy (specs/07)", () => {
  const t = text(PRIVACY);

  it.each(["Neon", "Vercel", "Resend", "Google"])("names the processor %s", (name) => {
    expect(t).toContain(name);
  });

  it("states the backup window, the minimum age and the supervisory authority", () => {
    expect(t).toContain("7 jours");
    expect(t).toContain("16 ans");
    expect(t).toContain("CNIL");
  });

  it("lists the data rights and how to exercise them", () => {
    expect(t).toMatch(/export/i);
    expect(t).toMatch(/suppression/i);
    expect(t).toMatch(/consentement/i);
  });

  it("says there is a single strictly necessary session cookie and no banner", () => {
    expect(t).toMatch(/cookie de session/i);
    expect(t).toMatch(/sans bandeau|aucun bandeau/i);
  });

  it("says health data is never sold or shared", () => {
    expect(t).toMatch(/ni vendues ni partagées/);
  });
});

describe("notice", () => {
  it("names the host and the database provider", () => {
    expect(text(NOTICE)).toContain("Vercel");
    expect(text(NOTICE)).toContain("Neon");
  });
});
```

- [ ] **Étape 2 : lancer, constater l'échec**

Run: `pnpm test src/features/legal/content/content.test.ts`
Attendu : FAIL (modules introuvables).

- [ ] **Étape 3 : écrire les trois textes**

Créer `src/features/legal/content/notice.ts` :

```ts
import { LEGAL_IDENTITY as I } from "../identity";
import type { LegalDocument } from "../types";

export const NOTICE: LegalDocument = {
  title: "Mentions légales",
  sections: [
    {
      id: "editeur",
      heading: "Éditeur du site",
      blocks: [
        `my-body est édité par ${I.publisher} (${I.status}).`,
        `Directeur de la publication : ${I.publisher}.`,
        `Contact : ${I.contactEmail}.`,
      ],
    },
    {
      id: "hebergement",
      heading: "Hébergement",
      blocks: [
        `Le site et l'application sont hébergés par ${I.host}.`,
        `La base de données est hébergée par ${I.database}.`,
      ],
    },
    {
      id: "propriete",
      heading: "Propriété intellectuelle",
      blocks: [
        "Le nom my-body, l'interface, les textes et le code de l'application sont protégés. Toute reproduction sans autorisation est interdite, sauf pour un usage strictement personnel.",
      ],
    },
    {
      id: "donnees",
      heading: "Données personnelles",
      blocks: [
        "Le traitement de tes données est décrit dans la politique de confidentialité, accessible depuis le pied de page de chaque page publique.",
      ],
    },
  ],
};
```

Créer `src/features/legal/content/terms.ts` :

```ts
import { GOAL_DISCLAIMER } from "@/features/goals/copy";
import { LEGAL_IDENTITY as I } from "../identity";
import type { LegalDocument } from "../types";

export const TERMS: LegalDocument = {
  title: "Conditions générales d'utilisation",
  sections: [
    {
      id: "objet",
      heading: "Objet",
      blocks: [
        "my-body est un outil gratuit de suivi du poids et des mensurations. Il t'aide à lire ta progression : tendance du poids, évolution de tes mensurations, rythme par rapport à ton objectif.",
        "Ces conditions fixent les règles d'utilisation du service. En créant un compte, tu les acceptes.",
      ],
    },
    {
      id: "acces",
      heading: "Accès et âge minimum",
      blocks: [
        "my-body est réservé aux personnes de 16 ans et plus. Le service est gratuit : l'inscription se fait par email et mot de passe, ou avec Google.",
        "Tu es responsable de l'exactitude des informations que tu saisis et de la confidentialité de ton mot de passe.",
      ],
    },
    {
      id: "avertissement",
      heading: "Avertissement non médical",
      blocks: [
        GOAL_DISCLAIMER,
        "my-body est un outil de bien-être : il n'établit aucun diagnostic, ne remplace pas l'avis d'un médecin, d'un diététicien ou d'un autre professionnel de santé, et n'est pas un dispositif médical. Les statuts et les rythmes affichés sont des repères généraux, pas des prescriptions.",
      ],
    },
    {
      id: "usage",
      heading: "Utilisation acceptable",
      blocks: [
        "Tu t'engages à utiliser my-body pour ton suivi personnel. Sont interdits :",
        {
          list: [
            "tenter d'accéder aux données d'un autre utilisateur ;",
            "perturber le fonctionnement du service ou contourner ses limites techniques ;",
            "utiliser le service de façon automatisée et massive.",
          ],
        },
      ],
    },
    {
      id: "donnees",
      heading: "Tes données",
      blocks: [
        "Tes données de santé t'appartiennent. Elles sont traitées avec ton consentement explicite, uniquement pour te fournir le suivi, comme l'explique la politique de confidentialité. Tu peux les exporter ou supprimer ton compte à tout moment depuis les Réglages.",
      ],
    },
    {
      id: "responsabilite",
      heading: "Disponibilité et responsabilité",
      blocks: [
        "Le service est fourni tel quel. Nous faisons le maximum pour qu'il soit disponible et exact, mais ne garantissons ni l'absence d'interruption ni l'absence d'erreur. Nous ne sommes pas responsables des décisions que tu prends à partir des informations affichées.",
      ],
    },
    {
      id: "fin",
      heading: "Fin de l'utilisation",
      blocks: [
        "Tu peux supprimer ton compte à tout moment : la suppression est immédiate et définitive. Nous pouvons suspendre un compte qui enfreint ces conditions.",
      ],
    },
    {
      id: "evolution",
      heading: "Évolution des conditions",
      blocks: [
        "Ces conditions peuvent évoluer. La date de dernière mise à jour figure en haut de cette page ; en cas de changement important, ton accord sera de nouveau demandé.",
      ],
    },
    {
      id: "droit",
      heading: "Droit applicable et contact",
      blocks: [
        "Ces conditions sont soumises au droit français.",
        `Pour toute question : ${I.contactEmail}.`,
      ],
    },
  ],
};
```

Créer `src/features/legal/content/privacy.ts` :

```ts
import { LEGAL_IDENTITY as I } from "../identity";
import type { LegalDocument } from "../types";

export const PRIVACY: LegalDocument = {
  title: "Politique de confidentialité",
  sections: [
    {
      id: "responsable",
      heading: "Qui est responsable de tes données ?",
      blocks: [
        `Le responsable du traitement est ${I.publisher} (${I.status}). Contact pour toute question sur tes données : ${I.contactEmail}.`,
      ],
    },
    {
      id: "donnees",
      heading: "Les données que nous collectons et pourquoi",
      blocks: [
        "Nous ne collectons que le nécessaire. Ni nom, ni adresse, ni téléphone.",
        {
          list: [
            "Email et mot de passe (conservé haché, jamais en clair) : créer ton compte et te connecter.",
            "Sexe : choisir la silhouette affichée.",
            "Date de naissance : vérifier l'âge minimum de 16 ans, et contexte pour de futurs indicateurs.",
            "Taille : profil corporel, prévue pour de futurs indicateurs.",
            "Poids, pourcentage de masse grasse, notes et mensurations : te fournir le suivi de ta progression.",
            "Objectif, unités d'affichage, jour de mesure et fuseau horaire : adapter le service à toi.",
          ],
        },
        "Le poids, les mensurations, la taille, l'âge et l'objectif sont des données concernant la santé.",
      ],
    },
    {
      id: "base-legale",
      heading: "Sur quelle base ?",
      blocks: [
        "Les données de santé sont traitées avec ton consentement explicite, recueilli à l'inscription, séparé de l'acceptation des conditions d'utilisation et conservé avec sa date et la version du texte.",
        "Retirer ton consentement revient à supprimer ton compte, car le service ne peut pas fonctionner sans ces données.",
      ],
    },
    {
      id: "destinataires",
      heading: "Qui reçoit tes données ?",
      blocks: [
        "Tes données ne sont ni vendues ni partagées à des fins commerciales. Seuls nos prestataires techniques y accèdent, pour faire fonctionner le service :",
        {
          list: [
            "Neon : base de données, en Union européenne (Francfort).",
            "Vercel : hébergement. Les journaux techniques et le réseau de diffusion peuvent transiter hors de l'Union européenne, avec des garanties (clauses contractuelles types, Data Privacy Framework).",
            "Resend : envoi des emails du service (confirmation, réinitialisation, suppression). Aucune donnée de santé n'y est envoyée.",
            "Google : connexion avec Google, si tu choisis cette option.",
          ],
        },
      ],
    },
    {
      id: "conservation",
      heading: "Combien de temps ?",
      blocks: [
        "Tes données sont conservées tant que ton compte existe. À la suppression du compte, elles sont effacées immédiatement et définitivement. Elles disparaissent des sauvegardes à la fin de leur durée de rétention, soit 7 jours.",
      ],
    },
    {
      id: "droits",
      heading: "Tes droits",
      blocks: [
        {
          list: [
            "Accès et portabilité : export CSV de tes pesées et de tes mensurations depuis les Réglages.",
            "Rectification : toutes tes données sont modifiables dans l'application.",
            "Effacement : suppression immédiate de ton compte depuis les Réglages.",
            "Retrait du consentement : par la suppression du compte.",
          ],
        },
        `Pour exercer tes droits ou poser une question : ${I.contactEmail}. Tu peux aussi saisir la CNIL (cnil.fr) en cas de difficulté.`,
      ],
    },
    {
      id: "securite",
      heading: "Sécurité",
      blocks: [
        "Les échanges sont chiffrés (HTTPS), les mots de passe sont hachés, et chaque requête est limitée à tes propres données. Aucune donnée de santé n'apparaît dans les journaux techniques.",
      ],
    },
    {
      id: "cookies",
      heading: "Cookies",
      blocks: [
        "my-body dépose un seul cookie, le cookie de session (valable 30 jours), strictement nécessaire pour te garder connecté. Il ne demande aucun consentement : il n'y a donc pas de bandeau. Si une mesure d'audience est activée, elle se fait sans cookie et sans donnée de santé.",
      ],
    },
    {
      id: "age",
      heading: "Âge minimum",
      blocks: ["my-body est réservé aux personnes de 16 ans et plus."],
    },
    {
      id: "evolution",
      heading: "Évolution de cette politique",
      blocks: [
        "La date de dernière mise à jour figure en haut de cette page. En cas de changement important, nous te le dirons et, si nécessaire, nous te demanderons de nouveau ton accord.",
      ],
    },
  ],
};
```

- [ ] **Étape 4 : lancer, constater le succès**

Run: `pnpm test src/features/legal`
Attendu : PASS.

- [ ] **Étape 5 : brancher les pages**

Remplacer `src/app/mentions-legales/page.tsx` :

```tsx
import type { Metadata } from "next";
import { NOTICE } from "@/features/legal/content/notice";
import { LegalPage } from "@/features/legal/components/legal-page";
import { LEGAL_UPDATED_ON } from "@/features/legal/identity";

export const metadata: Metadata = { title: "Mentions légales · my-body" };

export default function LegalNoticePage() {
  return <LegalPage document={NOTICE} updatedOn={LEGAL_UPDATED_ON} />;
}
```

Remplacer `src/app/cgu/page.tsx` (même forme, `TERMS`, `TermsPage`, titre « Conditions générales d'utilisation · my-body`) et `src/app/confidentialite/page.tsx` (`PRIVACY`, `PrivacyPage`, titre « Politique de confidentialité · my-body »).

Dans `src/app/(auth)/layout.tsx`, importer `SiteFooter` de `@/features/legal/components/site-footer` et l'ajouter après `{children}` dans le `<main>` :

```tsx
      {children}
      <SiteFooter />
```

- [ ] **Étape 6 : parcours E2E**

Créer `tests/e2e/legal.spec.ts` :

```ts
import { expect, test } from "@playwright/test";
import { GOAL_DISCLAIMER } from "../../src/features/goals/copy";

const PAGES = [
  ["/mentions-legales", "Mentions légales"],
  ["/cgu", "Conditions générales d'utilisation"],
  ["/confidentialite", "Politique de confidentialité"],
] as const;

for (const [path, title] of PAGES) {
  test(`${path}: public, provisional notice, footer, no horizontal scroll`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByRole("note")).toContainText("Version provisoire");
    const footer = page.getByRole("navigation", { name: "Pages légales" });
    await expect(footer.getByRole("link")).toHaveCount(3);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("the terms carry the same non-medical disclaimer as the Objectif screen", async ({ page }) => {
  await page.goto("/cgu");
  await expect(page.getByText(GOAL_DISCLAIMER)).toBeVisible();
});

test("the sign-up page links the legal pages from its footer and from the consents", async ({ page }) => {
  await page.goto("/inscription");
  await page.getByRole("navigation", { name: "Pages légales" }).getByRole("link", { name: "Confidentialité" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Politique de confidentialité" })).toBeVisible();

  await page.goto("/inscription");
  await expect(page.getByRole("link", { name: "En savoir plus" })).toHaveAttribute("href", "/confidentialite");
  await expect(page.getByRole("link", { name: "conditions générales d'utilisation" })).toHaveAttribute("href", "/cgu");
});
```

(Si l'import relatif de `GOAL_DISCLAIMER` ne résout pas sous Playwright, recopier la phrase de la contrainte globale dans le test.)

- [ ] **Étape 7 : vérifier**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm exec playwright test --no-deps --project=mobile --project=desktop tests/e2e/legal.spec.ts`
Attendu : PASS. L'E2E tourne sur la base configurée comme les autres specs ; ces specs ne créent aucun compte.

- [ ] **Étape 8 : revue design et commit**

Invoquer `web-design-guidelines` sur les pages et le layout d'authentification, corriger.

```bash
pnpm format
git add src/features/legal src/app tests/e2e/legal.spec.ts
git commit -m "feat(legal): publish the legal pages and link them from the auth screens"
```

---

### Tâche 3 : page d'accueil publique

**Fichiers :**
- Créer : `src/features/landing/preview-data.ts`, `src/features/landing/preview-data.test.ts`, `src/features/landing/components/landing-preview.tsx`, `src/features/landing/components/pillars.tsx`, `src/features/landing/components/landing-preview.test.tsx`, `src/app/page.test.tsx`, `tests/e2e/landing.spec.ts`
- Modifier : `src/app/page.tsx`, `tests/e2e/smoke.spec.ts`

**Interfaces :**
- Consomme : `Sparkline` (`@/features/dashboard/components/sparkline`, prop `data: Sparkline`, `unit`), `Silhouette` (`@/features/measurements/components/silhouette`, props `sex`, `zones: readonly ZoneView[]`), `ZONES`/`Zone`/`DeltaTone` (`@/lib/metrics`), `ZONE_LABELS` (`@/features/measurements/copy`), `formatWeight`, `formatWeeklyRate` (`@/lib/units`), `SiteFooter` (tâche 1), `getAuth` (`@/lib/auth`).
- Produit : `PREVIEW_SPARKLINE`, `PREVIEW_ZONES`, `PREVIEW_TREND_KG`, `PREVIEW_RATE_KG`, `LandingPreview()`, `Pillars()`, `HomePage()`.

- [ ] **Étape 1 : écrire les tests des données fictives (qui échouent)**

Créer `src/features/landing/preview-data.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { sparklineGeometry } from "@/features/dashboard/sparkline";
import { ZONES } from "@/lib/metrics";
import {
  PREVIEW_RATE_KG,
  PREVIEW_SPARKLINE,
  PREVIEW_TREND_KG,
  PREVIEW_ZONES,
} from "./preview-data";

describe("landing preview data", () => {
  it("is a fixed, chronological series that draws a real trend line", () => {
    const { dots, trend, from, to } = PREVIEW_SPARKLINE;
    expect(dots.length).toBeGreaterThan(8);
    expect(trend).toHaveLength(dots.length);
    expect([...dots].map((d) => d.date)).toEqual([...dots].map((d) => d.date).sort());
    expect(from <= dots[0].date && dots[dots.length - 1].date <= to).toBe(true);
    expect(sparklineGeometry(PREVIEW_SPARKLINE, 320, 72).trendPath).not.toBe("");
  });

  it("shows a falling trend that matches the headline numbers", () => {
    const trend = PREVIEW_SPARKLINE.trend;
    expect(trend[trend.length - 1].trendKg).toBe(PREVIEW_TREND_KG);
    expect(trend[0].trendKg).toBeGreaterThan(PREVIEW_TREND_KG);
    expect(PREVIEW_RATE_KG).toBeLessThan(0);
  });

  it("covers the eight zones, some measured and some not, with the project's labels", () => {
    expect(PREVIEW_ZONES.map((z) => z.zone)).toEqual([...ZONES]);
    const measured = PREVIEW_ZONES.filter((z) => z.valueText !== null);
    expect(measured.length).toBeGreaterThanOrEqual(4);
    expect(measured.length).toBeLessThan(ZONES.length);
    for (const z of PREVIEW_ZONES) expect(z.ariaLabel).toContain(z.label);
  });
});
```

- [ ] **Étape 2 : lancer, constater l'échec**

Run: `pnpm test src/features/landing/preview-data.test.ts`
Attendu : FAIL (module introuvable).

- [ ] **Étape 3 : implémenter les données**

Créer `src/features/landing/preview-data.ts` :

```ts
import type { Sparkline } from "@/features/dashboard/weight-summary";
import { ZONE_LABELS } from "@/features/measurements/copy";
import type { ZoneView } from "@/features/measurements/summary";
import { ZONES, type DeltaTone, type Zone } from "@/lib/metrics";

/**
 * Invented data for the public landing page. Fixed on purpose: it never depends on the
 * current date or on a user, and it is always shown as an example (never real data).
 */
const DATES = [
  "2026-07-01", "2026-07-08", "2026-07-15", "2026-07-22", "2026-07-29", "2026-08-05", "2026-08-12",
  "2026-08-19", "2026-08-26", "2026-09-02", "2026-09-09", "2026-09-16", "2026-09-23",
] as const;
const RAW_KG = [82.4, 81.6, 82.1, 81.3, 81.5, 80.9, 81.2, 80.4, 80.6, 80.0, 80.3, 79.5, 79.4];
const TREND_KG = [82.2, 82.0, 81.9, 81.7, 81.5, 81.3, 81.1, 80.9, 80.7, 80.5, 80.3, 80.0, 79.8];

export const PREVIEW_SPARKLINE: Sparkline = {
  from: "2026-07-01",
  to: "2026-09-30",
  dots: DATES.map((date, i) => ({ date, weightKg: RAW_KG[i] })),
  trend: DATES.map((date, i) => ({ date, trendKg: TREND_KG[i] })),
};
export const PREVIEW_TREND_KG = 79.8;
export const PREVIEW_RATE_KG = -0.4;

const MEASURED: Partial<Record<Zone, { value: string; delta: string; tone: DeltaTone }>> = {
  waist: { value: "81,5 cm", delta: "−3,5", tone: "positive" },
  arm: { value: "33,2 cm", delta: "+0,8", tone: "positive" },
  chest: { value: "96,0 cm", delta: "0", tone: "neutral" },
  hips: { value: "98,0 cm", delta: "−1,2", tone: "positive" },
  thigh: { value: "57,5 cm", delta: "+0,5", tone: "neutral" },
};

export const PREVIEW_ZONES: ZoneView[] = ZONES.map((zone) => {
  const label = ZONE_LABELS[zone];
  const m = MEASURED[zone];
  return {
    zone,
    label,
    valueText: m?.value ?? null,
    deltaText: m ? `${m.delta} cm` : null,
    tone: m?.tone ?? "neutral",
    ariaLabel: m ? `${label} : ${m.value}, ${m.delta} cm sur 30 jours` : `${label} : pas encore mesurée`,
  };
});
```

Adapter les types réels (`Sparkline` de `weight-summary.ts`, `ZoneView`) si un champ diffère ; ne pas modifier les tests.

- [ ] **Étape 4 : lancer, constater le succès**

Run: `pnpm test src/features/landing/preview-data.test.ts`
Attendu : PASS.

- [ ] **Étape 5 : écrire les tests des composants et de la page (qui échouent)**

Créer `src/features/landing/components/landing-preview.test.tsx` :

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LandingPreview } from "./landing-preview";
import { Pillars } from "./pillars";

afterEach(cleanup);

describe("LandingPreview", () => {
  it("is a labelled figure that says the data is invented", () => {
    render(<LandingPreview />);
    const figure = screen.getByRole("figure", { name: /aperçu de l'application/i });
    expect(within(figure).getByText(/données fictives/i)).toBeTruthy();
  });

  it("shows the headline trend, the rate and the chart summary", () => {
    render(<LandingPreview />);
    expect(screen.getByTestId("preview-trend").textContent).toMatch(/79,8/);
    expect(screen.getByText(/−0,4/)).toBeTruthy();
    expect(screen.getByRole("img", { name: /tendance de .* à .* sur 3 mois/i })).toBeTruthy();
  });

  it("draws the silhouette as a plain picture: no zone buttons", () => {
    render(<LandingPreview />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});

describe("Pillars", () => {
  it("presents the three pillars as headings", () => {
    render(<Pillars />);
    const titles = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual(["Tendance", "Silhouette", "Rythme"]);
  });
});
```

Créer `src/app/page.test.tsx` :

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ctx = vi.hoisted(() => ({ getSession: vi.fn(), redirect: vi.fn() }));

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    ctx.redirect(url);
    throw new Error(`redirect:${url}`);
  },
}));
vi.mock("@/lib/auth", () => ({ getAuth: () => ({ api: { getSession: ctx.getSession } }) }));

import HomePage from "./page";

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe("public home page", () => {
  it("sends a signed-in visitor to the app", async () => {
    ctx.getSession.mockResolvedValue({ user: { id: "alice" } });
    await expect(HomePage()).rejects.toThrow("redirect:/accueil");
    expect(ctx.redirect).toHaveBeenCalledWith("/accueil");
  });

  it("shows the landing page to a signed-out visitor, with each main button once", async () => {
    ctx.getSession.mockResolvedValue(null);
    render(await HomePage());

    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    const start = screen.getAllByRole("link", { name: "Commencer gratuitement" });
    expect(start).toHaveLength(1);
    expect(start[0].getAttribute("href")).toBe("/inscription");
    const signIn = screen.getAllByRole("link", { name: "Se connecter" });
    expect(signIn).toHaveLength(1);
    expect(signIn[0].getAttribute("href")).toBe("/connexion");
    expect(screen.getByRole("navigation", { name: "Pages légales" })).toBeTruthy();
  });

  it("still shows the landing page when the session lookup fails", async () => {
    ctx.getSession.mockRejectedValue(new Error("db down"));
    render(await HomePage());
    expect(screen.getByRole("link", { name: "Commencer gratuitement" })).toBeTruthy();
  });
});
```

- [ ] **Étape 6 : lancer, constater l'échec**

Run: `pnpm test src/features/landing src/app/page.test.tsx`
Attendu : FAIL (composants introuvables, page ancienne).

- [ ] **Étape 7 : implémenter**

Créer `src/features/landing/components/pillars.tsx` :

```tsx
const PILLARS = [
  ["Tendance", "Ton poids du jour fluctue. my-body lisse les pesées pour te montrer la tendance, la seule chose qui compte."],
  ["Silhouette", "Touche une zone de ta silhouette pour saisir une mensuration. Vois d'un coup d'œil ce qui change, même quand le poids stagne."],
  ["Rythme", "Perte, prise ou maintien : my-body te dit si ton rythme est adapté à ton objectif, et estime la date où tu l'atteindras."],
] as const;

export function Pillars() {
  return (
    <section aria-labelledby="pillars-title" className="mt-16">
      <h2 id="pillars-title" className="sr-only">
        Ce que fait my-body
      </h2>
      <div className="grid gap-8 lg:grid-cols-3">
        {PILLARS.map(([title, text]) => (
          <div key={title} className="border-t border-line pt-4">
            <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
            <p className="mt-2 text-sm text-fg-2">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
```

Créer `src/features/landing/components/landing-preview.tsx` :

```tsx
import { Sparkline } from "@/features/dashboard/components/sparkline";
import { Silhouette } from "@/features/measurements/components/silhouette";
import { formatDecimal, formatWeeklyRate, NNBSP } from "@/lib/units";
import {
  PREVIEW_RATE_KG,
  PREVIEW_SPARKLINE,
  PREVIEW_TREND_KG,
  PREVIEW_ZONES,
} from "../preview-data";

/** What the app looks like, with invented data (it is a picture, not a screenshot to maintain). */
export function LandingPreview() {
  return (
    <figure
      aria-label="Aperçu de l'application"
      className="mx-auto grid max-w-3xl gap-8 rounded-2xl border border-line p-6 lg:grid-cols-[1fr_280px]"
    >
      <div>
        <p className="text-xs text-fg-2">Tendance du poids</p>
        <p className="mt-1 text-5xl font-semibold tracking-tight" data-testid="preview-trend">
          {formatDecimal(PREVIEW_TREND_KG)}
          <span className="ml-1 text-lg font-normal text-muted">kg</span>
        </p>
        <p className="mt-1 text-sm text-positive">{formatWeeklyRate(PREVIEW_RATE_KG, "kg")}</p>
        <Sparkline data={PREVIEW_SPARKLINE} unit="kg" />
      </div>
      <Silhouette sex="female" zones={PREVIEW_ZONES} />
      <figcaption className="text-xs text-fg-2 lg:col-span-2">
        Exemple avec des données fictives.
      </figcaption>
    </figure>
  );
}
```

(`NNBSP` n'est pas nécessaire ici : retirer l'import si inutilisé.)

Remplacer `src/app/page.tsx` :

```tsx
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LandingPreview } from "@/features/landing/components/landing-preview";
import { Pillars } from "@/features/landing/components/pillars";
import { SiteFooter } from "@/features/legal/components/site-footer";
import { getAuth } from "@/lib/auth";

async function isSignedIn(requestHeaders: Headers): Promise<boolean> {
  try {
    return Boolean(await getAuth().api.getSession({ headers: requestHeaders }));
  } catch {
    // A failing lookup must not take the public page down.
    return false;
  }
}

export default async function HomePage() {
  // headers() outside the try: it is what makes the route dynamic.
  if (await isSignedIn(await headers())) redirect("/accueil");

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/" className="inline-flex min-h-11 items-center text-[17px] font-bold tracking-tight">
        <span aria-hidden className="mr-2 inline-block size-2.5 rounded-full bg-fg" />
        my-body
      </Link>
      <section className="mx-auto mt-12 max-w-2xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight lg:text-5xl">
          Comprends ce que ton poids veut dire.
        </h1>
        <p className="mt-4 text-fg-2">
          Suis ton poids et tes mensurations. my-body en tire la tendance, te montre ta silhouette
          évoluer et te dit si ton rythme est adapté à ton objectif. Gratuit.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/inscription"
            className="inline-flex h-11 items-center rounded-full bg-fg px-6 text-sm font-semibold text-white"
          >
            Commencer gratuitement
          </Link>
          <Link
            href="/connexion"
            className="inline-flex h-11 items-center rounded-full border border-fg px-6 text-sm font-semibold"
          >
            Se connecter
          </Link>
        </div>
      </section>
      <div className="mt-14">
        <LandingPreview />
      </div>
      <Pillars />
      <SiteFooter />
    </main>
  );
}
```

- [ ] **Étape 8 : lancer, constater le succès**

Run: `pnpm test src/features/landing src/app/page.test.tsx && pnpm typecheck && pnpm lint`
Attendu : PASS. Si `Silhouette` (composant client) ou `Sparkline` posent un problème dans jsdom, adapter le **test** (pas la page) en suivant `silhouette.test.tsx`.

- [ ] **Étape 9 : E2E**

Mettre à jour `tests/e2e/smoke.spec.ts` :

```ts
import { expect, test } from "@playwright/test";

test("public home page shows the pitch and the sign-up link", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Comprends ce que ton poids veut dire");
  await expect(page.getByRole("link", { name: "Commencer gratuitement" })).toHaveAttribute(
    "href",
    "/inscription",
  );
});
```

Créer `tests/e2e/landing.spec.ts` :

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

test("landing: pitch, three pillars, fictional preview, both buttons, legal footer, no horizontal scroll", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Commencer gratuitement" })).toHaveAttribute("href", "/inscription");
  await expect(page.getByRole("link", { name: "Se connecter" })).toHaveAttribute("href", "/connexion");
  for (const pillar of ["Tendance", "Silhouette", "Rythme"]) {
    await expect(page.getByRole("heading", { level: 3, name: pillar })).toBeVisible();
  }
  await expect(page.getByRole("figure", { name: /aperçu de l'application/i })).toContainText("données fictives");
  await expect(page.getByRole("navigation", { name: "Pages légales" }).getByRole("link")).toHaveCount(3);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("landing: the buttons lead to the sign-up and sign-in pages", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Commencer gratuitement" }).click();
  await expect(page).toHaveURL(/\/inscription$/);
  await page.goto("/");
  await page.getByRole("link", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/connexion$/);
});

// Read-only on the shared demo account (it only signs in).
test("landing: a signed-in visitor is sent to the app", async ({ page }) => {
  await signIn(page);
  await page.goto("/");
  await expect(page).toHaveURL(/\/accueil$/);
});
```

Run: `pnpm exec playwright test --no-deps --project=mobile --project=desktop tests/e2e/landing.spec.ts tests/e2e/smoke.spec.ts`
Attendu : PASS (le test connecté est ignoré si `SEED_DEMO_PASSWORD` est absent).

- [ ] **Étape 10 : revue design et commit**

Invoquer `web-design-guidelines` sur `page.tsx`, `landing-preview.tsx`, `pillars.tsx` ; vérifier en 390 px et 1440 px (pas de défilement horizontal, silhouette lisible, boutons ≥ 44 px) ; corriger.

```bash
pnpm format
git add src/features/landing src/app/page.tsx src/app/page.test.tsx tests/e2e/landing.spec.ts tests/e2e/smoke.spec.ts
git commit -m "feat(landing): add the public home page with a fictional app preview"
```

---

### Tâche 4 : clôture du lot L6b

**Fichiers :**
- Modifier : `specs/10-planning-et-jalons.md`, ce plan (écarts constatés)

- [ ] **Étape 1 : vérifications complètes**

Run : `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test --coverage && pnpm build && pnpm exec playwright test --no-deps --project=mobile --project=desktop tests/e2e/legal.spec.ts tests/e2e/landing.spec.ts tests/e2e/smoke.spec.ts`
Attendu : tout vert. Vérifier à la main en 390 px et 1440 px : `/`, `/cgu`, `/confidentialite`, `/mentions-legales`, `/inscription` (pied de page).

- [ ] **Étape 2 : relecture**

Lancer l'agent `reviewer` sur la branche entière (EF-LEGAL-01/02, EF-PUB-01, exactitude du texte par rapport à la spec 07, accessibilité). Corriger tous les points **blocking**.

- [ ] **Étape 3 : mettre à jour les specs**

Dans `specs/10-planning-et-jalons.md`, sous L6 : « **L6b terminé** le JJ/MM/2026 (pages légales en version provisoire, accueil public). **L6 terminé.** » ; dans la « Checklist de lancement public », ajouter : « - [ ] Identité de l'éditeur (nom, statut, email de contact) renseignée dans `features/legal/identity.ts`, textes légaux relus et validés, bandeau « Version provisoire » retiré, `CONSENT_VERSION` mise à jour si le fond du consentement change. » Compléter la section « Écarts assumés » de ce plan avec les écarts constatés.

- [ ] **Étape 4 : PR**

Pousser la branche, ouvrir la PR vers `main` (description en français : résumé, points d'attention dont l'identité à renseigner, tests), puis demander à `jira-updater` de commenter les sous-tickets de l'epic BODY-7 couverts par L6b et de clore l'epic une fois L6a et L6b fusionnés.
