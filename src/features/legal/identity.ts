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
