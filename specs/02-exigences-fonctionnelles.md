# 02 · Exigences fonctionnelles

Format : **ID · Priorité (M/S/C) · Exigence**, suivi des **critères d'acceptation** (CA).
Les règles de calcul citées sont détaillées dans [03](03-regles-metier-et-calculs.md), et les écrans dans [01](01-parcours-et-ecrans.md).

---

## AUTH : compte et authentification

**EF-AUTH-01 · M · Inscription par email et mot de passe**
- CA1 : L'email doit être valide et unique (insensible à la casse). Sinon : « Un compte existe déjà avec cet email. »
- CA2 : Le mot de passe fait au moins 10 caractères. Le serveur applique la même règle que le client.
- CA3 : Le consentement au traitement des données de santé et l'acceptation des CGU sont obligatoires. La date et la version du texte accepté sont enregistrées.
- CA4 : Un email de vérification est envoyé. L'utilisateur accède **immédiatement** à l'onboarding puis à l'app, sans attendre la vérification.
- CA5 : Tant que l'email n'est pas vérifié, un bandeau discret s'affiche en haut de l'app : « Confirme ton email pour pouvoir récupérer ton compte. » avec un bouton « Renvoyer » (60 s minimum entre deux envois) et une fermeture pour la session en cours.
- CA6 : Le lien de vérification (`/api/auth/verify-email?token=…`) confirme l'adresse puis redirige vers `/accueil?email=verifie`, qui affiche « Email confirmé ».

**EF-AUTH-02 · M · Connexion et inscription avec Google**
- CA1 : Si l'email Google correspond à un compte existant, les deux sont liés automatiquement.
- CA2 : Lors d'une première connexion Google, l'écran de consentement (EF-AUTH-01 CA3) est présenté avant l'onboarding.

**EF-AUTH-03 · M · Connexion par email et mot de passe**
- CA1 : En cas d'identifiants invalides, le message est générique (« Email ou mot de passe incorrect ») et ne révèle pas si l'email existe.
- CA2 : Les tentatives sont limitées (voir [07](07-securite-et-rgpd.md)).
- CA3 : Après connexion, l'utilisateur est redirigé vers `next` (s'il s'agit d'une route interne) ou vers `/accueil`.

**EF-AUTH-04 · M · Mot de passe oublié**
- CA1 : Un lien de réinitialisation à usage unique, valable 1 heure, est envoyé. Le message affiché est identique que l'email existe ou non.
- CA2 : Après réinitialisation, toutes les autres sessions sont révoquées.
- CA3 : Le lien n'est envoyé **que si l'email est vérifié**. Pour un email non vérifié, rien n'est envoyé, mais le message affiché reste identique (on ne révèle pas l'état du compte). Cela évite qu'un tiers qui possède une adresse mal tapée prenne le contrôle du compte.

**EF-AUTH-05 · M · Déconnexion**
- CA1 : La session serveur est révoquée et l'utilisateur est redirigé vers `/connexion`.

**EF-AUTH-06 · S · Changer de mot de passe** (comptes email)
- CA1 : Le mot de passe actuel est exigé. Les autres sessions sont révoquées.

---

## ONB : onboarding

**EF-ONB-01 · M · Assistant en 5 étapes** (sexe, taille et date de naissance, poids actuel, objectif, première séance)
- CA1 : Chaque étape est enregistrée à la validation. Revenir sur `/onboarding` reprend à la première étape incomplète.
- CA2 : L'étape 3 crée une pesée datée du jour.
- CA3 : L'étape 4 crée l'objectif actif. Son `startWeightKg` est égal au poids saisi à l'étape 3.
- CA4 : L'étape 5 est optionnelle. « Plus tard » termine l'onboarding.
- CA5 : Un utilisateur de moins de 16 ans voit le message « my-body est réservé aux 16 ans et plus » et ne peut pas continuer.

**EF-ONB-02 · M · Accès conditionné**
- CA1 : Tant que le profil, une pesée et un objectif actif n'existent pas **à la fin de l'onboarding**, toute route connectée hors `/onboarding` et `/reglages` redirige vers `/onboarding`.
- CA2 : Un compte onboardé sans objectif actif (avant L3, ou après « Nouvel objectif ») n'est pas renvoyé vers `/onboarding` : `/accueil` et `/objectif` proposent d'en définir un.

---

## WGT : pesées

