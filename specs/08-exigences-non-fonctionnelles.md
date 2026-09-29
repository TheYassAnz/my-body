# 08 · Exigences non fonctionnelles

## Performance

| ID | Exigence | Mesure |
|---|---|---|
| ENF-01 | LCP < 2,5 s et INP < 200 ms au 75e percentile, sur mobile en 4G | Vercel Speed Insights / Lighthouse mobile ≥ 90 |
| ENF-02 | Enregistrement d'une pesée (clic → accueil mis à jour) < 800 ms au 75e percentile | Mesure manuelle, puis instrumentation |
| ENF-03 | JavaScript client de la page Accueil < 180 ko gzip | `next build` + analyse du bundle. Recharts chargé seulement là où un graphique est affiché |
| ENF-04 | Calcul de l'ensemble des indicateurs pour 5 ans d'historique < 20 ms côté serveur | Test de performance Vitest |

## Accessibilité

| ID | Exigence |
|---|---|
| ENF-10 | Conformité **WCAG 2.1 niveau AA** sur tous les écrans. |
| ENF-11 | Navigation complète au clavier : ordre logique, focus visible (anneau `--focus`), panneaux et fenêtres modales qui retiennent et restituent le focus (Radix). |
| ENF-12 | Silhouette : chaque zone est un `<button>` avec `aria-label` complet. Le tableau des mensurations est l'**alternative textuelle** équivalente. |
| ENF-13 | Graphiques : chaque graphique a un résumé textuel (« Tendance de 82,0 à 78,4 kg sur 3 mois, −0,4 kg/semaine ») et un accès à l'historique sous forme de liste. |
| ENF-14 | Zones de toucher ≥ 44×44 px. Texte redimensionnable jusqu'à 200 % sans perte. |
| ENF-15 | L'information n'est jamais portée par la couleur seule : les écarts sont signés (+/−) et les statuts écrits en toutes lettres. |
| ENF-16 | `prefers-reduced-motion` respecté (transitions désactivées). |

## Compatibilité

| ID | Exigence |
|---|---|
| ENF-20 | Navigateurs : les 2 dernières versions de Chrome, Edge, Firefox, Safari (macOS), Safari iOS 16+ et Chrome Android. |
| ENF-21 | Largeurs de 320 px à 2560 px sans défilement horizontal. |
| ENF-22 | Fonctionnement sans JavaScript non requis (application interactive), mais les pages légales et la page publique s'affichent sans JS. |

## Fiabilité et exploitation

| ID | Exigence |
|---|---|
| ENF-30 | Disponibilité visée de 99,5 % (celle des offres Vercel et Neon, sans engagement contractuel en V1). |
| ENF-31 | Sauvegardes : restauration à un instant donné de Neon (7 jours minimum). Procédure de restauration documentée dans le README. |
| ENF-32 | Migrations de base **rétrocompatibles** (ajout avant suppression) pour permettre le retour arrière d'un déploiement Vercel. |
| ENF-33 | Erreurs serveur journalisées avec `userId`, action et code d'erreur, sans donnée de santé ([07 §8](07-securite-et-rgpd.md)). Une page d'erreur `error.tsx` propose « Réessayer ». |
| ENF-34 | Page 404 personnalisée, dans le style « Clarté ». |

## Maintenabilité

| ID | Exigence |
|---|---|
| ENF-40 | TypeScript `strict`, zéro `any` explicite hors typage de bibliothèques tierces. |
| ENF-41 | ESLint et Prettier sans erreur en CI. |
| ENF-42 | Couverture de `lib/metrics` et `lib/units` ≥ 95 % (lignes et branches). Couverture globale suivie mais non bloquante. |
| ENF-43 | Chaque fichier a une responsabilité claire. Au-delà d'environ 300 lignes, on découpe. |
| ENF-44 | Un README décrit l'installation, les scripts, les variables d'environnement, les migrations, le seed et la restauration. |

## Internationalisation

| ID | Exigence |
|---|---|
| ENF-50 | Interface en **français uniquement** en V1. Les textes sont regroupés par domaine (`features/*/copy.ts`) pour faciliter une traduction future, sans bibliothèque i18n en V1. |
| ENF-51 | Formatage des nombres et des dates avec `Intl` et la locale `fr-FR`. |

## Mesure d'audience

| ID | Exigence |
|---|---|
| ENF-60 | (S) Vercel Web Analytics (sans cookie) pour le trafic des pages. |
| ENF-61 | (C) Compteurs d'usage agrégés, calculés par requêtes SQL ponctuelles plutôt que par un outil tiers, pour suivre les indicateurs de succès ([00 §8](00-vision-et-perimetre.md)). |
