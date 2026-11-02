"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Logo } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorBanner } from "@/components/ui/states";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const POINTS = [
  ["Per-order truth", "See whether each order was paid the right amount, net of fees, TCS and TDS."],
  ["Claims with evidence", "Short, late or overcharged amounts land in one list, ready to send to the partner."],
  ["Formats can change", "Column mappings are previewed, approved and versioned, so a new report layout never breaks close."],
];

export default function LoginPage() {
  const { user, ready, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace("/dashboard");
  }, [ready, user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-hero p-12 lg:flex">
        <p className="font-display flex items-center gap-2.5 text-[22px] font-bold text-ink"><Logo />Recon Desk</p>
        <div>
          <h2 className="font-display max-w-md text-display-xl font-bold">Know where the money went.</h2>
          <ul className="mt-10 flex max-w-md flex-col gap-5">
            {POINTS.map(([t, d]) => (
              <li key={t} className="flex gap-4"><span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mint ring-1 ring-ink"><Check size={14} strokeWidth={3} aria-hidden /></span>
                <div><p className="text-body-md font-semibold text-ink">{t}</p><p className="mt-0.5 text-body-sm text-body-mid">{d}</p></div></li>))}
          </ul>
        </div>
        <p className="text-body-sm text-body-mid">Orders · Settlements · COD · Freight</p>
      </section>
      <section className="flex items-center justify-center bg-canvas px-4 py-12 lg:bg-canvas">
        <div className="w-full max-w-md">
          <p className="font-display flex items-center gap-2.5 text-[20px] font-bold text-ink lg:hidden"><Logo />Recon Desk</p>
          <h1 className="font-display mt-6 text-display-lg lg:mt-0">Sign in</h1>
          <p className="mt-2 text-body-sm text-body-mid">Use your finance team account.</p>
          <form onSubmit={submit} className="mt-8 flex flex-col gap-5">
            {error && <ErrorBanner message={error} />}
            <Input label="Email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button type="submit" loading={busy} className="mt-1">Sign in</Button>
          </form>
        </div>
      </section>
    </main>
  );
}
