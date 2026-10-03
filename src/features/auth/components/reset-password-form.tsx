"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fieldError } from "@/lib/action-result";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/constants";
import { resetPasswordAction } from "../client-actions";
import { FormError } from "./form-error";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, null);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <Input
        label="Nouveau mot de passe"
        name="password"
        type="password"
        autoComplete="new-password"
        hint={`Au moins ${PASSWORD_MIN_LENGTH} caractères`}
        error={fieldError(state, "password")}
      />
      <Input
        label="Confirme le mot de passe"
        name="confirm"
        type="password"
        autoComplete="new-password"
        error={fieldError(state, "confirm")}
      />
      <FormError state={state} />
      <Button type="submit" loading={pending} className="w-full">
        Enregistrer
      </Button>
    </form>
  );
}
