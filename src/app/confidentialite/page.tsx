import type { Metadata } from "next";
import { PRIVACY } from "@/features/legal/content/privacy";
import { LegalPage } from "@/features/legal/components/legal-page";
import { LEGAL_UPDATED_ON } from "@/features/legal/identity";

export const metadata: Metadata = { title: "Politique de confidentialité · my-body" };

export default function PrivacyPage() {
  return <LegalPage document={PRIVACY} updatedOn={LEGAL_UPDATED_ON} />;
}
