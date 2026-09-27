import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Footprint";
import { whoAmI } from "@/lib/clinic.functions";

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
  { to: "/clinic/recall", label: "Recall", hint: "Missed & overdue" },
  { to: "/clinic/approvals", label: "Approvals", hint: "Plan changes & staff" },
  { to: "/clinic/messages", label: "Replies", hint: "Parent messages" },
  { to: "/clinic/capacity", label: "Capacity", hint: "AI bottleneck check" },
] as const;

function ClinicLayout() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
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

  if (!ready || me.isLoading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  if (me.data && me.data.roles.length === 0)
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <div className="max-w-md rounded-3xl border border-border bg-card p-8 text-center">
          <Logo />
          <h1 className="mt-6 font-display text-3xl">Waiting for approval</h1>
          <p className="mt-2 text-muted-foreground">Your account ({me.data.email}) is registered. The doctor needs to approve it before you can see clinic data.</p>
          <div className="mt-6 flex justify-center gap-3">
            <button onClick={() => me.refetch()} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Check again</button>
            <button onClick={() => supabase.auth.signOut()} className="rounded-full border border-border px-5 py-2 text-sm">Sign out</button>
          </div>
        </div>
      </div>
    );
  const role = me.data?.roles.includes("doctor") ? "Doctor" : "Desk";
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="sticky top-0 z-30 border-b border-border bg-card lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-5 py-4 lg:block">
          <Link to="/"><Logo /></Link>
          <p className="hidden text-xs uppercase tracking-wide text-muted-foreground lg:mt-2 lg:block">Clinic admin</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:pb-0">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: true }} className="shrink-0 rounded-xl px-3.5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted" activeProps={{ className: "bg-secondary text-secondary-foreground" }}>
              <span className="block">{n.label}</span>
              <span className="hidden text-xs font-normal opacity-70 lg:block">{n.hint}</span>
            </Link>
          ))}
        </nav>
        <div className="hidden border-t border-border p-4 lg:absolute lg:inset-x-0 lg:bottom-0 lg:block">
          <p className="truncate text-sm font-semibold">{me.data?.email}</p>
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
  );
}
