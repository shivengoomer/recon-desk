"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { Logo } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import { ErrorBanner } from "@/components/ui/states";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const POINTS = [
  ["Per-order truth", "See whether each order was paid the right amount, net of fees, TCS and TDS."],
  ["Claims with evidence", "Short, late or overcharged amounts land in one list, ready to send to the partner."],
  ["Formats can change", "Column mappings are previewed, approved and versioned, so a new report layout never breaks close."],
];

export default function LoginPage() {
  const { user, ready, login, register } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [canRegister, setCanRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [invite, setInvite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace("/dashboard");
  }, [ready, user, router]);
  useEffect(() => {
    api<{ registration_enabled: boolean }>("/api/auth/config").then((c) => setCanRegister(c.registration_enabled)).catch(() => {});
  }, []);

  function switchMode(m: "signin" | "register") {
    setMode(m);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signin") await login(email.trim(), password);
      else await register({ name: name.trim(), email: email.trim(), password, invite_code: invite.trim() });
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : mode === "signin" ? "Could not sign in" : "Could not create the account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* ── Left: hero panel ─────────────────────────────────────────── */}
      <section className="bg-hero hidden flex-col justify-between p-12 lg:flex">
        <Link
          href="/"
          className="font-display flex w-fit items-center gap-2.5 text-[22px] font-bold text-ink transition-opacity hover:opacity-70"
        >
          <Logo />Recon Desk
        </Link>
        <div>
          <h2 className="font-display max-w-md text-display-xl font-bold">Know where the money went.</h2>
          <ul className="mt-10 flex max-w-md flex-col gap-5">
            {POINTS.map(([t, d]) => (
              <li key={t} className="flex gap-4">
                <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mint ring-1 ring-ink">
                  <Check size={14} strokeWidth={3} aria-hidden />
                </span>
                <div><p className="text-body-md font-semibold text-ink">{t}</p><p className="mt-0.5 text-body-sm text-body-mid">{d}</p></div>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-body-sm text-body-mid">Orders · Settlements · COD · Freight</p>
      </section>

      {/* ── Right: form panel ─────────────────────────────────────────── */}
      <section className="flex items-center justify-center bg-canvas px-6 py-12">
        <div className="w-full max-w-md">

          {/* Mobile brand — prominent highlighted capsule, links back to home */}
          <div className="flex justify-center lg:hidden">
            <Link
              href="/"
              className="group mb-7 inline-flex items-center gap-2.5 rounded-full border border-hairline bg-canvas px-4 py-2 shadow-layer-2 ring-1 ring-mint/40 transition-all duration-200 hover:border-ink hover:shadow-layer-3 active:scale-[0.98]"
            >
              <div className="relative flex items-center justify-center">
                <Logo />
                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-mint ring-2 ring-canvas" aria-hidden />
              </div>
              <span className="font-display text-[19px] font-bold tracking-tight text-ink">
                Recon Desk
              </span>
              <span className="ml-0.5 rounded-full bg-mint/20 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-ink">
                FINANCE
              </span>
            </Link>
          </div>

          {/* Mode tabs — always shown */}
          <div role="tablist" aria-label="Account" className="mt-2 grid grid-cols-2 gap-1 rounded-full bg-soft p-1 lg:mt-0">
            {([ ["signin", "Sign in"], ["register", "Create account"] ] as const).map(([m, label]) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => switchMode(m)}
                className={`min-h-11 rounded-full text-body-sm font-semibold transition-colors ${mode === m ? "bg-canvas text-ink shadow-layer-2" : "text-body-mid hover:text-ink"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Back link — shown when in register mode without tabs (or as extra affordance) */}
          {mode === "register" && (
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md px-1 text-body-sm text-body-mid transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              <ArrowLeft size={14} strokeWidth={2.5} aria-hidden />
              Back to sign in
            </button>
          )}

          <h1 className="font-display mt-5 text-[26px] font-bold leading-tight tracking-tight text-ink md:text-[30px]">
            {mode === "signin" ? "Sign in" : "Create your account"}
          </h1>
          <p className="mt-1 text-body-sm text-body-mid">
            {mode === "signin"
              ? "Use your finance team account."
              : "You need the invite code from your co-founder. New accounts are finance executives."}
          </p>

          <form onSubmit={submit} className="mt-8 flex flex-col gap-5">
            {error && <ErrorBanner message={error} />}
            {mode === "register" && (
              <Input label="Full name" autoComplete="name" required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
            )}
            <Input label="Email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <PasswordInput
              label="Password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={mode === "register" ? 10 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {mode === "register" && (
              <>
                <p className="-mt-3 text-body-sm text-body-mid">At least 10 characters.</p>
                <PasswordInput label="Invite code" autoComplete="off" required value={invite} onChange={(e) => setInvite(e.target.value)} />
              </>
            )}
            <Button type="submit" loading={busy} className="mt-1">
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
