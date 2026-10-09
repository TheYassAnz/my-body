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
        "my-body dépose un seul cookie, le cookie de session (valable 30 jours), strictement nécessaire pour te garder connecté. Il ne demande aucun consentement : le site s'utilise donc sans bandeau. Si une mesure d'audience est activée, elle se fait sans cookie et sans donnée de santé.",
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
