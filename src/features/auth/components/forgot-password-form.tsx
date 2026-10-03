"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fieldError, fieldValue } from "@/lib/action-result";
import { requestPasswordResetAction } from "../client-actions";
import { FormError } from "./form-error";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, null);
  if (state?.ok) {
    return (
      <p role="status" className="text-sm text-fg-2">
        Si un compte vérifié existe avec cet email, tu vas recevoir un lien pour choisir un nouveau
        mot de passe. Il est valable 1 heure.
      </p>
    );
  }
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
      <FormError state={state} />
      <Button type="submit" loading={pending} className="w-full">
        Recevoir le lien
      </Button>
    </form>
  );
}
