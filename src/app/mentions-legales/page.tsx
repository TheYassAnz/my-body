import type { Metadata } from "next";
import { NOTICE } from "@/features/legal/content/notice";
import { LegalPage } from "@/features/legal/components/legal-page";
import { LEGAL_UPDATED_ON } from "@/features/legal/identity";

export const metadata: Metadata = { title: "Mentions légales · my-body" };

export default function LegalNoticePage() {
  return <LegalPage document={NOTICE} updatedOn={LEGAL_UPDATED_ON} />;
}
