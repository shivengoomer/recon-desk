"use client";
import { CheckCheck, FileText, FileWarning, Layers, Plus, ScanSearch, Search, Truck, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/shell";
import { buttonClass } from "@/components/ui/button";
import { FeatureCard } from "@/components/ui/card";
import { GradientASCII } from "@/components/ui/gradient-ascii";
import {
  AnimatedNumber,
  InteractiveReconEngine,
  Parallax,
  Reveal,
  RevealGroup,
  ScrollProgressBar,
  SpotlightCard,
} from "@/components/ui/scroll-motion";

const STATS = [
  ["≈9s", "to match 1 lakh orders"],
  ["20 rows", "previewed before a mapping is saved"],
  ["0", "customer names, phones or addresses stored"],
  ["4", "report types: orders, settlements, COD, freight"],
];

const CATCHES = [
  { icon: Wallet,      title: "Short-paid settlements",  text: "Compare what a marketplace paid with what its rate card says it should, per order, net of fees." },
  { icon: FileWarning, title: "Unremitted COD",           text: "Cash collected by couriers that never reached your account, aged from the day it fell due." },
  { icon: Truck,       title: "Freight overcharges",      text: "Wrong weight slabs and surcharges, caught by recomputing every freight invoice line." },
  { icon: Layers,      title: "Formats that change",      text: "A partner renames a column? Review a suggested mapping, approve it, and roll back any time." },
  { icon: ScanSearch,  title: "TCS and TDS, kept apart",  text: "Statutory deductions are shown per partner and never mistaken for leakage." },
  { icon: Search,      title: "Missing order IDs",        text: "Rows with no usable order ID get ranked match suggestions. A person confirms; nothing closes automatically." },
];

const TICKER = ["Short-paid settlement", "Unremitted COD", "Freight overcharge", "Wrong weight slab", "Missing order ID", "TCS and TDS shown apart", "Partner format changed", "Claim with evidence"];

const FAQ = [
  ["Which files can I upload?", "CSV and Excel (.xlsx) for orders, marketplace settlements, courier COD remittances and freight invoices. Column mappings are saved per partner and file type."],
  ["What happens when a partner changes its report format?", "The new columns are compared with your saved mapping. A suggested mapping is shown on 20 preview rows, you approve it, and every version is kept so you can roll back."],
  ["Does AI decide what is owed?", "No. Expected amounts and statuses are computed from your rate cards by rules. AI-style suggestions are limited to column mappings and possible matches for rows with no order ID, and they are never applied automatically."],
  ["Do you store customer personal data?", "No. Customer names, phones and addresses are never imported, so there is nothing to mask."],
  ["Does it file claims for us?", "It prepares them. Each claim carries the expected-versus-actual numbers and the source rows, and you export the evidence to raise it with the partner."],
  ["How fast is it?", "On a synthetic set of 1 lakh orders with about 1.2 lakh partner rows, matching took roughly nine seconds."],
];

export default function Landing() {
  const [asciiProps, setAsciiProps] = useState({ cellSize: 18, density: 0.56, glyphOpacity: 0.5 });
  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      if (w < 640) {
        setAsciiProps({ cellSize: 14, density: 0.28, glyphOpacity: 0.22 });
      } else if (w < 1024) {
        setAsciiProps({ cellSize: 15, density: 0.4, glyphOpacity: 0.35 });
      } else {
        setAsciiProps({ cellSize: 18, density: 0.56, glyphOpacity: 0.5 });
      }
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return (
    <div className="bg-canvas">
      {/* Mint progress bar with gradient glow that tracks scroll */}
      <ScrollProgressBar />

      {/* ── Hero wrapper encompassing both the frosted navbar and hero stage ── */}
      <div className="relative isolate overflow-hidden bg-hero">
        {/* Ambient interactive ASCII backdrop — responsive cell size for mobile/iPad */}
        <div className="pointer-events-auto absolute inset-0 z-0 [mask-image:radial-gradient(ellipse_120%_40%_at_50%_0%,#000_10%,transparent_70%)] sm:[mask-image:radial-gradient(ellipse_100%_55%_at_50%_8%,#000_18%,transparent_78%)] lg:[mask-image:radial-gradient(ellipse_85%_70%_at_50%_15%,#000_25%,transparent_85%)]">
          <GradientASCII
            shape="horizon"
            colors={['#0f2e22', '#184735', '#246b50', '#00f0a0', '#a8fcd7']}
            characters=" ·:+*x#@"
            cellSize={asciiProps.cellSize}
            density={asciiProps.density}
            glyphOpacity={asciiProps.glyphOpacity}
            gradientOpacity={0.08}
            glow={0.2}
            flow={0.5}
            speed={0.7}
            scale={1.15}
            grain={0.04}
            lightMode={true}
            mouseInteraction={true}
            clickEffect="wave"
            className="h-full w-full"
          />
        </div>

        {/* ── Frosted Glass Nav — reveals the dynamic ASCII gradient beneath ── */}
        <header className="sticky top-0 z-30 border-b border-ink/5 bg-canvas/30 backdrop-blur-md transition-all duration-300">
          <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-3.5 md:px-8">
            <Link href="/" className="font-display flex items-center gap-2.5 text-[22px] font-bold text-ink">
              <Logo />Recon Desk
            </Link>
            <nav aria-label="Sections" className="hidden items-center gap-8 md:flex">
              {[["#demo", "Live demo"], ["#catches", "What it catches"], ["#how", "How it works"], ["#faq", "FAQ"]].map(([h, l]) => (
                <a key={h} href={h} className="text-body-sm font-semibold text-ink hover:underline">{l}</a>
              ))}
            </nav>
            <Link href="/login" className={buttonClass("primary", "!min-h-10 !rounded-[18px] !px-5 !py-2 !text-body-sm")}>Sign in</Link>
          </div>
        </header>

        <section className="relative z-10">
            <div className="mx-auto grid max-w-[1200px] items-center gap-8 px-4 py-12 md:gap-12 md:px-8 md:py-16 lg:grid-cols-[1.1fr_1fr] lg:py-24">

              {/* Left copy — staggered reveal */}
              <RevealGroup className="flex flex-col">
                <Reveal>
                  <h1 className="font-display mt-4 text-[36px] font-bold leading-[1.04] tracking-[-1px] sm:text-[44px] md:text-[48px] md:mt-6 lg:text-display-xxl">
                    Find every rupee your partners owe you.
                  </h1>
                </Reveal>
                <Reveal>
                  <p className="mt-6 max-w-xl text-body-lg text-ink">
                    Upload settlement, COD and freight reports. Recon Desk checks every order against your rate cards and turns each shortfall into a claim with evidence.
                  </p>
                </Reveal>
                <Reveal>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link href="/login" className={buttonClass("primary", "!px-10")}>Sign in</Link>
                    <a href="#demo" className={buttonClass("secondary", "!px-8")}>Try interactive demo</a>
                  </div>
                </Reveal>
              </RevealGroup>

              {/* Right card — parallax float with live claim card */}
              <Parallax speed={0.08}>
                <Reveal solo delay={0.15} from="right">
                  <div className="relative">
                    <FeatureCard className="relative z-10 pb-10">
                      <div className="rounded-md bg-primary p-6 text-on-primary">
                        <p className="text-eyebrow-sm uppercase text-on-primary/60">Open claims</p>
                        <p className="tabular font-display mt-2 text-[56px] font-bold leading-none text-mint">
                          <AnimatedNumber value="₹74,997" />
                        </p>
                        <p className="mt-2 text-body-sm text-on-primary/70">across 126 claims</p>
                        <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
                          <div className="w-[38%] bg-mute-soft" />
                          <div className="w-[36%] bg-accent-yellow" />
                          <div className="w-[20%] bg-accent-orange" />
                          <div className="w-[6%] bg-accent-red" />
                        </div>
                      </div>
                      <ul className="mt-4 divide-y divide-hairline">
                        {[
                          ["ORD-W-204118", "Website · COD · Delivered",  "−₹1,409.00", "Unpaid"],
                          ["ORD-M-88120",  "Marketplace 1 · Prepaid",    "−₹37.00",    "Short-paid"],
                          ["ORD-W-204377", "Website · Returned",         "−₹46.00",    "Short-paid"],
                        ].map(([id, sub, diff, st]) => (
                          <li key={id} className="flex items-center justify-between gap-3 py-3">
                            <div><p className="font-mono text-caption-mono text-ink">{id}</p><p className="text-body-sm text-body-mid">{sub}</p></div>
                            <div className="flex items-center gap-3">
                              <span className="hidden rounded-full bg-accent-red/10 px-2.5 py-1 text-caption text-on-soft-red sm:inline">{st}</span>
                              <span className="tabular text-body-md font-bold text-on-soft-red">{diff}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </FeatureCard>
                    <div className="absolute -bottom-7 right-6 z-20 flex items-center gap-3 rounded-full border border-ink bg-canvas py-2 pl-2 pr-5 shadow-layer-2 md:-right-4" aria-hidden>
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-mint font-display text-[18px] font-bold">97%</span>
                      <span className="text-body-sm font-semibold leading-tight">auto-matched<br /><span className="font-medium text-body-mid">orders past due</span></span>
                    </div>
                  </div>
                </Reveal>
              </Parallax>
            </div>
          </section>

          {/* ── Stats strip with live ticking numbers ─────────────────────────── */}
          <section>
            <RevealGroup
              className="mx-auto grid max-w-[1200px] grid-cols-2 gap-x-6 gap-y-10 px-4 pb-20 md:px-8 lg:grid-cols-4"
            >
              {STATS.map(([n, c], i) => (
                <Reveal key={c} delay={i * 0.05}>
                  <div className="border-t border-ink pt-4">
                    <dt className="font-display text-[44px] font-bold leading-none md:text-display-md">
                      <AnimatedNumber value={n} />
                    </dt>
                    <dd className="mt-2 text-body-sm text-body-mid">{c}</dd>
                  </div>
                </Reveal>
              ))}
            </RevealGroup>
          </section>
        </div>

        <main>
          {/* ── Live Interactive Motion Demo Showcase ────────────────────────── */}
        <section id="demo" className="mx-auto max-w-[1200px] scroll-mt-20 px-4 py-section md:px-8">
          <Reveal solo from="scale">
            <InteractiveReconEngine />
          </Reveal>
        </section>

        {/* ── What it catches (Spotlight Glow Cards) ───────────────────────── */}
        <section id="catches" className="mx-auto max-w-[1200px] scroll-mt-20 px-4 py-section md:px-8">
          <RevealGroup>
            <Reveal>
              <p className="text-eyebrow uppercase text-body-mid">What it catches</p>
            </Reveal>
            <Reveal>
              <h2 className="font-display mt-3 max-w-3xl text-[38px] font-bold leading-[1.1] md:text-display-xl">
                The leaks that live between your reports.
              </h2>
            </Reveal>
          </RevealGroup>

          <RevealGroup className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {CATCHES.map(({ icon: Icon, title, text }, i) => (
              <Reveal key={title} delay={i * 0.07}>
                <SpotlightCard className="h-full p-6 md:p-8">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-mint shadow-sm">
                    <Icon size={22} aria-hidden />
                  </span>
                  <h3 className="font-display mt-6 text-display-xs">{title}</h3>
                  <p className="mt-2 text-body-sm text-body-mid">{text}</p>
                </SpotlightCard>
              </Reveal>
            ))}
          </RevealGroup>
        </section>

        {/* ── Marquee ticker ──────────────────────────────────────────────── */}
        <div className="overflow-hidden bg-primary py-4" aria-hidden>
          <div className="flex w-max animate-marquee gap-10 whitespace-nowrap text-body-sm text-on-primary">
            {[...TICKER, ...TICKER, ...TICKER, ...TICKER].map((t, i) => (
              <span key={i} className="flex items-center gap-10">{t}<span className="h-2 w-2 rounded-full bg-mint" /></span>
            ))}
          </div>
        </div>

        {/* ── Step 1: Upload & map ─────────────────────────────────────────── */}
        <section id="how" className="scroll-mt-20 bg-tint">
          <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 py-section md:px-8 lg:grid-cols-2">
            <RevealGroup className="flex flex-col">
              <Reveal><p className="text-eyebrow uppercase text-body-mid">1 · Upload and map</p></Reveal>
              <Reveal><h2 className="font-display mt-3 text-[38px] font-bold leading-[1.1] md:text-display-lg">Upload anything. Map it once.</h2></Reveal>
              <Reveal>
                <p className="mt-5 max-w-lg text-body-lg text-ink">
                  Drop CSV or Excel reports from every marketplace, courier and your own store. Columns are suggested, previewed on 20 rows and saved per partner. Re-uploads are safe and de-duplicated.
                </p>
              </Reveal>
              <Reveal><Link href="/login" className={buttonClass("primary", "mt-8 !px-10 w-fit")}>Try it</Link></Reveal>
            </RevealGroup>

            <Parallax speed={0.06}>
              <Reveal solo from="right">
                <FeatureCard>
                  <p className="text-body-sm font-semibold text-body-mid">Marketplace 1 · Settlement</p>
                  <ul className="mt-4 flex flex-col gap-2">
                    {[
                      ["Order ID",     "Order Item ID"],
                      ["Gross amount", "Sale Amount"],
                      ["Net settled",  "Settlement Amount"],
                      ["TCS",          "GST TCS"],
                      ["TDS",          "Income Tax TDS"],
                    ].map(([f, c], i) => (
                      <li
                        key={f}
                        className="flex items-center justify-between gap-3 rounded-sm bg-soft px-4 py-3 text-body-sm"
                        style={{ animationDelay: `${i * 60}ms` }}
                      >
                        <span className="font-semibold text-ink">{f}</span>
                        <span className="flex items-center gap-2 text-body-mid">
                          {c}
                          <span className="rounded-full bg-mint/30 px-2 py-0.5 text-caption text-on-soft-green">Suggested</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 flex items-center gap-2 text-body-sm text-body-mid">
                    <CheckCheck size={16} className="text-on-soft-green" aria-hidden />
                    20 of 20 preview rows readable · version 2 ready to approve
                  </p>
                </FeatureCard>
              </Reveal>
            </Parallax>
          </div>
        </section>

        {/* ── Step 2: Match & claim ─────────────────────────────────────────── */}
        <section className="bg-canvas">
          <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 py-section md:px-8 lg:grid-cols-2">
            <Parallax speed={0.06}>
              <Reveal solo from="left">
                <FeatureCard className="order-2 border border-hairline lg:order-1">
                  <p className="text-body-sm font-semibold text-body-mid">Claims · SwiftShip</p>
                  <ul className="mt-3 divide-y divide-hairline">
                    {[
                      ["ORDW200388", "Unremitted COD",      "₹5,457.00", "27d"],
                      ["ORDW201503", "Unremitted COD",      "₹5,758.00", "16d"],
                      ["ORDW200419", "Freight overcharge",  "₹45.00",    "41d"],
                    ].map(([id, t, a, age]) => (
                      <li key={id} className="flex items-center justify-between gap-3 py-3">
                        <div><p className="font-mono text-caption-mono">{id}</p><p className="text-body-sm text-body-mid">{t} · {age}</p></div>
                        <span className="tabular text-body-md font-bold">{a}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex items-center justify-between rounded-sm bg-soft px-4 py-3 text-body-sm">
                    <span className="flex items-center gap-2 font-semibold"><FileText size={16} aria-hidden />Evidence pack ready</span>
                    <span className="text-body-mid">CSV</span>
                  </div>
                </FeatureCard>
              </Reveal>
            </Parallax>

            <RevealGroup className="order-1 flex flex-col lg:order-2">
              <Reveal><p className="text-eyebrow uppercase text-body-mid">2 · Match and claim</p></Reveal>
              <Reveal><h2 className="font-display mt-3 text-[38px] font-bold leading-[1.1] md:text-display-lg">Every shortfall, with evidence.</h2></Reveal>
              <Reveal>
                <p className="mt-5 max-w-lg text-body-lg text-ink">
                  Rules compare each order with its rate card, net of fees, with TCS and TDS added back. Anything short, late or overcharged lands in a claims list you can work by partner and age.
                </p>
              </Reveal>
              <Reveal><Link href="/login" className={buttonClass("primary", "mt-8 !px-10 w-fit")}>Try it</Link></Reveal>
            </RevealGroup>
          </div>
        </section>

        {/* ── Principle band ──────────────────────────────────────────────── */}
        <section className="bg-primary text-on-primary">
          <div className="mx-auto max-w-[1200px] px-4 py-section text-center md:px-8">
            <RevealGroup className="flex flex-col items-center">
              <Reveal>
                <p className="mx-auto flex w-fit items-center gap-2 rounded-full border border-white/30 px-4 py-1.5 text-caption">
                  <span className="h-2 w-2 rounded-full bg-mint" aria-hidden />Our principle
                </p>
              </Reveal>
              <Reveal>
                <h2 className="font-display mx-auto mt-6 max-w-3xl text-[38px] font-bold leading-[1.1] !text-on-primary md:text-display-xl">
                  Rules decide. <span className="text-mint">People approve.</span>
                </h2>
              </Reveal>
              <Reveal>
                <p className="mx-auto mt-6 max-w-2xl text-body-lg text-on-primary/80">
                  Expected amounts come from your rate cards. Suggestions never close anything, and an append-only audit log records every change.
                </p>
              </Reveal>
            </RevealGroup>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────────── */}
        <section id="faq" className="scroll-mt-20 bg-tint">
          <div className="mx-auto grid max-w-[1200px] gap-12 px-4 py-section md:px-8 lg:grid-cols-[1fr_1.4fr]">
            <RevealGroup>
              <Reveal><p className="text-eyebrow uppercase text-body-mid">FAQ</p></Reveal>
              <Reveal><h2 className="font-display mt-3 text-[38px] font-bold leading-[1.1] md:text-display-lg">Questions, answered.</h2></Reveal>
            </RevealGroup>

            <RevealGroup className="border-t border-ink/20">
              {FAQ.map(([q, a], i) => (
                <Reveal key={q} delay={i * 0.04}>
                  <details className="group border-b border-ink/20">
                    <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-body-md font-semibold text-ink">
                      {q}
                      <Plus size={20} className="shrink-0 transition-transform group-open:rotate-45" aria-hidden />
                    </summary>
                    <p className="pb-5 pr-8 text-body-sm text-body-mid">{a}</p>
                  </details>
                </Reveal>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────────────────── */}
        <section className="bg-hero">
          <div className="mx-auto max-w-[1200px] px-4 py-section md:px-8">
            <Reveal solo>
              <div className="flex flex-col items-start gap-8 rounded-md bg-canvas p-8 shadow-layer-2 md:flex-row md:items-center md:justify-between md:p-14">
                <h2 className="font-display max-w-xl text-[38px] font-bold leading-[1.1] md:text-display-lg">
                  Close the month in days, not weeks.
                </h2>
                <Link href="/login" className={buttonClass("mint", "!px-12 shrink-0")}>Sign in</Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 py-10 text-body-sm text-muted md:flex-row md:justify-between md:px-8">
        <p className="font-display flex items-center gap-2 text-[18px] font-bold text-ink"><Logo />Recon Desk</p>
        <p className="text-mute">Orders · Settlements · COD · Freight</p>
      </footer>
    </div>
  );
}
