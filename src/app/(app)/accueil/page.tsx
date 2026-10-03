import { User } from "lucide-react";
import Link from "next/link";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight lg:text-[28px]">Bonjour</h1>
        <Link
          href="/reglages"
          aria-label="Réglages"
          className="flex size-11 items-center justify-center rounded-full border border-line text-fg lg:hidden"
        >
          <User size={20} strokeWidth={1.7} aria-hidden />
        </Link>
      </div>
      {email === "verifie" && (
        <p role="status" className="mt-3 text-sm text-positive">
          Email confirmé.
        </p>
      )}
      <p className="mt-6 text-sm text-fg-2">Ton tableau de bord arrive bientôt.</p>
    </>
  );
}
