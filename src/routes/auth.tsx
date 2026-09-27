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
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-sm">
        <Link to="/"><Logo /></Link>
        <h1 className="mt-6 font-display text-3xl">{mode === "in" ? "Clinic sign in" : "Create staff account"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">For doctors and desk staff only.</p>
        <label className="mt-6 block text-sm font-medium">Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5" />
        </label>
        <label className="mt-4 block text-sm font-medium">Password
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5" />
        </label>
        {msg && <p className="mt-4 rounded-xl bg-muted p-3 text-sm">{msg}</p>}
        <button disabled={busy} className="mt-6 w-full rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-60">
          {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
        </button>
        <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-4 w-full text-sm text-primary underline-offset-4 hover:underline">
          {mode === "in" ? "New staff member? Create an account" : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
