import { AppShell } from "@/components/app-shell/app-shell";
import { getLatestWeight } from "@/features/weight/queries";
import { today } from "@/lib/dates";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/session";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("settings");
  const latest = await getLatestWeight(getDb(), user.userId);
  return (
    <AppShell
      emailVerified={user.emailVerified}
      weightSheet={{
        today: today(user.profile?.timezone ?? "Europe/Paris"),
        lastWeightKg: latest?.weightKg ?? null,
        unit: user.profile?.weightUnit ?? "kg",
      }}
    >
      {children}
    </AppShell>
  );
}
