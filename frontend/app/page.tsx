import { CategoryCard, type Accent } from "@/components/ui/card";

const streams: { accent: Accent; name: string; text: string }[] = [
  { accent: "purple", name: "Orders", text: "Every channel, one ledger. Prepaid and COD." },
  { accent: "blue", name: "Payments", text: "Gateway settlements and COD remittances, net of fees." },
  { accent: "orange", name: "Returns", text: "Partial returns and the refunds they should trigger." },
  { accent: "pink", name: "Review queue", text: "Unsure matches surface with the reasons why." },
  { accent: "green", name: "Reconciled", text: "Confirmed matches with a full audit trail." },
];

export default function Home() {
  return (
    <main>
      <header className="sticky top-0 z-10 border-b border-hairline bg-canvas">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-3xl">
          <span className="text-body-md font-semibold text-ink">Recon Desk</span>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-3xl md:py-24">
        <p className="text-eyebrow uppercase text-body-mid">Reconciliation for D2C home brands</p>
        <h1 className="mt-4 max-w-4xl text-[40px] font-semibold leading-[1.05] tracking-[-0.4px] md:text-display-xxl">
          Every order, payment and return, accounted for.
        </h1>
        <p className="mt-6 max-w-2xl text-body-md text-body md:text-display-xs md:font-normal">
          Match settlements to orders, catch short COD remittances and duplicate refunds, and review only what needs a human.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 md:px-3xl">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {streams.map((s) => (
            <CategoryCard key={s.name} accent={s.accent} className="min-h-48">
              <h2 className="text-display-sm !text-current">{s.name}</h2>
              <p className="mt-3 text-body-sm">{s.text}</p>
            </CategoryCard>
          ))}
        </div>
      </section>
    </main>
  );
}
