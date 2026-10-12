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
