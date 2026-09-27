import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { ParentShell } from "@/components/ParentShell";
import { PhoneInput } from "@/components/PhoneInput";
import { Footprint } from "@/components/Footprint";
import { isValidMobile } from "@/lib/validation";
import { getFamily, linkByPhone, linkByToken } from "@/lib/family.functions";
import { useLang, fmtSlot } from "@/lib/i18n";

export const Route = createFileRoute("/family")({
  ssr: false,
  validateSearch: (s) => z.object({ link: z.string().max(80).optional() }).parse(s),
  head: () => ({
    meta: [
      { title: "Parent login & family dashboard — DoseChain" },
      { name: "description", content: "Sign in to see all your children's vaccines, upcoming visits and clinic messages in one place." },
      { property: "og:title", content: "Parent login — DoseChain" },
      { property: "og:description", content: "All your children's vaccines, visits and messages in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FamilyPage,
});

function useSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === "SIGNED_IN" || e === "SIGNED_OUT" || e === "USER_UPDATED" || e === "INITIAL_SESSION") setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return session;
}

function FamilyPage() {
  const session = useSession();
  const { lang } = useLang();
  if (session === undefined) return <ParentShell><div className="p-16 text-center text-muted-foreground">…</div></ParentShell>;
  return (
    <ParentShell eyebrow={lang === "hi" ? "पैरेंट अकाउंट" : "Parent account"}>
      {session ? <Dashboard email={session.user.email ?? ""} /> : <Login />}
    </ParentShell>
  );
}

// ---------------- login ----------------
function Login() {
  const { lang } = useLang();
  const hi = lang === "hi";
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) setMsg({ ok: false, text: hi ? "ईमेल या पासवर्ड गलत है" : "Wrong email or password" });
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password: pw, options: { emailRedirectTo: `${window.location.origin}/family` } });
      if (error) setMsg({ ok: false, text: error.message });
      else if (!data.session) setMsg({ ok: true, text: hi ? "ईमेल देखें — पुष्टि लिंक पर क्लिक करें, फिर लॉगिन करें।" : "Check your email and tap the confirmation link, then sign in." });
    }
    setBusy(false);
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/family${window.location.search}` });
    if (r.error) setMsg({ ok: false, text: hi ? "Google से लॉगिन नहीं हो पाया" : "Google sign-in didn't work, try again" });
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 md:grid-cols-[1.1fr_1fr] md:items-center">
      <div>
        <p className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground"><Footprint className="h-3.5 w-3.5" />{hi ? "माता-पिता के लिए" : "For parents"}</p>
        <h1 className="mt-4 font-display text-4xl leading-tight md:text-5xl">{hi ? "आपके सभी बच्चे, एक जगह" : "All your little ones, in one place"}</h1>
        <p className="mt-4 max-w-md text-muted-foreground">{hi ? "अगला टीका, बुक विज़िट, क्लिनिक के संदेश और हेल्थ पासपोर्ट — बिना लिंक खोजे।" : "Next vaccines, booked visits, clinic messages and each child's Health Passport — no more hunting for links."}</p>
        <ul className="mt-6 space-y-2 text-sm">
          {(hi ? ["हर बच्चे की प्रगति", "आने वाली विज़िट", "क्लिनिक से संदेश"] : ["Every child's progress", "Upcoming visits across the family", "Messages from the clinic"]).map((x) => (
            <li key={x} className="flex items-center gap-2"><span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground">✓</span>{x}</li>
          ))}
        </ul>
      </div>
      <div className="rounded-3xl border border-border bg-card p-6 shadow-lg md:p-8">
        <div className="mb-5 grid grid-cols-2 rounded-full bg-muted p-1 text-sm font-semibold">
          {(["in", "up"] as const).map((m) => (
            <button key={m} type="button" onClick={() => { setMode(m); setMsg(null); }} className={`rounded-full py-2 ${mode === m ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
              {m === "in" ? (hi ? "लॉगिन" : "Sign in") : (hi ? "नया अकाउंट" : "Create account")}
            </button>
          ))}
        </div>
        <button type="button" onClick={google} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border-2 border-border font-semibold hover:bg-muted">
          <span className="font-bold text-info">G</span> {hi ? "Google से जारी रखें" : "Continue with Google"}
        </button>
        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />{hi ? "या" : "or"}<span className="h-px flex-1 bg-border" /></div>
        <form onSubmit={submit} className="space-y-3">
          <input type="email" required maxLength={120} placeholder={hi ? "ईमेल" : "Email"} value={email} onChange={(e) => setEmail(e.target.value)} className="min-h-11 w-full rounded-xl border border-input bg-background px-3" />
          <input type="password" required minLength={6} maxLength={72} placeholder={hi ? "पासवर्ड" : "Password"} value={pw} onChange={(e) => setPw(e.target.value)} className="min-h-11 w-full rounded-xl border border-input bg-background px-3" />
          <button disabled={busy} className="min-h-11 w-full rounded-full bg-primary font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            {busy ? "…" : mode === "in" ? (hi ? "लॉगिन करें" : "Sign in") : (hi ? "अकाउंट बनाएँ" : "Create account")}
          </button>
        </form>
        {msg && <p className={`mt-3 text-sm font-medium ${msg.ok ? "text-primary" : "text-overdue"}`}>{msg.text}</p>}
        <p className="mt-5 text-center text-xs text-muted-foreground">
          {hi ? "पहली बार?" : "First visit?"} <Link to="/start" className="font-semibold text-primary">{hi ? "टीका बुक करें" : "Book a vaccine"}</Link>
        </p>
      </div>
    </div>
  );
}

