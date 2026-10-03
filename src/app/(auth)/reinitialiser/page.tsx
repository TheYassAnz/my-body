import Link from "next/link";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Nouveau mot de passe</h1>
      {token && !error ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="text-sm text-fg-2">
          Ce lien est invalide ou a expiré.{" "}
          <Link href="/mot-de-passe-oublie" className="underline">
            Refaire une demande
          </Link>
        </p>
      )}
    </>
  );
}
