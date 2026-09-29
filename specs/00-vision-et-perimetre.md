# 00 · Vision et périmètre

## 1. Contexte

Les personnes qui veulent transformer leur corps (perdre du gras, prendre du muscle, ou les deux) suivent souvent leur poids chaque jour et **abandonnent à tort** faute d'une lecture correcte des données :

- Le poids quotidien fluctue de ±1 à 2 kg pour des raisons sans lien avec la masse grasse (eau, sel, glycogène, transit, cycle menstruel). Une pesée isolée ne veut rien dire, seule la **tendance** compte.
- En recomposition, le poids stagne alors que la silhouette change (le tour de taille baisse, le tour de bras monte). Sans **mensurations**, la progression est invisible.
- Un rythme trop rapide en perte fait perdre du muscle, et un rythme trop rapide en prise fait prendre du gras. Peu d'outils disent si le rythme est **sain et adapté à l'objectif**.

Les apps existantes (Happy Scale, Libra, MacroFactor, apps de balances connectées) traitent bien la tendance du poids. Elles restent pauvres sur les mensurations : saisie fastidieuse, aucun protocole, visualisation faible.

## 2. Vision

> **my-body** est l'outil le plus simple pour suivre son poids et ses mensurations **et comprendre ce qu'ils veulent dire** par rapport à son objectif.

Trois piliers :

1. **La tendance plutôt que le chiffre du jour** : le poids lissé est mis en avant partout.
2. **Le corps comme interface** : une silhouette (homme ou femme) sur laquelle on saisit et lit ses mensurations.
3. **Un regard d'expert intégré** : rythme recommandé selon l'objectif, statut clair (« dans le rythme », « trop rapide »…), protocole de mesure pour des données fiables.

## 3. Cible

Produit **public**, inscription ouverte, **gratuit** en V1. Personnes de plus de 16 ans ayant un objectif de composition corporelle.

### Personas

| Persona | Profil | Objectif | Ce qu'il attend |
|---|---|---|---|
| **Karim, 27 ans** (principal) | Pratique la musculation 4 fois par semaine | Alterne prise de masse et sèche, parfois recompo | Savoir si sa prise est « propre » (rythme ≤ 0,5 %/sem), voir ses bras et épaules progresser pendant que sa taille reste stable. |
| **Julie, 38 ans** | Reprend le sport, veut perdre 8 kg | Perte | Ne pas se décourager quand la balance remonte un matin. Voir sa taille et ses hanches baisser. |
| **Marc, 52 ans** | A atteint son poids de forme | Maintien | Vérifier en 5 secondes par jour qu'il reste dans sa zone. |

## 4. Périmètre V1

| Domaine | Inclus en V1 |
|---|---|
| **Compte** | Inscription et connexion par email + mot de passe ou Google. Vérification de l'email, mot de passe oublié, déconnexion. Consentement explicite au traitement des données de santé. |
| **Onboarding** | Sexe, taille, date de naissance, poids actuel, objectif, première séance de mesure (optionnelle). |
| **Poids** | Saisie rapide (une par jour), % de masse grasse optionnel, note optionnelle. Historique modifiable et supprimable. |
| **Mensurations** | 8 zones fixes, séance de mesure guidée avec protocole, saisie d'une zone isolée depuis la silhouette. |
| **Silhouette** | Silhouette annotée homme/femme : dernière valeur et écart par zone sur une période au choix. |
| **Objectif** | 4 types, cible, rythme visé, statut calculé, projection de date, historique des objectifs. |
| **Progrès** | Courbes (poids, % MG, chaque zone), périodes 1M / 3M / 6M / 1A / Tout, historique détaillé. |
| **Réglages** | Profil, unités d'affichage (kg/lb, cm/in), jour de mesure conseillé, export CSV, suppression du compte. |
| **Légal** | Mentions légales, CGU, politique de confidentialité. |

## 5. Hors périmètre V1

Voir le [backlog V2+](11-backlog-v2.md). Les principaux éléments exclus :

- Carte de chaleur des zones et silhouette qui se déforme selon les mesures.
- PWA : installation, mode hors-ligne, notifications push de rappel.
- Photos de progression.
- Suivi nutritionnel (calories, macros) et calcul de dépense énergétique.
- Estimation du % de masse grasse par formule (US Navy…). En V1, le % MG est **uniquement saisi** depuis une balance adaptée.
- Zones personnalisées, mesure gauche/droite séparée, bras contracté.
- Synchronisation avec des balances connectées, Apple Santé ou Google Fit.
- Multilingue, mode sombre, paiement ou abonnement, espace coach.

## 6. Modèle économique

**Totalement gratuit en V1**, sans publicité ni revente de données. Aucun module de paiement n'est prévu. L'architecture ne doit pas empêcher d'ajouter un freemium plus tard, mais rien n'est anticipé dans le code (YAGNI).

## 7. Contraintes

| Type | Contrainte |
|---|---|
| **Équipe** | Un seul développeur, sans échéance : le découpage en lots doit livrer de la valeur incrémentale ([10](10-planning-et-jalons.md)). |
| **Technique** | Next.js + TypeScript, PostgreSQL, Drizzle, Better Auth, hébergement Vercel ([05](05-architecture-technique.md)). |
| **Réglementaire** | Données de santé au sens de l'article 9 du RGPD : consentement explicite, hébergement en UE, droits d'accès et d'effacement ([07](07-securite-et-rgpd.md)). |
| **Budget** | Rester dans les offres gratuites ou d'entrée de gamme (Vercel Hobby puis Pro, Neon Free puis Launch, Resend Free) tant que l'audience le permet. |
| **Support** | Web responsive. Mobile d'abord pour la saisie, desktop pour la consultation. |

## 8. Indicateurs de succès (post-lancement)

| Indicateur | Cible indicative à 3 mois |
|---|---|
| Onboarding terminé (poids + objectif) | ≥ 70 % des inscrits |
| Rétention à 30 jours (au moins 1 pesée dans les 7 derniers jours) | ≥ 30 % |
| Pesées par utilisateur actif et par semaine | ≥ 4 |
| Utilisateurs actifs ayant fait au moins 2 séances de mesure | ≥ 40 % |
| Temps médian de saisie d'une pesée | < 5 s |

Ces indicateurs supposent une mesure d'audience minimale et respectueuse de la vie privée ([08](08-exigences-non-fonctionnelles.md)).
