import { AppShell } from "@/components/app-shell/app-shell";
import { getWeightSheetDefaults } from "@/features/weight/sheet-defaults";
import { requireUser } from "@/lib/session";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("settings");
  // Settings is reachable before onboarding: no weighing sheet then.
  const weightSheet = await getWeightSheetDefaults(user);
  return (
    <AppShell emailVerified={user.emailVerified} weightSheet={weightSheet ?? undefined}>
      {children}
    </AppShell>
  );
}
