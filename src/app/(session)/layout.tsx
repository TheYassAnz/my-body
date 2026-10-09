import { requireUser } from "@/lib/session";

/** Full-screen flows (no tab bar): same access rule as (app). */
export default async function SessionLayout({ children }: { children: React.ReactNode }) {
  await requireUser("app");
  return <>{children}</>;
}
