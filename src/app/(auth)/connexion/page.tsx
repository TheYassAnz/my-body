import Link from "next/link";
import { GoogleButton } from "@/features/auth/components/google-button";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { googleErrorMessage } from "@/features/auth/google-error";
import { safeNext } from "@/lib/access";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reinitialise?: string; error?: string }>;
}) {
  const { next, reinitialise, error } = await searchParams;
  const target = safeNext(next);
  const googleError = googleErrorMessage(error);
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Se connecter</h1>
      {reinitialise && (
        <p role="status" className="text-sm text-positive">
          Mot de passe modifié. Tu peux te connecter.
        </p>
      )}
      {googleError && (
        <p role="alert" className="text-sm text-fg">
          {googleError}
        </p>
      )}
      <GoogleButton
        next={target}
        errorCallbackURL={`/connexion?next=${encodeURIComponent(target)}`}
      />
      <p className="text-center text-xs text-muted">ou</p>
      <SignInForm next={target} />
      <p className="text-center text-sm text-fg-2">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="underline">
          Créer un compte
        </Link>
      </p>
    </>
  );
}
