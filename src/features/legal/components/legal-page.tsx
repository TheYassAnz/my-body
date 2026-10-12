import Link from "next/link";
import type { LegalBlock, LegalDocument } from "../types";
import { SiteFooter } from "./site-footer";

const longDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === "string")
    return <p className="text-sm leading-relaxed text-fg-2">{block}</p>;
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-fg-2">
      {block.list.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/** Public legal page: no session needed (EF-LEGAL-01). */
export function LegalPage({ document, updatedOn }: { document: LegalDocument; updatedOn: string }) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href="/"
        className="inline-flex min-h-11 items-center text-[17px] font-bold tracking-tight"
      >
        <span aria-hidden className="mr-2 inline-block size-2.5 rounded-full bg-fg" />
        my-body
      </Link>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">{document.title}</h1>
      <p role="note" className="mt-4 rounded-xl bg-surface px-4 py-3 text-sm text-fg-2">
        Version provisoire, en cours de validation juridique. Dernière mise à jour :{" "}
        {longDate.format(new Date(updatedOn))}.
      </p>
      {document.sections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          aria-labelledby={`${section.id}-title`}
          className="mt-8 flex flex-col gap-3"
        >
          <h2 id={`${section.id}-title`} className="text-[15px] font-semibold tracking-tight">
            {section.heading}
          </h2>
          {section.blocks.map((block, index) => (
            <Block key={index} block={block} />
          ))}
        </section>
      ))}
      <SiteFooter />
    </main>
  );
}
