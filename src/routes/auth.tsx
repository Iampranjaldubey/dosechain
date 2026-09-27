import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Footprint";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Clinic staff sign in — DoseChain" },
      { name: "description", content: "Sign in to the Nanhe Kadam clinic desk: today's visits, bite lane and doctor approvals." },
      { property: "og:title", content: "Clinic staff sign in — DoseChain" },
      { property: "og:description", content: "Staff access to the DoseChain clinic desk." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message);
      else void nav({ to: "/clinic" });
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/clinic` } });
      setMsg(error ? error.message : "Check your email to confirm your account, then sign in.");
    }
    setBusy(false);
  }

  return (
    <div className="grid min-h-screen bg-background md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside className="relative flex flex-col overflow-hidden bg-primary px-6 py-8 text-primary-foreground md:px-10 md:py-10 lg:px-14">
        <Link to="/" className="self-start rounded-full bg-background px-4 py-2 text-foreground shadow-sm"><Logo /></Link>
        <div className="mt-8 max-w-lg md:mt-auto">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground/80">Clinic desk</p>
          <h2 className="mt-3 font-display text-3xl leading-tight md:text-4xl lg:text-5xl">Every child's next dose, already on your screen.</h2>
        </div>
        <div className="mt-8 hidden max-w-lg rounded-3xl bg-background p-5 text-foreground shadow-xl md:block" aria-hidden>
          <div className="flex items-center justify-between">
            <p className="font-display text-lg">Today · 9 visits</p>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">Vial: 3 of 5 used</span>
          </div>
          <ul className="mt-4 divide-y divide-border text-sm">
            {[["Aarav, 6 weeks", "10:00 AM", "Confirmed"], ["Meera, 10 weeks", "10:30 AM", "Rescheduled: fever"], ["Kabir, dog bite day 3", "11:00 AM", "Due today"]].map(([n, t, st]) => (
              <li key={n} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-2.5">
                <span className="min-w-0 truncate"><span className="font-medium">{n}</span> <span className="text-muted-foreground">· {t}</span></span>
                <span className="text-xs text-muted-foreground">{st}</span>
              </li>
            ))}
          </ul>
        </div>
        <dl className="mt-8 hidden max-w-lg md:grid grid-cols-3 gap-4 border-t border-primary-foreground/20 pt-6 text-sm">
          <div><dt className="text-primary-foreground/75">Recall</dt><dd className="font-display text-2xl">No calls</dd></div>
          <div><dt className="text-primary-foreground/75">Re-plans</dt><dd className="font-display text-2xl">Doctor OK'd</dd></div>
          <div><dt className="text-primary-foreground/75">Parents</dt><dd className="font-display text-2xl">WhatsApp</dd></div>
        </dl>
      </aside>
      <div className="flex items-center justify-center px-5 py-10 md:px-10">
        <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-border bg-card p-7 shadow-sm md:p-9">
          <div className="flex rounded-full bg-muted p-1 text-sm font-semibold" role="tablist">
            {(["in", "up"] as const).map((m) => (
              <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setMsg(null); }} className={`flex-1 rounded-full px-4 py-2 transition ${mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {m === "in" ? "Sign in" : "New staff"}
              </button>
            ))}
          </div>
          <h1 className="mt-7 font-display text-3xl md:text-4xl">{mode === "in" ? "Welcome back" : "Create staff account"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{mode === "in" ? "For doctors and desk staff. Parents never need an account." : "Start your own clinic as its doctor, or join one when its doctor invites or approves you."}</p>
          <label className="mt-7 block text-sm font-medium">Work email
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@clinic.in" className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15" />
          </label>
          <label className="mt-4 block text-sm font-medium">Password
            <input type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15" />
          </label>
          {msg && <p role="status" className="mt-4 rounded-xl border border-border bg-secondary/60 p-3 text-sm">{msg}</p>}
          <button disabled={busy} className="mt-6 w-full rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground shadow-sm transition hover:brightness-110 disabled:opacity-60">
            {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
          </button>
          <p className="mt-6 border-t border-border pt-5 text-center text-xs text-muted-foreground">
            Parent? <Link to="/start" className="font-semibold text-primary hover:underline">Book a vaccine visit</Link> · <Link to="/" className="hover:text-foreground">Clinic website</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
