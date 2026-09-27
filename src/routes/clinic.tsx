import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Footprint";
import { whoAmI, listJoinableClinics, requestJoinClinic, createClinic } from "@/lib/clinic.functions";
import { PhoneInput } from "@/components/PhoneInput";
import { ClinicContext, type ActiveClinic } from "@/lib/clinic-context";

export const Route = createFileRoute("/clinic")({
  head: () => ({
    meta: [
      { title: "Clinic desk — DoseChain" },
      { name: "description", content: "Today's visits, rabies bite lane, reminders and doctor approvals for Nanhe Kadam Child Clinic." },
      { property: "og:title", content: "Clinic desk — DoseChain" },
      { property: "og:description", content: "The staff side of DoseChain." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClinicLayout,
});

const NAV = [
  { to: "/clinic", label: "Today", hint: "Visits, vial, bite lane" },
  { to: "/clinic/me", label: "My clinics", hint: "Children, visits, capacity" },
  { to: "/clinic/recall", label: "Recall", hint: "Missed & overdue" },
  { to: "/clinic/approvals", label: "Approvals", hint: "Plan changes & staff" },
  { to: "/clinic/messages", label: "Replies", hint: "Parent messages" },
  { to: "/clinic/capacity", label: "Capacity", hint: "AI bottleneck check" },
  { to: "/clinic/settings", label: "Settings", hint: "Team, hours, holidays" },
] as const;

const STORE_KEY = "dc-active-clinic";

function ClinicLayout() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORE_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) void nav({ to: "/auth" });
      else setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!s) void nav({ to: "/auth" });
    });
    return () => sub.subscription.unsubscribe();
  }, [nav]);

  const me = useQuery({ queryKey: ["me"], queryFn: () => whoAmI(), enabled: ready });

  if (!ready || me.isLoading)
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;

  if (!me.data || me.data.memberships.length === 0) return <NoClinic email={me.data?.email ?? ""} />;

  const ms = me.data.memberships;
  const active: ActiveClinic = ms.find((m) => m.clinicId === activeId) ?? ms[0]!;
  const role = active.role === "doctor" ? "Doctor" : "Desk";

  return (
    <ClinicContext.Provider value={active}>
      <div className="min-h-screen bg-background lg:grid lg:grid-cols-[250px_1fr]">
        <aside className="sticky top-0 z-30 border-b border-border bg-card lg:h-screen lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3 px-5 py-4 lg:block">
            <Link to="/"><Logo /></Link>
            <p className="hidden text-xs uppercase tracking-wide text-muted-foreground lg:mt-2 lg:block">Clinic admin</p>
          </div>
          {ms.length > 1 && (
            <div className="px-5 pb-3 lg:px-4">
              <label className="sr-only" htmlFor="active-clinic">Clinic</label>
              <select
                id="active-clinic"
                value={active.clinicId}
                onChange={(e) => {
                  setActiveId(e.target.value);
                  try {
                    localStorage.setItem(STORE_KEY, e.target.value);
                  } catch {
                    /* ignore */
                  }
                }}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm font-semibold"
              >
                {ms.map((m) => (
                  <option key={m.clinicId} value={m.clinicId}>
                    {m.clinicName}
                  </option>
                ))}
              </select>
            </div>
          )}
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:pb-0">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} activeOptions={{ exact: true }} className="shrink-0 rounded-xl px-3.5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted" activeProps={{ className: "bg-secondary text-secondary-foreground" }}>
                <span className="block">{n.label}</span>
                <span className="hidden text-xs font-normal opacity-70 lg:block">{n.hint}</span>
              </Link>
            ))}
          </nav>
          <div className="hidden border-t border-border p-4 lg:absolute lg:inset-x-0 lg:bottom-0 lg:block">
            <p className="truncate text-sm font-semibold">{me.data.email}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{role}</span>
              <button onClick={() => supabase.auth.signOut()} className="text-sm text-muted-foreground hover:text-foreground">Sign out</button>
            </div>
          </div>
        </aside>
        <main className="min-w-0 px-5 py-8 lg:px-10">
          <div className="mb-4 flex items-center justify-end gap-3 lg:hidden">
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold uppercase text-muted-foreground">{role}</span>
            <button onClick={() => supabase.auth.signOut()} className="text-sm text-muted-foreground">Sign out</button>
          </div>
          <Outlet />
        </main>
      </div>
    </ClinicContext.Provider>
  );
}

function NoClinic({ email }: { email: string }) {
  const qc = useQueryClient();
  const joins = useQuery({ queryKey: ["joinable"], queryFn: () => listJoinableClinics() });
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const join = useMutation({
    mutationFn: (clinicId: string) => requestJoinClinic({ data: { clinicId } }),
    onSuccess: () => toast.success("Request sent — the clinic's doctor will approve you."),
    onError: (e) => toast.error((e as Error).message),
  });
  const create = useMutation({
    mutationFn: () => createClinic({ data: { name: name.trim(), city: city.trim() || null, phone: phone ? `+91${phone}` : null } }),
    onSuccess: () => {
      toast.success("Clinic created — you are its doctor.");
      void qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="rounded-3xl border border-border bg-card p-8 text-center">
          <div className="flex justify-center"><Logo /></div>
          <h1 className="mt-6 font-display text-3xl">Clinic access</h1>
          <p className="mt-2 text-muted-foreground">
            {email ? (
              <>
                Signed in as <b>{email}</b>.{" "}
              </>
            ) : null}
            You're not part of a clinic yet — join one or start your own.
          </p>
        </div>

        {joins.data && joins.data.length > 0 && (
          <div className="rounded-3xl border border-border bg-card p-6">
            <h2 className="font-display text-2xl">Join a clinic</h2>
            <ul className="mt-3 space-y-2">
              {joins.data.map((c) => (
                <li key={c.id} className="flex items-center gap-3">
                  <span className="flex-1 font-medium">
                    {c.name} <span className="text-muted-foreground">· {c.city}</span>
                  </span>
                  <button
                    onClick={() => join.mutate(c.id)}
                    disabled={join.isPending}
                    className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    Ask to join
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-3xl border border-border bg-card p-6">
          <h2 className="font-display text-2xl">Start your own clinic</h2>
          <p className="mt-1 text-sm text-muted-foreground">You become this clinic's doctor and can approve desk staff later.</p>
          <div className="mt-4 space-y-3">
            <input
              value={name}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
              placeholder="Clinic name (e.g. Nanhe Kadam Child Clinic)"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input maxLength={80} value={city} onChange={(e) => setCity(e.target.value)} placeholder="City / area" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm" />
              <PhoneInput value={phone} onChange={setPhone} />
            </div>
            <button
              onClick={() => create.mutate()}
              disabled={!name.trim() || create.isPending}
              className="min-h-11 w-full rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {create.isPending ? "Creating…" : "Create clinic"}
            </button>
          </div>
        </div>

        <div className="text-center">
          <button onClick={() => supabase.auth.signOut()} className="text-sm text-muted-foreground hover:text-foreground">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
