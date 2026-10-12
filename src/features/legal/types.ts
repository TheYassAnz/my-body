/** A paragraph, or a bulleted list. */
export type LegalBlock = string | { list: readonly string[] };
export type LegalSection = { id: string; heading: string; blocks: readonly LegalBlock[] };
export type LegalDocument = { title: string; sections: readonly LegalSection[] };
