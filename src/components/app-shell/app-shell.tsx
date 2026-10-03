import { EmailBanner } from "./email-banner";
import { BottomNav, SideNav } from "./nav-links";

export function AppShell({
  emailVerified,
  children,
}: {
  emailVerified: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-[210px] shrink-0 flex-col border-r border-line px-4 py-6 lg:flex">
        <p className="px-2.5 pb-6 text-[17px] font-bold tracking-tight">
          <span aria-hidden className="mr-2 inline-block size-2.5 rounded-full bg-fg" />
          my-body
        </p>
        <SideNav />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {!emailVerified && <EmailBanner />}
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-[22px] pt-8 pb-28 lg:px-10 lg:pb-10">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
