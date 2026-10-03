import { Button } from "@/components/ui/button";
import { signOutAction } from "@/features/auth/actions";
import { requireUser } from "@/lib/session";

export default async function SettingsPage() {
  const user = await requireUser("settings");
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight lg:text-[28px]">Réglages</h1>
      <section className="mt-8 flex flex-col gap-4 border-t border-line pt-6">
        <h2 className="text-[15px] font-semibold tracking-tight">Compte</h2>
        <p className="text-sm text-fg-2">{user.email}</p>
        <form action={signOutAction}>
          <Button type="submit" variant="secondary">
            Se déconnecter
          </Button>
        </form>
      </section>
    </>
  );
}
