import { ConsentForm } from "@/features/auth/components/consent-form";
import { requireUser } from "@/lib/session";

export default async function ConsentPage() {
  await requireUser("consent");
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Avant de commencer</h1>
      <p className="text-sm text-fg-2">
        my-body a besoin de ton accord pour enregistrer tes données.
      </p>
      <ConsentForm />
    </main>
  );
}
