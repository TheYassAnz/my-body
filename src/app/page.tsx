import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6">
      <h1 className="text-3xl font-semibold tracking-tight">my-body</h1>
      <p className="text-fg-2">
        Suis ton poids et tes mensurations, et comprends ce qu&apos;ils veulent dire.
      </p>
      <div className="flex gap-3">
        <Link
          href="/inscription"
          className="rounded-full bg-fg px-5 py-2.5 text-sm font-semibold text-white"
        >
          Commencer gratuitement
        </Link>
        <Link
          href="/connexion"
          className="rounded-full border border-fg px-5 py-2.5 text-sm font-semibold"
        >
          Se connecter
        </Link>
      </div>
    </main>
  );
}
