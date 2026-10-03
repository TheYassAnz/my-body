import Link from "next/link";
import { GoogleButton } from "@/features/auth/components/google-button";
import { SignUpForm } from "@/features/auth/components/sign-up-form";
import { googleErrorMessage } from "@/features/auth/google-error";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const googleError = googleErrorMessage(error);
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Créer un compte</h1>
      {googleError && (
        <p role="alert" className="text-sm text-fg">
          {googleError}
        </p>
      )}
      <GoogleButton next="/onboarding" errorCallbackURL="/inscription" />
      <p className="text-center text-xs text-muted">ou</p>
      <SignUpForm />
      <p className="text-center text-sm text-fg-2">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="underline">
          Se connecter
        </Link>
      </p>
    </>
  );
}
