# 10 · Planning et jalons

Développeur solo, **sans échéance imposée**. Le travail est découpé en **lots livrables** : chaque lot se termine par une version déployée et utilisable, même incomplète. Les charges sont des ordres de grandeur en jours de travail effectif, **à titre indicatif**.

## Vue d'ensemble

| Lot | Contenu | Livre | Charge indicative |
|---|---|---|---|
| **L0** | Socle technique | Une app vide déployée, la CI verte | 1 à 2 j |
| **L1** | Authentification et profil | S'inscrire, se connecter, renseigner son profil | 3 à 4 j |
| **L2** | Pesées et tendance | **Premier usage réel** : se peser et voir sa tendance | 4 à 5 j |
| **L3** | Objectifs | Rythme, statut, projection | 3 à 4 j |
| **L4** | Mensurations et silhouette | Séance guidée, silhouette annotée | 5 à 7 j |
| **L5** | Progrès | Graphiques et historique éditable pour toutes les métriques | 3 à 4 j |
| **L6** | Réglages, données, légal | Unités, export, suppression, pages légales, page publique | 3 à 4 j |
| **L7** | Finitions et lancement | Desktop soigné, accessibilité, performance, E2E, recette | 4 à 6 j |

**Total indicatif : 26 à 36 jours de travail effectif.**

Dès **L2**, l'application est utilisable au quotidien par le développeur lui-même : c'est le meilleur test produit.

## Détail des lots

### L0 · Socle
- Initialisation Next.js + TypeScript strict, Tailwind, Geist, ESLint, Prettier, pnpm.
- Drizzle + Neon (branche dev), premier schéma vide et migration.
- Vitest et PGlite configurés, avec un test d'exemple. Playwright configuré.
- GitHub Actions (lint, typecheck, test, build). Projet Vercel en région fra1 et intégration Neon.
- Tokens « Clarté » dans `globals.css`, premiers composants `Button` et `Input`.
- **Terminé quand :** un push sur `main` déploie une page « my-body » et la CI est verte.

### L1 · Authentification et profil
- Better Auth : email + mot de passe, vérification d'email (Resend), réinitialisation, Google OAuth, limitation de débit.
- Écrans d'authentification, consentement et table `consent`.
- Table `profile`, onboarding étapes 1 et 2, `requireUser()`, middleware et gardes.
- Layout `(app)` avec navigation mobile et desktop (écrans vides).
- **Terminé quand :** E2E-9 passe et on peut s'inscrire, vérifier son email, se connecter, remplir son profil et se déconnecter.

### L2 · Pesées et tendance
- Table `weight_entry`, actions et requêtes, avec tests d'isolation.
- `lib/metrics` : `trend`, calibrage, `rate` (TDD). `lib/units` et `lib/dates`.
- Onboarding étape 3. Panneau de saisie avec stepper, remplacement du jour et valeur suspecte.
- Accueil : bloc Poids (chiffre héros, rythme, mini-courbe) et états de calibrage.
- Seed de démonstration.
- **Terminé quand :** E2E-2 passe.

### L3 · Objectifs
- Table `goal`, contraintes. `goal-status` et `projection` (TDD, table de cas complète).
- Écran Objectif (types, curseur de rythme, aperçu, suivi), onboarding étape 4.
- Accueil : bloc Objectif, bandeau « objectif atteint ». Rythme de l'Accueil en vert quand il va dans le sens de l'objectif.
- Historique des objectifs (EF-GOAL-05).
- **Terminé quand :** l'onboarding est complet (hors étape 5) et E2E-5 passe.

### L4 · Mensurations et silhouette
- Tables `measurement_session` et `measurement`. `deltas` (TDD).
- Composant `Silhouette` (homme et femme, ancres, accessibilité).
- Écran Corps, panneau de saisie d'une zone, séance guidée avec protocoles et récapitulatif.
- Onboarding étape 5. Accueil : bloc Mensurations et rappels.
- **Terminé quand :** E2E-3 et E2E-4 passent.
- Hors lot : modifier ou supprimer une mesure (EF-MEA-04) reste en L5 ; silhouette et tableau de mensurations de l'Accueil desktop en L7 ; jour de mesure dans les Réglages en L6 (le rappel lit `reminderWeekday` s'il est défini).

### L5 · Progrès
- Graphique générique (poids avec tendance, cible et projection ; séries simples pour les zones et le % MG), sélecteur de période, statistiques.
- Historique paginé, édition et suppression (avec annulation, S).
- **Terminé quand :** toutes les métriques sont consultables et éditables depuis Progrès.
- **Terminé** le 09/10/2026. Reporté : point et pilule « Valeur courante » du graphique (specs/06 §4).

### L6 · Réglages, données et légal
- Réglages : profil, unités (propagées partout), jour de mesure, compte.
- Export CSV, suppression du compte et email de confirmation.
- Pages légales (contenu à rédiger ou faire relire), page d'accueil publique.
- **Terminé quand :** E2E-6, E2E-7 et E2E-8 passent.
- **L6a terminé** le 09/10/2026 (Réglages, export CSV, suppression du compte ; E2E-6, 7 et 8 passent). Reste **L6b** : pages légales (contenu) et page d'accueil publique. Plan : [L6a](plans/2026-10-09-l6a-reglages-et-donnees.md).

### L7 · Finitions et lancement
- Accueil desktop complet (grand graphique, silhouette, tableau des mensurations), cohérence avec les maquettes.
- Audit d'accessibilité (E2E-10 et VoiceOver), performance (ENF-01 à 04), pages d'erreur et 404.
- Sécurité : en-têtes, CSP, revue des points de [07](07-securite-et-rgpd.md). Validation juridique des points ouverts.
- Fermeture du panneau bas par glissement vers le bas.
- README complet. Recette sur appareils réels.
- **Terminé quand :** tous les critères « M » de [02](02-exigences-fonctionnelles.md) sont satisfaits et la checklist de lancement ci-dessous est cochée.

## Définition de « terminé » (pour chaque tâche)

- Critères d'acceptation de l'exigence vérifiés.
- Tests écrits et verts (unitaires ou intégration selon le cas, E2E si un parcours est concerné).
- Lint, types et build verts en CI.
- Rendu vérifié en mobile (390 px) et desktop (1440 px).
- Aucune donnée de santé dans les logs.

## Checklist de lancement public

- [ ] Points **[À valider juridiquement]** de [07](07-securite-et-rgpd.md) tranchés (HDS, AIPD, Vercel).
- [ ] Mentions légales, CGU et politique de confidentialité publiées.
- [ ] Domaine, email expéditeur (SPF, DKIM, DMARC) configurés dans Resend.
- [ ] Client OAuth Google en production (écran de consentement vérifié).
- [ ] Restauration de sauvegarde Neon testée une fois.
- [ ] Lighthouse mobile ≥ 90 sur Accueil, Corps et Progrès.
- [ ] Zéro violation axe sérieuse ou critique.
- [ ] Bêta fermée (5 à 10 personnes aux profils variés : perte, prise, maintien, homme, femme) pendant 2 semaines, retours traités.
