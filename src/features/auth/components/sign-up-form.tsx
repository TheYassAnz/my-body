"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fieldError, fieldValue } from "@/lib/action-result";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/constants";
import { signUpAction } from "../client-actions";
import { ConsentCheckboxes } from "./consent-checkboxes";
import { FormError } from "./form-error";

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUpAction, null);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={fieldValue(state, "email")}
        error={fieldError(state, "email")}
      />
      <Input
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint={`Au moins ${PASSWORD_MIN_LENGTH} caractères`}
        error={fieldError(state, "password")}
      />
      <ConsentCheckboxes state={state} />
      <FormError state={state} />
      <Button type="submit" loading={pending} className="w-full">
        Créer mon compte
      </Button>
    </form>
  );
}
