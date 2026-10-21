/**
 * Facts about the publisher that only the project owner can supply (specs/07 §3).
 * Replace every "[À renseigner : …]" before the public launch (specs/10 launch checklist).
 */
export const LEGAL_IDENTITY = {
  publisher: "Yassine ANZAR BASHA",
  status: "entreprise individuelle",
  contactEmail: "yassanz.contact@gmail.com",
  host: "Vercel Inc. (États-Unis, vercel.com)",
  database: "Neon (région UE, Francfort)",
} as const;

/** ISO date of the last edit of the legal texts: shown on every legal page. */
export const LEGAL_UPDATED_ON = "2026-10-09";
