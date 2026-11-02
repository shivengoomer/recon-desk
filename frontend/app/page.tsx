import Link from "next/link";
import { CategoryCard, type Accent } from "@/components/ui/card";
import { Logo } from "@/components/shell";

const CATCHES: { accent: Accent; title: string; text: string }[] = [
  { accent: "purple", title: "Short-paid settlements", text: "Compare what a marketplace paid with what its rate card says it should, per order, net of fees." },
  { accent: "blue", title: "Unremitted COD", text: "Cash collected by couriers that never reached your account, aged from the day it fell due." },
  { accent: "orange", title: "Freight overcharges", text: "Wrong weight slabs and surcharges, caught by recomputing every freight invoice line." },
  { accent: "pink", title: "Formats that change", text: "A partner renames a column? Review a suggested mapping on 20 rows, approve it, and roll back any time." },
  { accent: "green", title: "TCS and TDS, kept apart", text: "Statutory deductions are shown per partner and never mistaken for leakage." },
];

const STEPS = [
  ["Upload", "Drop CSV or Excel reports from every marketplace, courier and your own store."],
  ["Map once", "Columns are suggested, previewed and saved per partner. Re-uploads are safe and de-duplicated."],
  ["Match", "Rules compare each order with the rate card. 1 lakh orders in about nine seconds."],
  ["Claim", "Every shortfall lands in a claims list with the evidence to send to the partner."],
];

