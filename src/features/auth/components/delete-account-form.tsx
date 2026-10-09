"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fieldError } from "@/lib/action-result";
import { deleteAccountAction } from "../client-actions";
import { FormError } from "./form-error";

export function DeleteAccountForm({ needsPassword }: { needsPassword: boolean }) {
  const [state, action, pending] = useActionState(deleteAccountAction, null);

  return (
    <form action={action} aria-label="Suppression du compte" className="flex flex-col gap-4">
      <p className="text-sm text-fg-2">
        La suppression est immédiate et définitive : ton compte, tes pesées, tes mensurations et ton
        objectif sont effacés. Tu recevras un email de confirmation.
      </p>
      <Input
        label="Pour confirmer, saisis SUPPRIMER"
        name="confirmation"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        error={fieldError(state, "confirmation")}
      />
      {needsPassword && (
        <Input
          label="Mot de passe"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          error={fieldError(state, "password")}
        />
      )}
      <FormError state={state} />
      <Button type="submit" variant="danger" loading={pending} className="self-start">
        Supprimer mon compte
      </Button>
    </form>
  );
}
