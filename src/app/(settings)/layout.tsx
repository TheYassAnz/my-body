import { AppShell } from "@/components/app-shell/app-shell";
import { requireUser } from "@/lib/session";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("settings");
  return <AppShell emailVerified={user.emailVerified}>{children}</AppShell>;
}
