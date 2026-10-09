import Link from "next/link";
import { SiteFooter } from "@/features/legal/components/site-footer";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 py-12">
      <Link href="/" className="text-[17px] font-bold tracking-tight">
        <span aria-hidden className="mr-2 inline-block size-2.5 rounded-full bg-fg" />
        my-body
      </Link>
      {children}
      <SiteFooter />
    </main>
  );
}
