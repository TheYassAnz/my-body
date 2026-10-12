import Link from "next/link";

const LINKS = [
  ["/mentions-legales", "Mentions légales"],
  ["/cgu", "CGU"],
  ["/confidentialite", "Confidentialité"],
] as const;

/** Public footer: the three legal pages (EF-LEGAL-01). Tap targets are 44 px high (ENF-14). */
export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line pt-4 text-xs text-fg-2">
      <nav aria-label="Pages légales" className="flex flex-wrap gap-x-5">
        {LINKS.map(([href, label]) => (
          <Link key={href} href={href} className="inline-flex min-h-11 items-center underline">
            {label}
          </Link>
        ))}
      </nav>
      <p className="mt-1">© my-body</p>
    </footer>
  );
}