// ---------------- dashboard ----------------
function fmtDay(iso: string | null, hi: boolean) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00Z").toLocaleDateString(hi ? "hi-IN" : "en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}
function ageText(dob: string, hi: boolean) {
  const m = Math.max(0, Math.floor((Date.now() - new Date(dob).getTime()) / (30.44 * 86400_000)));
  if (m < 24) return hi ? `${m} महीने` : `${m} months`;
  return hi ? `${Math.floor(m / 12)} साल` : `${Math.floor(m / 12)} yrs`;
}

function Dashboard({ email }: { email: string }) {
  const { lang } = useLang();
  const hi = lang === "hi";
  const qc = useQueryClient();
  const { link } = Route.useSearch();
  const navigate = Route.useNavigate();
  const q = useQuery({ queryKey: ["family"], queryFn: () => getFamily() });

  useEffect(() => {
    if (!link) return;
    linkByToken({ data: { token: link } }).finally(() => {
      navigate({ search: {}, replace: true });
      qc.invalidateQueries({ queryKey: ["family"] });
    });
  }, [link]);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
  }

  const d = q.data;
  const hasKids = !!d && d.children.length > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{email}</p>
          <h1 className="font-display text-3xl md:text-4xl">{hi ? "मेरा परिवार" : "My family"}{d?.guardians[0]?.name ? ` · ${d.guardians[0].name}` : ""}</h1>
        </div>
        <div className="flex gap-2">
          {hasKids && <Link to="/start" className="inline-flex min-h-10 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">+ {hi ? "बच्चा जोड़ें" : "Add child"}</Link>}
          <button onClick={signOut} className="min-h-10 rounded-full border border-border px-4 text-sm font-semibold hover:bg-muted">{hi ? "लॉग आउट" : "Sign out"}</button>
        </div>
      </div>

      {q.isLoading && <p className="mt-10 text-muted-foreground">…</p>}
      {q.isError && <p className="mt-10 text-overdue">{hi ? "लोड नहीं हुआ, फिर कोशिश करें" : "Couldn't load your family. Try again."}</p>}

      {d && !hasKids && <LinkFamily onDone={() => qc.invalidateQueries({ queryKey: ["family"] })} />}

      {hasKids && (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {d.children.map((c) => {
              const pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
              return (
                <div key={c.token} className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="relative grid h-16 w-16 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(var(--primary) ${pct * 3.6}deg, var(--muted) 0)` }}>
                      <span className="grid h-12 w-12 place-items-center rounded-full bg-card text-sm font-bold">{pct}%</span>
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate font-display text-xl">{c.name}</h2>
                      <p className="text-xs text-muted-foreground">{ageText(c.dob, hi)} · {c.clinic}</p>
                      <p className="text-xs text-muted-foreground">{c.done}/{c.total} {hi ? "टीके लगे" : "doses done"}</p>
                    </div>
                  </div>
                  <div className={`mt-4 rounded-2xl p-3 text-sm ${c.overdue ? "bg-overdue/10" : "bg-secondary/60"}`}>
                    <p className="text-xs font-bold uppercase tracking-wide text-primary">{c.overdue ? (hi ? "बकाया" : "Overdue") : (hi ? "अगला टीका" : "Next vaccine")}</p>
                    {c.nextDate ? (
                      <>
                        <p className="font-semibold">{fmtDay(c.nextDate, hi)} {c.nextBooked && <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">{hi ? "बुक" : "Booked"}</span>}</p>
                        <p className="truncate text-xs text-muted-foreground">{c.nextLabels.map((l) => (hi ? l.hi : l.en)).join(", ")}</p>
                      </>
                    ) : (
                      <p className="font-semibold">{hi ? "सब पूरे 🎉" : "All caught up 🎉"}</p>
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
                    <Link to="/c/$token" params={{ token: c.token }} className="rounded-full bg-muted px-3 py-1.5 hover:bg-secondary">{hi ? "टीका योजना" : "Vaccine plan"}</Link>
                    <Link to="/h/$token" params={{ token: c.token }} className="rounded-full bg-muted px-3 py-1.5 hover:bg-secondary">{hi ? "हेल्थ पासपोर्ट" : "Health Passport"}</Link>
                    {c.nextDate && !c.nextBooked && <Link to="/book" search={{ child: c.token }} className="rounded-full bg-primary px-3 py-1.5 text-primary-foreground">{hi ? "विज़िट बुक करें" : "Book visit"}</Link>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <section className="rounded-3xl border border-border bg-card p-5">
              <h2 className="font-display text-xl">{hi ? "आने वाली विज़िट" : "Upcoming visits"}</h2>
              {d.visits.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">{hi ? "कोई विज़िट बुक नहीं" : "No visits booked yet."}</p>
              ) : (
                <ul className="mt-3 divide-y divide-border">
                  {d.visits.map((v) => (
                    <li key={v.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                      <span><span className="font-semibold">{v.child}</span> · {fmtDay(v.day, hi)}{v.slot ? `, ${fmtSlot(v.slot)}` : ""}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${v.status === "confirmed" ? "bg-primary text-primary-foreground" : "bg-accent/30"}`}>
                        {v.status === "confirmed" ? (hi ? "पक्का" : "Confirmed") : (hi ? "पुष्टि बाकी" : "Awaiting")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="rounded-3xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl">{hi ? "क्लिनिक के संदेश" : "Clinic messages"}</h2>
                <Link to="/wa/$token" params={{ token: d.children[0]!.token }} className="text-sm font-semibold text-primary">{hi ? "चैट खोलें →" : "Open chat →"}</Link>
              </div>
              {d.messages.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">{hi ? "अभी कोई संदेश नहीं" : "No messages yet."}</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {d.messages.slice(0, 4).map((m) => (
                    <li key={m.id} className={`line-clamp-2 rounded-2xl px-3 py-2 text-sm ${m.direction === "out" ? "bg-secondary/60" : "ml-6 bg-muted"}`}>{hi ? m.hi || m.en : m.en || m.hi}</li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <details className="mt-6 rounded-2xl border border-dashed border-border p-4 text-sm">
            <summary className="cursor-pointer font-semibold">{hi ? "दूसरे नंबर से बुक बच्चे जोड़ें" : "Link children booked with another number"}</summary>
            <LinkFamily compact onDone={() => qc.invalidateQueries({ queryKey: ["family"] })} />
          </details>
        </>
      )}
    </div>
  );
}

function LinkFamily({ onDone, compact }: { onDone: () => void; compact?: boolean }) {
  const { lang } = useLang();
  const hi = lang === "hi";
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidMobile(phone)) return setErr(hi ? "सही 10 अंकों का नंबर डालें" : "Enter a valid 10-digit mobile");
    setBusy(true);
    setErr("");
    const r = await linkByPhone({ data: { phone: `+91${phone}`, dob } }).catch(() => ({ ok: false }));
    setBusy(false);
    if (r.ok) onDone();
    else setErr(hi ? "यह नंबर और जन्मतिथि मेल नहीं खाते" : "That number and birth date don't match any booking.");
  }

  return (
    <div className={compact ? "mt-4" : "mt-8 grid gap-6 rounded-3xl border border-border bg-card p-6 md:grid-cols-2 md:p-8"}>
      {!compact && (
        <div>
          <h2 className="font-display text-2xl">{hi ? "अपने बच्चों को जोड़ें" : "Connect your children"}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{hi ? "बुकिंग वाला WhatsApp नंबर और किसी एक बच्चे की जन्मतिथि डालें। उस नंबर के सभी बच्चे जुड़ जाएँगे।" : "Enter the WhatsApp number you booked with and one child's date of birth. Every child under that number will appear here."}</p>
          <p className="mt-4 text-sm">{hi ? "नए हैं?" : "New here?"} <Link to="/start" className="font-semibold text-primary">{hi ? "पहला टीका बुक करें →" : "Book the first vaccine →"}</Link></p>
        </div>
      )}
      <form onSubmit={go} className="space-y-3">
        <PhoneInput value={phone} onChange={setPhone} required />
        <label className="block text-sm font-medium">
          {hi ? "बच्चे की जन्मतिथि" : "Child's date of birth"}
          <input type="date" required value={dob} onChange={(e) => setDob(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-input bg-background px-3" />
        </label>
        <button disabled={busy} className="min-h-11 w-full rounded-full bg-primary font-semibold text-primary-foreground disabled:opacity-60">{busy ? "…" : hi ? "जोड़ें" : "Connect"}</button>
        {err && <p className="text-sm font-medium text-overdue">{err}</p>}
      </form>
    </div>
  );
}
