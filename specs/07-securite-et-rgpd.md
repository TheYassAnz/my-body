# 07 · Sécurité et RGPD

> ⚠️ Ce document fixe les exigences techniques et organisationnelles. Il **ne remplace pas un avis juridique**. Les points marqués **[À valider juridiquement]** doivent être confirmés avant le lancement public.

## 1. Qualification des données

Le poids, le % de masse grasse, les mensurations, la taille, l'âge et l'objectif de poids sont des **données concernant la santé** au sens de l'article 4.15 du RGPD, donc des **données sensibles** (article 9).

Conséquences :
- **Base légale** : consentement **explicite** de la personne (art. 9.2.a), recueilli à l'inscription, séparé de l'acceptation des CGU, et traçable (table `consent`, [04](04-modele-de-donnees.md)).
- **Minimisation** : on ne collecte que le nécessaire. Ni nom, ni adresse, ni téléphone. La date de naissance sert à la vérification d'âge et au contexte.
- **Retrait du consentement** : il équivaut à supprimer le compte, puisque le service ne peut pas fonctionner sans ces données. Ce point est expliqué dans la politique de confidentialité.
- **Âge minimum** : 16 ans.
- **Hébergement de données de santé (HDS)** : l'application est un outil de bien-être où la personne saisit elle-même ses données, hors de toute prise en charge sanitaire. La certification HDS n'est a priori **pas** requise. **[À valider juridiquement]**
- **Analyse d'impact (AIPD)** : probablement requise (données sensibles à grande échelle). Une AIPD simplifiée doit être rédigée avant l'ouverture publique. **[À valider juridiquement]**

## 2. Texte de consentement (inscription)

> ☐ J'accepte que my-body traite mes données de santé (poids, mensurations, masse grasse, objectif) dans le seul but de me fournir le suivi de ma progression. Ces données ne sont ni vendues ni partagées. Je peux les exporter ou les supprimer à tout moment. [En savoir plus](/confidentialite)

> ☐ J'accepte les [conditions générales d'utilisation](/cgu).

Les deux cases sont **non pré-cochées** et obligatoires. La version des textes est enregistrée.

## 3. Droits des personnes

| Droit | Mise en œuvre |
|---|---|
| Accès et portabilité | Export CSV des pesées et mensurations depuis les Réglages (EF-SET-04) |
| Rectification | Toutes les données sont modifiables dans l'app |
| Effacement | Suppression du compte immédiate et définitive (EF-SET-05) |
| Retrait du consentement | Suppression du compte |
| Contact | Adresse email dédiée, indiquée dans la politique de confidentialité |

**Sauvegardes** : les données supprimées disparaissent des sauvegardes Neon à la fin de leur fenêtre de rétention (point-in-time restore, 7 jours sur l'offre de lancement). La politique de confidentialité le mentionne.

## 4. Sous-traitants et localisation

| Sous-traitant | Rôle | Région des données | Encadrement |
|---|---|---|---|
| Neon | Base PostgreSQL | UE (Francfort) | DPA Neon |
| Vercel | Hébergement, exécution | Fonctions en fra1. Les logs et le CDN peuvent transiter hors UE | DPA Vercel, clauses contractuelles types, EU-US Data Privacy Framework |
| Resend | Emails transactionnels | À vérifier au démarrage (région UE si disponible) | DPA Resend |
| Google | Connexion OAuth (optionnelle) | — | L'utilisateur choisit ce mode |

**Règle** : **aucune donnée de santé** n'est envoyée à Resend, dans les logs ou vers un outil d'analyse. Les emails ne contiennent ni poids ni mensurations. **[À valider juridiquement : le recours à Vercel, société américaine]**

## 5. Authentification et sessions

| Exigence | Détail |
|---|---|
| Mots de passe | Hachés par Better Auth (scrypt par défaut). 10 caractères minimum. Refus des 10 000 mots de passe les plus courants (C). |
| Sessions | Cookie `HttpOnly`, `Secure`, `SameSite=Lax`, durée de 30 jours glissante. Révocation à la déconnexion, à la réinitialisation et au changement de mot de passe. |
| Vérification d'email | Obligatoire pour les comptes email avant l'accès à l'app. |
| Limitation de débit | Limiteur intégré de Better Auth : connexion 5/min par IP et par email, inscription 3/min par IP, envoi d'email 3/h par adresse. |
| Réinitialisation | Jeton à usage unique, 1 h, message identique que l'email existe ou non. |
| OAuth Google | Portées `openid email profile` uniquement. Liaison automatique si l'email est vérifié chez Google. |

## 6. Autorisation et isolation des données

- **Chaque** requête métier est filtrée par `userId` issu de la **session serveur** (`requireUser()`), jamais d'un paramètre client.
- Les identifiants de ressources (uuid) reçus du client sont **toujours** revérifiés avec `WHERE id = $1 AND user_id = $2`. Une ressource d'un autre utilisateur renvoie « introuvable » (pas de 403 qui en révélerait l'existence).
- Des tests d'intégration dédiés vérifient cette isolation pour chaque action ([09](09-strategie-de-tests.md)).

## 7. Sécurité applicative

| Risque | Mesure |
|---|---|
| Injection SQL | Requêtes paramétrées exclusivement (Drizzle). Pas de SQL brut concaténé. |
| XSS | Échappement React. Aucun `dangerouslySetInnerHTML`. La note est affichée en texte brut. |
| CSRF | Server Actions (vérification d'origine intégrée à Next.js) et cookie `SameSite=Lax`. |
| Redirection ouverte | Le paramètre `next` n'accepte qu'un chemin interne commençant par `/` et pas par `//`. |
| Injection CSV | Dans l'export, toute cellule commençant par `=`, `+`, `-`, `@` est préfixée d'une apostrophe (sauf les nombres). |
| En-têtes | CSP stricte (`default-src 'self'`, polices servies par `next/font`), `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, HSTS. |
| Secrets | Uniquement dans les variables d'environnement Vercel. Rien dans le dépôt. |
| Dépendances | Dependabot ou Renovate activé, et `pnpm audit` en CI (non bloquant en V1). |

## 8. Journalisation

- Les logs serveur (Vercel) ne contiennent **ni** donnée de santé, **ni** email complet, **ni** jeton. On journalise l'`userId`, l'action, le code d'erreur et la durée.
- Rétention : celle de Vercel par défaut.

## 9. Cookies et traceurs

- Seul le cookie de session, strictement nécessaire, est déposé, **sans bandeau de consentement**.
- La mesure d'audience, si elle est activée, se fait **sans cookie** (Vercel Web Analytics), sans donnée de santé ni identifiant utilisateur.
