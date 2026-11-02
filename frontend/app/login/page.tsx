"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
      <section className="hidden flex-col justify-between bg-primary p-12 text-on-primary lg:flex">
        <p className="flex items-center gap-2 text-body-md font-semibold"><span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-sm bg-canvas text-body-sm text-primary">R</span>Recon Desk</p>
        <div>
          <h2 className="max-w-md text-display-lg !text-on-primary">Know where the money went.</h2>
          <ul className="mt-10 flex max-w-md flex-col gap-6">
            {POINTS.map(([t, d]) => (
              <li key={t} className="border-t border-white/15 pt-4"><p className="text-body-md font-medium">{t}</p><p className="mt-1 text-body-sm text-on-primary/70">{d}</p></li>))}
          </ul>
        </div>
        <p className="text-body-sm text-on-primary/50">Orders · Settlements · COD · Freight</p>
      </section>
      <section className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <p className="text-eyebrow uppercase text-body-mid lg:hidden">Recon Desk</p>
          <h1 className="mt-3 text-display-md">Sign in</h1>
          <p className="mt-2 text-body-sm text-body-mid">Use your finance team account.</p>
          <form onSubmit={submit} className="mt-8 flex flex-col gap-5">
            {error && <ErrorBanner message={error} />}
            <Input label="Email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button type="submit" loading={busy}>Sign in</Button>
          </form>
        </div>
      </section>
    </main>
  );
}
