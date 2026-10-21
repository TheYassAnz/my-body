"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import { GoogleLogo } from "./google-logo";

/**
 * `errorCallbackURL` receives `?error=<code>` when Google sign-in fails
 * (shown with googleErrorMessage), instead of Better Auth's default error page.
 */
export function GoogleButton({
  next,
  errorCallbackURL,
}: {
  next: string;
  errorCallbackURL: string;
}) {
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);

  const signIn = async () => {
    setPending(true);
    setFailed(false);
    try {
      const { error } = await authClient.signIn.social({
        provider: "google",
        callbackURL: next,
        errorCallbackURL,
      });
      if (error) setFailed(true);
    } catch {
      setFailed(true);
    }
    setPending(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="secondary"
        className="w-full gap-2"
        loading={pending}
        onClick={signIn}
      >
        <GoogleLogo />
        Continuer avec Google
      </Button>
      {failed && <Alert>La connexion avec Google est indisponible. Réessaie plus tard.</Alert>}
    </div>
  );
}
