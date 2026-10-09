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
