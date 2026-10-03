"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fieldError, fieldValue } from "@/lib/action-result";
import { signInAction } from "../client-actions";
import { FormError } from "./form-error";

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signInAction, null);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next} />
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
        autoComplete="current-password"
        required
        error={fieldError(state, "password")}
      />
      <Link href="/mot-de-passe-oublie" className="self-end text-xs text-fg-2 underline">
        Mot de passe oublié ?
      </Link>
      <FormError state={state} />
      <Button type="submit" loading={pending} className="w-full">
        Se connecter
      </Button>
    </form>
  );
}
