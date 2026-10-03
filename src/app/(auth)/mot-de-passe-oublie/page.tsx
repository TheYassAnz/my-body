import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Mot de passe oublié</h1>
      <ForgotPasswordForm />
    </>
  );
}
