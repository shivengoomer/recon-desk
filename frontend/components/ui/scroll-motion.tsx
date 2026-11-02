"use client";
/**
 * Scroll and motion animation primitives for Recon Desk.
 * Incorporates motion-effects principles:
 * - Fluid spring physics & stretching tab transitions
 * - Dynamic interactive reconciliation engine
 * - Spotlight glow & tilt interactions
 * - Viewport-triggered counters and reveals
 * - Full respect for prefers-reduced-motion
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionProps,
} from "framer-motion";
import { ArrowRight, CheckCircle2, ChevronRight, FileSpreadsheet, Sparkles } from "lucide-react";

// ─── Tokens & Curves ────────────────────────────────────────────────────────

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const SPRING_BOUNCE = { type: "spring", stiffness: 400, damping: 28 } as const;
export const SPRING_SMOOTH = { type: "spring", stiffness: 260, damping: 24 } as const;

// ─── Core Reveal Primitives ────────────────────────────────────────────────

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
};

export function RevealGroup({
  children,
  className,
  delay = 0,
  stagger = true,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  stagger?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px 0px" });
  const reduced = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={stagger ? staggerContainer : undefined}
      initial={reduced ? "visible" : "hidden"}
      animate={inView ? "visible" : "hidden"}
      transition={stagger ? undefined : { delay }}
    >
      {children}
    </motion.div>
  );
}

export function Reveal({
  children,
  className,
  delay = 0,
  solo = false,
  from = "bottom",
  distance = 28,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  solo?: boolean;
  from?: "bottom" | "left" | "right" | "scale";
  distance?: number;
} & MotionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px 0px" });
  const reduced = useReducedMotion();

  const hidden =
    from === "left"
      ? { opacity: 0, x: -distance, y: 0 }
      : from === "right"
      ? { opacity: 0, x: distance, y: 0 }
      : from === "scale"
      ? { opacity: 0, scale: 0.94, y: 16 }
      : { opacity: 0, y: distance };

  const visible = { opacity: 1, x: 0, y: 0, scale: 1 };

  if (solo) {
    return (
      <motion.div
        ref={ref}
        className={className}
        initial={reduced ? "visible" : "hidden"}
        animate={inView ? "visible" : "hidden"}
        variants={{ hidden, visible }}
        transition={{ duration: 0.68, ease: EASE_OUT, delay }}
        {...rest}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      variants={{ hidden, visible }}
      transition={{ duration: 0.68, ease: EASE_OUT, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

// ─── Parallax ──────────────────────────────────────────────────────────────

export function Parallax({
  children,
  className,
  speed = 0.1,
}: {
  children: ReactNode;
  className?: string;
  speed?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [`${speed * 100}%`, `-${speed * 100}%`]);

  return (
    <motion.div ref={ref} className={className} style={reduced ? undefined : { y }}>
      {children}
    </motion.div>
  );
}

// ─── Smooth Top Progress Bar ───────────────────────────────────────────────

export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 300, damping: 30, restDelta: 0.001 });
  const reduced = useReducedMotion();
  if (reduced) return null;

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-50 h-[3px] origin-left bg-gradient-to-r from-mint via-[#00f0a0] to-[#00c885] shadow-[0_0_12px_rgba(0,240,160,0.6)]"
      style={{ scaleX }}
    />
  );
}

// ─── Spotlight Interactive Card (Tracks Cursor with Ambient Glow) ──────────

export function SpotlightCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const background = useMotionTemplate`radial-gradient(350px circle at ${mouseX}px ${mouseY}px, rgba(0, 240, 160, 0.09), transparent 80%)`;

  return (
    <div
      onMouseMove={handleMouseMove}
      className={`group relative overflow-hidden rounded-md border border-hairline bg-canvas transition-all duration-300 hover:border-ink/80 hover:shadow-layer-3 ${className}`}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-md opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background }}
        aria-hidden
      />
      {children}
    </div>
  );
}

// ─── Animated Number Ticker ────────────────────────────────────────────────

export function AnimatedNumber({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(inView ? value : "0");

  useEffect(() => {
    if (!inView) return;
    const match = value.match(/([^\d]*)([\d,.]+)(.*)/);
    if (!match) {
      setDisplay(value);
      return;
    }
    const [, prefix, numStr, suffix] = match;
    const target = parseFloat(numStr.replace(/,/g, ""));
    if (isNaN(target)) {
      setDisplay(value);
      return;
    }

    const duration = 1200;
    const startTime = performance.now();

    function update(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out expo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.round(target * ease);
      setDisplay(`${prefix}${current.toLocaleString("en-IN")}${suffix}`);

      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }, [inView, value]);

  return <span ref={ref}>{display}</span>;
}

// ─── Interactive Reconciliation Engine Showcase (Motion Effect 04/05/07) ──

const DEMO_CASES = [
  {
    id: "settlement",
    label: "Marketplace Settlement",
    order: "ORD-M-88120",
    partner: "Marketplace 1",
    tag: "Short-paid by ₹37.00",
    color: "accent-red",
    rateCardFee: "14.5% commission + ₹5 fixed fee",
    actualDeducted: "17.0% commission deducted",
    expected: "₹1,499.00",
    settled: "₹1,462.00",
    difference: "−₹37.00",
    statusText: "Underpaid · Claim auto-prepared with rate card reference",
    icon: Sparkles,
  },
  {
    id: "cod",
    label: "Courier COD Remittance",
    order: "ORD-W-204118",
    partner: "SwiftShip Courier",
    tag: "Unremitted · Due 27 days ago",
    color: "accent-orange",
    rateCardFee: "T+3 remittance SLA",
    actualDeducted: "Cash collected at doorstep, never settled to bank",
    expected: "₹1,409.00",
    settled: "₹0.00",
    difference: "−₹1,409.00",
    statusText: "Past SLA · Ready for courier debt recovery notice",
    icon: FileSpreadsheet,
  },
  {
    id: "freight",
    label: "Weight Slab Overcharge",
    order: "ORD-W-200419",
    partner: "SwiftShip Logistics",
    tag: "Weight Slab Error (+500g)",
    color: "accent-yellow",
    rateCardFee: "Zone A: 0–500g @ ₹45.00",
    actualDeducted: "Billed as 500g–1000g @ ₹90.00",
    expected: "₹45.00",
    settled: "₹90.00",
    difference: "−₹45.00",
    statusText: "Dead weight confirmed 380g in warehouse manifest · Reclaimable",
    icon: CheckCircle2,
  },
];

export function InteractiveReconEngine() {
  const [activeTab, setActiveTab] = useState(0);
  const current = DEMO_CASES[activeTab];

  return (
    <div className="relative overflow-hidden rounded-md border border-hairline bg-canvas p-6 shadow-layer-3 md:p-8">
      {/* Top Header & Interactive Stretch Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mint/20 px-3 py-1 font-mono text-[11px] font-semibold text-ink">
            <span className="h-1.5 w-1.5 rounded-full bg-mint animate-pulse" />
            LIVE ENGINE SIMULATOR
          </span>
          <h3 className="font-display mt-2 text-[22px] font-bold tracking-tight text-ink">
            Watch the rate-card engine catch leakage.
          </h3>
        </div>

        {/* Dynamic Stretch Pill Tabs (Effect 04) */}
        <div className="flex rounded-full bg-soft p-1">
          {DEMO_CASES.map((item, idx) => {
            const isSelected = activeTab === idx;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(idx)}
                className={`relative z-10 px-3.5 py-1.5 text-body-sm font-semibold transition-colors duration-200 ${
                  isSelected ? "text-ink" : "text-body-mid hover:text-ink"
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="reconTabPill"
                    className="absolute inset-0 rounded-full bg-canvas shadow-layer-2 ring-1 ring-ink/10"
                    transition={SPRING_BOUNCE}
                  />
                )}
                <span className="relative z-10">{item.partner.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Animated Case Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
            className="flex flex-col justify-between rounded-sm border border-hairline bg-soft/50 p-5 md:p-6"
          >
            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-caption-mono text-ink font-semibold">
                  {current.order}
                </span>
                <span className="rounded-full bg-accent-red/10 px-2.5 py-0.5 font-sans text-caption text-on-soft-red font-semibold">
                  {current.tag}
                </span>
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-sm bg-canvas p-3 border border-hairline/80">
                  <p className="text-eyebrow-sm uppercase text-body-mid">Rate card expectation</p>
                  <p className="mt-1 text-body-sm font-medium text-ink">{current.rateCardFee}</p>
                </div>

                <div className="rounded-sm bg-canvas p-3 border border-hairline/80">
                  <p className="text-eyebrow-sm uppercase text-body-mid">What partner actually billed</p>
                  <p className="mt-1 text-body-sm font-medium text-ink">{current.actualDeducted}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-hairline pt-4 text-body-sm">
              <span className="text-body-mid font-medium">{current.statusText}</span>
              <span className="inline-flex items-center gap-1 font-semibold text-ink group cursor-pointer">
                Evidence <ChevronRight size={14} />
              </span>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Live Calculation Metric Box */}
        <div className="flex flex-col justify-between rounded-sm bg-primary p-6 text-on-primary">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-eyebrow-sm uppercase text-on-primary/60">Discrepancy caught</p>
              <span className="h-2 w-2 rounded-full bg-mint animate-ping" />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={SPRING_BOUNCE}
              >
                <p className="tabular font-display mt-3 text-[48px] font-bold leading-none text-mint">
                  {current.difference}
                </p>
              </motion.div>
            </AnimatePresence>

            <div className="mt-6 space-y-2.5 text-body-sm">
              <div className="flex justify-between text-on-primary/80">
                <span>Contract Expected</span>
                <span className="tabular font-semibold text-white">{current.expected}</span>
              </div>
              <div className="flex justify-between text-on-primary/80">
                <span>Partner Paid</span>
                <span className="tabular font-semibold text-white">{current.settled}</span>
              </div>
              <div className="h-px bg-white/10 my-2" />
              <div className="flex justify-between font-bold text-mint">
                <span>Net Leakage</span>
                <span className="tabular">{current.difference}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab((prev) => (prev + 1) % DEMO_CASES.length)}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-body-sm font-semibold text-white transition-all hover:bg-mint hover:text-ink active:scale-95"
          >
            Next live case <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
