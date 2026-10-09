import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/features/auth/actions";
import { ProfileSettingsForm } from "@/features/profile/components/profile-settings-form";
import { ReminderSettingsForm } from "@/features/profile/components/reminder-settings-form";
import { UnitsSettingsForm } from "@/features/profile/components/units-settings-form";
import { requireUser } from "@/lib/session";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 flex flex-col gap-4 border-t border-line pt-6">
      <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export default async function SettingsPage() {
  const { email, profile } = await requireUser("settings");
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight lg:text-[28px]">Réglages</h1>
      {profile && (
        <>
          <Section title="Profil">
            {/* The key remounts the form once the saved values come back from the server. */}
            <ProfileSettingsForm
              key={`${profile.sex}${profile.heightCm}${profile.birthDate}`}
              defaults={{
                sex: profile.sex,
                heightCm: profile.heightCm,
                birthDate: profile.birthDate,
                lengthUnit: profile.lengthUnit,
              }}
            />
          </Section>
          <Section title="Affichage">
            <UnitsSettingsForm
              key={`${profile.weightUnit}${profile.lengthUnit}`}
              defaults={{ weightUnit: profile.weightUnit, lengthUnit: profile.lengthUnit }}
            />
          </Section>
          <Section title="Rappel">
            <ReminderSettingsForm
              key={String(profile.reminderWeekday)}
              defaults={{ weekday: profile.reminderWeekday }}
            />
          </Section>
        </>
      )}
      <Section title="Compte">
        <p className="text-sm text-fg-2">{email}</p>
        <form action={signOutAction}>
          <Button type="submit" variant="secondary">
            Se déconnecter
          </Button>
        </form>
      </Section>
      <Section title="Légal">
        <nav aria-label="Pages légales" className="flex flex-col gap-2 text-sm">
          <Link href="/mentions-legales" className="underline">
            Mentions légales
          </Link>
          <Link href="/cgu" className="underline">
            Conditions générales d&apos;utilisation
          </Link>
          <Link href="/confidentialite" className="underline">
            Politique de confidentialité
          </Link>
        </nav>
      </Section>
    </>
  );
}
