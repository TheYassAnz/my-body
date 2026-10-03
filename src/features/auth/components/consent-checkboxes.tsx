import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { fieldError, type ActionResult } from "@/lib/action-result";

export function ConsentCheckboxes({ state }: { state: ActionResult | null }) {
  return (
    <>
      <Checkbox
        name="consentHealth"
        error={fieldError(state, "consentHealth")}
        label={
          <>
            J&apos;accepte que my-body traite mes données de santé (poids, mensurations, masse
            grasse, objectif) dans le seul but de me fournir le suivi de ma progression. Ces données
            ne sont ni vendues ni partagées. Je peux les exporter ou les supprimer à tout moment.{" "}
            <Link href="/confidentialite" className="underline">
              En savoir plus
            </Link>
          </>
        }
      />
      <Checkbox
        name="consentTerms"
        error={fieldError(state, "consentTerms")}
        label={
          <>
            J&apos;accepte les{" "}
            <Link href="/cgu" className="underline">
              conditions générales d&apos;utilisation
            </Link>
            .
          </>
        }
      />
    </>
  );
}