export default function Landing() {
  return (
    <div className="bg-canvas">
      <header className="sticky top-0 z-20 border-b border-hairline bg-canvas/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-3xl">
          <Link href="/" className="flex items-center gap-2.5 text-body-md font-semibold text-ink"><Logo />Recon Desk</Link>
          <nav aria-label="Sections" className="hidden items-center gap-8 md:flex">
            {[["#catches", "What it catches"], ["#how", "How it works"], ["#trust", "Security"]].map(([h, l]) => <a key={h} href={h} className="text-body-sm font-medium text-ink hover:underline">{l}</a>)}
          </nav>
          <Link href="/login" className="inline-flex min-h-11 items-center rounded-sm bg-primary px-5 text-body-md font-medium text-on-primary hover:bg-ink-strong">Sign in</Link>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-4 pb-12 pt-16 md:px-3xl md:pt-24">
          <p className="text-eyebrow uppercase text-body-mid">Reconciliation for D2C brands</p>
          <h1 className="mt-5 max-w-5xl text-[44px] font-semibold leading-[1.04] tracking-[-0.5px] md:text-display-xxl">Find every rupee your partners owe you.</h1>
          <p className="mt-6 max-w-2xl text-body-md text-body md:text-display-xs md:font-normal md:leading-8">
            Upload settlement, COD and freight reports. Recon Desk checks every order against your rate cards and turns each shortfall into a claim with evidence.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="inline-flex min-h-11 items-center rounded-sm bg-primary px-6 text-body-md font-medium text-on-primary hover:bg-ink-strong">Sign in</Link>
            <a href="#how" className="inline-flex min-h-11 items-center rounded-sm border border-hairline bg-canvas px-6 text-body-md font-medium text-ink hover:bg-soft">See how it works</a>
          </div>
        </section>

        <section aria-label="Product preview" className="mx-auto max-w-7xl px-4 pb-20 md:px-3xl">
          <div className="grid gap-4 rounded-md bg-soft p-4 md:grid-cols-5 md:p-6">
            <div className="rounded-md bg-primary p-6 text-on-primary shadow-layer-2 md:col-span-2 md:p-8">
              <p className="text-eyebrow-sm uppercase text-on-primary/60">Open claims</p>
              <p className="tabular mt-3 text-[56px] font-semibold leading-none tracking-tight">₹74,997</p>
              <p className="mt-3 text-body-sm text-on-primary/70">across 126 claims</p>
              <div className="mt-8 flex h-3 overflow-hidden rounded-xs bg-white/10" aria-hidden>
                <div className="w-[38%] bg-mute-soft" /><div className="w-[36%] bg-accent-yellow" /><div className="w-[20%] bg-accent-orange" /><div className="w-[6%] bg-accent-red" />
              </div>
              <p className="mt-2 text-body-sm text-on-primary/60">Aged 0–30, 31–60, 61–90, 90+ days</p>
            </div>
            <div className="overflow-hidden rounded-md border border-hairline bg-canvas md:col-span-3">
              <div className="flex items-center justify-between border-b border-hairline px-5 py-3"><p className="text-body-sm font-medium text-ink">Largest differences</p><p className="text-body-sm text-body-mid">Orders</p></div>
              {[["ORD-W-204118", "Website · COD · Delivered", "−₹1,409.00", "Unpaid"], ["ORD-M-88120", "Marketplace 1 · Prepaid", "−₹37.00", "Short-paid"], ["ORD-W-204377", "Website · Returned", "−₹46.00", "Short-paid"]].map(([id, sub, diff, st]) => (
                <div key={id} className="flex items-center justify-between gap-4 border-b border-hairline px-5 py-4 last:border-b-0">
                  <div><p className="font-mono text-caption-mono text-ink">{id}</p><p className="text-body-sm text-body-mid">{sub}</p></div>
                  <div className="flex items-center gap-4"><span className="hidden rounded-sm bg-accent-red/10 px-2 py-1 text-caption text-on-soft-red sm:inline">{st}</span><span className="tabular text-body-md font-semibold text-on-soft-red">{diff}</span></div>
                </div>))}
            </div>
          </div>
        </section>

        <section id="catches" className="mx-auto max-w-7xl scroll-mt-20 px-4 pb-24 md:px-3xl">
          <p className="text-eyebrow uppercase text-body-mid">What it catches</p>
          <h2 className="mt-3 max-w-3xl text-[32px] font-semibold leading-tight md:text-display-lg">The leaks that live between your reports.</h2>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {CATCHES.map((c, i) => (
              <CategoryCard key={c.title} accent={c.accent} className={`min-h-56 ${i === 0 ? "lg:col-span-2" : ""}`}>
                <h3 className="text-display-sm !text-current">{c.title}</h3>
                <p className="mt-3 max-w-md text-body-sm opacity-95">{c.text}</p>
              </CategoryCard>))}
          </div>
        </section>

        <section id="how" className="scroll-mt-20 border-y border-hairline bg-soft">
          <div className="mx-auto max-w-7xl px-4 py-20 md:px-3xl">
            <p className="text-eyebrow uppercase text-body-mid">How it works</p>
            <h2 className="mt-3 max-w-3xl text-[32px] font-semibold leading-tight md:text-display-lg">From messy exports to a claims list.</h2>
            <ol className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {STEPS.map(([t, d], i) => (
                <li key={t} className="rounded-md border border-hairline bg-canvas p-6">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-caption text-on-primary">{i + 1}</span>
                  <h3 className="mt-4 text-display-xs">{t}</h3>
                  <p className="mt-2 text-body-sm text-body-mid">{d}</p>
                </li>))}
            </ol>
          </div>
        </section>

        <section id="trust" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-24 md:px-3xl">
          <p className="text-eyebrow uppercase text-body-mid">Security and control</p>
          <h2 className="mt-3 max-w-3xl text-[32px] font-semibold leading-tight md:text-display-lg">Rules decide. People approve.</h2>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            {[["Rules, not guesses", "Expected amounts and statuses come from your rate cards. AI only proposes column mappings and possible matches, and never closes anything."],
              ["No personal data", "Customer names, phones and addresses are never imported, which keeps you clear of DPDP Act obligations for this data."],
              ["Every change recorded", "An append-only audit log shows who changed what and when. Roles separate finance executives from the co-founder."]].map(([t, d]) => (
              <div key={t} className="rounded-md border border-hairline p-6 md:p-8"><h3 className="text-display-xs">{t}</h3><p className="mt-3 text-body-sm text-body-mid">{d}</p></div>))}
          </div>
        </section>

        <section className="bg-primary text-on-primary">
          <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-20 md:flex-row md:items-center md:justify-between md:px-3xl">
            <h2 className="max-w-2xl text-[32px] font-semibold leading-tight !text-on-primary md:text-display-lg">Close the month in days, not weeks.</h2>
            <Link href="/login" className="inline-flex min-h-11 items-center rounded-sm bg-canvas px-6 text-body-md font-medium text-primary hover:bg-soft">Sign in</Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-body-sm text-body-mid md:flex-row md:justify-between md:px-3xl">
        <p className="flex items-center gap-2"><Logo />Recon Desk</p>
        <p>Orders · Settlements · COD · Freight</p>
      </footer>
    </div>
  );
}
