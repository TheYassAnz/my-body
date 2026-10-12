import type { Metadata } from "next";
import { TERMS } from "@/features/legal/content/terms";
import { LegalPage } from "@/features/legal/components/legal-page";
import { LEGAL_UPDATED_ON } from "@/features/legal/identity";

export const metadata: Metadata = { title: "Conditions générales d'utilisation · my-body" };

export default function TermsPage() {
  return <LegalPage document={TERMS} updatedOn={LEGAL_UPDATED_ON} />;
}
