const PILLARS = [
  [
    "Tendance",
    "Ton poids du jour fluctue. my-body lisse les pesées pour te montrer la tendance, la seule chose qui compte.",
  ],
  [
    "Silhouette",
    "Touche une zone de ta silhouette pour saisir une mensuration. Vois d'un coup d'œil ce qui change, même quand le poids stagne.",
  ],
  [
    "Rythme",
    "Perte, prise ou maintien : my-body te dit si ton rythme est adapté à ton objectif, et estime la date où tu l'atteindras.",
  ],
] as const;

export function Pillars() {
  return (
    <section aria-labelledby="pillars-title" className="mt-16">
      <h2 id="pillars-title" className="sr-only">
        Ce que fait my-body
      </h2>
      <div className="grid gap-8 lg:grid-cols-3">
        {PILLARS.map(([title, text]) => (
          <div key={title} className="border-t border-line pt-4">
            <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
            <p className="mt-2 text-sm text-fg-2">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