**EF-WGT-01 · M · Saisir une pesée**
- CA1 : Champs : date (défaut aujourd'hui, jamais future), poids (obligatoire), % masse grasse (optionnel), note (optionnelle, 140 caractères maximum).
- CA2 : Bornes : poids de 20 à 400 kg, % MG de 2 à 70. La saisie en lb est convertie avant validation.
- CA3 : Le champ poids est pré-rempli avec la dernière pesée (ou le poids d'onboarding).
- CA4 : L'accueil et les indicateurs se mettent à jour immédiatement après l'enregistrement.

**EF-WGT-02 · M · Une pesée par jour**
- CA1 : Si une pesée existe déjà à la date choisie, l'utilisateur doit confirmer le remplacement. Confirmer met à jour la pesée existante.

**EF-WGT-03 · S · Détection de valeur suspecte**
- CA1 : Si la tendance existe (au moins 3 pesées) et que la valeur s'en écarte de plus de 5 %, une confirmation affiche l'écart en kg. L'enregistrement reste possible.

**EF-WGT-04 · M · Modifier ou supprimer une pesée**
- CA1 : Accessible depuis l'historique de Progrès. Tous les champs sont modifiables, y compris la date (soumise à EF-WGT-02).
- CA2 : La suppression demande une confirmation. Tendance, rythme et statut sont recalculés.
- CA3 (S) : Un toast « Annuler » pendant 5 s permet de restaurer la pesée supprimée.

---

## MEA : mensurations

**EF-MEA-01 · M · Huit zones fixes**
- CA1 : Zones : cou, épaules, poitrine, bras, taille, hanches, cuisse, mollet. Chacune est bornée entre 10 et 250 cm (ou l'équivalent en pouces).

**EF-MEA-02 · M · Séance de mesure guidée**
- CA1 : Les zones défilent dans l'ordre fixe et la zone courante est surlignée sur la silhouette.
- CA2 : Chaque zone affiche la valeur précédente et sa date, un champ pré-rempli avec cette valeur et le protocole de mesure.
- CA3 : Une zone peut être passée : aucune valeur n'est alors enregistrée pour elle.
- CA4 : Chaque valeur est enregistrée au passage à la zone suivante. Quitter conserve les valeurs déjà saisies.
- CA5 : Toutes les valeurs sont rattachées à la séance du jour, créée si besoin.
- CA6 : Un écran de fin récapitule les valeurs saisies et leur écart avec la dernière mesure précédente de chaque zone.

**EF-MEA-03 · M · Saisie d'une zone isolée depuis la silhouette**
- CA1 : Toucher un point de zone ouvre un panneau de saisie (valeur précédente, protocole, date du jour modifiable).
- CA2 : La mesure est rattachée à la séance de la date choisie. Si la zone y a déjà une valeur, l'utilisateur confirme le remplacement.

**EF-MEA-04 · M · Modifier ou supprimer une mesure**
- CA1 : Depuis l'historique d'une zone dans Progrès. Une séance vidée de toutes ses mesures est supprimée.

**EF-MEA-05 · S · Rappel de mesure dans l'app**
- CA1 : Si un jour de mesure est choisi, l'accueil affiche « Prochaine mesure : <jour> » (le jour même : « aujourd'hui »).
- CA2 : Si la dernière séance date de plus de 14 jours, ou s'il n'y en a aucune, un appel à l'action « Il est temps de te mesurer » s'affiche.

---

## BODY : silhouette

**EF-BODY-01 · M · Silhouette annotée**
- CA1 : La silhouette dépend du sexe du profil.
- CA2 : Chaque zone affiche sa dernière valeur connue et son écart sur la période choisie (7 j, 30 j, 90 j, Début), selon [03 §6](03-regles-metier-et-calculs.md).
- CA3 : L'écart est vert s'il est favorable à l'objectif, gris sinon. Aucun rouge n'est utilisé.
- CA4 : Une zone jamais mesurée affiche un point creux et « — ».
- CA5 : Chaque point est un bouton accessible au clavier, avec une étiquette complète, par exemple « Taille : 84 cm, moins 3,5 cm sur 30 jours ».

---

## GOAL : objectifs

**EF-GOAL-01 · M · Créer un objectif**
- CA1 : Types : perte, prise, recompo, maintien. À l'onboarding, une 5e option « Juste suivre mon poids » crée directement un objectif **maintien**, sans autre question.
- CA2 : Perte et prise : cible obligatoire, strictement inférieure (perte) ou supérieure (prise) à la tendance actuelle. Rythme obligatoire, dans les bornes du type.
- CA3 : Maintien et recompo : pas de cible ni de rythme. Le poids de référence est la tendance actuelle.
- CA4 : `startWeightKg` est la tendance à la création (ou la dernière pesée pendant le calibrage). `startDate` est aujourd'hui.
- CA5 : Un aperçu en direct affiche le rythme en kg/semaine et la date d'atteinte théorique.

**EF-GOAL-02 · M · Un seul objectif actif**
- CA1 : Créer un objectif d'un autre type archive l'objectif actif, après confirmation.
- CA2 : Modifier la cible ou le rythme de l'objectif actif ne crée pas de nouvel objectif.

**EF-GOAL-03 · M · Statut et projection**
- CA1 : Le statut est calculé selon [03 §5](03-regles-metier-et-calculs.md) et affiché sur l'Accueil et sur Objectif, avec son message.
- CA2 : La projection est affichée seulement si elle est calculable ([03 §5.4](03-regles-metier-et-calculs.md)).

**EF-GOAL-04 · M · Objectif atteint**
- CA1 : Quand la tendance franchit la cible, un bandeau propose « Passer en maintien » ou « Nouvel objectif ».
- CA2 : Dans les deux cas, l'objectif courant passe au statut `achieved`.

**EF-GOAL-05 · S · Historique des objectifs**
- CA1 : Liste des objectifs archivés ou atteints : type, période, poids de départ, poids (tendance) à la fin, statut.

---

## PROG : progrès

**EF-PROG-01 · M · Graphique par métrique**
- CA1 : Métriques : poids, % MG (si au moins une valeur), chacune des 8 zones.
- CA2 : Périodes : 1M, 3M, 6M, 1A, Tout. La période par défaut est 3M, ou Tout si l'historique est plus court.
- CA3 : Poids : pesées brutes, tendance, ligne cible (si l'objectif en a une) et projection.
- CA4 : Une infobulle au survol ou au toucher affiche la date, la valeur dans l'unité choisie et la note.

**EF-PROG-02 · M · Statistiques de période**
- CA1 : Variation (dernière valeur − première valeur de la période ; pour le poids, sur la tendance).
- CA2 : Rythme (poids) ou écart depuis le début (zones), plus le nombre de mesures.

**EF-PROG-03 · M · Historique éditable**
- CA1 : Liste antichronologique paginée (50 lignes, puis « Charger plus »). Ouvre l'édition (EF-WGT-04, EF-MEA-04).

---

## SET : réglages et données

**EF-SET-01 · M · Modifier le profil** (sexe, taille, date de naissance)
- CA1 : Changer de sexe change la silhouette sans toucher aux données.

**EF-SET-02 · M · Unités d'affichage**
- CA1 : Le poids s'affiche en kg ou en lb, les longueurs en cm ou en in. Le choix s'applique partout : affichage, saisie, graphiques, export.
- CA2 : Les valeurs stockées restent métriques. Conversion et arrondi suivent [03 §8](03-regles-metier-et-calculs.md).

**EF-SET-03 · S · Jour de mesure conseillé** (lundi à dimanche, ou aucun)

**EF-SET-04 · M · Export CSV**
- CA1 : `pesees.csv` avec les colonnes `date;poids_kg;masse_grasse_pct;note`.
- CA2 : `mensurations.csv` avec les colonnes `date;zone;valeur_cm`.
- CA3 : Encodage UTF-8 avec BOM, séparateur `;`, décimale `.`, dates ISO 8601. Toujours en unités métriques.

**EF-SET-05 · M · Suppression du compte**
- CA1 : La confirmation exige de saisir `SUPPRIMER`.
- CA2 : Suppression immédiate et définitive de l'utilisateur et de toutes ses données (cascade), puis révocation des sessions et redirection vers `/`.
- CA3 : Un email de confirmation de suppression est envoyé.

---

## LEGAL : pages légales

**EF-LEGAL-01 · M** : pages Mentions légales, CGU et Politique de confidentialité, accessibles sans connexion et liées depuis l'inscription, le pied de page public et les Réglages.

**EF-LEGAL-02 · M** : un avertissement non médical figure dans les CGU et en bas des écrans Objectif : « my-body ne fournit pas de conseil médical. Consulte un professionnel de santé avant de débuter un régime. »

---

## PUB : page d'accueil publique

**EF-PUB-01 · S** : page `/` présentant les trois piliers (tendance, silhouette, rythme), avec une capture de l'app et deux boutons « Commencer gratuitement » et « Se connecter ». Même direction visuelle « Clarté ».
