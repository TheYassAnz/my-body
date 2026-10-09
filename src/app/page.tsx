import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LandingPreview } from "@/features/landing/components/landing-preview";
import { Pillars } from "@/features/landing/components/pillars";
import { SiteFooter } from "@/features/legal/components/site-footer";
import { getAuth } from "@/lib/auth";

async function isSignedIn(requestHeaders: Headers): Promise<boolean> {
  try {
    return Boolean(await getAuth().api.getSession({ headers: requestHeaders }));
  } catch {
    // A failing lookup must not take the public page down.
    return false;
  }
}

export default async function HomePage() {
  // headers() outside the try: it is what makes the route dynamic.
  if (await isSignedIn(await headers())) redirect("/accueil");

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/"
        className="inline-flex min-h-11 items-center text-[17px] font-bold tracking-tight"
      >
        <span aria-hidden className="mr-2 inline-block size-2.5 rounded-full bg-fg" />
        my-body
      </Link>
      <section className="mx-auto mt-12 max-w-2xl text-center">
        <h1 className="text-balance text-4xl font-semibold tracking-tight lg:text-5xl">
          Comprends ce que ton poids veut dire.
        </h1>
        <p className="mt-4 text-fg-2">
          Suis ton poids et tes mensurations. my-body en tire la tendance, te montre ta silhouette
          évoluer et te dit si ton rythme est adapté à ton objectif. Gratuit.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/inscription"
            className="inline-flex h-11 items-center rounded-full bg-fg px-6 text-sm font-semibold text-white hover:opacity-90"
          >
            Commencer gratuitement
          </Link>
          <Link
            href="/connexion"
            className="inline-flex h-11 items-center rounded-full border border-fg px-6 text-sm font-semibold hover:bg-line"
          >
            Se connecter
          </Link>
        </div>
      </section>
      <div className="mt-14">
        <LandingPreview />
      </div>
      <Pillars />
      <SiteFooter />
    </main>
  );
}
