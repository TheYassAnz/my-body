import { AppShell } from "@/components/app-shell/app-shell";
import { requireUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("app");
  return <AppShell emailVerified={user.emailVerified}>{children}</AppShell>;
}
