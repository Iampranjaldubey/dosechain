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
      setMsg(error ? error.message : "Check your email to confirm your account, then sign in. The first account becomes the doctor.");
    }
    setBusy(false);
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col">
        <Link to="/" className="rounded-full bg-background/95 px-4 py-2 self-start"><Logo /></Link>
        <div className="mt-auto max-w-md">
          <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">Clinic desk</p>
          <h2 className="mt-3 font-display text-5xl leading-tight">Every child's next dose, already on your screen.</h2>
          <ul className="mt-8 space-y-3 text-sm opacity-90">
            <li>• Today's visits, shared rabies vial and bite watchdog</li>
            <li>• Recall list without a single phone call</li>
            <li>• AI suggests re-plans — the doctor confirms</li>
          </ul>
        </div>
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary-foreground/10" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 right-10 h-96 w-96 rounded-full bg-primary-foreground/5" />
      </aside>
      <div className="grid place-items-center px-4 py-12">
      <form onSubmit={submit} className="w-full max-w-sm">
        <Link to="/" className="lg:hidden"><Logo /></Link>
        <h1 className="mt-6 font-display text-4xl lg:mt-0">{mode === "in" ? "Clinic sign in" : "Create staff account"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{mode === "in" ? "For doctors and desk staff only. Parents never need an account." : "The first account becomes the doctor. Later accounts wait for the doctor's approval."}</p>
        <label className="mt-8 block text-sm font-medium">Email
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 w-full rounded-xl border border-input bg-card px-3.5 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15" />
        </label>
        <label className="mt-4 block text-sm font-medium">Password
          <input type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 w-full rounded-xl border border-input bg-card px-3.5 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15" />
        </label>
        {msg && <p className="mt-4 rounded-xl border border-border bg-secondary/60 p-3 text-sm">{msg}</p>}
        <button disabled={busy} className="mt-6 w-full rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground shadow-sm transition hover:brightness-110 disabled:opacity-60">
          {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
        </button>
        <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-4 w-full text-sm text-primary underline-offset-4 hover:underline">
          {mode === "in" ? "New staff member? Create an account" : "Already have an account? Sign in"}
        </button>
        <Link to="/" className="mt-8 block text-center text-xs text-muted-foreground hover:text-foreground">← Back to the clinic website</Link>
      </form>
      </div>
    </div>
  );
}
